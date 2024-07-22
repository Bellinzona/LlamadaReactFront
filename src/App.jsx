import { useState } from 'react'
import './App.css'
import CallApp from './CallApp'

function App() {
  const [count, setCount] = useState(0)

  // En el archivo principal (main.jsx o App.jsx)
  if (typeof global === 'undefined') {
    window.global = window;
  }


  return (
    <div>


      <CallApp></CallApp>


    </div>
  )
}

export default App
