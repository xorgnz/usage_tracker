import { ConversationTimeline } from '../conversations/ConversationTimeline';
import type { Conversation } from '../conversations/Conversation';
import { ConversationMessageRole, type ConversationMessage } from '../conversations/ConversationMessage';
import type { ConversationSource } from '../conversations/ConversationSource';
import {
    UsageDiagnosticCode,
    type UsageAccounting,
    type UsageAccountingGroup,
    type UsageAccountingResult,
    type UsageDiagnostic
} from './UsageAccounting';
import {
    SharedUsageAllocation,
    UsageCategory,
    UsageLevel,
    UsageScope,
    type UsageAttribution,
    type UsageBreakdown,
    type UsageContribution
} from './UsageContribution';
import { CalculationUnit, UsageCalculation } from './UsageCalculation';
import { UsageIdentity } from './UsageIdentity';
import { UsageMeasurementReader, type UsageObservation } from './UsageMeasurementReader';
import { UsageTokenCalculations } from './UsageTokenCalculations';

/** One logical response retains all observations and its separately measured block views. */
interface AccountedResponse
{
    readonly conversation: Conversation;
    readonly messages: readonly ConversationMessage[];
    readonly totals: readonly UsageContribution[];
    readonly blocks: readonly UsageContribution[];
    readonly turns: readonly ConversationSource[];
}

/** Owns reconciliation and grouping of usage without filesystem, pricing, or UI responsibilities. */
export class TokenUsageAccounting implements UsageAccounting
{
    private readonly reader: UsageMeasurementReader;
    private readonly calculations: UsageTokenCalculations;

    constructor()
    {
        this.reader = new UsageMeasurementReader();
        this.calculations = new UsageTokenCalculations();
    }

    account(conversations: readonly Conversation[]): UsageAccountingResult
    {
        const unique = new Map<string, Conversation>();
        for (const conversation of conversations)
        {
            const key = UsageIdentity.conversation(conversation.identity);
            if (unique.has(key) && unique.get(key) !== conversation)
            {
                throw new Error('Supply one conversation snapshot per file identity; conflicting snapshots cannot be silently selected.');
            }
            unique.set(key, conversation);
        }
        const contributions: UsageContribution[] = [];
        const breakdowns: UsageBreakdown[] = [];
        const allocations: SharedUsageAllocation[] = [];
        const groups: UsageAccountingGroup[] = [];
        const diagnostics: UsageDiagnostic[] = [];
        const responses: AccountedResponse[] = [];

        // Reconcile response snapshots before building any aggregate membership.
        for (const conversation of unique.values())
        {
            const turnIndex = this.turnIndex(conversation);
            const observations = new Map<string, ConversationMessage[]>();
            for (const message of conversation.messages)
            {
                if (message.role !== ConversationMessageRole.Assistant)
                {
                    continue;
                }
                const key = JSON.stringify(message.responseId === null ? ['source', UsageIdentity.source(message.source)] : ['response', message.responseId]);
                const existing = observations.get(key) ?? [];
                existing.push(message);
                observations.set(key, existing);
            }
            for (const messages of observations.values())
            {
                const attribution = this.attribution(conversation, UsageLevel.Response, messages[0].source);
                const measured = this.reader.read(messages, attribution, diagnostics);
                contributions.push(...measured.contributions);
                breakdowns.push(...measured.breakdowns);
                const blocks = this.readBlocks(conversation, messages, diagnostics, breakdowns);
                contributions.push(...blocks);

                const turns = conversation.turns.filter(turn => messages.some(message =>
                    turnIndex.get(message.source.lineNumber)?.equals(turn.initiatingMessage)));
                responses.push({ conversation, messages, totals: measured.contributions, blocks, turns: turns.map(turn => turn.initiatingMessage) });
                if (turns.length > 1)
                {
                    diagnostics.push({
                        code: UsageDiagnosticCode.ConflictingObservations,
                        sources: messages.map(message => message.source),
                        message: 'One response appears in multiple turns; turn allocations are unresolved while session usage is counted once.'
                    });
                }
                if (blocks.length > 0 && messages.length > 1)
                {
                    diagnostics.push({
                        code: UsageDiagnosticCode.UnsupportedUsage,
                        sources: messages.map(message => message.source),
                        message: 'Block usage spans repeated response observations; it is not summed into a missing response total.'
                    });
                }
            }
        }

        for (const response of responses)
        {
            groups.push(this.group(this.attribution(response.conversation, UsageLevel.Response, response.messages[0].source), [response], breakdowns));
        }
        for (const conversation of unique.values())
        {
            const own = responses.filter(response => response.conversation === conversation);
            for (const turn of conversation.turns)
            {
                const members = own.filter(response => response.turns.some(source => source.equals(turn.initiatingMessage)));
                groups.push(this.group(this.attribution(conversation, UsageLevel.Turn, turn.initiatingMessage), members, breakdowns));
            }
            groups.push(this.group(this.attribution(conversation, UsageLevel.Session, null), own, breakdowns));
            this.substepGroups(conversation, own, breakdowns, allocations, groups);

            // Follow explicit parent identity, with a visited set guarding repeated paths and cycles.
            const members = new Set<Conversation>([conversation]);
            const visit = (parent: Conversation): void =>
            {
                for (const child of unique.values())
                {
                    if (child.parent !== null && child.identity.projectDirectory === parent.identity.projectDirectory
                        && child.identity.sessionId === parent.identity.sessionId
                        && UsageIdentity.conversation(child.parent.parent) === UsageIdentity.conversation(parent.identity)
                        && !members.has(child))
                    {
                        members.add(child);
                        visit(child);
                    }
                }
            };
            visit(conversation);
            const attribution = { ...this.attribution(conversation, UsageLevel.Session, null), scope: UsageScope.IncludingSubagents };
            groups.push(this.group(attribution, responses.filter(response => members.has(response.conversation)), breakdowns));
        }
        return { contributions, breakdowns, allocations, groups, diagnostics };
    }

