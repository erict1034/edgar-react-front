// App.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import Plot from 'react-plotly.js'
import Button from './components/Button'
import ColumnVisibilityMenu from './components/ColumnVisibilityMenu'
import DraggableHeader from './components/DraggableHeader'
import ChartToolbar from './components/ChartToolbar'
import IconToolbarButton from './components/IconToolbarButton'
import AppBar from './components/AppBar'
import {
  FileBarChart2,
  Share2,
  Scissors,
  Percent,
  Rows3,
  TrendingUp,
  DollarSign,
  Activity,
  CircleAlert,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import ConceptLegend from './components/ConceptLegend'
import { TERM_COLORS, STATEMENTS, COMPARISON_COLORS, SHARE_LINE_COLORS, MARGIN_COLORS, PER_SHARE_COLORS, INDEX_COLORS } from './constants'
import {
  priceHoverTemplate,
  compactHoverTemplateByPoint,
  compactValueWithTermCustomdata,
  compactValueWithSourceCustomdata,
  percentValueWithTermCustomdata,
  marginHoverTemplateByPoint,
  yoyHoverTemplateByPoint,
  splitHoverTemplate,
  perShareValueWithTermCustomdata,
  perShareHoverTemplateByPoint,
  amendmentHoverTemplate,
  amendmentCustomdata,
  formatSignedPercent,
} from './utils/tooltips'
import { PLOT_CONFIG, PLOT_LAYOUT_INTERACTION } from './utils/plotInteraction'
import { STATEMENT_AXIS_LOCK } from './utils/statementChartInteraction'
import CompanyInfoPanel from './components/CompanyInfoPanel'
// imports
import IntrinsicValueTab, { IntrinsicValueToolbar } from './components/IntrinsicValueTab'
import { useIntrinsicValueState } from './hooks/useIntrinsicValueState'
import CodeMirror from '@uiw/react-codemirror'
import { sql, SQLite } from '@codemirror/lang-sql'

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

import {
  autocompletion,
  completionKeymap,
  acceptCompletion
} from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { apiUrl } from './utils/api'


function useClickOutside(onClose) {
  const ref = useRef(null)
  const cb = useRef(onClose)
  cb.current = onClose

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) cb.current()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return ref
}




function computeVisibleRanges(priceData, xStart, xEnd) {
  let priceMin = Infinity, priceMax = -Infinity
  let pctMin = Infinity, pctMax = -Infinity
  let firstClose = null

  for (const d of priceData) {
    const dt = new Date(d.date)
    if (xStart && dt < xStart) continue
    if (xEnd && dt > xEnd) continue

    if (firstClose === null) firstClose = d.close
    if (d.close < priceMin) priceMin = d.close
    if (d.close > priceMax) priceMax = d.close

    const pct = (d.close / firstClose - 1) * 100
    if (pct < pctMin) pctMin = pct
    if (pct > pctMax) pctMax = pct
  }

  if (firstClose === null) return null
  const pricePad = (priceMax - priceMin) * 0.05 || 1
  const pctPad = (pctMax - pctMin) * 0.05 || 1
  return {
    priceRange: [priceMin - pricePad, priceMax + pricePad],
    pctRange: [pctMin - pctPad, pctMax + pctPad],
    firstClose,
  }
}

function computeVisibleConceptRanges(rows, comparisonTraces, marginTraces, shareTraces, perShareTraces, amendmentRows, xStart, xEnd) {
  let yMin = Infinity, yMax = -Infinity
  rows.forEach(r => {
    if (r.value == null) return
    const dt = new Date(r.period_end)
    if (xStart && dt < xStart) return
    if (xEnd && dt > xEnd) return
    if (r.value < yMin) yMin = r.value
    if (r.value > yMax) yMax = r.value
  })

  amendmentRows?.forEach(a => {
    if (a.amended_value == null) return
    const dt = new Date(a.period_end)
    if (xStart && dt < xStart) return
    if (xEnd && dt > xEnd) return
    if (a.amended_value < yMin) yMin = a.amended_value
    if (a.amended_value > yMax) yMax = a.amended_value
  })

  let y2Min = Infinity, y2Max = -Infinity
  shareTraces.forEach(trace => {
    trace.x.forEach((xVal, i) => {
      const dt = new Date(xVal)
      if (xStart && dt < xStart) return
      if (xEnd && dt > xEnd) return
      const y = trace.y[i]
      if (y == null) return
      if (y < y2Min) y2Min = y
      if (y > y2Max) y2Max = y
    })
  })

  let y3Min = Infinity, y3Max = -Infinity
  comparisonTraces.forEach(trace => {
    trace.x.forEach((xVal, i) => {
      const dt = new Date(xVal)
      if (xStart && dt < xStart) return
      if (xEnd && dt > xEnd) return
      const y = trace.y[i]
      if (y == null) return
      if (y < y3Min) y3Min = y
      if (y > y3Max) y3Max = y
    })
  })

  let y4Min = Infinity, y4Max = -Infinity
  marginTraces.forEach(trace => {
    trace.x.forEach((xVal, i) => {
      const dt = new Date(xVal)
      if (xStart && dt < xStart) return
      if (xEnd && dt > xEnd) return
      const y = trace.y[i]
      if (y == null) return
      if (y < y4Min) y4Min = y
      if (y > y4Max) y4Max = y
    })
  })

  let y5Min = Infinity, y5Max = -Infinity
  perShareTraces.forEach(trace => {
    trace.x.forEach((xVal, i) => {
      const dt = new Date(xVal)
      if (xStart && dt < xStart) return
      if (xEnd && dt > xEnd) return
      const y = trace.y[i]
      if (y == null) return
      if (y < y5Min) y5Min = y
      if (y > y5Max) y5Max = y
    })
  })

  // Force 0 into range for any axis that has data, so the zero line
  // is always visible regardless of how far the visible window is
  // zoomed away from it.
  if (yMin !== Infinity) { yMin = Math.min(yMin, 0); yMax = Math.max(yMax, 0) }
  if (y2Min !== Infinity) { y2Min = Math.min(y2Min, 0); y2Max = Math.max(y2Max, 0) }
  if (y3Min !== Infinity) { y3Min = Math.min(y3Min, 0); y3Max = Math.max(y3Max, 0) }
  if (y4Min !== Infinity) { y4Min = Math.min(y4Min, 0); y4Max = Math.max(y4Max, 0) }
  if (y5Min !== Infinity) { y5Min = Math.min(y5Min, 0); y5Max = Math.max(y5Max, 0) }

  const yRange = yMin !== Infinity
    ? [yMin - (yMax - yMin) * 0.1 || -1, yMax + (yMax - yMin) * 0.1 || 1]
    : null
  const y2Range = y2Min !== Infinity
    ? [y2Min - (y2Max - y2Min) * 0.1 || -1, y2Max + (y2Max - y2Min) * 0.1 || 1]
    : null
  const y3Range = y3Min !== Infinity
    ? [y3Min - (y3Max - y3Min) * 0.1 || -1, y3Max + (y3Max - y3Min) * 0.1 || 1]
    : null
  const y4Range = y4Min !== Infinity
    ? [y4Min - (y4Max - y4Min) * 0.1 || -1, y4Max + (y4Max - y4Min) * 0.1 || 1]
    : null
  const y5Range = y5Min !== Infinity
    ? [y5Min - (y5Max - y5Min) * 0.1 || -1, y5Max + (y5Max - y5Min) * 0.1 || 1]
    : null

  return { yRange, y2Range, y3Range, y4Range, y5Range }
}


function getConceptMaxDate(conceptSeries, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendmentRows) {
  let maxDate = null
  conceptSeries
    ?.filter(r => visibleTerms[r.term] && r.period_end)
    .forEach(r => {
      const d = new Date(r.period_end)
      if (!maxDate || d > maxDate) maxDate = d
    })
  comparisonTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!maxDate || d > maxDate) maxDate = d
    })
  })
  marginTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!maxDate || d > maxDate) maxDate = d
    })
  })
  perShareTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!maxDate || d > maxDate) maxDate = d
    })
  })
  amendmentRows?.forEach(a => {
    if (!a.period_end) return
    const d = new Date(a.period_end)
    if (!maxDate || d > maxDate) maxDate = d
  })
  return maxDate
}

function monthsBack(endDate, months) {
  const d = new Date(endDate)
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function yearsBack(endDate, years) {
  const d = new Date(endDate)
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function fetchJson(url, options) {
  return fetch(apiUrl(url), options).then(r => {
    if (!r.ok) throw new Error(`Request failed (${r.status})`)
    return r.json()
  })
}

function padDateRangeEnd(range, fraction = 0.12) {
  if (!range) return range
  const [startStr, endStr] = range
  const start = new Date(startStr)
  const end = new Date(endStr)
  const spanMs = end - start
  const paddedEnd = new Date(end.getTime() + spanMs * fraction)
  return [startStr, paddedEnd.toISOString().slice(0, 10)]
}

function ytdStart(endDate) {
  return `${new Date(endDate).getFullYear()}-01-01`
}

function formatMonthYear(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatRefreshTimestamp(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTickerOption(ticker, lastRunAt) {
  const refreshedAt = formatRefreshTimestamp(lastRunAt)
  return refreshedAt ? `${ticker} - ${refreshedAt}` : ticker
}

function getConceptMinDate(conceptSeries, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendmentRows) {
  let minDate = null
  conceptSeries
    ?.filter(r => visibleTerms[r.term] && r.period_end)
    .forEach(r => {
      const d = new Date(r.period_end)
      if (!minDate || d < minDate) minDate = d
    })
  comparisonTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!minDate || d < minDate) minDate = d
    })
  })
  marginTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!minDate || d < minDate) minDate = d
    })
  })
  perShareTraces.forEach(t => {
    t.x.forEach(xVal => {
      const d = new Date(xVal)
      if (!minDate || d < minDate) minDate = d
    })
  })
  amendmentRows?.forEach(a => {
    if (!a.period_end) return
    const d = new Date(a.period_end)
    if (!minDate || d < minDate) minDate = d
  })
  return minDate
}

function rollingMean(values, window) {
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / window
  })
}

function nearestValue(rows, targetDateStr) {
  const target = new Date(targetDateStr).getTime()
  let best = null, bestDiff = Infinity
  for (const r of rows) {
    const diff = Math.abs(new Date(r.period_end).getTime() - target)
    if (diff < bestDiff) { bestDiff = diff; best = r }
  }
  return best ? best.value : null
}

function computeYoY(rows, terms) {
  const filtered = rows.filter(r => terms.includes(r.term) && r.value != null)
  const byTerm = {}
  filtered.forEach(r => { (byTerm[r.term] ??= []).push(r) })

  const out = []
  Object.values(byTerm).forEach(group => {
    const sorted = [...group].sort((a, b) => a.period_end.localeCompare(b.period_end))
    sorted.forEach(r => {
      const target = new Date(r.period_end)
      target.setFullYear(target.getFullYear() - 1)
      let best = null, bestDiff = Infinity
      sorted.forEach(p => {
        const diff = Math.abs(new Date(p.period_end).getTime() - target.getTime())
        if (diff < bestDiff) { bestDiff = diff; best = p }
      })
      const toleranceMs = 20 * 24 * 3600 * 1000
      if (best && bestDiff <= toleranceMs && best.value !== 0) {
        out.push({ period_end: r.period_end, term: r.term, yoy_pct: (r.value - best.value) / Math.abs(best.value) * 100 })
      }
    })
  })
  return out.sort((a, b) => a.period_end.localeCompare(b.period_end))
}

// ── Margin computation ───────────────────────────────────────────────────────
// Joins numerator and denominator rows by (term, period_end) and returns
// { period_end, term, value } where value = (num / denom) * 100
function computeMarginSeries(numRows, denomRows, terms) {
  const filtered = (rows) => rows.filter(r => terms.includes(r.term) && r.value != null)
  const numFiltered = filtered(numRows)
  const denomFiltered = filtered(denomRows)

  // Index denominator by "term|period_end" for O(1) lookup
  const denomIndex = {}
  denomFiltered.forEach(r => { denomIndex[`${r.term}|${r.period_end}`] = r.value })

  const out = []
  numFiltered.forEach(r => {
    const denom = denomIndex[`${r.term}|${r.period_end}`]
    if (denom == null || denom === 0) return
    out.push({ period_end: r.period_end, term: r.term, value: (r.value / denom) * 100 })
  })
  return out.sort((a, b) => a.period_end.localeCompare(b.period_end))
}

// Joins numerator and denominator rows by (term, period_end) and returns
// { period_end, term, value } where value = num / denom (a per-share $ amount, not a %)
function computePerShareSeries(numRows, denomRows, terms) {
  const filtered = (rows) => rows.filter(r => terms.includes(r.term) && r.value != null)
  const numFiltered = filtered(numRows)
  const denomFiltered = filtered(denomRows)

  const denomIndex = {}
  denomFiltered.forEach(r => { denomIndex[`${r.term}|${r.period_end}`] = r.value })

  const out = []
  numFiltered.forEach(r => {
    const denom = denomIndex[`${r.term}|${r.period_end}`]
    if (denom == null || denom === 0) return
    out.push({ period_end: r.period_end, term: r.term, value: r.value / denom })
  })
  return out.sort((a, b) => a.period_end.localeCompare(b.period_end))
}


