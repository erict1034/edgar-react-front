// src/hooks/useClickOutside.js
//
// Shared click-outside hook. Uses a ref for the callback so the document
// listener is subscribed once, regardless of whether callers pass an inline
// arrow function.

import { useEffect, useRef } from 'react'

export default function useClickOutside(onClose) {
    const ref = useRef(null)
    const cb = useRef(onClose)
    cb.current = onClose

    useEffect(() => {
        function handler(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                cb.current()
            }
        }

        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return ref
}