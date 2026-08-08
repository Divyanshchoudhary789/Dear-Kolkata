import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: '14px',
          borderRadius: '8px',
          border: '1px solid #EFEBE4',
          boxShadow: '0 8px 24px rgba(109, 15, 14, 0.08)',
        },
        success: {
          iconTheme: { primary: '#9A1A18', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: '#fff' },
        },
      }}
    />
  </StrictMode>,
)
