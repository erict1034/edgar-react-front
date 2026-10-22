/** ChartToolbar.jsx
 * Fixed top-left icon toolbar, styled similarly to Plotly's modebar
 * (small rounded strip, tight icon spacing, subtle border/shadow).
 *
 * Usage:
 *   <ChartToolbar>
 *     <IconToolbarButton .../>
 *     <ChartToolbar.Divider />
 *     <IconToolbarButton .../>
 *   </ChartToolbar>
 */
export default function ChartToolbar({ children }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        background: '#ffffff',
        border: '1px solid #d8d8d8',
        borderRadius: 6,
        padding: 3,
        margin: '0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        zIndex: 20,
      }}
    >
      {children}
    </div>
  )
}

ChartToolbar.Divider = function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        background: '#e0e0e0',
        margin: '0 3px',
      }}
    />
  )
}
