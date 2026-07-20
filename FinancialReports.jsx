import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LoadingLogo from './components/LoadingLogo.jsx'
import './styles/theme.css'
import './styles/tailwind.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingLogo />}>
      <App />
    </Suspense>
  </React.StrictMode>
)
