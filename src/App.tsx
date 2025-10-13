import './App.css';
import AppBar from './components/AppBar';
import { useState } from 'react';
import MotionCaptureProcess from './components/MotionCaptureProcess';
import MotionCaptureLive from './components/MotionCaptureLive';

function App() {
  const [context, setContext] = useState<"mocap" | "process">("mocap");

  return (
    <div id="app">
      <AppBar setContext={setContext}/>
      <div id="main">
        {
          context === "mocap" && (
            <MotionCaptureLive/>
          )
        }
        {
          context === "process" && (
            <MotionCaptureProcess onGoHome={() => setContext("mocap") } />
          )
        }
      </div>
    </div>
  );
}

export default App;
