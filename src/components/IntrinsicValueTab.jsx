// src/components/IntrinsicValueTab.jsx


import { useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { apiUrl } from '../utils/api'

import IconToolbarButton from './IconToolbarButton'
import { AlertTriangle, Info } from 'lucide-react'

import DataGrid from './DataGrid'

import useClickOutside from '../hooks/useClickOutside'
import {
    formatUsdCompact,
    formatCompact,
    formatCurrency,
    formatPercent,
} from '../utils/format'

import {
    CONCEPT_GROUPS, SHARE_GROUP, BANK_CONCEPT_GROUPS, BANK_SHARE_GROUP,
    ALL_FIELD_KEYS, DEFAULT_GROWTH_5YR, DEFAULT_GROWTH_15YR, FALLBACK_FCF_MARGIN,
} from '../constants/intrinsicValue'


import ReleaseReferencePanel from './ReleaseReferencePanel'

function PercentInput({ value, onChange, decimals = 1, disabled, placeholder, nullable = true }) {
    const toText = v => (v == null || !Number.isFinite(v) ? '' : (v * 100).toFixed(decimals))
    const [draft, setDraft] = useState(toText(value))
    const [editing, setEditing] = useState(false)

    useEffect(() => {
        if (!editing) setDraft(toText(value))
    }, [value, editing]) // eslint-disable-line react-hooks/exhaustive-deps

    function commit() {
        setEditing(false)
        const trimmed = draft.trim()
        if (trimmed === '') {
            if (nullable) return onChange(null)
            return setDraft(toText(value))
        }
        const n = Number(trimmed)
        if (!Number.isFinite(n)) return setDraft(toText(value))
        onChange(n / 100)
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <input
                type="number"
                inputMode="decimal"
                step="any"
                disabled={disabled}
                placeholder={placeholder}
                value={draft}
                onFocus={() => setEditing(true)}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') { setDraft(toText(value)); e.currentTarget.blur() }
                }}
                style={{ width: 70, fontSize: 12, padding: '2px 4px', textAlign: 'right' }}
            />
            <span style={{ fontSize: 12 }}>%</span>
        </span>
    )
}

function SliderField({
    label, value, onChange, min, max, step,
    decimals = 1, disabled = false, children, nullable = true
}) {
    const outOfRange = value != null && (value < min || value > max)
    const sliderValue = Math.min(max, Math.max(min, value ?? 0))

    return (
        <div style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 2 }}>
                <span>{label}</span>
                <PercentInput value={value} onChange={onChange} decimals={decimals} disabled={disabled} nullable={nullable} />
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={sliderValue}
                disabled={disabled}
                onChange={e => onChange(Number(e.target.value))}
                style={{ width: '100%' }}
            />
            {outOfRange && (
                <div style={{ fontSize: 10, color: 'var(--menu-text-muted)' }}>
                    outside slider range
                </div>
            )}
            {children}
        </div>
    )
}


function CollapsibleSection({
    title,
    defaultOpen = false,
    children,
}) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                }}
            >
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'inherit',
                    }}
                >
                    {open ? '▼' : '▶'}
                </button>

                <span>{title}</span>
            </div>

            {open && children}
        </div>
    )
}


function SearchableMultiSelect({
    options,
    selectedValues,
    onChange,
}) {
    const [search, setSearch] = useState('')

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
    )

    function toggle(value) {
        const next = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value]

        onChange(next)
    }

    return (
        <>
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search concepts..."
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: 11,
                    padding: '4px 6px',
                    marginBottom: 4,
                }}
            />

            <div
                style={{
                    maxHeight: 120,
                    overflowY: 'auto',
                    border: '1px solid var(--menu-input-border)',
                    borderRadius: 3,
                    padding: 4,
                }}
            >
                {filtered.map(o => {
                    const checked = selectedValues.includes(o.value)

                    return (
                        <label
                            key={o.value}
                            title={o.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                marginBottom: 2,
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(o.value)}
                                style={{ flexShrink: 0 }}
                            />

                            <span
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {o.label.split(' [')[0]}
                            </span>
                        </label>
                    )
                })}

                {!filtered.length && (
                    <div
                        style={{
                            padding: 6,
                            fontSize: 11,
                            color: 'var(--menu-text-muted)',
                        }}
                    >
                        No matching concepts
                    </div>
                )}
            </div>
        </>

    )
}

