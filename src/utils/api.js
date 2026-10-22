// src/utils/api.js

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || ''

export function apiUrl(path) {
    return apiBaseUrl ? `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}` : path
}

export function fetchJson(url, options) {
    return fetch(apiUrl(url), options).then(async r => {
        if (!r.ok) {
            let msg = `Request failed (${r.status})`
            try {
                const body = await r.json()
                if (typeof body.detail === 'string') {
                    msg = body.detail
                } else if (Array.isArray(body.detail)) {
                    // FastAPI/pydantic validation errors: [{ loc, msg, ... }]
                    msg = body.detail.map(d => d.msg).join('; ')
                }
            } catch { /* non-JSON body, keep the generic message */ }
            throw new Error(msg)
        }
        return r.json()
    })
}