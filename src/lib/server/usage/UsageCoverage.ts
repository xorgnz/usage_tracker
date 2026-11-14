import { SessionDiscoveryStatus, SessionWarningCode } from '../../sessions/SessionDiscoveryViewModel';
import type { ConversationLoadResult } from '../conversations/ConversationLoadResult';
import type { ConversationIdentity } from '../conversations/ConversationSource';
import { CalculationUnit, UsageCalculation } from './UsageCalculation';
import { UsageCalculationEngine } from './UsageCalculationEngine';
import { UsageCategory } from './UsageContribution';
import type { UsageCoverageGap } from './UsageEstimation';
import { UsageIdentity } from './UsageIdentity';

/** Models unavailable source usage separately from interpreted measurements and their prices. */
export class UsageCoverage
{
    inspect(source: ConversationLoadResult): UsageCoverageGap[]
    {
        const gaps: UsageCoverageGap[] = [];
        for (const entry of source.conversations)
        {
            const reasons: string[] = [];
            if (entry.readFailed || entry.parsed === null)
            {
                reasons.push('unavailable-conversation');
            }
            if (entry.deferredTrailingRecord)
            {
                reasons.push('deferred-trailing-record');
            }
            if (entry.warnings.some(warning => warning.code === SessionWarningCode.MalformedRecord))
            {
                reasons.push('skipped-malformed-record');
            }
            if (reasons.length > 0)
            {
                gaps.push(this.gap({
                    projectDirectory: entry.file.projectDirectory,
                    sessionId: entry.file.sessionId,
                    agentId: entry.file.agentId,
                    filePath: entry.file.path
                }, reasons));
            }
        }

        // Discovery failures may hide files whose identities are not available to any session group.
        if (source.status === SessionDiscoveryStatus.Failed
            || source.warnings.some(warning => warning.code === SessionWarningCode.DirectoryAccess)
            || (source.status === SessionDiscoveryStatus.Partial && source.warnings.length === 0))
        {
            gaps.push(this.gap(null, ['incomplete-source-discovery']));
        }
        return gaps;
    }

    private gap(conversation: ConversationIdentity | null, reasons: readonly string[]): UsageCoverageGap
    {
        const id = JSON.stringify(['coverage', conversation === null ? null : UsageIdentity.conversation(conversation)]);
        const engine = new UsageCalculationEngine();
        const categories = Object.values(UsageCategory).map(category =>
        {
            const tokens = UsageCalculation.missing({ id: JSON.stringify([id, category, 'tokens']), unit: CalculationUnit.Tokens,
                reason: reasons.join(', '), sources: [] });
            const rate = UsageCalculation.missing({ id: JSON.stringify([id, category, 'price']), unit: CalculationUnit.USDPerToken,
                reason: 'Price context for unavailable usage is unknown.', sources: [] });
            return { category, tokens: engine.evaluate(tokens), evaluation: engine.evaluate(UsageCalculation.product(tokens, rate)) };
        });
        return { id, conversation, reasons, categories };
    }
}