function SearchableSelect({
    value,
    options,
    onChange,
    placeholder = 'Auto-detect',
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useClickOutside(() => setOpen(false))

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
    )

    const selected = options.find(o => o.value === value)

    const tooltipText = selected?.label || placeholder

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            <button
                type="button"
                title={tooltipText}
                onClick={() => {
                    setOpen(v => !v)
                    setSearch('')
                }}

                style={{
                    width: '100%',
                    textAlign: 'left',
                    fontSize: 12,
                    padding: '4px 6px',
                    background: 'var(--menu-bg)',
                    color: 'var(--menu-text)',
                    border: '1px solid var(--menu-input-border)',
                    borderRadius: 3,
                    cursor: 'pointer',

                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {selected ? selected.label.split(' [')[0] : placeholder}
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        marginTop: 2,
                        background: 'var(--menu-bg)',
                        border: '1px solid var(--menu-border)',
                        borderRadius: 4,
                        padding: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                    }}
                >
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search concepts..."
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            fontSize: 12,
                            padding: '4px 6px',
                            marginBottom: 4,
                        }}
                    />

                    <div
                        style={{
                            maxHeight: 180,
                            overflowY: 'auto',
                        }}
                    >
                        <div
                            onClick={() => {
                                onChange('')
                                setOpen(false)
                            }}
                            style={{
                                padding: '4px 6px',
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            Auto-detect:
                        </div>

                        {filtered.map(o => (
                            <div
                                key={o.value}
                                onClick={() => {
                                    onChange(o.value)
                                    setOpen(false)
                                }}
                                title={o.label}
                                style={{
                                    padding: '4px 6px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {o.label.split(' [')[0]}
                            </div>
                        ))}

                        {!filtered.length && (
                            <div
                                style={{
                                    padding: '6px',
                                    fontSize: 11,
                                    color: 'var(--menu-text-muted)',
                                }}
                            >
                                No matching concepts
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// Status line under a picker: flags an override that returned no data, and
// marks the share field that is actually feeding the calculation.
function FieldStatus({ fieldKey, overrides, resolved, sharesSource }) {
    const picked = overrides?.[fieldKey]
    const failed = Boolean(picked) && !resolved?.[fieldKey]
    const inUse = sharesSource?.field === fieldKey

    if (!failed && !inUse) return null
    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10 }}>
            {failed && (
                <span style={{ color: '#d9a441', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <AlertTriangle size={11} /> "{picked}" returned no data
                </span>
            )}
            {inUse && (
                <span style={{ color: 'var(--menu-text-muted)' }}>
                    {sharesSource.is_fallback ? 'in use (fallback)' : 'in use'}
                </span>
            )}
        </div>
    )
}

function resolvedFor(state) {
    const src = state.activeModel === 'excess_return' ? state.bankResult : state.result
    return { resolved: src?.resolved_concepts || {}, sharesSource: src?.shares_source }
}

function formatShareCount(n) {
    if (n == null || !Number.isFinite(n)) return 'n/a'
    const abs = Math.abs(n)
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    return n.toLocaleString()
}

function SharesSourceBanner({ source }) {
    if (!source) return null
    const warnings = source.warnings || []
    const warn = warnings.length > 0
    const Icon = warn ? AlertTriangle : Info
    const label = source.is_fallback
        ? 'weighted-avg diluted (fallback)'
        : (source.tag || source.field)

    return (
        <div
            title={warn ? warnings.join('\n') : 'Share count used in the valuation'}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12,
                padding: '4px 8px', borderRadius: 4, width: 'fit-content',
                border: `1px solid ${warn ? '#d9a441' : 'var(--menu-border)'}`,
                color: warn ? '#d9a441' : 'var(--menu-text)',
            }}
        >
            <Icon size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
                <div>
                    Shares Outstanding: <strong>{formatShareCount(source.value)}</strong> from {label},{' '}
                    {source.period_end} ({source.age_days}d old)
                </div>
                {warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 11 }}>{w}</div>
                ))}
            </div>
        </div>
    )
}


// =========================
// TOOLBAR -- concept-mapping buttons, one per statement group + shares
// =========================
function ConceptGroupPanel({ group, state }) {
    const { conceptOverrides, setConceptOverride, groupOptions } = state
    const { resolved: resolvedConcepts } = resolvedFor(state)
    const options = (groupOptions[group.statement] || []).filter(
        o => (o.value.split('||')[1] || '') === 'USD'
    )
    const visibleFields = group.fields.filter(field =>
        !field.methods ||
        field.methods.includes(state.fcfMethod)
    )

    function toggleMultiOption(fieldKey, concept, checked) {
        const current = (conceptOverrides[fieldKey] || '').split(',').filter(Boolean)
        const next = checked
            ? [...new Set([...current, concept])]
            : current.filter(c => c !== concept)
        setConceptOverride(fieldKey, next.join(','))
    }

    return (
        <div
            style={{
                position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                color: 'var(--menu-text)', width: 300,
            }}
        >
            {visibleFields.map(field => (
                <div key={field.key} style={{ marginBottom: 8 }}>
                    <div
                        title={resolvedConcepts[field.key] || ''}
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            marginBottom: 2,
                            cursor: resolvedConcepts[field.key] ? 'help' : 'default',
                        }}
                    >{field.label}</div>

                    {field.multi ? (
                        <>
                            <div style={{ marginBottom: 4 }}>
                                <div style={{ fontSize: 10, color: 'var(--menu-text-muted)' }}>
                                    Select one or more to replace Auto-detect selection.
                                </div>
                                <div
                                    title={resolvedConcepts[field.key] || 'auto-detect'}
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--menu-text-muted)',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {conceptOverrides[field.key]
                                        ? `Selected: ${conceptOverrides[field.key].split(',').filter(Boolean).length}`
                                        : `Auto-detect${resolvedConcepts[field.key] ? ` (${resolvedConcepts[field.key]})` : ''}`}
                                </div>
                            </div>
                            <SearchableMultiSelect
                                options={options.map(o => ({
                                    value: o.value.split('||')[0],
                                    label: o.label,
                                }))}
                                selectedValues={
                                    (conceptOverrides[field.key] || '')
                                        .split(',')
                                        .filter(Boolean)
                                }
                                onChange={values =>
                                    setConceptOverride(field.key, values.join(','))
                                }
                            />
                            {conceptOverrides[field.key] && (
                                <button
                                    type="button"
                                    onClick={() => setConceptOverride(field.key, '')}
                                    style={{ fontSize: 10, marginTop: 4, background: 'none', border: 'none', color: 'var(--menu-text-muted)', cursor: 'pointer', padding: 0 }}
                                >
                                    Reset to auto-detect
                                </button>

                            )}
                        </>
                    ) : (
                        <SearchableSelect
                            value={
                                conceptOverrides[field.key] && !resolvedConcepts[field.key]
                                    ? ''
                                    : conceptOverrides[field.key] || ''
                            }
                            options={options.map(o => ({
                                ...o,
                                value: o.value.split('||')[0],
                            }))}
                            onChange={value => setConceptOverride(field.key, value)}
                            placeholder={
                                resolvedConcepts[field.key]
                                    ? `Auto-detect (${resolvedConcepts[field.key]})`
                                    : 'Auto-detect'
                            }
                        />
                    )}
                    <FieldStatus
                        fieldKey={field.key}
                        overrides={conceptOverrides}
                        resolved={resolvedConcepts}
                    />
                </div>
            ))}
        </div>
    )
}

