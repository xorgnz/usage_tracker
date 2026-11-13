import { UsageCategory } from './UsageContribution';
import type { UsageRate } from './UsageRate';

/** Verified standard/global Claude API token prices, stored locally without runtime network access. */
interface ModelRateSchedule
{
    readonly model: string;
    readonly input: string;
    readonly output: string;
    readonly write5m: string;
    readonly write1h: string;
    readonly read: string;
    readonly launchAfter: string;
    readonly announcement: string;
}

const schedules: readonly ModelRateSchedule[] = [
    {
        model: 'claude-sonnet-5', input: '2', output: '10', write5m: '2.5', write1h: '4', read: '0.2',
        launchAfter: '2026-07-01T00:00:00.000Z', announcement: 'https://www.anthropic.com/news/claude-sonnet-5'
    },
    {
        model: 'claude-opus-5', input: '5', output: '25', write5m: '6.25', write1h: '10', read: '0.5',
        launchAfter: '2026-07-25T00:00:00.000Z', announcement: 'https://www.anthropic.com/news/claude-opus-5'
    },
    {
        model: 'claude-opus-5-5', input: '4', output: '20', write5m: '5', write1h: '8', read: '0.2',
        launchAfter: '2026-09-23T00:00:00.000Z', announcement: 'https://www.anthropic.com/claude-opus-5-5'
    },
    {
        model: 'claude-sonnet-5-5', input: '2', output: '10', write5m: '2.5', write1h: '4', read: '0.1',
        launchAfter: '2026-09-29T00:00:00.000Z', announcement: 'https://www.anthropic.com/claude-sonnet-5-5'
    }
];

const periods = [
    {
        from: '2026-10-22T00:00:00.000Z', until: '2026-11-09T00:00:00.000Z',
        source: 'https://assets.claude.com/5633dc848caa431115468f31c7085d695bbfb9cc.pdf'
    },
    {
        from: '2026-11-09T00:00:00.000Z', until: null,
        source: 'https://assets.claude.com/a04aca860a54b7323e33f449706e9b43680e1346.pdf'
    }
];

export const initialUsageRates: readonly UsageRate[] = Object.freeze(schedules.flatMap(schedule =>
{
    const categories = [
        { category: UsageCategory.Input, detail: null, amount: schedule.input },
        { category: UsageCategory.Output, detail: null, amount: schedule.output },
        { category: UsageCategory.CacheRead, detail: null, amount: schedule.read },
        { category: UsageCategory.CacheWrite, detail: 'ephemeral_5m_input_tokens', amount: schedule.write5m },
        { category: UsageCategory.CacheWrite, detail: 'ephemeral_1h_input_tokens', amount: schedule.write1h }
    ];
    const historical: UsageRate[] = categories.filter(item => item.category === UsageCategory.Input || item.category === UsageCategory.Output).map(item => ({
        id: `${schedule.model}/${item.category}/launch`,
        model: schedule.model, category: item.category, detail: item.detail, usdAmount: item.amount, tokenUnit: 1000000,
        effectiveFrom: schedule.launchAfter, effectiveUntil: periods[0].from, source: schedule.announcement,
        assumptions: [
            'Claude API standard/global list-price estimate; not subscription billing.',
            'Launch-day time is unspecified; coverage starts the following UTC day.',
            'Published launch base prices carried forward to the first included dated rate card; no intervening change is asserted.'
        ]
    }));
    const dated = periods.flatMap(period => categories.map(item => ({
        id: `${schedule.model}/${item.category}/${item.detail ?? 'base'}/${period.from.slice(0, 10)}`,
        model: schedule.model, category: item.category, detail: item.detail, usdAmount: item.amount, tokenUnit: 1000000,
        effectiveFrom: period.from, effectiveUntil: period.until, source: period.source,
        assumptions: [
            'Claude API standard/global list-price estimate; not subscription billing.',
            'Rate-card dates use UTC midnight; periods include the start and exclude the end.',
            'Latest verified schedule remains applicable until superseded locally; no automatic price updates.',
            'Cache-write duration must be recorded explicitly; total cache-write usage has no assumed duration.'
        ]
    })));
    return [...historical, ...dated].map(rate => Object.freeze({ ...rate, assumptions: Object.freeze(rate.assumptions) }));
}));
