import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import NetworkIndicator from './components/NetworkIndicator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NetworkIndicator />
    <App />
  </StrictMode>,
)
