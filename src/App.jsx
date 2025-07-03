import React, { useState } from 'react';
import Display from './components/Display'

function App() {
  const [semestre, setSemestre] = useState('2025-2');
  return (
    <div className="w-full h-full">
      <Display semestre={semestre} setSemestre={setSemestre} />
    </div>
  )
}

export default App