// src/utils/format.js

const usdCompact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

const numCompact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
})

const isMissing = v => v == null || Number.isNaN(v)

export function formatUsdCompact(v) {
    return isMissing(v) ? '—' : usdCompact.format(v)
}

export function formatCompact(v) {
    return isMissing(v) ? '—' : numCompact.format(v)
}

export function formatCurrency(v) {
    if (isMissing(v)) return '—'
    return `$${Number(v).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export function formatPercent(v, decimals = 2) {
    if (isMissing(v)) return '—'
    return `${(Number(v) * 100).toFixed(decimals)}%`
}