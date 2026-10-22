// statementChartInteraction.js


export const STATEMENT_AXIS_LOCK = {
    // Primary bar value axis — the only one users should be able to zoom.
    yaxis: { fixedrange: false },
    // Shares overlay axis — locked; scaled programmatically via `range`.
    yaxis2: { fixedrange: false },
    // YoY % comparison overlay axis — locked; scaled programmatically.
    yaxis3: { fixedrange: false },
    // Margin % overlay axis — locked; scaled programmatically.
    yaxis4: { fixedrange: false },
    // Per-share value overlay axis — locked; scaled programmatically.
    yaxis5: { fixedrange: false },


}