// src/constants/intrinsicValue.js

import {
    FileBarChart2,
    Banknote,
    Landmark,
    Users,
} from 'lucide-react'


// ── Concept-mapping field/group definitions ──────────────────────────────

export const CONCEPT_GROUPS = [
    {
        key: 'income_statement',
        label: 'Income Stmt',
        statement: 'income_statement',
        icon: FileBarChart2,
        fields: [
            {
                key: 'revenue',
                label: 'Revenue',
                methods: ['ocf', 'nopat'],
            },
            {
                key: 'ebit',
                label: 'Operating Income (EBIT)',
                methods: ['nopat'],
            },
            {
                key: 'taxes',
                label: 'Income Tax Expense',
                methods: ['nopat'],
            },
        ],
    },

    {
        key: 'cashflow',
        label: 'Cash Flow',
        statement: 'cashflow',
        icon: Banknote,
        fields: [
            {
                key: 'ocf',
                label: 'Operating Cash Flow',
                methods: ['ocf'],
            },
            {
                key: 'capex',
                label: 'Capital Expenditures',
                methods: ['ocf', 'nopat'],
            },
            {
                key: 'depreciation',
                label: 'Depreciation & Amortization',
                multi: true,
                methods: ['nopat'],
            },
            {
                key: 'working_capital_change',
                label: 'Change in Working Capital',
                multi: true,
                methods: ['nopat'],
            },
        ],
    },

    {
        key: 'balance_sheet',
        label: 'Balance Sheet',
        statement: 'balance_sheet',
        icon: Landmark,
        fields: [
            {
                key: 'ppe',
                label: 'Property, Plant & Equipment',
                methods: ['ocf', 'nopat'],
            },
            {
                key: 'accounts_payable',
                label: 'Accounts Payable',
                methods: ['ocf', 'nopat'],
            },
            {
                key: 'cash',
                label: 'Cash & Equivalents',
                methods: ['ocf', 'nopat'],
            },
            {
                key: 'debt',
                label: 'Long-Term Debt',
                methods: ['ocf', 'nopat'],
            },
        ],
    },
]


export const SHARE_GROUP = {
    key: 'shares',
    label: 'Shares',
    icon: Users,
    fields: [
        {
            key: 'shares_common',
            label: 'Shares Outstanding (Common)',
        },
        {
            key: 'shares_diluted',
            label: 'Diluted Shares (Point-in-Time)',
        },
        {
            key: 'shares_basic_wtd',
            label: 'Weighted Avg Basic Shares',
        },
        {
            key: 'shares_diluted_wtd',
            label: 'Weighted Avg Diluted Shares',
        },
        {
            key: 'stock_repurchased',
            label: 'Stock Repurchased',
        },
        {
            key: 'dilution_adjustment',
            label: 'Dilution Adjustment',
        },
        {
            key: 'antidilutive_securities',
            label: 'Antidilutive Securities',
        },
    ],
}


export const ALL_FIELD_KEYS = [
    ...CONCEPT_GROUPS.flatMap(g => g.fields.map(f => f.key)),
    ...SHARE_GROUP.fields.map(f => f.key),
]


// ── DCF defaults ─────────────────────────────────────────────────────────

export const DEFAULT_DISCOUNT = 0.10
export const DEFAULT_TERMINAL_GROWTH = 0.025
export const DEFAULT_GROWTH_5YR = 0.15
export const DEFAULT_GROWTH_15YR = 0.07
export const FALLBACK_FCF_MARGIN = 0.15



// APPEND to src/constants/intrinsicValue.js (below SHARE_GROUP / ALL_FIELD_KEYS).
// Reuses the lucide icons that file already imports. Keys are prefixed with
// "bank_" so React remounts the toolbar buttons (closing any open panel) when
// the view switches between DCF and excess return.
//
// `statement` is the value your /api/statements/{ticker}?statement=... endpoint
// expects; these match the existing groups ('income_statement', 'balance_sheet',
// 'cashflow'). If a concept doesn't appear in a dropdown, it's filed under a
// different statement in your classification; change `statement` for that group.
//
// ALL_FIELD_KEYS is intentionally NOT extended: the hook's DCF request only
// forwards DCF keys, and ExcessReturnView forwards the bank keys itself.

export const BANK_CONCEPT_GROUPS = [
    {
        key: 'bank_income_statement',
        label: 'Income Stmt',
        statement: 'income_statement',
        icon: FileBarChart2,
        fields: [
            { key: 'net_income', label: 'Net Income' },
            { key: 'net_income_common', label: 'Net Income to Common' },
        ],
    },
    {
        key: 'bank_balance_sheet',
        label: 'Balance Sheet',
        statement: 'balance_sheet',
        icon: Landmark,
        fields: [
            { key: 'equity', label: 'Stockholders Equity' },
            { key: 'preferred', label: 'Preferred Stock' },
            { key: 'goodwill', label: 'Goodwill' },
            // multi: lets you sum several intangible lines (e.g. finite- plus indefinite-lived)
            { key: 'intangibles', label: 'Other Intangibles', multi: true },
        ],
    },
    {
        key: 'bank_cashflow',
        label: 'Cash Flow',
        statement: 'cashflow',
        icon: Banknote,
        fields: [
            { key: 'dividends', label: 'Common Dividends Paid' },
            { key: 'buybacks', label: 'Buybacks (Cash Paid)' },
        ],
    },
]

export const BANK_SHARE_GROUP = {
    key: 'bank_shares',
    label: 'Shares',
    icon: Users,
    fields: [
        { key: 'shares_common', label: 'Shares Outstanding (Common)' },
        { key: 'shares_diluted', label: 'Diluted Shares (Point-in-Time)' },
        { key: 'shares_diluted_wtd', label: 'Weighted Avg Diluted Shares' },
    ],
}