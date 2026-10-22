import { useState } from 'react'

/**
 * A single icon button for the top-left chart toolbar.
 * - Shows a small dark tooltip on hover (Plotly modebar style)
 * - `isActive` highlights the button when its dropdown panel is open
 * - Pass a dropdown panel as `children`; it's positioned relative to this button
 */
export default function IconToolbarButton({ icon: Icon, label, isActive, onClick, disabled, children, innerRef }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={innerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={isActive}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? '#e8f0fe' : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: disabled ? 'default' : 'pointer',
          color: disabled ? '#bbb' : isActive ? '#1a73e8' : '#4a4a4a',
          padding: 0,
          opacity: disabled ? 0.5 : 1,
          transition: 'background 0.1s ease',
        }}
        onMouseDown={e => e.preventDefault() /* keep focus off the button so click-outside logic stays simple */}
      >
        <Icon size={16} strokeWidth={1.75} />
      </button>

      {hovered && !disabled && !isActive && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            background: '#323232',
            color: '#fff',
            fontSize: 11,
            lineHeight: 1,
            padding: '5px 7px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        >
          {label}
        </div>
      )}

      {children}
    </div>
  )
}
