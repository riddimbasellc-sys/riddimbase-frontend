import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { SiteSettingsProvider } from './context/SiteSettingsContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteSettingsProvider>
        <App />
      </SiteSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
)
