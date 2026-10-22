// tooltips.js
// Centralized helpers for building Plotly hover elements (customdata + hovertemplate).
//
// Shared shape across every trace family: "TICKER LABEL: VALUE" then the date.
// - TICKER is always included for perspective when multiple charts/tabs are open.
// - LABEL is a term marker (Q1–Q4 / FY) for statement-based traces, or a short
//   series name (Close, 50-day MA) for price traces — never the full concept
//   name, since that's already shown in ConceptLegend and would blow up the
//   tooltip's width.
// - VALUE is abbreviated (K/M/B/T) for large dollar/share amounts so the box
//   stays compact; percentages are just rounded.
//
// Kept as separate small functions per trace family (rather than one mega
// function) so each can be tuned independently without touching the others.

/**
 * Abbreviates a raw numeric value into a compact financial string.
 * 1_284_000_000 -> "1.28B", 15_230_000 -> "15.23M", 940 -> "940"
 */
function abbreviateNumber(value, decimals = 2) {
    if (value == null || isNaN(value)) return '—'
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(decimals)}T`
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(decimals)}B`
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(decimals)}M`
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(decimals)}K`
    return `${sign}${abs.toFixed(0)}`
}

/**
 * Formats a raw value + XBRL unit into a compact display string.
 * (1284000000, 'USD') -> "$1.28B"
 * (15230000, 'shares') -> "15.23M shares"
 * (4.52, 'USD/shares') -> "$4.52/share" (per-share values are already small — never abbreviated)
 */
export function formatCompactValue(value, unit) {
    if (value == null) return '—'
    if (unit === 'USD/shares') return `$${value.toFixed(2)}/share`
    const prefix = unit === 'USD' ? '$' : ''
    const suffix = unit === 'shares' ? ' shares' : ''
    return `${prefix}${abbreviateNumber(value)}${suffix}`
}

/**
 * Builds a customdata array of compact value strings for a trace where the
 * label (e.g. term) is constant across all points and supplied separately
 * via compactHoverTemplate(). Pair the two together on the same trace.
 */
export function compactValueCustomdata(values, unit) {
    return values.map(v => formatCompactValue(v, unit))
}

/**
 * Builds a customdata array of [termLabel, compactValueString] pairs for a
 * trace whose term varies point-to-point (e.g. a share line spanning both
 * quarterly and FY filings). Pair with compactHoverTemplateByPoint().
 */
export function compactValueWithTermCustomdata(rows, unit) {
    return rows.map(r => [r.term, formatCompactValue(r.value, unit)])
}

/** Builds [term/source label, compact value] pairs for statement bars. */
export function compactValueWithSourceCustomdata(rows, unit) {
    return rows.map(r => {
        const sourceLabel = r.source === 'comparative'
            ? `${r.form || 'Filing'} comparative`
            : null
        const termLabel = sourceLabel ? `${r.term} (${sourceLabel})` : r.term
        return [termLabel, formatCompactValue(r.value, unit)]
    })
}

// ── Hovertemplate builders ─────────────────────────────────────────────────

/** Price traces (Close, moving averages). Standard $ formatting — prices don't need abbreviation. */
export function priceHoverTemplate(ticker, seriesLabel) {
    return `${ticker} ${seriesLabel}: $%{y:,.2f}<br>` +
        `Change: %{customdata}<br>` +
        `%{x}<extra></extra>`
}

/** Term bars — label (e.g. "Q3", "FY") is constant per trace. Requires a matching customdata array. */
export function compactHoverTemplate(ticker, termLabel) {
    return `${ticker} ${termLabel}: %{customdata}<br>%{x}<extra></extra>`
}

/** Share lines — term varies per point. Requires customdata built with compactValueWithTermCustomdata(). */
export function compactHoverTemplateByPoint(ticker) {
    return `${ticker} %{customdata[0]}: %{customdata[1]}<br>%{x}<extra></extra>`
}

/**
 * Formats a percentage value to a fixed number of decimals with a '%' suffix.
 */
function formatPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—'
    return `${value.toFixed(decimals)}%`
}

/**
 * Builds a customdata array of [term, formattedPercentString] pairs for a
 * percent-based trace whose term is known per point (margin lines, YoY
 * comparisons). `valueKey` lets callers point at whichever field holds the
 * percent value (e.g. 'value' for margin points, 'yoy_pct' for YoY points).
 */
export function percentValueWithTermCustomdata(rows, valueKey = 'value', decimals = 1) {
    return rows.map(r => [r.term, formatPercent(r[valueKey], decimals)])
}

/** Margin lines — term varies per point. Requires customdata built with percentValueWithTermCustomdata(). */
export function marginHoverTemplateByPoint(ticker) {
    return `${ticker} %{customdata[0]} Margin: %{customdata[1]}<br>%{x}<extra></extra>`
}


/** YoY comparison lines — term varies per point. Requires customdata built with percentValueWithTermCustomdata(). */
export function yoyHoverTemplateByPoint(ticker) {
    return `${ticker} %{customdata[0]} YoY: %{customdata[1]}<br>%{x}<extra></extra>`
}

/**
 * Formats a per-share dollar value to two decimals. Per-share amounts are
 * already small (rarely above low hundreds), so — like formatCompactValue's
 * 'USD/shares' branch — this is never abbreviated with K/M/B/T suffixes.
 */
function formatPerShareValue(value) {
    if (value == null || isNaN(value)) return '—'
    const sign = value < 0 ? '-' : ''
    return `${sign}$${Math.abs(value).toFixed(2)}`
}

/**
 * Builds a customdata array of [term, formattedPerShareString] pairs for a
 * per-share trace whose term is known per point (per-share lines: Revenue/Share,
 * FCF/Share, etc.). `valueKey` lets callers point at whichever field holds the
 * per-share value (matches computePerShareSeries()'s output shape).
 */
export function perShareValueWithTermCustomdata(rows, valueKey = 'value') {
    return rows.map(r => [r.term, formatPerShareValue(r[valueKey])])
}

/** Per-share lines — term varies per point. Requires customdata built with perShareValueWithTermCustomdata(). */
export function perShareHoverTemplateByPoint(ticker) {
    return `${ticker} %{customdata[0]} Per Share: %{customdata[1]}<br>%{x}<extra></extra>`
}

/** Split markers — reuses each point's precomputed `text` (e.g. "2-for-1 split"). */
export function splitHoverTemplate(ticker) {
    return `${ticker}: %{text}<br>%{x}<extra></extra>`
}

/**
 * Formats a signed percentage change to one decimal place, e.g. 15.4321 -> "+15.4%".
 */
export function formatSignedPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—'
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Builds amendment customdata as [formattedOriginal, formattedPctChange, daysAfterOriginal].
 * Values are pre-formatted in JS rather than via hovertemplate d3-format specifiers
 * so precision is controlled directly and not subject to formatting edge cases.
 */
function formatDaysAfter(value) {
    if (value == null || isNaN(value)) return '—'
    return `${value}`
}

export function amendmentCustomdata(rows) {
    return rows.map(a => [
        a.term ?? '—',
        a.original_value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—',
        formatSignedPercent(a.pct_change),
        formatDaysAfter(a.days_after_original),
    ])
}

export function amendmentHoverTemplate(ticker) {
    return (
        `<b>${ticker}</b> %{customdata[0]} — %{x}<br>` +
        'Original: %{customdata[1]}<br>' +
        'Amended: %{y:,.2f} (%{customdata[2]})<br>' +
        'Filed %{customdata[3]} days after original' +
        '<extra></extra>'
    )
}