function formatCompactNumber(v) {
  if (v == null) return ''
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

function formatPct(v) {
  if (v == null) return ''
  return `${v.toFixed(1)}%`
}

function formatPrice(v) {
  if (v == null) return ''
  return `$${v.toFixed(2)}`
}

function lastPointLabelsWithPct(prices, pctValues) {
  let lastIdx = -1
  prices.forEach((v, i) => { if (v != null) lastIdx = i })
  return prices.map((v, i) =>
    i === lastIdx ? `${formatPrice(v)} (${formatSignedPercent(pctValues[i])})` : ''
  )
}

function formatPerShare(v) {
  if (v == null) return ''
  return `$${v.toFixed(2)}`
}

// Returns a text array the same length as `values`, blank everywhere except
// the last non-null entry, which gets the formatted label. Used to show a
// single end-of-line value label per trace instead of labeling every point.
function lastPointLabels(values, formatter) {
  let lastIdx = -1
  values.forEach((v, i) => { if (v != null) lastIdx = i })
  return values.map((v, i) => (i === lastIdx ? formatter(v) : ''))
}

const columnHelper = createColumnHelper()

// Stable ID for a margin selection
function marginId(numeratorValue, denominatorValue) {
  return `${numeratorValue}|||${denominatorValue}`
}

function perShareId(numeratorValue, denominatorConcept) {
  return `${numeratorValue}|||${denominatorConcept}`
}

const VIEW_OPTIONS = [
  { value: 'price', label: 'Price Chart' },
  { value: 'concept', label: 'Financial Chart' },
  { value: 'intrinsic', label: 'Intrinsic Value' },
  { value: 'browser', label: 'SQL' },

]

function readChartTheme() {
  const style = getComputedStyle(document.documentElement)
  const v = (name, fallback) => style.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--bg', '#ffffff'),
    border: v('--border', '#e5e4e7'),
    text: v('--text', '#6b6375'),
    textH: v('--text-h', '#08060d'),
    line: v('--chart-line', '#ffffff'),
    ma50: v('--chart-ma50', '#59cf22'),
    ma200: v('--chart-ma200', '#8d05fc'),
    split: v('--chart-split', '#F4A442'),
    amendment: v('--chart-amendment', '#e07b39'),
    amendmentBorder: v('--chart-amendment-border', '#ffffff'),
    gridStrong: v('--chart-grid-strong', '#322f2f'),
    gridFaint: v('--chart-grid-faint', '#141212'),
    gridXAxis: v('--chart-grid-xaxis', '#080808'),
    tick: v('--chart-tick', '#736b6b'),
  }
}

