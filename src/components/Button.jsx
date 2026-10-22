// Button.jsx
import { useState } from 'react'

const VARIANTS = {
    primary: {
        base: { background: '#2E7D32', color: '#fff', border: '1px solid #2E7D32' },
        hover: { background: '#276b2b' },
    },
    secondary: {
        base: { background: '#fff', color: '#333', border: '1px solid #ccc' },
        hover: { background: '#f5f5f5' },
        // "active" = menu is open — pass isActive to get this look
        active: { background: '#eef3ee', border: '1px solid #2E7D32', color: '#2E7D32' },
    },
    ghost: {
        base: { background: 'transparent', color: '#555', border: '1px solid transparent' },
        hover: { background: '#f0f0f0' },
    },
    danger: {
        base: { background: 'transparent', color: '#C62828', border: '1px solid transparent' },
        hover: { background: '#fdecea' },
    },
}

const SIZES = {
    sm: { padding: '3px 8px', fontSize: 12, borderRadius: 4 },
    md: { padding: '6px 12px', fontSize: 14, borderRadius: 6 },
    lg: { padding: '9px 16px', fontSize: 15, borderRadius: 6 },
}

function Spinner({ size = 12 }) {
    return (
        <span
            style={{
                width: size, height: size,
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'qw-spin 0.6s linear infinite',
            }}
        />
    )
}

export default function Button({
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    isActive = false,       // for menu toggles: shows the "open" look
    leftIcon = null,
    rightIcon = null,
    fullWidth = false,
    children,
    style = {},
    ...props
}) {
    const [hover, setHover] = useState(false)
    const [focus, setFocus] = useState(false)
    const v = VARIANTS[variant] || VARIANTS.secondary
    const s = SIZES[size] || SIZES.md
    const isDisabled = disabled || loading

    const composed = {
        // layout
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
        fontWeight: 500,
        lineHeight: 1.2,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
        outline: 'none',
        ...s,
        // variant base
        ...v.base,
        // states (order matters)
        ...(isActive && v.active ? v.active : {}),
        ...(hover && !isDisabled ? v.hover : {}),
        ...(focus ? { boxShadow: '0 0 0 3px rgba(46,125,50,0.35)' } : {}), // focus ring
        ...(isDisabled ? { opacity: 0.55 } : {}),
        ...style, // caller overrides last
    }

    return (
        <button
            type="button"
            disabled={isDisabled}
            aria-busy={loading || undefined}
            style={composed}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            {...props}
        >
            {loading ? <Spinner /> : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    )
}