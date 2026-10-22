// components/CompanyInfoPanel.jsx
import { useState } from 'react'
import { Building2 } from 'lucide-react'
import IconToolbarButton from './IconToolbarButton'

const DESCRIPTION_COLLAPSED_CHARS = 400

export default function CompanyInfoPanel({ companyInfo, isOpen, innerRef, onToggle }) {
    const [expanded, setExpanded] = useState(false)

    if (!companyInfo) return null

    const {
        company_name,
        ticker,
        sic_description,
        city,
        state,
        fiscal_year_end,
        state_of_incorporation,
        business_description,
        business_description_accn,
        nature_of_operations,
        nature_of_operations_accn,
    } = companyInfo

    // Fall back to the XBRL/10-Q-scraped Nature of Operations text when no
    // 10-K-sourced business_description exists yet (e.g. a recent IPO).
    const description = business_description || nature_of_operations
    const descriptionSource = business_description
        ? { label: '10-K', accn: business_description_accn }
        : { label: '10-Q', accn: nature_of_operations_accn }

    const hasLongDescription =
        description && description.length > DESCRIPTION_COLLAPSED_CHARS

    const shownDescription =
        description && !expanded && hasLongDescription
            ? `${description.slice(0, DESCRIPTION_COLLAPSED_CHARS).trim()}…`
            : description

    return (
        <IconToolbarButton
            icon={Building2}
            label="Company Info"
            isActive={isOpen}
            innerRef={innerRef}
            onClick={onToggle}
        >
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        background: 'var(--menu-bg)',
                        border: '1px solid var(--menu-border)',
                        borderRadius: 4,
                        padding: 12,
                        zIndex: 30,
                        color: 'var(--menu-text)',
                        width: 380,
                        maxHeight: 420,
                        overflowY: 'auto',
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        {company_name} <span style={{ fontWeight: 400, color: 'var(--menu-text-muted)' }}>({ticker})</span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--menu-text-muted)', marginBottom: 8 }}>
                        {[sic_description, [city, state].filter(Boolean).join(', ')]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--menu-text-muted)', marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {state_of_incorporation && <span>Inc.: {state_of_incorporation}</span>}
                        {fiscal_year_end && <span>FYE: {fiscal_year_end}</span>}
                    </div>

                    {description ? (
                        <>
                            <div style={{ borderTop: '1px solid var(--menu-divider)', paddingTop: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--menu-text-muted)' }}>
                                    Business Description
                                </div>
                                <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                    {shownDescription}
                                </div>
                                {hasLongDescription && (
                                    <button
                                        onClick={() => setExpanded(v => !v)}
                                        style={{
                                            marginTop: 6,
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--menu-link, #5b8def)',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            padding: 0,
                                        }}
                                    >
                                        {expanded ? 'Show less' : 'Show more'}
                                    </button>
                                )}
                                {descriptionSource.accn && (
                                    <div style={{ fontSize: 10, color: 'var(--menu-text-muted)', marginTop: 6 }}>
                                        Source: {descriptionSource.label} ({descriptionSource.accn})
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--menu-text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--menu-divider)', paddingTop: 8 }}>
                            No business description available yet.
                        </div>
                    )}
                </div>
            )}
        </IconToolbarButton>
    )
}