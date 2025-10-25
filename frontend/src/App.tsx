import { useState } from 'react'
import './App.css'
import OcrResultsModal from './components/OcrResultsModal'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ocrText, setOcrText] = useState('')

  // Demo function to show modal
  const showModalDemo = () => {
    setOcrText('This is a sample OCR text extracted from an image. It contains multiple lines of text that can be summarized, researched, or analyzed.')
    setIsModalOpen(true)
  }

  return (
    <div className="app-container">
      <h1>Ask OCR</h1>
      <p>OCR Desktop Application with AI Integration</p>
      
      <div className="demo-section">
        <button onClick={showModalDemo} className="btn-primary">
          Show OCR Results Modal (Demo)
        </button>
      </div>

      <OcrResultsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ocrText={ocrText}
        language="eng"
      />
    </div>
  )
}

export default App
