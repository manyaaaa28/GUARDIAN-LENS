import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'
import App from './App.tsx'
import './index.css'

window.Buffer = Buffer
window.process = process

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