function App() {
  const [tickers, setTickers] = useState([])
  const [tickerRefreshTimes, setTickerRefreshTimes] = useState({})
  const [ticker, setTicker] = useState('')
  const [priceData, setPriceData] = useState(null)

  const [chartTheme, setChartTheme] = useState(readChartTheme)

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const updateChartTheme = () => setChartTheme(readChartTheme())
    colorScheme.addEventListener('change', updateChartTheme)
    return () => colorScheme.removeEventListener('change', updateChartTheme)
  }, [])

  const [priceXRange, setPriceXRange] = useState(null)
  const [priceRangeLabel, setPriceRangeLabel] = useState('All')

  // inside the App() function body, alongside your other state — the hook
  // needs to run every render regardless of which tab is active, so pass
  // `view === 'intrinsic'` as the enabled flag to stop it fetching in the
  // background while you're on another tab


  const [priceYRange, setPriceYRange] = useState(null)
  const [pctYRange, setPctYRange] = useState(null)
  const [priceZoomVersion, setPriceZoomVersion] = useState(0)

  const [view, setView] = useState('price')
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const viewMenuRef = useClickOutside(() => setViewMenuOpen(false))

  const [statement, setStatement] = useState('')
  const [conceptOptions, setConceptOptions] = useState([])
  const [selectedConcept, setSelectedConcept] = useState('')
  const [conceptSeries, setConceptSeries] = useState(null)
  const [loadedConceptKey, setLoadedConceptKey] = useState('')
  const [amendmentData, setAmendmentData] = useState([])
  const [pickerMenuOpen, setPickerMenuOpen] = useState(false)
  const [conceptSearch, setConceptSearch] = useState('')

  const [visibleTerms, setVisibleTerms] = useState({ Q1: true, Q2: true, Q3: true, Q4: true, FY: true })
  const [showMA50, setShowMA50] = useState(true)
  const [showMA200, setShowMA200] = useState(true)
  const [termMenuOpen, setTermMenuOpen] = useState(false)
  const [maMenuOpen, setMaMenuOpen] = useState(false)
  const [pctReferenceClose, setPctReferenceClose] = useState(null)

  const [companyInfo, setCompanyInfo] = useState(null)
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false)
  const companyInfoRef = useClickOutside(() => setCompanyInfoOpen(false))

  // ── Index comparison state ──────────────────────────────────────────────
  const [indexOptions, setIndexOptions] = useState([])          // [{symbol, label}]
  const [indexMenuOpen, setIndexMenuOpen] = useState(false)
  const [checkedIndices, setCheckedIndices] = useState({})      // { '^GSPC': true }
  const [indexData, setIndexData] = useState({})                // { '^GSPC': [{date, close}] }
  const indexRef = useClickOutside(() => setIndexMenuOpen(false))

  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [checkedShareLines, setCheckedShareLines] = useState({})
  const [shareLineData, setShareLineData] = useState({})
  const [dynamicSeries, setDynamicSeries] = useState([])
  const intrinsicState = useIntrinsicValueState(ticker, dynamicSeries, view === 'intrinsic')
  const [splitMenuOpen, setSplitMenuOpen] = useState(false)
  const [chkStockSplit, setChkStockSplit] = useState(false)
  const [chkPendingSplit, setChkPendingSplit] = useState(false)
  const [splitsData, setSplitsData] = useState([])

  const [comparisonMenuOpen, setComparisonMenuOpen] = useState(false)
  const [comparisonStatement, setComparisonStatement] = useState('')
  const [comparisonSearch, setComparisonSearch] = useState('')
  const [comparisonOptions, setComparisonOptions] = useState([])
  const [comparisonSelections, setComparisonSelections] = useState({})
  const [comparisonRawSeries, setComparisonRawSeries] = useState({})

  // ── Margin state ─────────────────────────────────────────────────────────
  const [marginMenuOpen, setMarginMenuOpen] = useState(false)
  const [marginStatement, setMarginStatement] = useState('')
  const [marginSearch, setMarginSearch] = useState('')       // filters both num + denom pickers
  const [marginOptions, setMarginOptions] = useState([])    // concept options for current marginStatement
  // pending = the in-progress pair the user is building before adding
  const [pendingNumerator, setPendingNumerator] = useState('')
  const [pendingDenominator, setPendingDenominator] = useState('')
  // added selections: { [id]: { numeratorValue, denominatorValue, annual, qtr, checked, label } }
  const [marginSelections, setMarginSelections] = useState({})
  // raw series cache shared between numerator + denominator concepts (same key format as comparisonRawSeries)
  const [marginRawSeries, setMarginRawSeries] = useState({})

  const marginRef = useClickOutside(() => setMarginMenuOpen(false))


  // ── Per-Share state ──────────────────────────────────────────────────────
  const [perShareMenuOpen, setPerShareMenuOpen] = useState(false)
  const [perShareStatement, setPerShareStatement] = useState('')  // filters numerator picker
  const [perShareSearch, setPerShareSearch] = useState('')
  const [perShareOptions, setPerShareOptions] = useState([])      // numerator concept options
  const [pendingPerShareNumerator, setPendingPerShareNumerator] = useState('')
  const [pendingPerShareDenominator, setPendingPerShareDenominator] = useState('')  // a dynamicSeries.concept
  // selections: { [id]: { numeratorValue, denominatorConcept, label, annual, qtr, checked } }
  const [perShareSelections, setPerShareSelections] = useState({})
  // numerator raw series cache, keyed by concept||unit (same shape as comparisonRawSeries/marginRawSeries)
  const [perShareNumeratorRawSeries, setPerShareNumeratorRawSeries] = useState({})
  // denominator raw series cache, keyed by concept only (shares unit is implicit)
  const [perShareDenomRawSeries, setPerShareDenomRawSeries] = useState({})

  const perShareRef = useClickOutside(() => setPerShareMenuOpen(false))


  useEffect(() => {
    if (!perShareStatement || !ticker) { setPerShareOptions([]); return }
    let cancelled = false
    fetchJson(`/api/statements/${ticker}?statement=${perShareStatement}`)
      .then(d => { if (!cancelled) setPerShareOptions(d.options) })
      .catch(() => { if (!cancelled) setPerShareOptions([]) })
    return () => { cancelled = true }
  }, [perShareStatement, ticker])

  function ensurePerShareNumeratorSeries(value) {
    if (!value || perShareNumeratorRawSeries[value]) return
    const requestTicker = ticker
    const [concept, unit] = value.split('||')
    fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=${unit}`)
      .then(data => {
        if (requestTicker !== ticker) return
        setPerShareNumeratorRawSeries(v => ({ ...v, [value]: data }))
      })
      .catch(() => { })
  }

  function ensurePerShareDenomSeries(concept) {
    if (!concept || perShareDenomRawSeries[concept]) return
    const requestTicker = ticker
    fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=shares`)
      .then(data => {
        if (requestTicker !== ticker) return
        setPerShareDenomRawSeries(v => ({ ...v, [concept]: data }))
      })
      .catch(() => { })
  }

  function addPerSharePair() {
    if (!pendingPerShareNumerator || !pendingPerShareDenominator) return
    const id = perShareId(pendingPerShareNumerator, pendingPerShareDenominator)
    if (perShareSelections[id]) return

    const numMeta = perShareOptions.find(o => o.value === pendingPerShareNumerator)
    const denomMeta = dynamicSeries.find(s => s.concept === pendingPerShareDenominator)
    const numLabel = numMeta ? numMeta.label.split(' [')[0] : pendingPerShareNumerator.split('||')[0]
    const denomLabel = denomMeta ? denomMeta.alias : pendingPerShareDenominator

    setPerShareSelections(v => ({
      ...v,
      [id]: {
        numeratorValue: pendingPerShareNumerator,
        denominatorConcept: pendingPerShareDenominator,
        label: `${numLabel} / ${denomLabel}`,
        annual: true,
        qtr: false,
        checked: true,
      },
    }))
    ensurePerShareNumeratorSeries(pendingPerShareNumerator)
    ensurePerShareDenomSeries(pendingPerShareDenominator)
    setPendingPerShareNumerator('')
    setPendingPerShareDenominator('')
  }

  function removePerSharePair(id) {
    setPerShareSelections(v => {
      const next = { ...v }
      delete next[id]
      return next
    })
  }

  function setPerShareAnnual(id, checked) {
    setPerShareSelections(v => ({ ...v, [id]: { ...v[id], annual: checked } }))
  }

  function setPerShareQtr(id, checked) {
    setPerShareSelections(v => ({ ...v, [id]: { ...v[id], qtr: checked } }))
  }


  // Fetch margin concept options when statement changes
  useEffect(() => {
    if (!marginStatement || !ticker) { setMarginOptions([]); return }
    let cancelled = false
    fetchJson(`/api/statements/${ticker}?statement=${marginStatement}`)
      .then(d => { if (!cancelled) setMarginOptions(d.options) })
      .catch(() => { if (!cancelled) setMarginOptions([]) })
    return () => { cancelled = true }
  }, [marginStatement, ticker])

  // Fetch series for a concept|unit value if not already cached
  function ensureMarginSeries(value) {
    if (!value || marginRawSeries[value]) return
    const requestTicker = ticker
    const [concept, unit] = value.split('||')
    fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=${unit}`)
      .then(data => {
        if (requestTicker !== ticker) return
        setMarginRawSeries(v => ({ ...v, [value]: data }))
      })
      .catch(() => { })
  }

  function addMarginPair() {
    if (!pendingNumerator || !pendingDenominator) return
    const id = marginId(pendingNumerator, pendingDenominator)
    if (marginSelections[id]) return  // already added

    const numMeta = marginOptions.find(o => o.value === pendingNumerator)
    const denomMeta = marginOptions.find(o => o.value === pendingDenominator)
    const numLabel = numMeta ? numMeta.label.split(' [')[0] : pendingNumerator.split('||')[0]
    const denomLabel = denomMeta ? denomMeta.label.split(' [')[0] : pendingDenominator.split('||')[0]

    setMarginSelections(v => ({
      ...v,
      [id]: {
        numeratorValue: pendingNumerator,
        denominatorValue: pendingDenominator,
        label: `${numLabel} / ${denomLabel}`,
        annual: true,
        qtr: false,
        checked: true,
      },
    }))
    ensureMarginSeries(pendingNumerator)
    ensureMarginSeries(pendingDenominator)
    setPendingNumerator('')
    setPendingDenominator('')
  }

  function removeMarginPair(id) {
    setMarginSelections(v => {
      const next = { ...v }
      delete next[id]
      return next
    })
  }

  function setMarginAnnual(id, checked) {
    setMarginSelections(v => ({ ...v, [id]: { ...v[id], annual: checked } }))
  }

  function setMarginQtr(id, checked) {
    setMarginSelections(v => ({ ...v, [id]: { ...v[id], qtr: checked } }))
  }

  // ── Margin traces (useMemo) ───────────────────────────────────────────────
  const marginTraces = useMemo(() => {
    const traces = []
    const checked = Object.entries(marginSelections)
      .filter(([, s]) => s.checked)
      .sort(([a], [b]) => a.localeCompare(b))

    checked.forEach(([id, s], i) => {
      const color = MARGIN_COLORS[i % MARGIN_COLORS.length]
      const numRows = marginRawSeries[s.numeratorValue] || []
      const denomRows = marginRawSeries[s.denominatorValue] || []

      if (s.annual) {
        const pts = computeMarginSeries(numRows, denomRows, ['FY'])
        traces.push({
          x: pts.map(r => r.period_end),
          y: pts.map(r => r.value),
          type: 'scatter', mode: 'lines+markers+text',
          name: `${s.label} FY`,
          yaxis: 'y4',
          line: { width: 2, color },
          marker: { size: 4, color },
          text: lastPointLabels(pts.map(r => r.value), formatPct),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: percentValueWithTermCustomdata(pts, 'value'),
          hovertemplate: marginHoverTemplateByPoint(ticker),
        })
      }
      if (s.qtr) {
        const pts = computeMarginSeries(numRows, denomRows, ['Q1', 'Q2', 'Q3', 'Q4'])
        traces.push({
          x: pts.map(r => r.period_end),
          y: pts.map(r => r.value),
          type: 'scatter', mode: 'lines+markers+text',
          name: `${s.label} Qtr`,
          yaxis: 'y4',
          line: { width: 2, dash: 'dot', color },
          marker: { size: 4, color },
          text: lastPointLabels(pts.map(r => r.value), formatPct),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: percentValueWithTermCustomdata(pts, 'value'),
          hovertemplate: marginHoverTemplateByPoint(ticker),
        })
      }
    })
    return traces
  }, [marginSelections, marginRawSeries])


  const perShareTraces = useMemo(() => {
    const traces = []
    const checked = Object.entries(perShareSelections)
      .filter(([, s]) => s.checked)
      .sort(([a], [b]) => a.localeCompare(b))

    checked.forEach(([id, s], i) => {
      const color = PER_SHARE_COLORS[i % PER_SHARE_COLORS.length]
      const numRows = perShareNumeratorRawSeries[s.numeratorValue] || []
      const denomRows = perShareDenomRawSeries[s.denominatorConcept] || []

      if (s.annual) {
        const pts = computePerShareSeries(numRows, denomRows, ['FY'])
        traces.push({
          x: pts.map(r => r.period_end),
          y: pts.map(r => r.value),
          type: 'scatter', mode: 'lines+markers+text',
          name: `${s.label} FY`,
          yaxis: 'y5',
          line: { width: 2, color },
          marker: { size: 4, color },
          text: lastPointLabels(pts.map(r => r.value), formatPerShare),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: perShareValueWithTermCustomdata(pts, 'value'),
          hovertemplate: perShareHoverTemplateByPoint(ticker),
        })
      }
      if (s.qtr) {
        const pts = computePerShareSeries(numRows, denomRows, ['Q1', 'Q2', 'Q3', 'Q4'])
        traces.push({
          x: pts.map(r => r.period_end),
          y: pts.map(r => r.value),
          type: 'scatter', mode: 'lines+markers+text',
          name: `${s.label} Qtr`,
          yaxis: 'y5',
          line: { width: 2, dash: 'dot', color },
          marker: { size: 4, color },
          text: lastPointLabels(pts.map(r => r.value), formatPerShare),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: perShareValueWithTermCustomdata(pts, 'value'),
          hovertemplate: perShareHoverTemplateByPoint(ticker),
        })
      }
    })
    return traces
  }, [perShareSelections, perShareNumeratorRawSeries, perShareDenomRawSeries])

  const indexTraces = useMemo(() => {
    if (!priceData?.length) return []
    const xStart = priceXRange ? new Date(priceXRange[0]) : new Date(priceData[0].date)

    return Object.entries(checkedIndices)
      .filter(([, checked]) => checked)
      .map(([symbol], i) => {
        const rows = (indexData[symbol] || []).filter(d => new Date(d.date) >= xStart)
        if (!rows.length) return null
        const anchor = rows[0].close
        const meta = indexOptions.find(o => o.symbol === symbol)
        const color = INDEX_COLORS[i % INDEX_COLORS.length]
        const pctVals = rows.map(r => (r.close / anchor - 1) * 100)
        return {
          x: rows.map(r => r.date),
          y: pctVals,
          customdata: rows.map(r => r.close),
          type: 'scatter',
          mode: 'lines+text',
          yaxis: 'y3',
          name: meta?.label || symbol,
          line: { color, width: 1.5, dash: 'dash' },
          text: lastPointLabels(pctVals, formatSignedPercent),
          textposition: 'middle right',
          textfont: { size: 10, color },
          hovertemplate:
            `${meta?.label || symbol}: %{y:.2f}%` +
            `<br>Index: %{customdata:,.2f}` +
            `<br>%{x}` +
            `<extra></extra>`,
        }
      })
      .filter(Boolean)
  }, [checkedIndices, indexData, indexOptions, priceXRange, priceData])

  function widenPctRangeForIndices(pctRange, xStart, xEnd) {
    let [pctMin, pctMax] = pctRange
    Object.entries(checkedIndices)
      .filter(([, checked]) => checked)
      .forEach(([symbol]) => {
        const rows = (indexData[symbol] || []).filter(d => {
          const dt = new Date(d.date)
          if (xStart && dt < xStart) return false
          if (xEnd && dt > xEnd) return false
          return true
        })
        if (!rows.length) return
        const anchor = rows[0].close
        rows.forEach(r => {
          const pct = (r.close / anchor - 1) * 100
          if (pct < pctMin) pctMin = pct
          if (pct > pctMax) pctMax = pct
        })
      })
    const pad = (pctMax - pctMin) * 0.05 || 1
    return [pctMin - pad, pctMax + pad]
  }

  const amendmentTrace = useMemo(() => {
    if (!amendmentData.length) return null
    return {
      x: amendmentData.map(a => a.period_end),
      y: amendmentData.map(a => a.amended_value),
      customdata: amendmentCustomdata(amendmentData),
      type: 'scatter',
      mode: 'markers',
      name: 'Amended (10-Q/A)',
      marker: { symbol: 'triangle-up', size: 10, color: chartTheme.amendment, line: { width: 1, color: chartTheme.amendmentBorder } },
      showlegend: false,
      hovertemplate: amendmentHoverTemplate(ticker),
    }
  }, [amendmentData, ticker, chartTheme])

  // ── Term bar + share-line traces (useMemo) ────────────────────────────────
  const conceptBarAndShareTraces = useMemo(() => {
    if (!conceptSeries) return []

    const unit = selectedConcept.split('||')[1]

    const barTraces = ['Q1', 'Q2', 'Q3', 'Q4', 'FY']
      .filter(term => visibleTerms[term])
      .map(term => {
        const rows = conceptSeries.filter(r => r.term === term)
        // 10-K comparatives are hatched; 10-Q comparatives get an outline.
        const isComparative = r => r.source === 'comparative'
        const isAnnualComparative = r => isComparative(r) && String(r.form || '').startsWith('10-K')
        const isQuarterlyComparative = r => isComparative(r) && !isAnnualComparative(r)
        const termColor = TERM_COLORS[term]
        return {
          x: rows.map(r => r.period_end), y: rows.map(r => r.value),
          type: 'bar', name: term, showlegend: false,
          marker: {
            opacity: rows.map(r => (isQuarterlyComparative(r) ? 0.25 : 0.85)),
            color: termColor,
            pattern: {
              shape: rows.map(r => (isAnnualComparative(r) ? '/' : '')),
              fgcolor: termColor,
              bgcolor: 'rgba(0,0,0,0)',
              size: 6,
              solidity: 0.5,
            },
            line: {
              color: rows.map(r => (isComparative(r) ? termColor : 'rgba(0,0,0,0)')),
              width: rows.map(r => (isQuarterlyComparative(r) ? 2 : isAnnualComparative(r) ? 1 : 0)),
            },
          },
          customdata: compactValueWithSourceCustomdata(rows, unit),
          hovertemplate: compactHoverTemplateByPoint(ticker),
        }
      })

    const shareTraces = Object.entries(checkedShareLines)
      .filter(([concept, checked]) => checked && shareLineData[concept]?.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([concept], i) => {
        const rows = shareLineData[concept] || []
        const meta = dynamicSeries.find(s => s.concept === concept)
        const color = SHARE_LINE_COLORS[i % SHARE_LINE_COLORS.length]
        return {
          x: rows.map(r => r.period_end),
          y: rows.map(r => r.value),
          type: 'scatter',
          mode: 'lines+markers+text',
          name: meta?.alias || concept,
          yaxis: 'y2',
          line: { width: 2, color },
          marker: { size: 4, color },
          text: lastPointLabels(rows.map(r => r.value), formatCompactNumber),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: compactValueWithTermCustomdata(rows, 'shares'),
          hovertemplate: compactHoverTemplateByPoint(ticker),
        }
      })

    return [...barTraces, ...shareTraces]
  }, [conceptSeries, visibleTerms, selectedConcept, checkedShareLines, shareLineData, dynamicSeries, ticker])

  // ── Split marker traces (useMemo) ──────────────────────────────────────────
  const splitMarkerTraces = useMemo(() => {
    const checkedConcepts = Object.entries(checkedShareLines).filter(([, c]) => c).map(([concept]) => concept)
    if (checkedConcepts.length === 0) return []

    const preferred = 'WeightedAverageNumberOfSharesOutstandingBasic'
    const anchorConcept = checkedConcepts.includes(preferred) ? preferred : checkedConcepts[0]
    const anchorRows = shareLineData[anchorConcept] || []
    if (anchorRows.length === 0) return []

    const completed = [], pending = []
    splitsData.forEach(s => {
      if (s.status === 'completed' && !chkStockSplit) return
      if (s.status === 'pending' && !chkPendingSplit) return
      const y = nearestValue(anchorRows, s.split_date)
      if (y == null) return
      const point = { x: s.split_date, y, ratio: s.split_ratio }
      if (s.status === 'completed') completed.push(point)
      else pending.push(point)
    })

    const traces = []
    if (completed.length) {
      traces.push({
        x: completed.map(p => p.x), y: completed.map(p => p.y),
        mode: 'markers+text', type: 'scatter', name: 'Stock split', yaxis: 'y2',
        marker: { symbol: 'triangle-up', size: 12, color: chartTheme.split, line: { width: 2, color: chartTheme.split } },
        text: completed.map(p => `${Math.round(p.ratio)}-for-1 split`),
        textposition: 'top center', textfont: { size: 11, color: chartTheme.split },
        hovertemplate: splitHoverTemplate(ticker),
        showlegend: false,
      })
    }
    if (pending.length) {
      traces.push({
        x: pending.map(p => p.x), y: pending.map(p => p.y),
        mode: 'markers+text', type: 'scatter', name: 'Pending split', yaxis: 'y2',
        marker: { symbol: 'triangle-up-open', size: 12, color: chartTheme.split, line: { width: 2, color: chartTheme.split } },
        text: pending.map(p => `${Math.round(p.ratio)}-for-1 (pending)`),
        textposition: 'top center', textfont: { size: 11, color: chartTheme.split },
        hovertemplate: splitHoverTemplate(ticker),
        showlegend: false,
      })
    }
    return traces
  }, [checkedShareLines, shareLineData, splitsData, chkStockSplit, chkPendingSplit, ticker, chartTheme])

  // ── Comparison traces (unchanged) ─────────────────────────────────────────
  const comparisonTraces = useMemo(() => {
    const traces = []
    const checked = Object.entries(comparisonSelections)
      .filter(([, s]) => s.checked)
      .sort(([a], [b]) => a.localeCompare(b))

    checked.forEach(([value, s], i) => {
      const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length]
      const rows = comparisonRawSeries[value] || []
      const meta = comparisonOptions.find(o => o.value === value)
      const label = meta ? meta.label.split(' [')[0] : value.split('||')[0]

      if (s.annual) {
        const yoy = computeYoY(rows, ['FY'])
        traces.push({
          x: yoy.map(r => r.period_end), y: yoy.map(r => r.yoy_pct),
          type: 'scatter', mode: 'lines+markers+text', name: `${label} FY YoY%`,
          yaxis: 'y3', line: { width: 2, color }, marker: { size: 4, color },
          text: lastPointLabels(yoy.map(r => r.yoy_pct), formatPct),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: percentValueWithTermCustomdata(yoy, 'yoy_pct'),
          hovertemplate: yoyHoverTemplateByPoint(ticker),
        })
      }
      if (s.qtr) {
        const yoy = computeYoY(rows, ['Q1', 'Q2', 'Q3', 'Q4'])
        traces.push({
          x: yoy.map(r => r.period_end), y: yoy.map(r => r.yoy_pct),
          type: 'scatter', mode: 'lines+markers+text', name: `${label} Qtr YoY%`,
          yaxis: 'y3', line: { width: 2, dash: 'dot', color }, marker: { size: 4, color },
          text: lastPointLabels(yoy.map(r => r.yoy_pct), formatPct),
          textposition: 'middle right',
          textfont: { size: 10, color },
          showlegend: false,
          customdata: percentValueWithTermCustomdata(yoy, 'yoy_pct'),
          hovertemplate: yoyHoverTemplateByPoint(ticker),
        })
      }
    })
    return traces
  }, [comparisonSelections, comparisonRawSeries, comparisonOptions])

  const defaultRanges = priceData ? computeVisibleRanges(priceData, null, null) : null
  const effectivePriceYRange = priceYRange || defaultRanges?.priceRange
  const effectivePctYRange = pctYRange || (defaultRanges ? widenPctRangeForIndices(defaultRanges.pctRange, null, null) : null)
  const effectivePctReference = pctReferenceClose ?? priceData?.[0]?.close

  // ── Price-chart label series (close + MA, as % from effectivePctReference) ──
  const closePctSeries = priceData ? priceData.map(d => (d.close / effectivePctReference - 1) * 100) : []
  const ma50Series = priceData ? rollingMean(priceData.map(d => d.close), 50) : []
  const ma50PctSeries = ma50Series.map(v => v != null ? (v / effectivePctReference - 1) * 100 : null)
  const ma200Series = priceData ? rollingMean(priceData.map(d => d.close), 200) : []
  const ma200PctSeries = ma200Series.map(v => v != null ? (v / effectivePctReference - 1) * 100 : null)

  const [conceptRange, setConceptRange] = useState({ x: null, y: null, y2: null, y3: null, y4: null, y5: null })
  const [conceptRangeLabel, setConceptRangeLabel] = useState('All')
  const [conceptZoomVersion, setConceptZoomVersion] = useState(0)

  const activeShareLines = Object.entries(checkedShareLines)
    .filter(([k, c]) => c && shareLineData[k]?.length)
    .map(([k]) => `${k}:${shareLineData[k].length}`)
    .sort()
    .join(',')

  const activeComparisons = Object.entries(comparisonSelections)
    .filter(([, s]) => s.checked)
    .map(([k, s]) => `${k}:${s.annual ? 1 : 0}:${s.qtr ? 1 : 0}:${comparisonRawSeries[k]?.length || 0}`)
    .sort()
    .join(',')

  const activeMargins = Object.entries(marginSelections)
    .filter(([, s]) => s.checked)
    .map(([id, s]) => `${id}:${s.annual ? 1 : 0}:${s.qtr ? 1 : 0}:${(marginRawSeries[s.numeratorValue]?.length || 0)}:${(marginRawSeries[s.denominatorValue]?.length || 0)}`)
    .sort()
    .join(',')

  const activePerShare = Object.entries(perShareSelections)
    .filter(([, s]) => s.checked)
    .map(([id, s]) => `${id}:${s.annual ? 1 : 0}:${s.qtr ? 1 : 0}:${(perShareNumeratorRawSeries[s.numeratorValue]?.length || 0)}:${(perShareDenomRawSeries[s.denominatorConcept]?.length || 0)}`)
    .sort()
    .join(',')

  const activeTerms = Object.entries(visibleTerms)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
    .join(',')

  const activeSplits = `${chkStockSplit ? 1 : 0}:${chkPendingSplit ? 1 : 0}`

  const activeAmendments = amendmentData.length
  const conceptUiRevision = `concept-${ticker}-${selectedConcept}-${activeShareLines}-${activeComparisons}-${activeMargins}-${activePerShare}-${activeTerms}-${activeSplits}-${activeAmendments}`

  const visibleConceptRows = conceptSeries
    ? conceptSeries.filter(r => visibleTerms[r.term])
    : []
  const shareTracesForRange = conceptBarAndShareTraces.filter(t => t.yaxis === 'y2')
  const defaultConceptRanges = conceptSeries
    ? computeVisibleConceptRanges(visibleConceptRows, comparisonTraces, marginTraces, shareTracesForRange, perShareTraces, amendmentData, null, null)
    : null
  const effectiveConceptYRange = conceptRange.y || defaultConceptRanges?.yRange
  //console.log('conceptSeries[0]:', conceptSeries?.[0]?.concept, 'defaultConceptRanges:', defaultConceptRanges, 'effectiveConceptYRange:', effectiveConceptYRange, 'conceptRange:', conceptRange)
  const effectiveConceptY2Range = conceptRange.y2 || defaultConceptRanges?.y2Range
  const effectiveConceptY3Range = conceptRange.y3 || defaultConceptRanges?.y3Range
  const effectiveConceptY4Range = conceptRange.y4 || defaultConceptRanges?.y4Range
  const effectiveConceptY5Range = conceptRange.y5 || defaultConceptRanges?.y5Range

  const conceptMaxDate = getConceptMaxDate(conceptSeries, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendmentData)
  const conceptMinDate = getConceptMinDate(conceptSeries, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendmentData)

  const defaultConceptXRange = conceptMinDate && conceptMaxDate
    ? [conceptMinDate.toISOString().slice(0, 10), conceptMaxDate.toISOString().slice(0, 10)]
    : null
  const effectiveConceptXRange = conceptRange.x || defaultConceptXRange

  const conceptRangeButtons = conceptMaxDate ? [
    { label: '1Y', start: yearsBack(conceptMaxDate, 1) },
    { label: 'YTD', start: ytdStart(conceptMaxDate) },
    { label: '3Y', start: yearsBack(conceptMaxDate, 3) },
    { label: '5Y', start: yearsBack(conceptMaxDate, 5) },
    { label: '10Y', start: yearsBack(conceptMaxDate, 10) },
    { label: 'All', start: conceptMinDate?.toISOString().slice(0, 10) },
  ] : []

  const rangeSummaryStart = conceptRange.x?.[0] || conceptMinDate?.toISOString().slice(0, 10)
  const rangeSummaryEnd = conceptRange.x?.[1] || conceptMaxDate?.toISOString().slice(0, 10)
  const rangeSummaryText = rangeSummaryStart && rangeSummaryEnd
    ? `${formatMonthYear(rangeSummaryStart)} – ${formatMonthYear(rangeSummaryEnd)}`
    : null

  const priceMaxDate = priceData?.length ? new Date(priceData[priceData.length - 1].date) : null
  const priceMinDate = priceData?.length ? new Date(priceData[0].date) : null

  const defaultPriceXRange = priceMinDate && priceMaxDate
    ? [priceMinDate.toISOString().slice(0, 10), priceMaxDate.toISOString().slice(0, 10)]
    : null
  const effectivePriceXRange = priceXRange || defaultPriceXRange

  const priceRangeButtons = priceMaxDate ? [
    { label: '1M', start: monthsBack(priceMaxDate, 1) },
    { label: '3M', start: monthsBack(priceMaxDate, 3) },
    { label: '6M', start: monthsBack(priceMaxDate, 6) },
    { label: 'YTD', start: ytdStart(priceMaxDate) },
    { label: '1Y', start: yearsBack(priceMaxDate, 1) },
    { label: '3Y', start: yearsBack(priceMaxDate, 3) },
    { label: '5Y', start: yearsBack(priceMaxDate, 5) },
    { label: '10Y', start: yearsBack(priceMaxDate, 10) },
    { label: 'All', start: priceMinDate?.toISOString().slice(0, 10) },
  ] : []

  const priceRangeSummaryStart = priceXRange?.[0] || priceMinDate?.toISOString().slice(0, 10)
  const priceRangeSummaryEnd = priceXRange?.[1] || priceMaxDate?.toISOString().slice(0, 10)
  const priceRangeSummaryText = priceRangeSummaryStart && priceRangeSummaryEnd
    ? `${formatMonthYear(priceRangeSummaryStart)} – ${formatMonthYear(priceRangeSummaryEnd)}`
    : null

  const [pullStatus, setPullStatus] = useState(null)
  const [pullJobId, setPullJobId] = useState(null)
  const [newTickerInput, setNewTickerInput] = useState('')

  const pickerRef = useClickOutside(() => setPickerMenuOpen(false))
  const maRef = useClickOutside(() => setMaMenuOpen(false))
  const shareRef = useClickOutside(() => setShareMenuOpen(false))
  const splitRef = useClickOutside(() => setSplitMenuOpen(false))
  const comparisonRef = useClickOutside(() => setComparisonMenuOpen(false))
  const termRef = useClickOutside(() => setTermMenuOpen(false))

  const relayoutTimer = useRef(null)

  function clearRelayoutTimer() {
    if (relayoutTimer.current) {
      clearTimeout(relayoutTimer.current)
      relayoutTimer.current = null
    }
  }

  useEffect(() => {
    return () => clearRelayoutTimer()
  }, [])

  // Cancel any in-flight debounced zoom recompute when the underlying
  // dataset changes out from under it (new concept or new ticker) —
  // otherwise a stale timer can fire and stomp state for the wrong dataset.
  useEffect(() => {
    clearRelayoutTimer()
  }, [selectedConcept, ticker])

  function handlePriceRelayout(eventData) {
    if (!priceData || priceData.length === 0) return
    const touchesXAxis = Object.keys(eventData).some(k => k.startsWith('xaxis'))
    if (!touchesXAxis) return

    if (eventData['xaxis.autorange']) {
      setPriceRangeLabel('All')
      if (priceMinDate) {
        selectPriceRange(priceMinDate.toISOString().slice(0, 10))
      } else {
        setPriceZoomVersion(v => v + 1)
        setPriceXRange(null)
        setPriceYRange(null)
        setPctYRange(null)
        setPctReferenceClose(null)
      }
      return
    }

    let xStart, xEnd
    if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
      xStart = new Date(eventData['xaxis.range[0]'])
      xEnd = new Date(eventData['xaxis.range[1]'])
    } else if (eventData['xaxis.range']) {
      xStart = new Date(eventData['xaxis.range'][0])
      xEnd = new Date(eventData['xaxis.range'][1])
    } else {
      return
    }

    const ranges = computeVisibleRanges(priceData, xStart, xEnd)
    if (!ranges) return
    setPriceZoomVersion(v => v + 1)
    setPriceXRange([xStart.toISOString().slice(0, 10), xEnd.toISOString().slice(0, 10)])
    setPriceYRange(ranges.priceRange)
    setPctYRange(widenPctRangeForIndices(ranges.pctRange, xStart, xEnd))
    setPctReferenceClose(ranges.firstClose)
  }

  function handleConceptRelayout(eventData) {
    if (!conceptSeries || conceptSeries.length === 0) return
    const touchesXAxis = Object.keys(eventData).some(k => k.startsWith('xaxis'))
    if (!touchesXAxis) return

    if (eventData['xaxis.autorange']) {
      setConceptRangeLabel('All')
      if (conceptMinDate) {
        selectConceptRange(conceptMinDate.toISOString().slice(0, 10))
      } else {
        clearRelayoutTimer()
        setConceptZoomVersion(v => v + 1)
        setConceptRange({ x: null, y: null, y2: null, y3: null, y4: null, y5: null })
      }
      return
    }

    let xStart, xEnd
    if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
      xStart = new Date(eventData['xaxis.range[0]'])
      xEnd = new Date(eventData['xaxis.range[1]'])
    } else if (eventData['xaxis.range']) {
      xStart = new Date(eventData['xaxis.range'][0])
      xEnd = new Date(eventData['xaxis.range'][1])
    } else {
      return
    }

    if (relayoutTimer.current) clearTimeout(relayoutTimer.current)

    relayoutTimer.current = setTimeout(() => {
      const visibleRows = conceptSeries.filter(r => visibleTerms[r.term])
      const shareTracesForRange = conceptBarAndShareTraces.filter(t => t.yaxis === 'y2')
      const ranges = computeVisibleConceptRanges(visibleRows, comparisonTraces, marginTraces, shareTracesForRange, perShareTraces, amendmentData, xStart, xEnd)
      if (!ranges) return
      setConceptZoomVersion(v => v + 1)
      setConceptRange({
        x: [xStart.toISOString().slice(0, 10), xEnd.toISOString().slice(0, 10)],
        y: ranges.yRange, y2: ranges.y2Range, y3: ranges.y3Range, y4: ranges.y4Range, y5: ranges.y5Range,
      })
    }, 120)
  }

  function selectConceptRange(startDate) {
    clearRelayoutTimer()
    setConceptZoomVersion(v => v + 1)
    const endDate = conceptMaxDate.toISOString().slice(0, 10)
    const xStart = new Date(startDate)
    const xEnd = new Date(endDate)
    const visibleRows = conceptSeries.filter(r => visibleTerms[r.term])
    const shareTracesForRange = conceptBarAndShareTraces.filter(t => t.yaxis === 'y2')
    const ranges = computeVisibleConceptRanges(visibleRows, comparisonTraces, marginTraces, shareTracesForRange, perShareTraces, amendmentData, xStart, xEnd)
    setConceptRange({ x: [startDate, endDate], y: ranges?.yRange ?? null, y2: ranges?.y2Range ?? null, y3: ranges?.y3Range ?? null, y4: ranges?.y4Range ?? null, y5: ranges?.y5Range ?? null })
  }

  function selectPriceRange(startDate) {
    if (!priceMaxDate) return
    setPriceZoomVersion(v => v + 1)
    const endDate = priceMaxDate.toISOString().slice(0, 10)
    const xStart = new Date(startDate)
    const xEnd = new Date(endDate)
    const ranges = computeVisibleRanges(priceData, xStart, xEnd)
    setPriceXRange([startDate, endDate])
    if (ranges) {
      setPriceYRange(ranges.priceRange)
      setPctYRange(widenPctRangeForIndices(ranges.pctRange, xStart, xEnd))
      setPctReferenceClose(ranges.firstClose)
    }
  }

  function resetPriceZoom() {
    const activeRange = priceRangeButtons.find(b => b.label === priceRangeLabel)
    if (activeRange?.start) {
      selectPriceRange(activeRange.start)
    } else {
      // fallback — only if priceRangeLabel somehow doesn't match any button
      setPriceRangeLabel('All')
      setPriceZoomVersion(v => v + 1)
      setPriceXRange(null)
      setPriceYRange(null)
      setPctYRange(null)
      setPctReferenceClose(null)
    }
  }

  function toggleIndex(symbol) {
    const nowChecked = !checkedIndices[symbol]
    setCheckedIndices(v => ({ ...v, [symbol]: nowChecked }))
    if (nowChecked && !indexData[symbol]) {
      fetchJson(`/api/indices/price?symbol=${encodeURIComponent(symbol)}`)
        .then(data => setIndexData(v => ({ ...v, [symbol]: data })))
        .catch(() => { })
    }
  }

  function toggleShareLine(concept) {
    const nowChecked = !checkedShareLines[concept]
    const requestTicker = ticker
    setCheckedShareLines(v => ({ ...v, [concept]: nowChecked }))

    if (nowChecked && !shareLineData[concept]) {
      fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=shares`)
        .then(data => {
          if (requestTicker !== ticker) return
          const cleaned = data
            .filter(r => r.value != null)
            .sort((a, b) => a.period_end.localeCompare(b.period_end))
          setShareLineData(v => ({ ...v, [concept]: cleaned }))
        })
        .catch(() => { })
    }
  }

  function toggleComparison(value) {
    const prior = comparisonSelections[value] || { checked: false, annual: true, qtr: false }
    const nowChecked = !prior.checked
    const requestTicker = ticker
    setComparisonSelections(v => ({ ...v, [value]: { ...prior, checked: nowChecked } }))

    if (nowChecked && !comparisonRawSeries[value]) {
      const [concept, unit] = value.split('||')
      fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=${unit}`)
        .then(data => {
          if (requestTicker !== ticker) return
          setComparisonRawSeries(v => ({ ...v, [value]: data }))
        })
        .catch(() => { })
    }
  }

  function setComparisonAnnual(value, checked) {
    setComparisonSelections(v => ({ ...v, [value]: { ...v[value], annual: checked } }))
  }

  function setComparisonQtr(value, checked) {
    setComparisonSelections(v => ({ ...v, [value]: { ...v[value], qtr: checked } }))
  }

  function startPull() {
    const target = newTickerInput.trim().toUpperCase() || ticker
    if (!target) return

    setPullStatus({ status: 'pending' })
    fetchJson(`/api/pull/${target}`, { method: 'POST' })
      .then(d => setPullJobId(d.job_id))
      .catch(() => setPullStatus({ status: 'failed', error: 'Request failed to start' }))
  }

  useEffect(() => {
    if (!pullJobId) return

    const interval = setInterval(() => {
      fetchJson(`/api/pull/jobs/${pullJobId}`)
        .then(job => {
          setPullStatus(job)
          if (job.status === 'succeeded' || job.status === 'failed') {
            clearInterval(interval)
            setPullJobId(null)
            if (job.status === 'succeeded') {
              fetchJson('/api/tickers')
                .then(d => {
                  setTickers(d.tickers)
                  setTickerRefreshTimes(d.last_run_at ?? {})
                })
                .catch(() => { setTickers([]); setTickerRefreshTimes({}) })
              setNewTickerInput('')
              setTicker(job.ticker)
            }
          }
        })
        .catch(() => {
          clearInterval(interval)
          setPullJobId(null)
          setPullStatus({ status: 'failed', error: 'Lost connection to job status' })
        })
    }, 2000)

    return () => clearInterval(interval)
  }, [pullJobId])

  useEffect(() => {
    fetchJson('/api/tickers')
      .then(d => {
        setTickers(d.tickers)
        setTickerRefreshTimes(d.last_run_at ?? {})
      })
      .catch(() => { setTickers([]); setTickerRefreshTimes({}) })
  }, [])

  useEffect(() => {
    fetchJson('/api/indices')
      .then(d => setIndexOptions(d.options))
      .catch(() => setIndexOptions([]))
  }, [])

  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    fetchJson(`/api/tickers/${ticker}`)
      .then(d => {
        if (cancelled) return
        setPriceData(d.price)
        setDynamicSeries(d.dynamic_series)
        setSplitsData(d.splits)
        setPriceYRange(null)
        setPctYRange(null)
        setPctReferenceClose(null)
        setPriceRangeLabel('All')
        setConceptRange({ x: null, y: null, y2: null, y3: null, y4: null, y5: null })
      })
      .catch(() => {
        if (cancelled) return
        setPriceData(null)
        setDynamicSeries([])
        setSplitsData([])
      })

    fetchJson(`/api/tickers/${ticker}/info`)
      .then(d => { if (!cancelled) setCompanyInfo(d) })
      .catch(() => { if (!cancelled) setCompanyInfo(null) })

    // Reset concept picker
    setStatement('')
    setSelectedConcept('')
    setConceptSeries(null)
    setLoadedConceptKey('')
    setAmendmentData([])
    setPickerMenuOpen(false)
    setConceptSearch('')

    // Reset term bars + moving averages to defaults
    setVisibleTerms({ Q1: true, Q2: true, Q3: true, Q4: true, FY: true })
    setTermMenuOpen(false)
    setShowMA50(true)
    setShowMA200(true)
    setMaMenuOpen(false)

    // Reset index comparison state
    setCheckedIndices({})
    setIndexMenuOpen(false)

    // Reset share lines
    setCheckedShareLines({})
    setShareLineData({})
    setShareMenuOpen(false)

    // Reset split markers
    setChkStockSplit(false)
    setChkPendingSplit(false)
    setSplitMenuOpen(false)

    // Reset comparison (YoY) state on ticker change
    setComparisonMenuOpen(false)
    setComparisonStatement('')
    setComparisonSearch('')
    setComparisonOptions([])
    setComparisonSelections({})
    setComparisonRawSeries({})

    // Reset margin state on ticker change
    setMarginMenuOpen(false)
    setMarginStatement('')
    setMarginSearch('')
    setMarginOptions([])
    setMarginSelections({})
    setMarginRawSeries({})
    setPendingNumerator('')
    setPendingDenominator('')

    // Reset per-share state on ticker change
    setPerShareMenuOpen(false)
    setPerShareStatement('')
    setPerShareSearch('')
    setPerShareOptions([])
    setPerShareSelections({})
    setPerShareNumeratorRawSeries({})
    setPerShareDenomRawSeries({})
    setPendingPerShareNumerator('')
    setPendingPerShareDenominator('')

    setCompanyInfoOpen(false)

    return () => { cancelled = true }
  }, [ticker])

  // ── Data Browser (generic table/sql view) state and fetch ──────────────────
  const [browserTables, setBrowserTables] = useState([])
  const [browserTable, setBrowserTable] = useState('')
  const selectedBrowserTableMeta = browserTables.find(t => t.name === browserTable)
  const browserTableNeedsTicker = selectedBrowserTableMeta?.has_ticker ?? true
  const [browserColumnsMeta, setBrowserColumnsMeta] = useState([])
  const [browserFilterCol, setBrowserFilterCol] = useState('')
  const [browserFilterVal, setBrowserFilterVal] = useState('')
  const [browserFilterValDebounced, setBrowserFilterValDebounced] = useState('')
  const browserLimit = 100
  const [browserOffset, setBrowserOffset] = useState(0)
  const [browserColumns, setBrowserColumns] = useState([])
  const [browserRows, setBrowserRows] = useState([])
  const [browserTotal, setBrowserTotal] = useState(0)
  const [browserSql, setBrowserSql] = useState('')
  const [browserSchema, setBrowserSchema] = useState({})
  const [browserSqlExecuted, setBrowserSqlExecuted] = useState('')
  const [browserSqlError, setBrowserSqlError] = useState('')
  const [browserSqlMeta, setBrowserSqlMeta] = useState(null)
  const [browserSqlActive, setBrowserSqlActive] = useState(false)
  const [browserColumnVisibility, setBrowserColumnVisibility] = useState({})
  const [browserColumnOrder, setBrowserColumnOrder] = useState([])
  const [browserColumnMenuOpen, setBrowserColumnMenuOpen] = useState(false)
  const [browserCopyStatus, setBrowserCopyStatus] = useState('')
  const browserColumnRef = useClickOutside(() => setBrowserColumnMenuOpen(false))
  const [browserTableSorting, setBrowserTableSorting] = useState([])

  useEffect(() => {
    if (view !== 'browser') return
    const params = ticker ? `?ticker=${encodeURIComponent(ticker)}` : ''
    fetchJson(`/api/browser/tables${params}`)
      .then(data => setBrowserTables(data))
      .catch(() => setBrowserTables([]))
  }, [view, ticker])

  useEffect(() => {
    if (!browserTable) return
    let cancelled = false
    fetch(apiUrl(`/api/browser/tables/${browserTable}/columns`))
      .then(r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then(d => { if (!cancelled) setBrowserColumnsMeta(d.columns) })
      .catch(() => { if (!cancelled) setBrowserColumnsMeta([]) })
    setBrowserFilterCol('')
    setBrowserFilterVal('')
    setBrowserFilterValDebounced('')
    setBrowserOffset(0)
    return () => { cancelled = true }
  }, [browserTable])

  // Debounce the filter text so we don't fire a request on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setBrowserFilterValDebounced(browserFilterVal), 300)
    return () => clearTimeout(id)
  }, [browserFilterVal])

  // Re-page from the top whenever the active ticker changes
  useEffect(() => { setBrowserOffset(0) }, [ticker, browserTable])

  useEffect(() => {
    if (!browserTable || (browserTableNeedsTicker && !ticker) || browserSqlActive) {
      if (!ticker && !browserSqlActive && browserTableNeedsTicker) {
        setBrowserColumns([]); setBrowserRows([]); setBrowserTotal(0)
      }
      return
    }
    let cancelled = false
    const paramsObj = { limit: browserLimit, offset: browserOffset }
    if (browserTableNeedsTicker) paramsObj.ticker = ticker
    const params = new URLSearchParams(paramsObj)
    if (browserFilterCol && browserFilterValDebounced) {
      params.set('filter_col', browserFilterCol)
      params.set('filter_val', browserFilterValDebounced)
    }
    fetch(apiUrl(`/api/browser/tables/${browserTable}/rows?${params.toString()}`))
      .then(r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        setBrowserColumns(d.columns)
        setBrowserRows(d.rows)
        setBrowserTotal(d.total)
      })
      .catch(() => { if (!cancelled) { setBrowserColumns([]); setBrowserRows([]); setBrowserTotal(0) } })
    return () => { cancelled = true }
  }, [browserTable, ticker, browserLimit, browserOffset, browserFilterCol, browserFilterValDebounced, browserSqlActive, browserTableNeedsTicker])

  useEffect(() => {                                         // ← new
    if (view !== 'browser') return
    fetchJson('/api/browser/schema')
      .then(setBrowserSchema)
      .catch(() => setBrowserSchema({}))
  }, [view])


  const cmDarkTheme = EditorView.theme({
    '&': {
      backgroundColor: 'var(--menu-bg)',
      color: 'var(--menu-text)',
      border: '1px solid var(--menu-border)',
      borderRadius: '4px',
    },
    '.cm-scroller': {                          // ← add this
      backgroundColor: 'var(--menu-bg)',
      fontFamily: 'monospace',
    },
    '.cm-content': {
      backgroundColor: 'var(--menu-bg)',       // ← and this
      caretColor: 'var(--menu-text)',
      fontFamily: 'monospace',
      fontSize: '12px',
    },
    '.cm-line': {                              // ← and this
      backgroundColor: 'transparent',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--menu-text)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'var(--menu-hover)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--menu-bg)',
      color: 'var(--menu-text-muted)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'var(--menu-hover)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--menu-hover)' },
    '.cm-tooltip': {
      backgroundColor: 'var(--menu-bg)',
      border: '1px solid var(--menu-border)',
      color: 'var(--menu-text)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--menu-hover)',
      color: 'var(--menu-text)',
    },
  }, { dark: true })

  const cmSyntaxHighlight = syntaxHighlighting(HighlightStyle.define([
    { tag: t.keyword, color: '#c586c0', fontWeight: 'bold' },   // SELECT, FROM, WHERE...
    { tag: t.typeName, color: '#4ec9b0' },                       // types
    { tag: t.string, color: '#ce9178' },                         // 'literal'
    { tag: t.number, color: '#b5cea8' },
    { tag: t.comment, color: 'var(--menu-text-muted)', fontStyle: 'italic' },
    { tag: t.operator, color: 'var(--menu-text)' },
    { tag: t.punctuation, color: 'var(--menu-text-muted)' },
  ]))


  const sqlExtensions = useMemo(
    () => [
      sql({
        dialect: SQLite,
        schema: browserSchema,
        upperCaseKeywords: true
      }),

      autocompletion(),

      Prec.highest(
        keymap.of([
          { key: 'Tab', run: acceptCompletion },
          ...completionKeymap
        ])
      ),

      cmDarkTheme,
      cmSyntaxHighlight,

      keymap.of([
        {
          key: 'Ctrl-Enter',
          run: () => {
            runBrowserSql()
            return true
          }
        }
      ])
    ],
    [browserSchema]
  )



  function runBrowserSql(offset = 0, sqlToRun = browserSql.trim()) {
    const sql = sqlToRun.trim()
    if (!sql) return
    setBrowserSqlError('')
    fetch(apiUrl('/api/browser/query'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, limit: browserLimit, offset }),
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.detail || 'Query failed')
        return data
      })
      .then(data => {
        setBrowserSqlActive(true)
        setBrowserSqlExecuted(sql)
        setBrowserOffset(offset)
        setBrowserColumns(data.columns)
        setBrowserRows(data.rows)
        setBrowserSqlMeta({
          elapsed_ms: data.elapsed_ms,
          hasMore: data.has_more,
          rowCount: data.rows.length,
        })
      })
      .catch(e => setBrowserSqlError(e.message))
  }

  function clearBrowserSql() {
    setBrowserSqlActive(false)
    setBrowserSqlExecuted('')
    setBrowserSqlError('')
    setBrowserSqlMeta(null)
    setBrowserOffset(0)
  }

  function resetBrowserSql() {
    setBrowserSql('')
    clearBrowserSql()
  }

  const browserTableColumns = useMemo(
    () => browserColumns.map(c => columnHelper.accessor(c, {
      header: c,
      cell: info => info.getValue() ?? '—',
    })),
    [browserColumns]
  )

  // Reset visibility/order/sort whenever the set of columns actually changes (new table or SQL result)
  useEffect(() => {
    setBrowserColumnVisibility({})
    setBrowserColumnOrder(browserColumns)
    setBrowserTableSorting([])
  }, [browserColumns])

  const browserTableData = useMemo(
    () => browserRows.map(r => Object.fromEntries(browserColumns.map((c, i) => [c, r[i]]))),
    [browserRows, browserColumns]
  )

  const browserReactTable = useReactTable({
    data: browserTableData,
    columns: browserTableColumns,
    state: { columnVisibility: browserColumnVisibility, columnOrder: browserColumnOrder, sorting: browserTableSorting },
    onColumnVisibilityChange: setBrowserColumnVisibility,
    onColumnOrderChange: setBrowserColumnOrder,
    onSortingChange: setBrowserTableSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 60, size: 140 },
  })

  async function copyBrowserPage() {
    const columns = browserReactTable.getVisibleLeafColumns()
    const rows = browserReactTable.getRowModel().rows
    const toTsvValue = value => String(value ?? '').replace(/[\t\r\n]+/g, ' ')
    const tsv = [
      columns.map(column => toTsvValue(column.columnDef.header ?? column.id)).join('\t'),
      ...rows.map(row => row.getVisibleCells().map(cell => toTsvValue(cell.getValue())).join('\t')),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(tsv)
      setBrowserCopyStatus(`Copied ${rows.length} row${rows.length === 1 ? '' : 's'}`)
    } catch {
      setBrowserCopyStatus('Copy failed')
    }
  }

  function handleBrowserColumnDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBrowserColumnOrder(order => {
      const oldIndex = order.indexOf(active.id)
      const newIndex = order.indexOf(over.id)
      return arrayMove(order, oldIndex, newIndex)
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (!statement || !ticker) { setConceptOptions([]); return }
    let cancelled = false
    fetchJson(`/api/statements/${ticker}?statement=${statement}`)
      .then(d => { if (!cancelled) setConceptOptions(d.options) })
      .catch(() => { if (!cancelled) setConceptOptions([]) })
    setSelectedConcept('')
    return () => { cancelled = true }
  }, [statement, ticker])

  useEffect(() => {
    if (!selectedConcept || !ticker) return
    let cancelled = false
    const [concept, unit] = selectedConcept.split('||')

    Promise.all([
      fetchJson(`/api/tickers/${ticker}/concept-series?concept=${concept}&unit=${unit}`),
      fetch(apiUrl(`/api/tickers/${ticker}/amendments?concept=${concept}&unit=${unit}`))
        .then(r => (r.status === 404 ? [] : r.json()))
        .catch(() => []),
    ]).then(([data, amendments]) => {
      if (cancelled) return

      const visibleRows = data.filter(r => visibleTerms[r.term])
      const shareTracesForRange = conceptBarAndShareTraces.filter(t => t.yaxis === 'y2')
      const ranges = computeVisibleConceptRanges(visibleRows, comparisonTraces, marginTraces, shareTracesForRange, perShareTraces, amendments, null, null)

      const minDate = getConceptMinDate(data, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendments)
      const maxDate = getConceptMaxDate(data, comparisonTraces, marginTraces, perShareTraces, visibleTerms, amendments)

      setAmendmentData(amendments)
      setConceptSeries(data)
      setConceptRange({
        x: minDate && maxDate ? [minDate.toISOString().slice(0, 10), maxDate.toISOString().slice(0, 10)] : null,
        y: ranges?.yRange ?? null,
        y2: ranges?.y2Range ?? null,
        y3: ranges?.y3Range ?? null,
        y4: ranges?.y4Range ?? null,
        y5: ranges?.y5Range ?? null,
      })
      setLoadedConceptKey(selectedConcept)
    }).catch(() => {
      if (cancelled) return
      setAmendmentData([])
      setConceptSeries(null)
    })

    return () => { cancelled = true }
  }, [selectedConcept, ticker])

  useEffect(() => {
    if (!conceptSeries || loadedConceptKey !== selectedConcept) return
    const visibleRows = conceptSeries.filter(r => visibleTerms[r.term])
    const shareTracesForRange = conceptBarAndShareTraces.filter(t => t.yaxis === 'y2')
    const xStart = conceptRange.x ? new Date(conceptRange.x[0]) : null
    const xEnd = conceptRange.x ? new Date(conceptRange.x[1]) : null
    const ranges = computeVisibleConceptRanges(
      visibleRows, comparisonTraces, marginTraces, shareTracesForRange, perShareTraces,
      amendmentData, xStart, xEnd
    )
    if (ranges?.yRange) {
      setConceptRange(r => {
        // Bail out with the same reference if y hasn't actually changed —
        // otherwise this creates a new object every run, which re-triggers
        // this effect via the conceptRange dependency below (infinite loop).
        if (r.y && r.y[0] === ranges.yRange[0] && r.y[1] === ranges.yRange[1]) {
          return r
        }
        return { ...r, y: ranges.yRange }
      })
    }
  }, [amendmentData, conceptSeries, loadedConceptKey, selectedConcept, visibleTerms, comparisonTraces, marginTraces, conceptBarAndShareTraces, perShareTraces, conceptRange.x])

  useEffect(() => {
    if (!comparisonStatement || !ticker) { setComparisonOptions([]); return }
    let cancelled = false
    fetchJson(`/api/statements/${ticker}?statement=${comparisonStatement}`)
      .then(d => { if (!cancelled) setComparisonOptions(d.options) })
      .catch(() => { if (!cancelled) setComparisonOptions([]) })
    return () => { cancelled = true }
  }, [comparisonStatement, ticker])

  // ── Derived axis layout flags ─────────────────────────────────────────────
  const hasShareLines = Object.values(checkedShareLines).some(Boolean)
  const hasComparisons = comparisonTraces.length > 0
  const hasMargins = marginTraces.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar>


        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          style={{ height: 30, fontSize: 13 }}
        >
          <option value="">Select a ticker...</option>
          {tickers.map(t => (
            <option key={t} value={t}>{formatTickerOption(t, tickerRefreshTimes[t])}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="New ticker (e.g. NVDA)"
          title="Pulling a new ticker can take over two minutes. Select an existing ticker from the dropdown for instant results."
          value={newTickerInput}
          onChange={e => setNewTickerInput(e.target.value)}
          style={{ width: 110, height: 30, fontSize: 13, boxSizing: 'border-box' }}
        />
        {pullStatus?.status === 'failed' ? (
          <Button
            variant="danger"
            size="sm"
            leftIcon={<CircleAlert size={16} aria-hidden="true" />}
            aria-label={`Retry pull for ${pullStatus.ticker || newTickerInput.trim().toUpperCase() || ticker}`}
            title={`${pullStatus.ticker || newTickerInput.trim().toUpperCase() || ticker} pull failed: ${pullStatus.error || 'Check server logs'}`}
            onClick={startPull}
            style={{ width: 30, height: 30, padding: 0 }}
          />
        ) : (
          <Button
            variant="primary"
            size="sm"
            loading={pullStatus?.status === 'pending' || pullStatus?.status === 'running'}
            disabled={!ticker && !newTickerInput.trim()}
            onClick={startPull}
          >
            {pullStatus?.status === 'pending' || pullStatus?.status === 'running' ? 'Pulling…' : 'Pull Fresh Data'}
          </Button>
        )}

        {view === 'price' && ticker && (
          <ChartToolbar>
            {priceData && (
              <>
                <CompanyInfoPanel
                  companyInfo={companyInfo}
                  isOpen={companyInfoOpen}
                  innerRef={companyInfoRef}
                  onToggle={() => setCompanyInfoOpen(o => !o)}
                />
                <ChartToolbar.Divider />
                <IconToolbarButton
                  icon={Activity}
                  label="Moving Averages"
                  isActive={maMenuOpen}
                  innerRef={maRef}
                  onClick={() => setMaMenuOpen(o => !o)}
                >
                  {maMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                      border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                      color: 'var(--menu-text)',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <input type="checkbox" checked={showMA50} onChange={e => setShowMA50(e.target.checked)} style={{ flexShrink: 0 }} />
                        50-day MA
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={showMA200} onChange={e => setShowMA200(e.target.checked)} style={{ flexShrink: 0 }} />
                        200-day MA
                      </label>
                    </div>
                  )}
                </IconToolbarButton>
                <IconToolbarButton icon={TrendingUp} label="Compare Index" isActive={indexMenuOpen} innerRef={indexRef} onClick={() => setIndexMenuOpen(o => !o)}>
                  {indexMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                      border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                      color: 'var(--menu-text)',
                    }}>
                      {indexOptions.map(o => (
                        <label key={o.symbol} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <input type="checkbox" checked={!!checkedIndices[o.symbol]} onChange={() => toggleIndex(o.symbol)} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  )}
                </IconToolbarButton>
                <ChartToolbar.Divider />
                <select
                  aria-label="Price chart time period"
                  value={priceRangeLabel}
                  onChange={e => {
                    const range = priceRangeButtons.find(button => button.label === e.target.value)
                    if (!range) return
                    setPriceRangeLabel(range.label)
                    selectPriceRange(range.start)
                  }}
                  style={{
                    height: 26,
                    padding: '2px 6px',
                    fontSize: 12,
                    color: 'var(--menu-text)',
                    background: 'var(--menu-bg)',
                    border: '1px solid var(--menu-border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {priceRangeButtons.map(button => (
                    <option key={button.label} value={button.label}>{button.label}</option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={resetPriceZoom}>
                  Reset Zoom
                </Button>
                {priceRangeSummaryText && (
                  <span style={{ fontSize: 11, color: 'var(--menu-text-muted)', margin: 6, whiteSpace: 'nowrap' }}>
                    {priceRangeSummaryText}
                  </span>
                )}
              </>
            )}
          </ChartToolbar>
        )}

        {view === 'concept' && ticker && (
          <ChartToolbar>
            <IconToolbarButton
              icon={FileBarChart2}
              label={selectedConcept ? conceptOptions.find(o => o.value === selectedConcept)?.label?.split(' [')[0] || 'Line Item' : 'Statement / Line Item'}
              isActive={pickerMenuOpen}
              innerRef={pickerRef}
              onClick={() => setPickerMenuOpen(o => !o)}
            >
              {pickerMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                  border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30, color: 'var(--menu-text)',
                  width: 320,
                }}>
                  <select
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                    style={{ width: '100%', marginBottom: 6 }}
                  >
                    {STATEMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  {statement && (
                    <>
                      <input
                        type="text" placeholder="Filter line items..." value={conceptSearch}
                        onChange={e => setConceptSearch(e.target.value)}
                        style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                        autoFocus
                      />
                      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {conceptOptions
                          .filter(o => o.label.toLowerCase().includes(conceptSearch.toLowerCase()))
                          .map(o => (
                            <div
                              key={o.value}
                              onClick={() => { setSelectedConcept(o.value); setPickerMenuOpen(false); setConceptSearch('') }}
                              title={o.label}
                              style={{
                                padding: '5px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 3,
                                background: selectedConcept === o.value ? 'var(--menu-hover)' : 'transparent',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}
                            >
                              {o.label}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </IconToolbarButton>

            {dynamicSeries.length > 0 && (
              <>
                <ChartToolbar.Divider />

                <IconToolbarButton
                  icon={Share2}
                  label="Share Lines"
                  isActive={shareMenuOpen}
                  innerRef={shareRef}
                  onClick={() => setShareMenuOpen(o => !o)}
                >
                  {shareMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                      border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                      color: 'var(--menu-text)',
                      maxHeight: 300, overflowY: 'auto', minWidth: 220,
                    }}>
                      {dynamicSeries.map(s => (
                        <label key={s.concept} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 13 }} title={s.alias}>
                          <input
                            type="checkbox"
                            checked={!!checkedShareLines[s.concept]}
                            onChange={() => toggleShareLine(s.concept)}
                            style={{ flexShrink: 0 }}
                          />
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {s.alias}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </IconToolbarButton>

                <IconToolbarButton
                  icon={Scissors}
                  label="Split Markers"
                  isActive={splitMenuOpen}
                  innerRef={splitRef}
                  onClick={() => setSplitMenuOpen(o => !o)}
                >
                  {splitMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                      border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                      color: 'var(--menu-text)',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <input type="checkbox" checked={chkStockSplit} onChange={e => setChkStockSplit(e.target.checked)} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                          Stock Split
                        </span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={chkPendingSplit} onChange={e => setChkPendingSplit(e.target.checked)} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                          Pending Split
                        </span>
                      </label>
                    </div>
                  )}
                </IconToolbarButton>
              </>
            )}

            <IconToolbarButton
              icon={Percent}
              label="Compare YoY %"
              isActive={comparisonMenuOpen}
              innerRef={comparisonRef}
              onClick={() => setComparisonMenuOpen(o => !o)}
            >
              {comparisonMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                  border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                  color: 'var(--menu-text)',
                  width: 300,
                }}>
                  <select value={comparisonStatement} onChange={e => setComparisonStatement(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
                    {STATEMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  {Object.entries(comparisonSelections).filter(([, s]) => s.checked).length > 0 && (
                    <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 6, borderBottom: '1px solid var(--menu-divider)', paddingBottom: 6 }}>
                      {Object.entries(comparisonSelections).filter(([, s]) => s.checked).map(([value, s]) => {
                        const meta = comparisonOptions.find(o => o.value === value)
                        const label = meta ? meta.label.split(' [')[0] : value.split('||')[0]
                        return (
                          <div key={value} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{label}</span>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 6 }}>
                              <input type="checkbox" checked={s.annual} onChange={e => setComparisonAnnual(value, e.target.checked)} style={{ flexShrink: 0 }} /> FY
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 6 }}>
                              <input type="checkbox" checked={s.qtr} onChange={e => setComparisonQtr(value, e.target.checked)} style={{ flexShrink: 0 }} /> Qtr
                            </label>
                            <Button
                              variant="danger"
                              size="sm"
                              aria-label={`Remove ${label}`}
                              onClick={() => toggleComparison(value)}
                              style={{ padding: '0 6px', fontWeight: 'bold' }}
                            >
                              ✕
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <input
                    type="text" placeholder="Filter concepts..." value={comparisonSearch}
                    onChange={e => setComparisonSearch(e.target.value)}
                    style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                  />
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {comparisonOptions
                      .filter(o => o.label.toLowerCase().includes(comparisonSearch.toLowerCase()))
                      .map(o => (
                        <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }} title={o.label}>
                          <input
                            type="checkbox"
                            checked={!!comparisonSelections[o.value]?.checked}
                            onChange={() => toggleComparison(o.value)}
                            style={{ flexShrink: 0 }}
                          />
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {o.label}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </IconToolbarButton>

            {/* ── Margin Lines button ───────────────────────────────── */}
            <IconToolbarButton
              icon={TrendingUp}
              label="Margin Lines"
              isActive={marginMenuOpen}
              innerRef={marginRef}
              onClick={() => setMarginMenuOpen(o => !o)}
            >
              {marginMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                  border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                  color: 'var(--menu-text)',
                  width: 340,
                }}>
                  {/* Statement filter — shared for both pickers */}
                  <select
                    value={marginStatement}
                    onChange={e => { setMarginStatement(e.target.value); setPendingNumerator(''); setPendingDenominator('') }}
                    style={{ width: '100%', marginBottom: 6 }}
                  >
                    {STATEMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  {/* Active pairs */}
                  {Object.entries(marginSelections).length > 0 && (
                    <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 6, borderBottom: '1px solid var(--menu-divider)', paddingBottom: 6 }}>
                      {Object.entries(marginSelections).map(([id, s], i) => {
                        const color = MARGIN_COLORS[i % MARGIN_COLORS.length]
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            {/* Color swatch */}
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }} title={s.label}>
                              {s.label}
                            </span>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 4, flexShrink: 0 }}>
                              <input type="checkbox" checked={s.annual} onChange={e => setMarginAnnual(id, e.target.checked)} style={{ flexShrink: 0 }} /> FY
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 4, flexShrink: 0 }}>
                              <input type="checkbox" checked={s.qtr} onChange={e => setMarginQtr(id, e.target.checked)} style={{ flexShrink: 0 }} /> Qtr
                            </label>
                            <Button
                              variant="danger"
                              size="sm"
                              aria-label={`Remove ${s.label}`}
                              onClick={() => removeMarginPair(id)}
                              style={{ padding: '0 6px', fontWeight: 'bold', flexShrink: 0 }}
                            >
                              ✕
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Pair builder — only shown when a statement is selected */}
                  {marginStatement && (
                    <>
                      <input
                        type="text"
                        placeholder="Filter concepts..."
                        value={marginSearch}
                        onChange={e => setMarginSearch(e.target.value)}
                        style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                      />

                      {/* Numerator picker */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3, fontWeight: 600 }}>Numerator</div>
                        <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--menu-input-border)', borderRadius: 3 }}>
                          {marginOptions
                            .filter(o => o.label.toLowerCase().includes(marginSearch.toLowerCase()))
                            .map(o => (
                              <div
                                key={o.value}
                                onClick={() => setPendingNumerator(o.value)}
                                title={o.label}
                                style={{
                                  padding: '4px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
                                  background: pendingNumerator === o.value ? 'var(--menu-hover)' : 'transparent',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}
                              >
                                {o.label}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Denominator picker */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3, fontWeight: 600 }}>Denominator</div>
                        <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--menu-input-border)', borderRadius: 3 }}>
                          {marginOptions
                            .filter(o => o.label.toLowerCase().includes(marginSearch.toLowerCase()))
                            .map(o => (
                              <div
                                key={o.value}
                                onClick={() => setPendingDenominator(o.value)}
                                title={o.label}
                                style={{
                                  padding: '4px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
                                  background: pendingDenominator === o.value ? 'var(--menu-hover-alt)' : 'transparent',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}
                              >
                                {o.label}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Preview + Add */}
                      {(pendingNumerator || pendingDenominator) && (
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontStyle: 'italic', minHeight: 16 }}>
                          {pendingNumerator
                            ? (marginOptions.find(o => o.value === pendingNumerator)?.label.split(' [')[0] || '…')
                            : '…'}
                          {' / '}
                          {pendingDenominator
                            ? (marginOptions.find(o => o.value === pendingDenominator)?.label.split(' [')[0] || '…')
                            : '…'}
                        </div>
                      )}


                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!pendingNumerator || !pendingDenominator}
                        onClick={addMarginPair}
                        style={{ width: '100%' }}
                      >
                        Add Margin Line
                      </Button>
                    </>
                  )}
                </div>
              )}
            </IconToolbarButton>

            {/* ── Per-Share Lines button ────────────────────────────── */}
            <IconToolbarButton
              icon={DollarSign}
              label="Per Share"
              isActive={perShareMenuOpen}
              innerRef={perShareRef}
              onClick={() => setPerShareMenuOpen(o => !o)}
            >
              {perShareMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                  border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                  color: 'var(--menu-text)',
                  width: 340,
                }}>
                  {/* Statement filter — for the numerator picker only */}
                  <select
                    value={perShareStatement}
                    onChange={e => { setPerShareStatement(e.target.value); setPendingPerShareNumerator(''); setPendingPerShareDenominator('') }}
                    style={{ width: '100%', marginBottom: 6 }}
                  >
                    {STATEMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  {/* Active pairs */}
                  {Object.entries(perShareSelections).length > 0 && (
                    <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 6, borderBottom: '1px solid var(--menu-divider)', paddingBottom: 6 }}>
                      {Object.entries(perShareSelections).map(([id, s], i) => {
                        const color = PER_SHARE_COLORS[i % PER_SHARE_COLORS.length]
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }} title={s.label}>
                              {s.label}
                            </span>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 4, flexShrink: 0 }}>
                              <input type="checkbox" checked={s.annual} onChange={e => setPerShareAnnual(id, e.target.checked)} style={{ flexShrink: 0 }} /> FY
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, marginRight: 4, flexShrink: 0 }}>
                              <input type="checkbox" checked={s.qtr} onChange={e => setPerShareQtr(id, e.target.checked)} style={{ flexShrink: 0 }} /> Qtr
                            </label>
                            <Button
                              variant="danger"
                              size="sm"
                              aria-label={`Remove ${s.label}`}
                              onClick={() => removePerSharePair(id)}
                              style={{ padding: '0 6px', fontWeight: 'bold', flexShrink: 0 }}
                            >
                              ✕
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Pair builder — only shown when a statement is selected */}
                  {perShareStatement && (
                    <>
                      <input
                        type="text"
                        placeholder="Filter concepts..."
                        value={perShareSearch}
                        onChange={e => setPerShareSearch(e.target.value)}
                        style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                      />

                      {/* Numerator picker */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3, fontWeight: 600 }}>Numerator</div>
                        <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--menu-input-border)', borderRadius: 3 }}>
                          {perShareOptions
                            .filter(o => o.label.toLowerCase().includes(perShareSearch.toLowerCase()))
                            .map(o => (
                              <div
                                key={o.value}
                                onClick={() => setPendingPerShareNumerator(o.value)}
                                title={o.label}
                                style={{
                                  padding: '4px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
                                  background: pendingPerShareNumerator === o.value ? 'var(--menu-hover)' : 'transparent',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}
                              >
                                {o.label}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Denominator picker — share concepts only, no statement filter needed */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 3, fontWeight: 600 }}>Per Share Of</div>
                        <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--menu-input-border)', borderRadius: 3 }}>
                          {dynamicSeries.map(s => (
                            <div
                              key={s.concept}
                              onClick={() => setPendingPerShareDenominator(s.concept)}
                              title={s.alias}
                              style={{
                                padding: '4px 6px', fontSize: 12, cursor: 'pointer', borderRadius: 2,
                                background: pendingPerShareDenominator === s.concept ? 'var(--menu-hover-alt)' : 'transparent',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}
                            >
                              {s.alias}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview + Add */}
                      {(pendingPerShareNumerator || pendingPerShareDenominator) && (
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontStyle: 'italic', minHeight: 16 }}>
                          {pendingPerShareNumerator
                            ? (perShareOptions.find(o => o.value === pendingPerShareNumerator)?.label.split(' [')[0] || '…')
                            : '…'}
                          {' / '}
                          {pendingPerShareDenominator
                            ? (dynamicSeries.find(s => s.concept === pendingPerShareDenominator)?.alias || '…')
                            : '…'}
                        </div>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!pendingPerShareNumerator || !pendingPerShareDenominator}
                        onClick={addPerSharePair}
                        style={{ width: '100%' }}
                      >
                        Add Per-Share Line
                      </Button>
                    </>
                  )}
                </div>
              )}
            </IconToolbarButton>

            {conceptSeries && (
              <>
                <IconToolbarButton
                  icon={Rows3}
                  label="Term Bars"
                  isActive={termMenuOpen}
                  innerRef={termRef}
                  onClick={() => setTermMenuOpen(o => !o)}
                >
                  {termMenuOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                      border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 30,
                      color: 'var(--menu-text)',
                    }}>
                      {['Q1', 'Q2', 'Q3', 'Q4', 'FY'].map(term => (
                        <label key={term} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <input
                            type="checkbox"
                            checked={visibleTerms[term]}
                            onChange={e => {
                              setVisibleTerms(v => ({ ...v, [term]: e.target.checked }))
                              setConceptRange({ x: null, y: null, y2: null, y3: null, y4: null, y5: null })
                            }}
                            style={{ flexShrink: 0 }}
                          />
                          {term}
                        </label>
                      ))}
                    </div>
                  )}
                </IconToolbarButton>
                <ChartToolbar.Divider />
                <select
                  aria-label="Statement chart time period"
                  value={conceptRangeLabel}
                  onChange={e => {
                    const range = conceptRangeButtons.find(button => button.label === e.target.value)
                    if (!range) return
                    setConceptRangeLabel(range.label)
                    selectConceptRange(range.start)
                  }}
                  style={{
                    height: 26,
                    padding: '2px 6px',
                    fontSize: 12,
                    color: 'var(--menu-text)',
                    background: 'var(--menu-bg)',
                    border: '1px solid var(--menu-border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {conceptRangeButtons.map(button => (
                    <option key={button.label} value={button.label}>{button.label}</option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const activeRange = conceptRangeButtons.find(b => b.label === conceptRangeLabel)
                    if (activeRange?.start) {
                      selectConceptRange(activeRange.start)
                    } else {
                      // fallback — only if conceptRangeLabel somehow doesn't match any button
                      setConceptRangeLabel('All')
                      clearRelayoutTimer()
                      setConceptZoomVersion(v => v + 1)
                      setConceptRange({ x: null, y: null, y2: null, y3: null, y4: null, y5: null })
                    }
                  }}
                >
                  Reset Zoom
                </Button>
                {rangeSummaryText && (
                  <span style={{ fontSize: 11, color: 'var(--menu-text-muted)', margin: 6, whiteSpace: 'nowrap' }}>
                    {rangeSummaryText}
                  </span>
                )}
              </>
            )}
          </ChartToolbar>
        )}
        {view === 'intrinsic' && ticker && (
          <ChartToolbar>
            <IntrinsicValueToolbar state={intrinsicState} />
          </ChartToolbar>
        )}

        <AppBar.Spacer />

        <div ref={viewMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
          <Button
            variant="secondary"
            size="sm"
            isActive={viewMenuOpen}
            rightIcon="▾"
            onClick={() => setViewMenuOpen(o => !o)}
            style={{ minWidth: 110, justifyContent: 'space-between', height: 30 }}
          >
            {VIEW_OPTIONS.find(o => o.value === view)?.label || 'Prices'}
          </Button>
          {viewMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--menu-bg)',
                border: '1px solid var(--menu-border)',
                borderRadius: 4,
                padding: 4,
                zIndex: 40,
                color: 'var(--menu-text)',
                minWidth: 130,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                marginTop: 4,
              }}
            >
              {VIEW_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    setView(opt.value)
                    setViewMenuOpen(false)
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: 3,
                    fontWeight: view === opt.value ? 600 : 400,
                    background: view === opt.value ? 'var(--menu-hover)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.label}</span>
                  {view === opt.value && <span style={{ fontSize: 11, color: 'var(--menu-text-muted)' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppBar>

      {(() => {
        const pulling = pullStatus?.status === 'pending' || pullStatus?.status === 'running'
        return (
          <div
            role="status"
            style={{
              padding: '4px 12px',
              fontSize: 12,
              color: pulling ? '#d9a441' : 'var(--menu-text-muted)',
              borderBottom: '1px solid var(--menu-border)',
            }}
          >
            {pulling
              ? `Pulling data for ${pullStatus.ticker || newTickerInput.trim().toUpperCase() || ticker}. This can take over two minutes.`
              : 'Note: pulling a new ticker can take over two minutes. Selecting an existing ticker from the dropdown is much faster.'}
          </div>
        )
      })()}

      <div style={{ padding: '3px 3px', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {view === 'price' && ticker && (
          <>
            {priceData && (
              <>
                {companyInfo && (
                  <div style={{ fontSize: 12, color: 'var(--menu-text-muted)', padding: '2px 4px 6px' }}>
                    {companyInfo.company_name}
                    {companyInfo.sic_description && ` · ${companyInfo.sic_description}`}
                    {(companyInfo.city || companyInfo.state) &&
                      ` · ${[companyInfo.city, companyInfo.state].filter(Boolean).join(', ')}`}
                  </div>
                )}

                <Plot
                  data={[
                    {
                      x: priceData.map(d => d.date), y: priceData.map(d => d.close),
                      customdata: closePctSeries.map(v =>
                        `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
                      ),
                      type: 'scatter', mode: 'lines+text', name: `${ticker} Close`,
                      line: { color: chartTheme.line, width: 1 },
                      text: lastPointLabelsWithPct(priceData.map(d => d.close), closePctSeries),
                      textposition: 'middle right',
                      textfont: { size: 10, color: chartTheme.line },
                      hovertemplate: priceHoverTemplate(ticker, 'Close'),
                    },
                    ...(showMA50 ? [{
                      x: priceData.map(d => d.date), y: ma50Series,
                      customdata: ma50PctSeries.map(v =>
                        v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
                      ),
                      type: 'scatter', mode: 'lines+text', name: '50-day MA',
                      line: { color: chartTheme.ma50, width: 1.5, dash: 'dot' },
                      text: lastPointLabelsWithPct(ma50Series, ma50PctSeries),
                      textposition: 'middle right',
                      textfont: { size: 10, color: chartTheme.ma50 },
                      hovertemplate: priceHoverTemplate(ticker, '50d MA'),
                    }] : []),
                    ...(showMA200 ? [{
                      x: priceData.map(d => d.date), y: ma200Series,
                      customdata: ma200PctSeries.map(v =>
                        v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
                      ),
                      type: 'scatter', mode: 'lines+text', name: '200-day MA',
                      line: { color: chartTheme.ma200, width: 1.5, dash: 'dot' },
                      text: lastPointLabelsWithPct(ma200Series, ma200PctSeries),
                      textposition: 'middle right',
                      textfont: { size: 10, color: chartTheme.ma200 },
                      hovertemplate: priceHoverTemplate(ticker, '200d MA'),
                    }] : []),
                    {
                      x: priceData.map(d => d.date),
                      y: closePctSeries,
                      type: 'scatter', mode: 'lines', yaxis: 'y3',
                      line: { width: 0 }, opacity: 0, showlegend: false, hoverinfo: 'skip',
                    },
                    ...indexTraces,

                  ]}
                  layout={{
                    ...PLOT_LAYOUT_INTERACTION,
                    font: { color: chartTheme.text, size: 12 },
                    showlegend: true,
                    legend: {
                      orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1,
                      font: { color: chartTheme.text, size: 11 },
                    },
                    margin: { l: 80, r: 60, t: 10, b: 35, pad: 2 },
                    uirevision: `price-${ticker}-${priceZoomVersion}`,
                    paper_bgcolor: chartTheme.bg,
                    plot_bgcolor: chartTheme.bg,
                    xaxis: {
                      range: padDateRangeEnd(effectivePriceXRange),
                      autorange: effectivePriceXRange ? false : true,
                      rangeslider: { visible: false },
                      showgrid: true,
                      gridcolor: chartTheme.gridXAxis,
                      gridwidth: 0.001,
                      griddash: 'dot',
                      zeroline: false,
                      tickfont: { color: chartTheme.tick, size: 11 },
                    },
                    yaxis: {
                      title: 'Price ($)', tickformat: '$.2f', fixedrange: false, range: effectivePriceYRange, showgrid: true,
                      gridcolor: chartTheme.gridStrong,
                      gridwidth: 0.001,
                      griddash: 'dot',
                      zeroline: false,
                      tickfont: { color: chartTheme.tick, size: 11 },
                    },
                    yaxis3: {
                      title: '% Change', overlaying: 'y', side: 'right', anchor: 'x',
                      fixedrange: false, ticksuffix: '%', showgrid: false, range: effectivePctYRange, showgrid: true,
                      gridcolor: chartTheme.gridFaint,
                      gridwidth: 0.001,
                      griddash: 'dot',
                      zeroline: false,
                      tickfont: { color: chartTheme.tick, size: 11 },
                    },
                  }}
                  config={PLOT_CONFIG}
                  useResizeHandler={true}
                  //style={{ width: '100%', height: '100%' }}
                  style={{ width: '100%', height: '100%', flex: '1 1 auto', minHeight: 0 }}
                  onRelayout={handlePriceRelayout}
                />
              </>
            )}
          </>
        )}

        {view === 'concept' && ticker && (
          <>
            {(!selectedConcept || !conceptSeries || loadedConceptKey !== selectedConcept) && (
              <div style={{
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--menu-text-muted)',
                fontSize: 14,
                padding: 40,
                textAlign: 'center',
              }}>
                <FileBarChart2 size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div>Select a financial statement and line item from the toolbar above to view chart data.</div>
              </div>
            )}

            {conceptSeries && loadedConceptKey === selectedConcept && (
              <>
                <div style={{ margin: '0', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>


                  {(() => {
                    const checkedConcepts = Object.entries(checkedShareLines)
                      .filter(([, checked]) => checked)
                      .map(([concept]) => concept)
                      .sort((a, b) => a.localeCompare(b))
                    return (
                      <ConceptLegend
                        label={conceptSeries[0]?.label}
                        visibleTerms={visibleTerms}
                        shareLines={checkedConcepts.map((concept, i) => ({
                          name: dynamicSeries.find(s => s.concept === concept)?.alias || concept,
                          color: SHARE_LINE_COLORS[i % SHARE_LINE_COLORS.length],
                        }))}
                        comparisons={comparisonTraces.map(t => ({ name: t.name, color: t.line.color, dash: t.line.dash }))}
                        marginLines={marginTraces.map(t => ({ name: t.name, color: t.line.color, dash: t.line.dash }))}
                        perShareLines={perShareTraces.map(t => ({ name: t.name, color: t.line.color, dash: t.line.dash }))}
                        splitMarkers={splitMarkerTraces.map(t => ({
                          name: t.name,
                          color: t.marker.color,
                          open: t.marker.symbol === 'triangle-up-open',
                        }))}
                      />
                    )
                  })()}
                </div>

                <Plot
                  key={loadedConceptKey}
                  data={[
                    ...conceptBarAndShareTraces,
                    ...splitMarkerTraces,
                    ...comparisonTraces,
                    ...marginTraces,
                    ...perShareTraces,
                    ...(amendmentTrace ? [amendmentTrace] : []),
                  ]}
                  layout={{
                    ...PLOT_LAYOUT_INTERACTION,
                    title: `${ticker} ${conceptSeries[0]?.label || ''}`,
                    barmode: 'group',
                    showlegend: false,
                    margin: { l: 55, r: 0, t: 10, b: 35, pad: 2 },
                    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 },
                    uirevision: `${conceptUiRevision}-${conceptZoomVersion}`,
                    paper_bgcolor: chartTheme.bg,
                    plot_bgcolor: chartTheme.bg,
                    xaxis: {
                      domain: [0, 1],
                      range: effectiveConceptXRange,
                      autorange: effectiveConceptXRange ? false : true,
                    },
                    yaxis: {
                      ...STATEMENT_AXIS_LOCK.yaxis,
                      range: effectiveConceptYRange,
                      autorange: effectiveConceptYRange ? false : true,
                    },
                    yaxis2: {
                      ...STATEMENT_AXIS_LOCK.yaxis2,
                      overlaying: 'y',
                      side: 'right',
                      visible: false,
                      range: effectiveConceptY2Range,
                      autorange: effectiveConceptY2Range ? false : true,
                    },
                    yaxis3: {
                      ...STATEMENT_AXIS_LOCK.yaxis3,
                      overlaying: 'y',
                      side: 'right',
                      anchor: 'x',
                      visible: false,
                      range: effectiveConceptY3Range,
                      autorange: effectiveConceptY3Range ? false : true,
                    },
                    yaxis4: {
                      ...STATEMENT_AXIS_LOCK.yaxis4,
                      overlaying: 'y',
                      side: 'right',
                      anchor: 'x',
                      visible: false,
                      range: effectiveConceptY4Range,
                      autorange: effectiveConceptY4Range ? false : true,
                    },
                    yaxis5: {
                      ...STATEMENT_AXIS_LOCK.yaxis5,
                      overlaying: 'y',
                      side: 'right',
                      anchor: 'x',
                      visible: false,
                      range: effectiveConceptY5Range,
                      autorange: effectiveConceptY5Range ? false : true,
                    },
                  }}
                  config={PLOT_CONFIG}
                  useResizeHandler={true}
                  style={{ width: '95%', height: '90%' }}
                  //style={{ width: '100%', height: '100%', flex: '1 1 auto', minHeight: 0 }}
                  //style={{ width: '100%', flex: '1 1 0%', minHeight: 0 }}
                  onRelayout={handleConceptRelayout}

                />
              </>
            )}
          </>
        )}

        {view === 'browser' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={browserTable} onChange={e => { setBrowserTable(e.target.value); clearBrowserSql() }}>
                <option value="">Select a table...</option>
                {browserTables.map(t => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.has_ticker && ticker ? t.ticker_row_count : t.row_count})
                  </option>
                ))}
              </select>
              <select value={browserFilterCol} onChange={e => { setBrowserFilterCol(e.target.value); setBrowserOffset(0) }} disabled={browserSqlActive || (browserTableNeedsTicker && !ticker)}>
                <option value="">Filter column...</option>
                {browserColumnsMeta.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="contains..."
                value={browserFilterVal}
                onChange={e => { setBrowserFilterVal(e.target.value); setBrowserOffset(0) }}
                disabled={browserSqlActive || (browserTableNeedsTicker && !ticker) || !browserFilterCol}
                style={{ width: 140 }}
              />
              <div ref={browserColumnRef} style={{ position: 'relative', display: 'inline-block' }}>
                <Button variant="secondary" isActive={browserColumnMenuOpen} rightIcon="▾"
                  onClick={() => setBrowserColumnMenuOpen(o => !o)}>
                  Columns
                </Button>
                {browserColumnMenuOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, background: 'var(--menu-bg)',
                    border: '1px solid var(--menu-border)', borderRadius: 4, padding: 8, zIndex: 10,
                    minWidth: 160,
                  }}>
                    <ColumnVisibilityMenu table={browserReactTable} />
                  </div>
                )}
              </div>
              <Button variant="secondary" disabled={!browserRows.length} onClick={copyBrowserPage}>Copy page</Button>
              {browserCopyStatus && (
                <span style={{ fontSize: 12, color: 'var(--menu-text-muted)' }}>{browserCopyStatus}</span>
              )}
              {!browserSqlActive && ticker && (
                <>
                  <Button variant="secondary" disabled={browserOffset === 0} onClick={() => setBrowserOffset(o => Math.max(0, o - browserLimit))}>◂ Prev</Button>
                  <Button variant="secondary" disabled={browserOffset + browserLimit >= browserTotal} onClick={() => setBrowserOffset(o => o + browserLimit)}>Next ▸</Button>
                  <span style={{ fontSize: 13, color: 'var(--menu-text-muted)' }}>
                    {ticker} — {browserTotal ? `${browserOffset + 1}-${Math.min(browserOffset + browserLimit, browserTotal)} of ${browserTotal}` : '0 rows'}
                  </span>
                </>
              )}
              {!browserSqlActive && !ticker && browserTableNeedsTicker && (
                <span style={{ fontSize: 13, color: 'var(--menu-danger)' }}>Select a ticker (top left) to browse table data</span>
              )}
              {!browserSqlActive && !browserTableNeedsTicker && (
                <>
                  <Button variant="secondary" disabled={browserOffset === 0} onClick={() => setBrowserOffset(o => Math.max(0, o - browserLimit))}>◂ Prev</Button>
                  <Button variant="secondary" disabled={browserOffset + browserLimit >= browserTotal} onClick={() => setBrowserOffset(o => o + browserLimit)}>Next ▸</Button>
                  <span style={{ fontSize: 13, color: 'var(--menu-text-muted)' }}>
                    {browserTotal ? `${browserOffset + 1}-${Math.min(browserOffset + browserLimit, browserTotal)} of ${browserTotal}` : '0 rows'}
                  </span>
                </>
              )}
              {browserSqlActive && browserSqlMeta && (
                <>
                  <Button variant="secondary" disabled={browserOffset === 0} onClick={() => runBrowserSql(Math.max(0, browserOffset - browserLimit), browserSqlExecuted)}>◂ Prev</Button>
                  <Button variant="secondary" disabled={!browserSqlMeta.hasMore} onClick={() => runBrowserSql(browserOffset + browserLimit, browserSqlExecuted)}>Next ▸</Button>
                  <span style={{ fontSize: 13, color: 'var(--menu-text-muted)' }}>
                    Query - {browserOffset + 1}-{browserOffset + browserSqlMeta.rowCount} rows
                  </span>
                </>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Ticker UnAware Custom SQL (read-only; SELECT, WITH, VALUES, or EXPLAIN)
              </label>
              <CodeMirror
                value={browserSql}
                height="80px"
                extensions={sqlExtensions}
                onChange={value => setBrowserSql(value)}
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') runBrowserSql() }}
                basicSetup={{ lineNumbers: false, foldGutter: false }}
                style={{ width: '90%', fontSize: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <Button variant="primary" onClick={() => runBrowserSql()}>▶ Run (Ctrl+Enter)</Button>
                <Button variant="secondary" onClick={resetBrowserSql}>Reset</Button>
                {browserSqlError && <span style={{ fontSize: 12, color: 'var(--menu-danger)' }}>{browserSqlError}</span>}
              </div>
            </div>

            <div style={{ maxHeight: '55vh', overflowY: 'auto', border: '1px solid var(--table-border)' }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBrowserColumnDragEnd}
              >
                <table style={{
                  width: browserReactTable.getTotalSize(),
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  tableLayout: 'fixed',
                }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--table-header-bg)' }}>
                    {browserReactTable.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        <SortableContext
                          items={headerGroup.headers.map(h => h.column.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {headerGroup.headers.map(header => (
                            <DraggableHeader key={header.id} header={header} />
                          ))}
                        </SortableContext>
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {browserReactTable.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            title={String(cell.getValue() ?? '')}
                            style={{
                              textAlign: 'left',
                              padding: '4px 8px',
                              width: cell.column.getSize(),
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DndContext>
            </div>
          </div>

        )}
        {view === 'intrinsic' && ticker && <IntrinsicValueTab state={intrinsicState} />}

        {view === 'price' && !ticker && (
          <div style={{ maxWidth: 640, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8, lineHeight: 1.5 }}>
            <h2 style={{ marginTop: 0 }}>Welcome</h2>
            <p>
              <strong>What it does:</strong> This app pulls company filings from SEC EDGAR and turns them into
              price charts, financial statement concepts, per-share and margin metrics, and intrinsic value estimates.
              Select a ticker above, or enter a new one and pull fresh data, to get started.
            </p>
            <p><strong>Created by:</strong> Eric Tullis</p>
            <p>
              <strong>How it was built:</strong> A Python FastAPI backend processes SEC EDGAR data into a SQLite
              database, and a React (Vite) front end displays it.
            </p>
            <p>
              <strong>AI assistance:</strong> Eric Tullis designed and directed the project, with code developed
              in collaboration with Anthropic Claude and GitHub Copilot, which helped write, debug, and refine
              the backend and front-end code. Other Ai tools were used as needed for research and development purposes.
            </p>
          </div>
        )}



      </div>
    </div >
  )
}

export default App