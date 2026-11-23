import type { MonitoringResponseViewModel, MonitoringSelection, MonitoringUsageViewModel } from './MonitoringViewModel';

export interface MonitoringRefreshState
{
    readonly snapshot: MonitoringResponseViewModel;
    readonly expanded: readonly string[];
    readonly explanations: readonly string[];
    readonly loading: boolean;
    readonly failure: boolean;
}

type MonitoringFetch = (selection: MonitoringSelection, signal: AbortSignal) => Promise<MonitoringResponseViewModel>;

/** Owns request sequencing, current selections and the visible-page refresh lifecycle. */
export class MonitoringRefreshController
{
    private static readonly intervalMs = 5000;
    private readonly page: Document;
    private readonly fetchSnapshot: MonitoringFetch;
    private readonly notify: (state: MonitoringRefreshState) => void;
    private readonly expanded = new Map<string, number>();
    private readonly explanations = new Map<string, number>();
    private snapshot: MonitoringResponseViewModel;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private inFlight: AbortController | null = null;
    private selectionVersion = 0;
    private queued = false;
    private disposed = false;
    private failure = false;

    constructor(page: Document, snapshot: MonitoringResponseViewModel, fetchSnapshot: MonitoringFetch, notify: (state: MonitoringRefreshState) => void)
    {
        this.page = page;
        this.snapshot = snapshot;
        this.fetchSnapshot = fetchSnapshot;
        this.notify = notify;
        this.page.addEventListener('visibilitychange', this.visibilityChanged);
        this.schedule();
    }

    dispose(): void
    {
        this.disposed = true;
        this.clearTimer();
        this.page.removeEventListener('visibilitychange', this.visibilityChanged);
        this.inFlight?.abort();
    }

    acceptInitial(snapshot: MonitoringResponseViewModel): void
    {
        if (snapshot.sourceKey === this.snapshot.sourceKey && snapshot.generation > this.snapshot.generation)
        {
            this.accept(snapshot, new Map(), new Map());
            this.publish();
            if (this.expanded.size || this.explanations.size)
            {
                this.queueSelection();
            }
        }
    }

    toggleActivity(key: string): void
    {
        this.toggle(key, this.expanded);
    }

    toggleExplanation(id: string): void
    {
        this.toggle(id, this.explanations);
    }

    async refresh(): Promise<void>
    {
        if (this.disposed || this.inFlight !== null)
        {
            return;
        }

        this.clearTimer();
        const request = new AbortController();
        this.inFlight = request;
        this.publish();
        do
        {
            this.queued = false;
            const expanded = new Map(this.expanded);
            const explanations = new Map(this.explanations);
            try
            {
                const next = await this.fetchSnapshot({
                    expandedSessionKeys: [...expanded.keys()], explanationIds: [...explanations.keys()]
                }, request.signal);
                if (!this.disposed)
                {
                    this.accept(next, expanded, explanations);
                }
            }
            catch
            {
                if (!this.disposed)
                {
                    this.failure = true;
                }
            }
            if (!this.disposed)
            {
                this.publish();
            }
        }
        while (!this.disposed && this.queued);

        this.inFlight = null;
        if (!this.disposed)
        {
            this.publish();
            this.schedule();
        }
    }

    private readonly visibilityChanged = (): void =>
    {
        this.clearTimer();
        if (!this.page.hidden)
        {
            void this.refresh();
        }
    };

    private toggle(id: string, selection: Map<string, number>): void
    {
        if (selection.delete(id))
        {
            // Drop hidden details now so reopening requests a fresh snapshot.
            this.filterDetails();
            this.publish();
        }
        else
        {
            selection.set(id, ++this.selectionVersion);
            this.queueSelection();
        }
    }

    private queueSelection(): void
    {
        if (this.inFlight !== null)
        {
            this.queued = true;
            this.publish();
        }
        else
        {
            void this.refresh();
        }
    }

    private accept(snapshot: MonitoringResponseViewModel, expanded: ReadonlyMap<string, number>, explanations: ReadonlyMap<string, number>): void
    {
        if (snapshot.sourceKey !== this.snapshot.sourceKey)
        {
            this.expanded.clear();
            this.explanations.clear();
            this.queued = false;
        }
        else if (snapshot.generation < this.snapshot.generation)
        {
            return;
        }

        const sessionKeys = new Set(snapshot.sessions.map(session => session.key));
        const explanationIds = new Set(snapshot.sessions.flatMap(session => [
            ...this.usageExplanationIds(session.ownUsage),
            ...this.usageExplanationIds(session.combinedUsage)
        ]));
        for (const [selection, valid] of [[this.expanded, sessionKeys], [this.explanations, explanationIds]] as const)
        {
            for (const id of selection.keys())
            {
                if (!valid.has(id))
                {
                    selection.delete(id);
                }
            }
        }

        // A close/reopen assigns a new version, so a response for the old selection cannot fill the new panel.
        this.snapshot = {
            ...snapshot,
            details: snapshot.details.filter(detail =>
                this.expanded.has(detail.sessionKey) && this.expanded.get(detail.sessionKey) === expanded.get(detail.sessionKey)
            ),
            calculations: snapshot.calculations.filter(graph =>
                this.explanations.has(graph.id) && this.explanations.get(graph.id) === explanations.get(graph.id)
            )
        };
        this.failure = false;
    }

    private filterDetails(): void
    {
        this.snapshot = {
            ...this.snapshot,
            details: this.snapshot.details.filter(detail => this.expanded.has(detail.sessionKey)),
            calculations: this.snapshot.calculations.filter(graph => this.explanations.has(graph.id))
        };
    }

    private usageExplanationIds(usage: MonitoringUsageViewModel | null): string[]
    {
        return usage === null ? [] : [
            usage.cost.explanationId,
            ...usage.categories.flatMap(category => [category.tokens.explanationId, category.cost.explanationId])
        ];
    }

    private publish(): void
    {
        this.notify({
            snapshot: this.snapshot, expanded: [...this.expanded.keys()], explanations: [...this.explanations.keys()],
            loading: this.inFlight !== null, failure: this.failure
        });
    }

    private schedule(): void
    {
        this.clearTimer();
        if (!this.page.hidden)
        {
            this.timer = setTimeout(() =>
            {
                if (!this.page.hidden)
                {
                    void this.refresh();
                }
            }, MonitoringRefreshController.intervalMs);
        }
    }

    private clearTimer(): void
    {
        clearTimeout(this.timer);
        this.timer = undefined;
    }
}
