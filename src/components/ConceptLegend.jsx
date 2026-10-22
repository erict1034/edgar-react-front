// ConceptLegend.jsx
import { TERM_COLORS } from '../constants'

function ConceptLegend({ label, visibleTerms, comparisons = [], shareLines = [], marginLines = [], perShareLines = [], splitMarkers = [] }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 12, fontSize: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                {['Q1', 'Q2', 'Q3', 'Q4', 'FY']
                    .filter(term => visibleTerms[term])
                    .map(term => (
                        <span key={term} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                                width: 10, height: 10, borderRadius: 2,
                                background: TERM_COLORS[term], display: 'inline-block',
                            }} />
                            {term}
                        </span>
                    ))}
            </div>

            {shareLines.length > 0 && (
                <span style={{ borderLeft: '1px solid #ddd', height: 14, margin: '0 4px' }} />
            )}
            {shareLines.map(sl => (
                <span key={sl.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                        width: 14, height: 0,
                        borderTop: `2px solid ${sl.color}`,
                        display: 'inline-block',
                    }} />
                    {sl.name}
                </span>
            ))}
            {comparisons.length > 0 && (
                <span style={{ borderLeft: '1px solid #ddd', height: 14, margin: '0 4px' }} />
            )}
            {comparisons.map(c => (
                <span key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                        width: 14, height: 0,
                        borderTop: `2px ${c.dash === 'dot' ? 'dotted' : 'solid'} ${c.color}`,
                        display: 'inline-block',
                    }} />
                    {c.name}
                </span>
            ))}

            {marginLines.length > 0 && (
                <span style={{ borderLeft: '1px solid #ddd', height: 14, margin: '0 4px' }} />
            )}
            {marginLines.map(m => (
                <span key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                        width: 14, height: 0,
                        borderTop: `2px ${m.dash === 'dot' ? 'dotted' : 'solid'} ${m.color}`,
                        display: 'inline-block',
                    }} />
                    {m.name}
                </span>
            ))}

            {perShareLines.length > 0 && (
                <span style={{ borderLeft: '1px solid #ddd', height: 14, margin: '0 4px' }} />
            )}
            {perShareLines.map(p => (
                <span key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                        width: 14, height: 0,
                        borderTop: `2px ${p.dash === 'dot' ? 'dotted' : 'solid'} ${p.color}`,
                        display: 'inline-block',
                    }} />
                    {p.name}
                </span>
            ))}

            {/*
            {splitMarkers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid #ddd', paddingLeft: 14 }}>
                    {splitMarkers.map(sm => (
                        <span key={sm.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{
                                width: 0, height: 0,
                                borderLeft: '5px solid transparent',
                                borderRight: '5px solid transparent',
                                borderBottom: `8px solid ${sm.open ? 'transparent' : sm.color}`,
                                outline: sm.open ? `1px solid ${sm.color}` : 'none',
                                display: 'inline-block',
                            }} />
                            {sm.name}
                        </span>
                    ))}
                </div>
            )}
            */}
        </div>
    )
}

export default ConceptLegend