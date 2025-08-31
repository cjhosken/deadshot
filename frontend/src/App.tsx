import { useState, useRef, useEffect } from 'react'
import './App.css'
import Viewport from './components/Viewport'
import Workflow from './components/Workflow'
import Project from './types/Project'
import MenuBar from './components/MenuBar'

export const BACKEND_API_ADDRESS="http://localhost:8000";

function App() {
  const project = new Project("");
  const [workflow, setWorkflow] = useState<"mocap" | "track">("mocap");

  const containerRef = useRef<HTMLDivElement | null>(null)

  const [appSplit, setAppSplit] = useState(5) // App panel width %
  const [viewportSplit, setViewportSplit] = useState(60) // Viewport width %

  const isDraggingApp = useRef(false)
  const isDraggingViewport = useRef(false)

  // Start dragging handlers
  const handleMouseDownApp = () => { isDraggingApp.current = true }
  const handleMouseDownViewport = () => { isDraggingViewport.current = true }

  // Mouse move handler for both directions
  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()

    // Horizontal (app panel)
    if (isDraggingApp.current) {
      const newSplit = ((e.clientX - rect.left) / rect.width) * 100
      if (newSplit < 5) {
        setAppSplit(0);
      } else {
        setAppSplit(5);
      }
    }

    // Horizontal (viewport)
    if (isDraggingViewport.current) {
      const newSplit = ((e.clientX - rect.left) / rect.width) * 100
      if (newSplit < 80) {
        setViewportSplit(60);
      } else  {
        setViewportSplit(100); 
      }
    }
  }

  const handleMouseUp = () => {
    isDraggingApp.current = false
    isDraggingViewport.current = false
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [appSplit, viewportSplit])

  return (
    <div id="root" ref={containerRef}>
      {/* APPBAR */}
      <div
        className='panel' 
        id='app-panel'
        style={{ width: `${appSplit}%` }}
      >
        <MenuBar project={project} workflow={workflow} setWorkflow={setWorkflow}/>
      </div>

      {/* RESIZER: App / Viewport */}
      <div
        className="split-handle"
        onMouseDown={handleMouseDownApp}
      />


      {/* VIEWPORT */}
      <div
        className="panel" 
        id="viewport-panel"
        style={{ width: `${viewportSplit}%` }}
      >
        <Viewport project={project} workflow={workflow}/>
      </div>

      {/* VIEWPORT RESIZER */}
      <div
        className="split-handle"
        onMouseDown={handleMouseDownViewport}
      />

      {/* WORKFLOW */}
      <div
        className="panel"
        id="workflow-panel"
        style={{ width: `${100 - viewportSplit}%` }}
      >
        <Workflow project={project} workflow={workflow}/>
      </div>
    </div>
  )
}

export default App