    private readBlocks(
        conversation: Conversation,
        messages: readonly ConversationMessage[],
        diagnostics: UsageDiagnostic[],
        breakdowns: UsageBreakdown[]
    ): UsageContribution[]
    {
        const contributions: UsageContribution[] = [];
        for (const step of [...conversation.turns.flatMap(turn => turn.substeps), ...conversation.unattachedActivity])
        {
            const message = messages.find(candidate => step.messageSource?.equals(candidate.source));
            const content = step.content;
            if (message === undefined || typeof content !== 'object' || content === null || !Object.hasOwn(content, 'usage'))
            {
                continue;
            }
            // Only explicit block usage with the same named token schema is interpreted as a block measurement.
            const observation: UsageObservation = {
                source: step.source, responseId: message.responseId, requestId: message.requestId,
                model: message.model, timestamp: message.timestamp,
                usage: (content as Record<string, unknown>).usage, hasUsage: true
            };
            const measured = this.reader.read([observation], this.attribution(conversation, UsageLevel.Substep, step.source), diagnostics);
            contributions.push(...measured.contributions);
            breakdowns.push(...measured.breakdowns);
        }
        return contributions;
    }

    private group(attribution: UsageAttribution, responses: readonly AccountedResponse[], breakdowns: readonly UsageBreakdown[]): UsageAccountingGroup
    {
        return {
            attribution,
            totals: Object.values(UsageCategory).map(category =>
            {
                const contributions = responses.flatMap(response => response.totals.filter(total => total.category === category));
                const calculations = responses.map(response =>
                {
                    const contribution = response.totals.find(total => total.category === category)!;
                    if (attribution.level === UsageLevel.Turn && response.turns.length > 1)
                    {
                        return UsageCalculation.missing({
                            id: JSON.stringify([UsageIdentity.contribution(contribution), UsageIdentity.source(attribution.source!), 'turn-allocation']),
                            unit: CalculationUnit.Tokens,
                            reason: 'Response observations cross turn boundaries; no distribution is assumed.',
                            sources: contribution.observations
                        }, this.calculations.contribution(contribution, breakdowns));
                    }
                    return this.calculations.contribution(contribution, breakdowns, response.messages.length === 1 ? response.blocks : []);
                });
                return { category, contributions, calculation: UsageCalculation.sum(CalculationUnit.Tokens, calculations) };
            })
        };
    }

    private substepGroups(
        conversation: Conversation,
        responses: readonly AccountedResponse[],
        breakdowns: readonly UsageBreakdown[],
        allocations: SharedUsageAllocation[],
        groups: UsageAccountingGroup[]
    ): void
    {
        const seen = new Set<string>();
        for (const step of [...conversation.turns.flatMap(turn => turn.substeps), ...conversation.unattachedActivity])
        {
            if (seen.has(UsageIdentity.source(step.source)))
            {
                continue;
            }
            seen.add(UsageIdentity.source(step.source));
            const response = responses.find(candidate => candidate.messages.some(message => step.messageSource?.equals(message.source)));
            const totals = Object.values(UsageCategory).map(category =>
            {
                const actual = response?.blocks.find(block => block.category === category && block.source.equals(step.source));
                const total = response?.totals.find(total => total.category === category);
                if (actual !== undefined)
                {
                    return { category, contributions: [actual], calculation: this.calculations.contribution(actual, breakdowns) };
                }
                if (total !== undefined)
                {
                    allocations.push(new SharedUsageAllocation(step.source, total));
                }
                const calculation = UsageCalculation.missing({
                    id: JSON.stringify([UsageIdentity.source(step.source), category, 'allocation']),
                    unit: CalculationUnit.Tokens,
                    reason: total === undefined ? 'No recorded measurement for this activity.' : 'Unknown allocation of shared response usage.',
                    sources: [step.source]
                }, total === undefined ? null : this.calculations.contribution(total, breakdowns, response!.messages.length === 1 ? response!.blocks : []));
                return { category, contributions: [], calculation };
            });
            groups.push({ attribution: this.attribution(conversation, UsageLevel.Substep, step.source), totals });
        }
    }

    private turnIndex(conversation: Conversation): Map<number, ConversationSource>
    {
        const index = new Map<number, ConversationSource>();
        const starts = new Map(conversation.turns.map(turn => [turn.initiatingMessage.lineNumber, turn.initiatingMessage]));
        let current: ConversationSource | null = null;

        // Reuse parser chronology so messages with empty content still have turn membership.
        for (const record of new ConversationTimeline().order(conversation.records, []))
        {
            current = starts.get(record.source.lineNumber) ?? current;
            if (current !== null)
            {
                index.set(record.source.lineNumber, current);
            }
        }
        return index;
    }
    private attribution(conversation: Conversation, level: UsageLevel, source: ConversationSource | null): UsageAttribution
    {
        return { conversation: conversation.identity, level, scope: UsageScope.Own, source };
    }
}
