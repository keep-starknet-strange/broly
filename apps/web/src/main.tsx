import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { StarknetProvider } from './components/StarknetProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StarknetProvider>
        <App />
      </StarknetProvider>
    </BrowserRouter>
  </StrictMode>
)
