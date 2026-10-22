// useIntrinsicValueState.js - Custom React hook for managing intrinsic value state.
import { useEffect, useState } from 'react'


import { fetchJson } from '../utils/api'
import {
    ALL_FIELD_KEYS,
    DEFAULT_DISCOUNT,
    DEFAULT_TERMINAL_GROWTH,
} from '../constants/intrinsicValue'



export function useIntrinsicValueState(ticker, dynamicSeries, enabled = true) {
    const [model, setModelState] = useState('auto') // 'auto' | 'dcf' | 'excess_return'
    const [discountMode, setDiscountMode] = useState('auto')
    const [fcfMethod, setFcfMethodState] = useState('ocf') // 'nopat' or 'ocf'
    const [discount, setDiscount] = useState(DEFAULT_DISCOUNT)
    const [terminalGrowth, setTerminalGrowth] = useState(DEFAULT_TERMINAL_GROWTH)

    // User overrides. null == use the backend-derived value (kpis.*).
    const [fcfMargin, setFcfMargin] = useState(null)
    const [growth5yr, setGrowth5yr] = useState(null)
    const [growth15yr, setGrowth15yr] = useState(null)
    const [dilutionCagr, setDilutionCagr] = useState(null)

    // { [fieldKey]: explicitConceptName } -- only fields the user has
    // overridden away from auto-detect appear here.
    const [conceptOverrides, setConceptOverrides] = useState({})
    // { [statementValue]: [{value: "concept||unit", label}] } -- lazily
    // fetched and cached per statement the first time its toolbar group opens.
    const [groupOptions, setGroupOptions] = useState({})

    const [result, setResult] = useState(null)
    const [bankResult, setBankResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')


    function resetDerived() {
        setFcfMargin(null)
        setGrowth5yr(null)
        setGrowth15yr(null)
        setDilutionCagr(null)
    }

    // Reset everything when the ticker changes.
    useEffect(() => {
        setDiscountMode('auto')
        setDiscount(DEFAULT_DISCOUNT)
        setTerminalGrowth(DEFAULT_TERMINAL_GROWTH)
        setFcfMethodState('ocf')
        resetDerived()
        setConceptOverrides({})
        setGroupOptions({})
        setResult(null)
        setError('')
        setModelState('auto')
        setBankResult(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticker])

    function setFcfMethod(value) {
        setFcfMethodState(value)
        setFcfMargin(null)
    }

    function setModel(value) {
        setModelState(value)
        setResult(null)
    }

    function setConceptOverride(fieldKey, conceptNameOrEmpty) {
        setConceptOverrides(v => {
            const next = { ...v }
            if (conceptNameOrEmpty) next[fieldKey] = conceptNameOrEmpty
            else delete next[fieldKey]
            return next
        })
        resetDerived()
    }

    function ensureGroupOptions(statementValue) {
        if (!ticker || !statementValue || groupOptions[statementValue]) return
        fetchJson(`/api/statements/${ticker}?statement=${statementValue}`)
            .then(d => setGroupOptions(v => ({ ...v, [statementValue]: d.options || [] })))
            .catch(() => setGroupOptions(v => ({ ...v, [statementValue]: [] })))
    }

    // Debounced fetch on every slider / mode / concept-override change.
    useEffect(() => {
        if (!enabled || !ticker) return
        // The bank view fetches its own data, so don't duplicate the request.
        if (model === 'excess_return') return
        let cancelled = false

        const params = new URLSearchParams({
            model,                         // 'auto' lets the backend pick; 'dcf' forces the DCF
            discount: String(discount),
            discount_mode: discountMode,
            terminal_growth: String(terminalGrowth),
            fcf_method: fcfMethod,
        })
        if (fcfMargin != null) params.set('fcf_margin', String(fcfMargin))
        if (growth5yr != null) params.set('growth_5yr', String(growth5yr))
        if (growth15yr != null) params.set('growth_15yr', String(growth15yr))
        if (dilutionCagr != null) params.set('dilution_cagr', String(dilutionCagr))
        for (const key of ALL_FIELD_KEYS) {
            if (conceptOverrides[key]) params.set(`${key}_concept`, conceptOverrides[key])
        }

        const timer = setTimeout(() => {
            setLoading(true)
            setError('')
            fetchJson(`/api/tickers/${ticker}/intrinsic-value?${params.toString()}`)
                .then(data => {
                    if (!cancelled) setResult(data)
                })
                .catch(err => {
                    if (cancelled) return
                    setResult(null)
                    setError(err.message || 'Failed to load intrinsic value')
                })
                .finally(() => { if (!cancelled) setLoading(false) })
        }, 250)

        return () => { cancelled = true; clearTimeout(timer) }
    }, [
        enabled, ticker, model, discount, discountMode, terminalGrowth, fcfMethod,
        fcfMargin, growth5yr, growth15yr, dilutionCagr, conceptOverrides,
    ])

    const activeModel = model === 'auto'
        ? (result?.kpis?.model === 'excess_return' ? 'excess_return' : 'dcf')
        : model

    return {
        ticker,
        dynamicSeries,
        model, setModel,
        activeModel,
        bankResult, setBankResult,
        discountMode, setDiscountMode,
        discount, setDiscount,
        terminalGrowth, setTerminalGrowth,
        fcfMethod, setFcfMethod,
        fcfMargin, setFcfMargin,
        growth5yr, setGrowth5yr,
        growth15yr, setGrowth15yr,
        dilutionCagr, setDilutionCagr,
        conceptOverrides, setConceptOverride,
        groupOptions, ensureGroupOptions,
        result, loading, error,

    }
}