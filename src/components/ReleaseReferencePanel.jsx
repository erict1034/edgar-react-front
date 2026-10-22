// ReleaseReferencePanel.jsx - Displays the latest earnings release and its coverage status, along with growth figures and the ability to use them in the forecast.
import { forecastCoverage, growthRows, isNotable } from '../utils/releaseSignal'
import { formatUsdCompact } from '../utils/format'


const pct = n => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)
const pts = n => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(0)} pts`

export default function ReleaseReferencePanel({ ticker, release, assumedGrowth, model, onUse, reference = false }) {
    if (!release) {
        return (
            <div style={box}>
                <span style={{ color: 'var(--menu-text-muted)' }}>
                    No earnings release found for {ticker}.
                </span>
            </div>
        )
    }
    const rows = growthRows(release)
    const coverage = reference ? null : forecastCoverage(release, model)

    return (
        <div style={box}>
            {release.fetchWarning && (
                <div role="alert" style={{ color: '#d9a441', marginBottom: 6 }}>⚠ {release.fetchWarning}</div>
            )}
            <div style={{ fontWeight: 600 }}>
                {release.ticker} · {release.releaseTerm ? `${release.releaseTerm} · ` : ''}Latest release · period ending {release.periodEnd || '—'}
            </div>
            <div style={{ color: 'var(--menu-text-muted)', marginBottom: 6 }}>
                8-K filed {release.filedAt} · preliminary, per press release ·{' '}
                <a href={release.exhibitUrl || release.url} target="_blank" rel="noreferrer">press release ↗</a>
                {release.exhibitUrl && (
                    <>
                        {' '}·{' '}
                        <a href={release.url} target="_blank" rel="noreferrer">all filing documents ↗</a>
                    </>
                )}
            </div>


            {reference ? <ReferenceNote /> : <CoverageStatus coverage={coverage} />}

            {rows.length === 0 && <div style={{ color: 'var(--menu-text-muted)' }}>No growth figures could be extracted from this release.</div>}

            {rows.map(r => {
                const notable = !reference && isNotable(r.value, assumedGrowth)
                const canUse = !reference && !!onUse &&
                    (r.id !== 'yoy' || coverage.status === 'not_ingested' || coverage.status === 'unknown')
                return (
                    <div key={r.id} title={r.text || undefined} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 4,
                        background: notable ? 'rgba(217,164,65,0.15)' : 'transparent',
                    }}>
                        <span style={{ flex: 1, color: 'var(--menu-text-muted)' }}>
                            <div>
                                {r.label}{r.horizon ? ` (${r.horizon})` : ''}
                                {r.revenue != null && (
                                    <span> · {formatUsdCompact(r.revenue)} vs {formatUsdCompact(r.revenuePriorYear)}</span>
                                )}
                                {r.revenueLow != null && (
                                    <span> · {formatUsdCompact(r.revenueLow)}–{formatUsdCompact(r.revenueHigh)}</span>
                                )}
                            </div>
                            {r.periodText && <div style={{ fontSize: 11, opacity: 0.8 }}>{r.periodText}</div>}
                        </span>
                        {(r.range != null || r.value != null) && (
                            <span style={{ fontWeight: 500 }}>{r.range ?? pct(r.value)}</span>
                        )}
                        {r.value != null && assumedGrowth != null && (
                            <span style={{ width: 64, textAlign: 'right', color: notable ? '#d9a441' : 'var(--menu-text-muted)' }}>
                                {pts(r.value - assumedGrowth)}
                            </span>
                        )}
                        {r.value != null && canUse && (
                            <button type="button" onClick={() => onUse(r.value, { source: r.label, accession: release.accession, filedAt: release.filedAt })}>
                                Use
                            </button>
                        )}
                    </div>
                )
            })}

            {!reference && (
                <div style={{ marginTop: 6, color: 'var(--menu-text-muted)' }}>
                    Your forecast start for (5-year revenue growth): {pct(assumedGrowth)}
                </div>
            )}
        </div>
    )
}

function ReferenceNote() {
    return (
        <div style={{ margin: '6px 0 8px', padding: '6px 8px', borderRadius: 4, background: 'var(--menu-bg-secondary, rgba(127,127,127,0.08))', color: 'var(--menu-text-muted)' }}>
            Reference only. The excess-return model is driven by ROTCE and tangible book, not revenue growth.
            Open the press release to compare its reported ROTCE and tangible book value per share with the model values.
        </div>
    )
}

function CoverageStatus({ coverage, }) {
    const status = {
        included_in_forecast: {
            label: 'Release quarter is included in the forecast history and informs the revenue growth rate.',
            color: '#287d3c',
        },
        not_ingested: {
            label: 'Release quarter is not in the model history yet.',
            color: '#a15c00',
        },
        unknown: {
            label: 'Unable to determine whether this release is in the model history.',
            color: 'var(--menu-text-muted)',
        },
    }[coverage.status]

    return (
        <div style={{ margin: '6px 0 8px', padding: '6px 8px', borderRadius: 4, background: 'var(--menu-bg-secondary, rgba(127,127,127,0.08))' }}>
            <div style={{ color: status.color, fontWeight: 600 }}>{status.label}</div>
            {coverage.status === 'included_in_forecast' && (
                <div style={{ color: 'var(--menu-text-muted)', marginTop: 2 }}>
                    {coverage.includedInDcfBaseline
                        ? `The DCF revenue base (ends ${coverage.latestAnnualEnd}) already includes this period.`
                        : coverage.latestAnnualEnd
                            ? `The DCF revenue FY base currently ends ${coverage.latestAnnualEnd}, but the quarterly TTM history used for the revenue growth assumption includes this release.`
                            : 'No annual revenue base found for the DCF.'}
                </div>
            )}
            {coverage.status === 'not_ingested' && coverage.latestQuarterlyEnd && (
                <div style={{ color: 'var(--menu-text-muted)', marginTop: 2 }}>
                    Latest quarterly model data ends {coverage.latestQuarterlyEnd}.
                </div>
            )}
            {coverage.revenueMatches === false && (
                <div style={{ color: '#a15c00', marginTop: 2 }}>
                    Release revenue does not match the model&apos;s quarterly revenue.
                </div>
            )}
        </div>
    )
}

const box = { border: '1px solid var(--menu-border)', borderRadius: 6, padding: 10, fontSize: 12 }