function ShareGroupPanel({ group, state }) {
    const { conceptOverrides, setConceptOverride, dynamicSeries } = state
    const { resolved: resolvedConcepts, sharesSource } = resolvedFor(state)

    return (
        <div
            style={{
                position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                color: 'var(--menu-text)', width: 300,
            }}
        >
            {group.fields.map(field => {
                const picked = conceptOverrides[field.key] || ''
                const failed = Boolean(picked) && !resolvedConcepts[field.key]

                return (
                    <div key={field.key} style={{ marginBottom: 8 }}>
                        <div
                            title={resolvedConcepts[field.key] || ''}
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                marginBottom: 2,
                                cursor: resolvedConcepts[field.key] ? 'help' : 'default',
                            }}
                        >{field.label}</div>
                        <SearchableSelect
                            value={failed ? '' : picked}
                            options={(dynamicSeries || []).map(s => ({
                                value: s.concept,
                                label: s.alias,
                            }))}
                            onChange={value => setConceptOverride(field.key, value)}
                            placeholder={
                                failed
                                    ? 'No data found'
                                    : resolvedConcepts[field.key]
                                        ? `Auto-detect (${resolvedConcepts[field.key]})`
                                        : 'Auto-detect (no data)'
                            }
                        />
                        <FieldStatus
                            fieldKey={field.key}
                            overrides={conceptOverrides}
                            resolved={resolvedConcepts}
                            sharesSource={sharesSource}
                        />
                    </div>
                )
            })}
        </div>
    )
}

function ConceptGroupButton({ group, state, panel: Panel }) {
    const [open, setOpen] = useState(false)
    const ref = useClickOutside(() => setOpen(false))

    return (
        <IconToolbarButton
            icon={group.icon}
            label={group.label}
            isActive={open}
            innerRef={ref}
            onClick={() => {
                setOpen(o => !o)
                if (group.statement) state.ensureGroupOptions(group.statement)
            }}
        >
            {open && <Panel group={group} state={state} />}
        </IconToolbarButton>
    )
}

export function IntrinsicValueToolbar({ state }) {
    const bank = state.activeModel === 'excess_return'
    const groups = bank ? BANK_CONCEPT_GROUPS : CONCEPT_GROUPS
    const shareGroup = bank ? BANK_SHARE_GROUP : SHARE_GROUP
    return (
        <>
            {groups.map(group => (
                <ConceptGroupButton key={group.key} group={group} state={state} panel={ConceptGroupPanel} />
            ))}
            <ConceptGroupButton group={shareGroup} state={state} panel={ShareGroupPanel} />
        </>
    )
}

// =========================
// TAB BODY -- KPIs, sliders, tables
// =========================
const columnHelper = createColumnHelper()

