import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ScheduleViewer from './components/ScheduleViewer'
import ScheduleCreator from './components/ScheduleCreator';

function App() {
  return (
    <div className="App">
      <ScheduleCreator />
    </div>
  )
}

export default App