// constants.js
export const TERM_COLORS = {
    Q1: '#4C78A8',
    Q2: '#F58518',
    Q3: '#54A24B',
    Q4: '#E45756',
    FY: '#72B7B2',
}

export const STATEMENTS = [
    { label: '— None —', value: '' },
    { label: 'Income Statement', value: 'income_statement' },
    { label: 'Balance Sheet', value: 'balance_sheet' },
    { label: 'Cash Flow', value: 'cashflow' },
    { label: 'Equity', value: 'equity' },
    { label: 'Comprehensive Income', value: 'comprehensive_income' },
    { label: 'Unclassified', value: 'unclassified' },
]

export const COMPARISON_COLORS = [
    '#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666',
]

export const SHARE_LINE_COLORS = [
    '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777',
]


export const MARGIN_COLORS = [
    '#F72585', // vivid pink
    '#FF9F1C', // amber-orange (distinct from COMPARISON's #D95F02 burnt orange)
    '#3A86FF', // bright cornflower blue (distinct from share line's navy #2563EB)
    '#06D6A0', // mint green (distinct from COMPARISON's forest #1B9E77)
    '#FFBE0B', // golden yellow
    '#8338EC', // violet (distinct from COMPARISON's muted #7570B3)
]

export const PER_SHARE_COLORS = ['#1F8A70', '#B33771', '#4A69BD', '#E58E26']

export const INDEX_COLORS = ['#4812ec', '#B33771', '#4A69BD', '#f0610f']