const payloadColumns = [


    columnHelper.accessor('end', {
        id: 'end',
        header: 'Period End',
        meta: { align: 'left' }
    }),

    columnHelper.accessor('year', {
        id: 'year',
        header: 'Year',
        meta: { align: 'left' },
        size: '55'
    }),

    columnHelper.accessor('term', {
        id: 'term',
        header: 'Term',
        meta: { align: 'left' },
        size: '45'
    }),

    columnHelper.accessor('revenue', {
        id: 'revenue',
        header: 'Revenue',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('revenue_growth', {
        id: 'revenue_growth',
        header: 'Rev YOY',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('ocf', {
        id: 'ocf',
        header: 'OCF',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('ocf_margin', {
        id: 'ocf_margin',
        header: 'OCF %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('capex', {
        id: 'capex',
        header: 'CapEx',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('capex_margin', {
        id: 'capex_margin',
        header: 'CapEx %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('fcf', {
        id: 'fcf',
        header: 'FCF',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('fcf_margin', {
        id: 'fcf_margin',
        header: 'FCF %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('fcf_base', {
        id: 'fcf_base',
        header: 'FCF (OCF-based)',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('fcf_detailed', {
        id: 'fcf_detailed',
        header: 'FCF (NOPAT-based)',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('fcf_gap', {
        id: 'fcf_gap',
        header: 'FCF Gap',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('working_capital_change', {
        id: 'working_capital_change',
        header: 'WC Change',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('depreciation', {
        id: 'depreciation',
        header: 'Depreciation',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('nopat', {
        id: 'nopat',
        header: 'NOPAT',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('tax_rate', {
        id: 'tax_rate',
        header: 'Tax Rate',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('roic', {
        id: 'roic',
        header: 'ROIC',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('cash', {
        id: 'cash',
        header: 'Cash',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('debt', {
        id: 'debt',
        header: 'Debt',
        cell: i => formatUsdCompact(i.getValue())
    }),
]

const forecastColumns = [
    columnHelper.accessor('year', {
        id: 'year',
        header: 'Year',
        meta: { align: 'left' },
        size: '55'
    }),

    columnHelper.accessor('projected_revenue', {
        id: 'projected_revenue',
        header: 'Revenue',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('revenue_growth', {
        id: 'forecast_revenue_growth',
        header: 'Rev YOY',
        cell: i => formatPercent(i.getValue()),

    }),

    columnHelper.accessor('projected_ocf', {
        id: 'projected_ocf',
        header: 'OCF',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('projected_ocf_margin', {
        id: 'projected_ocf_margin',
        header: 'OCF %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('projected_capex', {
        id: 'projected_capex',
        header: 'CapEx',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('projected_capex_margin', {
        id: 'projected_capex_margin',
        header: 'CapEx %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('projected_fcf', {
        id: 'projected_fcf',
        header: 'FCF',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('fcf_margin', {
        id: 'forecast_fcf_margin',
        header: 'FCF %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('projected_shares', {
        id: 'projected_shares',
        header: 'Shares',
        cell: i => formatCompact(i.getValue())
    }),
    columnHelper.accessor('dilution_cagr', {
        id: 'dilution_cagr',
        header: 'Dilute CAGR',
        cell: i => formatPercent(i.getValue()),
        size: '95'

    }),

    columnHelper.accessor('fcf_per_share', {
        id: 'fcf_per_share',
        header: 'FCF/Share',
        cell: i => formatCurrency(i.getValue())
    }),

    columnHelper.accessor('discounted_fcf', {
        id: 'discounted_fcf',
        header: 'DFCF',
        cell: i => formatUsdCompact(i.getValue())
    }),

    columnHelper.accessor('discount_rate', {
        id: 'discount_rate',
        header: 'Discount',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('discount_factor', {
        id: 'discount_factor',
        header: 'Disc Factor',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('projected_roic', {
        id: 'forecast_roic',
        header: 'ROIC',
        cell: i => formatPercent(i.getValue())
    }),
]

const shareColumns = [

    columnHelper.accessor('end', {
        id: 'share_end',
        header: 'Period End',
        meta: { align: 'left' }
    }),

    columnHelper.accessor('year', {
        id: 'share_year',
        header: 'Year',
        meta: { align: 'left' },
        size: '55'
    }),

    columnHelper.accessor('term', {
        id: 'share_term',
        header: 'Term',
        meta: { align: 'left' },
        size: '45'
    }),

    columnHelper.accessor('basic_shares', {
        id: 'basic_shares',
        header: 'WASOB',
        cell: i => formatCompact(i.getValue())
    }),

    columnHelper.accessor('diluted_shares', {
        id: 'diluted_shares',
        header: 'WASOD',
        cell: i => formatCompact(i.getValue())
    }),

    columnHelper.accessor('dilution_yoy', {
        id: 'dilution_yoy',
        header: 'Diluted YoY',
        cell: i => formatPercent(i.getValue()),
        size: '95'

    }),

    columnHelper.accessor('diluted_minus_basic', {
        id: 'diluted_minus_basic',
        header: 'Dilution',
        cell: i => formatCompact(i.getValue())
    }),

    columnHelper.accessor('dilution_pct', {
        id: 'dilution_pct',
        header: 'Dilute %',
        cell: i => formatPercent(i.getValue())
    }),

    columnHelper.accessor('dilution_adjustment', {
        id: 'dilution_adjustment',
        header: 'Dilute Adj',
        cell: i => formatCompact(i.getValue())
    }),

    columnHelper.accessor('antidilutive_shares', {
        id: 'antidilutive_shares',
        header: 'Antidilute',
        cell: i => formatCompact(i.getValue())
    }),
    columnHelper.accessor('stock_repurchased', {
        id: 'stock_repurchased',
        header: 'Repurch',
        cell: i => formatCompact(i.getValue())
    }),
    columnHelper.accessor('stock_repurchased_pct', {
        id: 'stock_repurchased_pct',
        header: 'Repurch %',
        cell: i => formatPercent(i.getValue())
    }),
    columnHelper.accessor('net_dilution_shares', {
        id: 'net_dilution_shares',
        header: 'Net Dilute',
        cell: i => formatCompact(i.getValue())
    }),

    columnHelper.accessor('net_dilution_pct', {
        id: 'net_dilution_pct',
        header: 'Net Dilute %',
        cell: i => formatPercent(i.getValue())
    }),

]



function Kpi({ label, value }) {
    return (
        <div style={{ border: '1px solid var(--menu-border)', borderRadius: 6, padding: '8px 12px', minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
        </div>
    )
}

// Plain-language header tooltips, keyed by grid column id. Mapped concepts
// are appended as "Source concept: …" when available.
const COLUMN_DESCRIPTIONS = {
    end: 'Fiscal period end date.',
    year: 'Fiscal year.',
    term: 'Reporting term (e.g. FY or quarter).',
    revenue: 'Total revenue for the period.',
    revenue_growth: 'Year-over-year revenue growth.',
    ocf: 'Operating cash flow.',
    ocf_margin: 'Operating cash flow as a % of revenue.',
    capex: 'Capital expenditures (cash spent on property, plant & equipment).',
    capex_margin: 'CapEx as a % of revenue.',
    fcf: 'Free cash flow used in the valuation (per the selected FCF method).',
    fcf_margin: 'Free cash flow as a % of revenue.',
    fcf_base: 'Free cash flow computed the OCF way: OCF − CapEx.',
    fcf_detailed: 'Free cash flow computed the NOPAT way: NOPAT + D&A − capex − ΔWC.',
    fcf_gap: 'NOPAT-based FCF minus OCF-based FCF; shows how far the two methods disagree.',
    working_capital_change: 'Change in working capital; an increase consumes cash.',
    depreciation: 'Depreciation & amortization (non-cash expense added back).',
    nopat: 'Net operating profit after tax: EBIT × (1 − tax rate).',
    tax_rate: 'Effective tax rate: income tax expense ÷ pre-tax income.',
    roic: 'Return on invested capital: NOPAT ÷ invested capital.',
    cash: 'Cash & equivalents.',
    debt: 'Long-term debt.',
    projected_revenue: 'Forecast revenue, grown at the 5-yr then 15-yr growth rates.',
    forecast_revenue_growth: 'Assumed year-over-year growth in forecast revenue.',
    projected_ocf: 'Forecast operating cash flow (revenue × OCF %).',
    projected_ocf_margin: 'Assumed OCF as a % of revenue.',
    projected_capex: 'Forecast capital expenditures.',
    projected_capex_margin: 'Assumed CapEx as a % of revenue.',
    projected_fcf: 'Forecast free cash flow.',
    forecast_fcf_margin: 'Assumed free cash flow as a % of revenue.',
    projected_shares: 'Forecast diluted share count, using the dilution CAGR.',
    fcf_per_share: 'Forecast free cash flow ÷ forecast shares.',
    discounted_fcf: 'Forecast FCF multiplied by the discount factor (present value).',
    discount_rate: 'Annual discount rate applied to future cash flows.',
    discount_factor: '1 ÷ (1 + discount rate)^year; converts future cash to present value.',
    forecast_roic: 'Projected return on invested capital.',
    share_end: 'Fiscal period end date.',
    share_year: 'Fiscal year.',
    share_term: 'Reporting term (e.g. FY or quarter).',
    basic_shares: 'Weighted-average basic shares outstanding.',
    diluted_shares: 'Weighted-average diluted shares outstanding.',
    dilution_pct: '(WASOD − WASOB) ÷ WASOB',
    dilution_adjustment: 'Dilutive share adjustment as reported by the company. (blank if not reported).',
    diluted_minus_basic: 'WASOD - WASOB.',
    antidilutive_shares: 'Securities excluded from diluted EPS because they would increase EPS. (blank if not reported)',
    stock_repurchased: 'Shares repurchased by the company. (blank if not reported)',
    stock_repurchased_pct: 'Shares repurchased as a % of WASOB.',
    net_dilution_shares: 'Dilution shares minus repurchased shares.',
    net_dilution_pct: '(WASOD − WASOB − repurchased shares) ÷ WASOB.',
    dilution_cagr: 'Compound annual growth rate of WASOD.',
    dilution_yoy: 'Year-over-year growth rate of WASOD.',
}



const fmtMultiple = v => (v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(2)}x`)

// Fields the bank model reads; the DCF-only override keys are dropped.
const BANK_OVERRIDE_KEYS = [
    'net_income', 'net_income_common', 'equity', 'preferred', 'goodwill',
    'intangibles', 'dividends', 'buybacks',
    'shares_common', 'shares_diluted', 'shares_diluted_wtd',
]

const bankHistoryColumns = [
    columnHelper.accessor('end', { id: 'bank_end', header: 'Period End', meta: { align: 'left' } }),
    columnHelper.accessor('year', { id: 'bank_year', header: 'Year', meta: { align: 'left' }, size: '55' }),
    columnHelper.accessor('term', { id: 'bank_term', header: 'Term', meta: { align: 'left' }, size: '45' }),
    columnHelper.accessor('net_income_common', { id: 'bank_ni_common', header: 'NI to Common', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('common_equity', { id: 'bank_common_equity', header: 'Common Equity', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('goodwill', { id: 'bank_goodwill', header: 'Goodwill', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('intangibles', { id: 'bank_intangibles', header: 'Intangibles', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('tce', { id: 'bank_tce', header: 'TCE', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('tce_growth', { id: 'bank_tce_growth', header: 'TCE YOY', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('rotce', { id: 'bank_rotce', header: 'ROTCE', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('roe', { id: 'bank_roe', header: 'ROE', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('dividends', { id: 'bank_dividends', header: 'Dividends', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('buybacks', { id: 'bank_buybacks', header: 'Buybacks', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('total_payout', { id: 'bank_total_payout', header: 'Total Payout', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('payout_ratio', { id: 'bank_payout_ratio', header: 'Payout %', cell: i => formatPercent(i.getValue()) }),
]

const bankForecastColumns = [
    columnHelper.accessor('year', { id: 'bank_f_year', header: 'Year', meta: { align: 'left' }, size: '55' }),
    columnHelper.accessor('projected_roe', { id: 'bank_f_roe', header: 'ROTCE', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('projected_book_growth', { id: 'bank_f_growth', header: 'Book Growth', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('beginning_tce', { id: 'bank_f_beg', header: 'Beginning TCE', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('projected_net_income', { id: 'bank_f_ni', header: 'Net Income', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('residual_income', { id: 'bank_f_ri', header: 'Residual Income', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('implied_payout', { id: 'bank_f_payout', header: 'Implied Payout', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('implied_payout_ratio', { id: 'bank_f_payout_ratio', header: 'Payout %', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('ending_tce', { id: 'bank_f_end', header: 'Ending TCE', cell: i => formatUsdCompact(i.getValue()) }),
    columnHelper.accessor('discount_rate', { id: 'bank_f_rate', header: 'Cost of Equity', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('discount_factor', { id: 'bank_f_factor', header: 'Disc Factor', cell: i => formatPercent(i.getValue()) }),
    columnHelper.accessor('discounted_ri', { id: 'bank_f_dri', header: 'PV of RI', cell: i => formatUsdCompact(i.getValue()) }),
]

const BANK_COLUMN_DESCRIPTIONS = {
    bank_end: 'Fiscal period end date.',
    bank_ni_common: 'Net income available to common shareholders (falls back to total net income if the tag is missing).',
    bank_common_equity: 'Stockholders equity minus preferred stock.',
    bank_goodwill: 'Goodwill, deducted to get tangible equity.',
    bank_intangibles: 'Other intangibles excluding goodwill, deducted to get tangible equity.',
    bank_tce: 'Tangible common equity: common equity − goodwill − intangibles.',
    bank_tce_growth: 'Year-over-year growth in tangible common equity.',
    bank_rotce: 'Return on tangible common equity: NI to common ÷ average TCE.',
    bank_roe: 'Return on average common equity.',
    bank_dividends: 'Common dividends paid.',
    bank_buybacks: 'Common stock repurchased.',
    bank_total_payout: 'Dividends + buybacks.',
    bank_payout_ratio: 'Total payout ÷ NI to common.',
    bank_f_roe: 'Assumed ROTCE, fading linearly from the starting to the terminal value.',
    bank_f_growth: 'Assumed growth in tangible book, fading from the year-1 rate to terminal growth. Capped at 90% of ROTCE.',
    bank_f_beg: 'Tangible common equity at the start of the year.',
    bank_f_ni: 'ROTCE × beginning TCE.',
    bank_f_ri: 'Excess return: net income − cost of equity × beginning TCE.',
    bank_f_payout: 'Earnings not retained (dividends + buybacks): net income − growth in TCE.',
    bank_f_payout_ratio: 'Implied payout ÷ net income. Compare with the historical payout %.',
    bank_f_end: 'Tangible common equity at year end.',
    bank_f_rate: 'Cost of equity used to discount residual income.',
    bank_f_factor: '1 ÷ (1 + cost of equity)^year.',
    bank_f_dri: 'Residual income × discount factor.',
}

function ExcessReturnView({ ticker, conceptOverrides, onResult, beforeTables }) {
    // null = auto (backend derives the value and echoes it back in kpis)
    const [ov, setOv] = useState({
        discount: null, terminal_growth: null, roe_start: null, terminal_roe: null, bv_growth: null,
    })
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => { if (data) onResult?.(data) }, [data, onResult])

    const setField = (key) => (value) => setOv(prev => ({ ...prev, [key]: value }))

    // Overrides belong to one ticker.
    useEffect(() => {
        setOv({ discount: null, terminal_growth: null, roe_start: null, terminal_roe: null, bv_growth: null })
    }, [ticker])

    const bankConcepts = useMemo(() => {
        const out = {}
        for (const k of BANK_OVERRIDE_KEYS) if (conceptOverrides?.[k]) out[k] = conceptOverrides[k]
        return out
    }, [conceptOverrides])

    useEffect(() => {
        if (!ticker) return undefined
        const controller = new AbortController()
        const timer = setTimeout(async () => {
            const params = new URLSearchParams({ model: 'excess_return' })
            if (ov.discount != null) {
                params.set('discount', ov.discount)
                params.set('discount_mode', 'manual')
            }
            for (const k of ['terminal_growth', 'roe_start', 'terminal_roe', 'bv_growth']) {
                if (ov[k] != null) params.set(k, ov[k])
            }
            for (const [field, tag] of Object.entries(bankConcepts)) params.set(`${field}_concept`, tag)

            setLoading(true)
            try {
                const res = await fetch(apiUrl(`/api/tickers/${encodeURIComponent(ticker)}/intrinsic-value?${params}`), { signal: controller.signal })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.detail || `Request failed (${res.status})`)
                }
                setData(await res.json())
                setError(null)
            } catch (e) {
                if (e.name !== 'AbortError') setError(e.message)
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }, 250)
        return () => { clearTimeout(timer); controller.abort() }
    }, [ticker, ov, bankConcepts])

    const kpis = data?.kpis
    const upside = kpis?.intrinsic_price && kpis?.market_price ? kpis.intrinsic_price / kpis.market_price - 1 : null
    const terminalTooHigh = kpis && (ov.terminal_growth ?? kpis.terminal_growth) >= (ov.discount ?? kpis.effective_discount)

    return (
        <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Kpi label="Intrinsic Price" value={kpis ? formatCurrency(kpis.intrinsic_price) : '—'} />
                <Kpi label="Market Price" value={kpis ? formatCurrency(kpis.market_price) : '—'} />
                <Kpi label="vs Market" value={upside == null ? '—' : formatPercent(upside)} />
                <Kpi label="Equity Value" value={kpis ? formatUsdCompact(kpis.equity_value) : '—'} />
                <Kpi label="Tangible Common Equity" value={kpis ? formatUsdCompact(kpis.tce) : '—'} />
                <Kpi label="TBV / Share" value={kpis ? formatCurrency(kpis.tbvps) : '—'} />
                <Kpi label="Implied P/TBV" value={kpis ? fmtMultiple(kpis.implied_price_to_tbv) : '—'} />
                <Kpi label="Market P/TBV" value={kpis ? fmtMultiple(kpis.market_price_to_tbv) : '—'} />
                <Kpi label="PV of Excess Returns" value={kpis ? formatUsdCompact(kpis.pv_residual_income) : '—'} />
                <Kpi label="Terminal PV" value={kpis ? formatUsdCompact(kpis.terminal_pv) : '—'} />
                <Kpi label="Shares Outstanding" value={data ? formatCompact(data.shares_outstanding) : '—'} />
            </div>

            <SharesSourceBanner source={data?.shares_source} />
            {(data?.warnings || []).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: '#d9a441', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertTriangle size={13} /> {w}
                </div>
            ))}
            {error && <div style={{ fontSize: 12, color: 'var(--menu-danger)' }}>{error}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <SliderField
                    label="Cost of Equity"
                    value={ov.discount ?? kpis?.effective_discount ?? 0.1}
                    onChange={setField('discount')}
                    min={0.06} max={0.16} step={0.0025}
                >
                    <div style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>
                        {ov.discount == null ? `${kpis?.discount_mode ?? 'CAPM auto'} (clear the box to reset)` : 'Manual (clear the box to return to CAPM)'}
                    </div>
                </SliderField>

                <SliderField
                    label="Starting ROTCE"
                    value={ov.roe_start ?? kpis?.roe_start ?? 0.15}
                    onChange={setField('roe_start')}
                    min={0} max={0.4} step={0.005}
                >
                    {ov.roe_start == null && <div style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>auto: average of last 3 years</div>}
                </SliderField>

                <SliderField
                    label="Terminal ROTCE"
                    value={ov.terminal_roe ?? kpis?.terminal_roe ?? 0.12}
                    onChange={setField('terminal_roe')}
                    min={0} max={0.4} step={0.005}
                >
                    {ov.terminal_roe == null && <div style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>auto: midpoint of starting ROTCE and cost of equity</div>}
                </SliderField>

                <SliderField
                    label="Book Growth (year 1)"
                    value={ov.bv_growth ?? kpis?.bv_growth_start ?? 0.04}
                    onChange={setField('bv_growth')}
                    min={-0.02} max={0.12} step={0.0025}
                >
                    {ov.bv_growth == null && <div style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>auto: historical TCE trend</div>}
                </SliderField>

                <SliderField
                    label="Terminal Growth"
                    value={ov.terminal_growth ?? kpis?.terminal_growth ?? 0.025}
                    onChange={setField('terminal_growth')}
                    min={0} max={0.04} step={0.002}
                >
                    {terminalTooHigh && (
                        <div style={{ fontSize: 11, color: '#d9a441' }}>Terminal growth must be below the cost of equity.</div>
                    )}
                </SliderField>
            </div>

            {kpis?.historical_payout_ratio_3yr != null && (
                <div style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>
                    Historical total payout (3-yr avg): {formatPercent(kpis.historical_payout_ratio_3yr)}. Compare with the implied payout in the forecast.
                </div>
            )}
            {loading && <div style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>Recomputing…</div>}
            {beforeTables}

            <CollapsibleSection title="Historical Data" defaultOpen={true}>
                <DataGrid
                    tableId="intrinsic_bank_historical"
                    data={data?.payload ?? []}
                    columns={bankHistoryColumns}
                    headerTooltips={BANK_COLUMN_DESCRIPTIONS}
                    defaultVisibility={{ bank_end: false, bank_goodwill: false, bank_intangibles: false, bank_roe: false }}
                    emptyLabel="No historical data yet."
                    maxHeight={200}
                    scrollToBottom
                />
            </CollapsibleSection>

            <CollapsibleSection title="10-Year Excess Return Forecast" defaultOpen={true}>
                <DataGrid
                    tableId="intrinsic_bank_forecast"
                    data={data?.forecast ?? []}
                    columns={bankForecastColumns}
                    headerTooltips={BANK_COLUMN_DESCRIPTIONS}
                    defaultVisibility={{ bank_f_rate: false, bank_f_factor: false }}
                    emptyLabel="No forecast yet."
                    maxHeight={250}
                />
            </CollapsibleSection>
        </>
    )
}



export default function IntrinsicValueTab({ state }) {
    const {
        ticker,
        model, setModel,
        activeModel, setBankResult,
        bankResult,
        discountMode, setDiscountMode,
        discount, setDiscount,
        terminalGrowth, setTerminalGrowth,
        fcfMethod, setFcfMethod,
        fcfMargin, setFcfMargin,
        growth5yr, setGrowth5yr,
        growth15yr, setGrowth15yr,
        result, loading, error,
        dilutionCagr,
        setDilutionCagr,

    } = state


    const [release, setRelease] = useState(null)
    const [releaseLoading, setReleaseLoading] = useState(false)
    const [growthSource, setGrowthSource] = useState(null)

    useEffect(() => {
        if (!ticker) { setRelease(null); return }
        let cancelled = false
        setReleaseLoading(true)
        setGrowthSource(null)
        fetch(apiUrl(`/api/tickers/${ticker}/earnings-release`))
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (!cancelled) setRelease(d) })
            .catch(() => { if (!cancelled) setRelease(null) })
            .finally(() => { if (!cancelled) setReleaseLoading(false) })
        return () => { cancelled = true }
    }, [ticker])

    function applyReleaseGrowth(value, provenance) {

        setGrowth5yr(Math.round(value * 100) / 100)
        setGrowthSource(provenance)
    }

    // Grid column ids that differ from the concept field keys.
    const headerTooltips = useMemo(() => {
        const resolved = result?.resolved_concepts || {}
        const alias = {
            basic_shares: 'shares_basic_wtd',
            diluted_shares: 'shares_diluted_wtd',
            antidilutive_shares: 'antidilutive_securities',
            projected_revenue: 'revenue',
            projected_ocf: 'ocf',
            projected_capex: 'capex',
        }
        const conceptOf = {}
        for (const key of ALL_FIELD_KEYS) if (resolved[key]) conceptOf[key] = resolved[key]
        for (const [col, key] of Object.entries(alias)) if (resolved[key]) conceptOf[col] = resolved[key]

        const map = {}
        for (const id of new Set([...Object.keys(COLUMN_DESCRIPTIONS), ...Object.keys(conceptOf)])) {
            const lines = []
            if (COLUMN_DESCRIPTIONS[id]) lines.push(COLUMN_DESCRIPTIONS[id])
            if (conceptOf[id]) lines.push(`Source concept: ${conceptOf[id]}`)
            map[id] = lines.join('\n')
        }
        return map
    }, [result])

    if (!ticker) return null

    // What the backend actually ran wins when the choice is "auto".
    const view = activeModel

    const modelToggle = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Model:</span>
            <label>
                <input type="radio" checked={view === 'dcf'} onChange={() => setModel?.('dcf')} /> DCF
            </label>
            <label>
                <input type="radio" checked={view === 'excess_return'} onChange={() => setModel?.('excess_return')} /> Excess return
            </label>
            <span style={{ color: 'var(--menu-text-muted)' }}>
                {view === 'excess_return'
                    ? '— values bank equity directly: tangible book + PV of (ROTCE − cost of equity) × book'
                    : '— free cash flow to the firm, discounted at WACC'}
            </span>
        </div>
    )

    if (view === 'excess_return') {
        const bankKpis = bankResult?.kpis
        const lastBankRow = bankResult?.payload?.at(-1)

        const releaseSection = (
            <CollapsibleSection title="Latest Earnings Release" defaultOpen={true}>
                {bankKpis && (
                    <div style={{ fontSize: 12, color: 'var(--menu-text-muted)', marginBottom: 6 }}>
                        Model: TBV/share {formatCurrency(bankKpis.tbvps)} · latest annual ROTCE {formatPercent(lastBankRow?.rotce)} · starting ROTCE {formatPercent(bankKpis.roe_start)}
                    </div>
                )}
                {releaseLoading
                    ? <div style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>Loading release…</div>
                    : <ReleaseReferencePanel ticker={ticker} release={release} reference />}
            </CollapsibleSection>
        )

        return (
            <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                {modelToggle}
                <ExcessReturnView
                    ticker={ticker}
                    conceptOverrides={state.conceptOverrides}
                    onResult={setBankResult}
                    beforeTables={releaseSection}
                />
            </div>
        )
    }


    const kpis = result?.kpis
    const payloadRows = result?.payload ?? []
    const quarterlyRows = result?.quarterly_payload ?? []
    const historicalRows = [
        ...(result?.payload ?? []),
        ...(result?.quarterly_payload ?? []),
    ].sort((a, b) => new Date(a.end) - new Date(b.end))

    const shareRows = result?.share_payload ?? []
    const forecastRows = result?.forecast ?? []
    const sliderFcfMargin = fcfMargin ?? kpis?.effective_fcf_margin ?? FALLBACK_FCF_MARGIN
    const sliderGrowth5yr = growth5yr ?? kpis?.growth_5yr ?? DEFAULT_GROWTH_5YR
    const sliderGrowth15yr = growth15yr ?? kpis?.growth_15yr ?? DEFAULT_GROWTH_15YR
    const effectiveDiscount = kpis?.effective_discount ?? discount
    const terminalTooHigh = terminalGrowth >= effectiveDiscount
    const historicalDefaultVisibility =
        fcfMethod === 'ocf'
            ? {
                end: false,
                nopat: false,
                tax_rate: false,
                depreciation: false,
                working_capital_change: false,
                fcf_gap: false,
                fcf_base: false,
                fcf_detailed: false,
                roic: false,
            }
            : {}

    const forecastDefaultVisibility =
        fcfMethod === 'ocf'
            ? {
                forecast_roic: false,
                discount_rate: false,
                discount_factor: false,
                fcf_per_share: false,
                discounted_fcf: false,
            }
            : {}

    const shareDefaultVisibility =
        fcfMethod === 'ocf'
            ? {
                share_end: false,
            }
            : {}

    return (
        <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            {modelToggle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>FCF Methodology:</span>
                <label>
                    <input type="radio" checked={fcfMethod === 'nopat'} onChange={() => setFcfMethod('nopat')} /> NOPAT-based
                </label>
                <label>
                    <input type="radio" checked={fcfMethod === 'ocf'} onChange={() => setFcfMethod('ocf')} /> OCF-based
                </label>
                <span style={{ color: 'var(--menu-text-muted)' }}>
                    {fcfMethod === 'ocf'
                        ? '— uses reported OCF minus capex directly'
                        : '— NOPAT + D&A − capex − ΔWC, falls back to OCF-based when EBIT is unavailable'}
                </span>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Kpi label="Intrinsic Price" value={kpis ? formatCurrency(kpis.intrinsic_price) : '—'} />
                <Kpi label="Market Price" value={kpis ? formatCurrency(kpis.market_price) : '—'} />
                <Kpi label="Shares Outstanding" value={result ? formatCompact(result.shares_outstanding) : '—'} />
                <Kpi label="Enterprise Value" value={kpis ? formatUsdCompact(kpis.enterprise_value) : '—'} />
                <Kpi label="Equity Value" value={kpis ? formatUsdCompact(kpis.equity_value) : '—'} />
                <Kpi
                    label="Dilution CAGR"
                    value={kpis ? formatPercent(kpis.dilution_cagr) : '—'}
                />

                <Kpi
                    label="Forecast Shares"
                    value={kpis ? formatCompact(kpis.forecast_shares_final) : '—'}
                />
            </div>
            <SharesSourceBanner source={result?.shares_source} />

            {error && <div style={{ fontSize: 12, color: 'var(--menu-danger)' }}>{error}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ minWidth: 220 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>

                        <span>
                            Discount Rate

                        </span>
                        <PercentInput
                            value={effectiveDiscount}
                            onChange={setDiscount}
                            nullable={false}
                            disabled={discountMode === 'auto'}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 4 }}>
                        <label>
                            <input type="radio" checked={discountMode === 'auto'} onChange={() => setDiscountMode('auto')} /> Auto (WACC)
                        </label>
                        <label>
                            <input type="radio" checked={discountMode === 'manual'} onChange={() => setDiscountMode('manual')} /> Manual
                        </label>
                    </div>
                    <input
                        type="range" min={0.05} max={0.15} step={0.005}
                        value={Math.min(0.15, Math.max(0.05, discount))}
                        disabled={discountMode === 'auto'}
                        onChange={e => setDiscount(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>


                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>


                </div>
                <SliderField
                    label="5yr Revenue Growth"
                    value={sliderGrowth5yr}
                    onChange={v => { setGrowth5yr(v); setGrowthSource(null) }}
                    min={-0.5} max={5.0} step={0.05}
                >
                    {growthSource && (
                        <div style={{ fontSize: 11, color: 'var(--menu-text-muted)', marginTop: 2 }}>
                            from {growthSource.source}, 8-K {growthSource.filedAt}{' '}
                            <button
                                type="button"
                                onClick={() => { setGrowth5yr(null); setGrowthSource(null) }}
                                style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', padding: 0 }}
                            >
                                reset
                            </button>
                        </div>
                    )}
                </SliderField>



                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>


                </div>
                <SliderField
                    label="15yr Revenue Growth"
                    value={sliderGrowth15yr}
                    onChange={setGrowth15yr}
                    min={-0.2} max={2.0} step={0.02}
                />



                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>


                </div>
                <SliderField
                    label="Terminal Growth"
                    value={terminalGrowth}
                    onChange={setTerminalGrowth}
                    min={0.01} max={0.04} step={0.002}
                    nullable={false}
                >
                    {terminalTooHigh && (
                        <div style={{ fontSize: 11, color: '#d9a441' }}>
                            Terminal growth must be below the discount rate.
                        </div>
                    )}
                </SliderField>



                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>


                </div>
                <SliderField
                    label="FCF Margin"
                    value={sliderFcfMargin}
                    onChange={setFcfMargin}
                    min={-0.5} max={0.95} step={0.01}
                />


                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 2,
                    }}
                >


                    <span
                        style={{
                            color: 'var(--menu-text-muted)',
                        }}
                    >

                    </span>
                </div>

                <SliderField
                    label="Dilution CAGR"
                    value={dilutionCagr ?? kpis?.dilution_cagr ?? 0}
                    onChange={setDilutionCagr}
                    min={-0.05} max={0.15} step={0.001}
                    decimals={2}
                />

            </div>

            {loading && <div style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>Recomputing…</div>}

            <CollapsibleSection title="Latest Earnings Release" defaultOpen={true}>
                {releaseLoading
                    ? <div style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>Loading release…</div>
                    : <ReleaseReferencePanel
                        ticker={ticker}
                        release={release}
                        assumedGrowth={sliderGrowth5yr}
                        model={result}
                        onUse={applyReleaseGrowth}
                    />}
            </CollapsibleSection>

            <CollapsibleSection
                title="Share Dilution Historical Data"
                defaultOpen={false}
            >
                <DataGrid
                    tableId="intrinsic_share"
                    data={shareRows}
                    columns={shareColumns}
                    headerTooltips={headerTooltips}
                    defaultVisibility={shareDefaultVisibility}
                    emptyLabel="No historical share data available."
                    maxHeight={160}
                    scrollToBottom
                />
            </CollapsibleSection>

            <CollapsibleSection
                title="Historical Data"
                defaultOpen={true}
            >
                <DataGrid
                    tableId="intrinsic_historical"
                    data={historicalRows}
                    columns={payloadColumns}
                    headerTooltips={headerTooltips}
                    defaultVisibility={historicalDefaultVisibility}
                    emptyLabel="No historical data yet."
                    maxHeight={200}
                    scrollToBottom
                />
            </CollapsibleSection>

            <CollapsibleSection
                title="20-Year Forecast"
                defaultOpen={true}
            >
                <DataGrid
                    tableId="intrinsic_forecast"
                    data={forecastRows}
                    columns={forecastColumns}
                    headerTooltips={headerTooltips}
                    defaultVisibility={forecastDefaultVisibility}
                    emptyLabel="No forecast yet."
                    maxHeight={250}
                />
            </CollapsibleSection>
        </div>
    )
}