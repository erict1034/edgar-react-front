# Edgar React Frontend

## Run locally

```powershell
npm ci
npm run dev
```

Vite proxies `/api` requests to the local FastAPI server at `http://127.0.0.1:8000`. The deployed API URL is only needed for the Render static site; local development keeps using the proxy when `VITE_API_BASE_URL` is unset.

## Deploy to Render

Push this frontend directory to a GitHub repository, then in Render choose **New > Blueprint** and connect that repository. Render reads `render.yaml` and builds a free static site.

After the API service is deployed, set the static site's `VITE_API_BASE_URL` environment variable to the API's full public URL, for example `https://your-api.onrender.com`, then trigger a deploy. The frontend uses this URL for all API requests.
