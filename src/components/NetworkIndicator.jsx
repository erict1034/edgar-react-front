import { useEffect, useState } from 'react'

const SHOW_DELAY_MS = 300
const SLOW_AFTER_MS = 5000

// Wraps window.fetch to track in-flight requests and shows a top progress bar,
// plus a "server waking up" note when a request is slow (Render free tier cold start).
export default function NetworkIndicator() {
    const [pending, setPending] = useState(0)
    const [visible, setVisible] = useState(false)
    const [slow, setSlow] = useState(false)

    useEffect(() => {
        const original = window.fetch
        window.fetch = (...args) => {
            setPending(n => n + 1)
            const done = () => setPending(n => Math.max(0, n - 1))
            const p = original.apply(window, args)
            p.then(done, done)
            return p
        }
        return () => { window.fetch = original }
    }, [])

    useEffect(() => {
        if (pending === 0) {
            setVisible(false)
            setSlow(false)
            return
        }
        const t1 = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
        const t2 = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [pending > 0])

    if (!visible) return null

    return (
        <>
            <style>{`@keyframes net-ind-slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 10000, overflow: 'hidden', background: 'rgba(120,120,120,0.2)' }}>
                <div style={{ width: '30%', height: '100%', background: '#3b82f6', animation: 'net-ind-slide 1.1s ease-in-out infinite' }} />
            </div>
            {slow && (
                <div role="status" style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, padding: '6px 14px', borderRadius: 6, fontSize: 13, background: '#1f2937', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    Still loading… the free server may be waking up (up to ~1 minute).
                </div>
            )}
        </>
    )
}
