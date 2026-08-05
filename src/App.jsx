import React, { lazy, Suspense } from 'react'
import Display from './components/Display'

const EmptyClassroomFinder = lazy(() => import('./components/EmptyClassroomFinder'))

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname.endsWith('/papas-con-pan')) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Cargando...</div>}>
        <EmptyClassroomFinder />
      </Suspense>
    )
  }

  return (
    <div className="w-full h-full">
      <Display />
    </div>
  )
}

export default App