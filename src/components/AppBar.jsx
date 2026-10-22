/** AppBar.jsx
 * Slim top app bar spanning the full width of the page.
 * Holds global, page-level controls (ticker picker, pull-fresh-data, view switcher) —
 * as opposed to ChartToolbar, which holds controls scoped to the current chart view.
 *
 * Usage:
 *   <AppBar>
 *     <AppBar.Title>EDGAR Explorer</AppBar.Title>
 *     ...controls...
 *     <AppBar.Spacer />
 *     ...right-aligned controls...
 *   </AppBar>
 */
export default function AppBar({ children }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                borderBottom: '1px solid var(--border, #e5e4e7)',
                flexWrap: 'wrap',
                rowGap: 8,
                flexShrink: 0,   // add this
            }}
        >
            {children}
        </div>
    )
}

AppBar.Title = function Title({ children }) {
    return (
        <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', marginRight: 4 }}>
            {children}
        </span>
    )
}

AppBar.Spacer = function Spacer() {
    return <div style={{ flex: 1, minWidth: 8 }} />
}

AppBar.Tabs = function Tabs({ children }) {
    return (
        <div
            style={{
                display: 'inline-flex',
                gap: 2,
                background: 'var(--code-bg, #f4f3ec)',
                borderRadius: 6,
                padding: 3,
            }}
        >
            {children}
        </div>
    )
}

AppBar.Tab = function Tab({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                border: 'none',
                borderRadius: 4,
                padding: '5px 12px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                background: active ? '#fff' : 'transparent',
                color: active ? '#1a1a1a' : '#666',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    )
}