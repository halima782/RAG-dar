import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DocumentViewer from './components/DocumentViewer.jsx'

const params = new URLSearchParams(window.location.search)
const isDocumentViewer = params.get('viewer') === '1' && params.get('file')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDocumentViewer ? (
      <DocumentViewer file={params.get('file')} page={params.get('page')} />
    ) : (
      <App />
    )}
  </StrictMode>,
)
