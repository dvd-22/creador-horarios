import Display from './components/Display'
import EmptyClassroomFinder from './components/EmptyClassroomFinder'

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname.endsWith('/papas-con-pan')) {
    return <EmptyClassroomFinder />
  }

  return (
    <div className="w-full h-full">
      <Display />
    </div>
  )
}

export default App