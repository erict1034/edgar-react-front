// plotInteraction.js
// Centralized Plotly mouse/interaction settings shared by every chart.
//
// Kept separate from App.jsx because these are easy to lose track of —
// several of them (dragmode, hovermode) have Plotly defaults that work
// silently until you want to change one, at which point it's better to
// have a single explicit place to look rather than hunting through JSX.

/**
 * Shared `config` prop for <Plot>. Controls chart-level interaction toggles
 * that live outside the `layout` object (scroll-wheel zoom, mode bar, etc).
 */


export const PLOT_CONFIG = {
    scrollZoom: true,
    displayModeBar: false,
}

/**
 * Shared interaction keys to spread into each chart's `layout` object.
 * - dragmode: 'pan' — click-and-drag pans the chart instead of box-zooming.
 *   (Box-zoom is still reachable via the mode bar or scroll-zoom remains
 *   active for zooming in/out.)
 * - hovermode: 'closest' — only the single nearest point's tooltip is shown,
 *   rather than grouping every trace at that x-position into one box.
 */
export const PLOT_LAYOUT_INTERACTION = {
    dragmode: 'pan',
    hovermode: 'closest',
}