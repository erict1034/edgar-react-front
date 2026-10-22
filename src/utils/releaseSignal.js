// releaseSignal.js - Utility functions for handling earnings release signals, including growth row extraction, notable changes detection, and forecast coverage assessment.
const MIN_ABS_GAP = 0.10
const MIN_REL_GAP = 0.50

const fmtDate = iso =>
    iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00`)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
}

/** Every growth-comparable row from a release, in display order. */
export function growthRows(release) {
    if (!release) return []
    const rows = []

    if (release.revenue != null && release.revenuePriorYear) {
        rows.push({
            id: 'yoy',
            label: 'Latest quarter revenue YoY',
            value: release.revenue / release.revenuePriorYear - 1,
            horizon: null,
            text: null,
            revenue: release.revenue,
            revenuePriorYear: release.revenuePriorYear,
            periodText: `Quarter ended ${fmtDate(release.periodEnd)} vs ${release.revenuePriorYearPeriodEnd
                ? `quarter ended ${fmtDate(release.revenuePriorYearPeriodEnd)}`
                : 'the year-ago quarter'}`,
        })
    }

    ; (release.guidance || []).forEach((g, i) => {
        if (g.kind === 'revenue_growth_pct') {
            rows.push({
                id: `g${i}`, label: /constant currency/i.test(g.text || '') ? 'Guidance (constant currency)' : 'Guidance', value: (g.low + g.high) / 200,
                range: `${g.low}–${g.high}%`, horizon: g.horizon, text: g.text,
                periodText: g.horizon,
            })
        } else if (g.kind === 'revenue_range') {
            const base = g.impliedGrowth?.basePeriodEnd
            const unit = g.periodType === 'year' ? 'Fiscal year' : 'Quarter'
            rows.push({
                id: `g${i}`, label: 'Guidance', value: g.impliedGrowth?.mid ?? null,
                range: g.impliedGrowth
                    ? `${(g.impliedGrowth.low * 100).toFixed(1)}% to ${(g.impliedGrowth.high * 100).toFixed(1)}%`
                    : null,
                horizon: g.horizon, text: g.text, revenueLow: g.low, revenueHigh: g.high,
                periodText: base
                    ? `${unit} ending ~${fmtDate(addDays(base, 364))} vs ${unit.toLowerCase()} ended ${fmtDate(base)}`
                    : g.horizon,
            })
        } else if (g.kind === 'eps_range') {
            rows.push({
                id: `g${i}`, label: 'EPS guidance', value: null,
                range: `$${g.low.toFixed(2)}–$${g.high.toFixed(2)}`, horizon: g.horizon, text: g.text,
                periodText: g.horizon,
            })
        }
    })
    return rows
}

export function isNotable(value, assumed) {
    if (value == null || assumed == null) return false
    const gap = Math.abs(value - assumed)
    return gap >= MIN_ABS_GAP || gap >= MIN_REL_GAP * Math.abs(assumed)
}

export function forecastCoverage(release, model) {
    const periodEnd = release?.periodEnd
    if (!periodEnd) return { status: 'unknown' }

    const annualRows = model?.payload ?? []
    const quarterlyRows = model?.quarterly_payload ?? []
    const latestAnnual = latestRow(annualRows)
    const latestQuarterly = latestRow(quarterlyRows)
    const releaseQuarter = quarterlyRows.find(row => row.end === periodEnd)
    const reconciliation = release.reconciliation
    const quarterInHistory = Boolean(releaseQuarter || release.dataCoverage?.releaseQuarterInXbrl || (
        reconciliation?.xbrlPeriodEnd === periodEnd &&
        reconciliation?.reconciled === true
    ))
    const revenueMatches = releaseQuarter?.revenue != null && release.revenue != null
        ? relativeDifference(releaseQuarter.revenue, release.revenue) <= 0.002
        : release.dataCoverage?.revenueMatches ?? reconciliation?.reconciled ?? null
    const includedInDcfBaseline = Boolean(latestAnnual?.end && latestAnnual.end >= periodEnd)

    if (!quarterInHistory) {
        return {
            status: 'not_ingested',
            latestAnnualEnd: latestAnnual?.end,
            latestQuarterlyEnd: latestQuarterly?.end,
            revenueMatches,
            includedInDcfBaseline: false,
        }
    }
    return {
        status: 'included_in_forecast',
        latestAnnualEnd: latestAnnual?.end,
        latestQuarterlyEnd: latestQuarterly?.end,
        revenueMatches,
        includedInDcfBaseline,
    }
}

function latestRow(rows) {
    return [...rows]
        .filter(row => row?.end)
        .sort((a, b) => new Date(b.end) - new Date(a.end))[0]
}

function relativeDifference(a, b) {
    if (b === 0) return a === 0 ? 0 : Infinity
    return Math.abs(a / b - 1)
}