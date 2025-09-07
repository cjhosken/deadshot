import { FaCamera, FaPlus } from 'react-icons/fa';
import './App.css';
import AppBar from './components/AppBar';
import MotionClipDropdown from './components/MotionClipDropdown';
import Viewport from './components/Viewport';
import { useState } from 'react';
import { FaPhotoFilm, FaX } from 'react-icons/fa6';
import MotionCaptureProcess from './components/MotionCaptureProcess';
import MotionCaptureLive from './components/MotionCaptureLive';

function App() {
  const [context, setContext] = useState<"home" | "mocap" | "process">("home");
  const [openContextSelector, setOpenContextSelector] = useState(false);

  const handleAddButton = () => {
    setOpenContextSelector(true);
  }

  return (
    <div id="app">
      <AppBar />
      <div id="main">
        {
          context === "home" && (
            <div id="home-view">
              <div id="overlay">
                <button title="Create New Motion Clip" className="iconButton" id="add-button" onClick={handleAddButton}><FaPlus /></button>
                <MotionClipDropdown />
              </div>
              <Viewport showTimeline={true}/>
            </div>
          )
        }
        {
          context === "mocap" && (
            <MotionCaptureLive onGoHome={() => setContext("home") }/>
          )
        }
        {
          context === "process" && (
            <MotionCaptureProcess onGoHome={() => setContext("home") } />
        )
        }
      </div>
      {
        openContextSelector && (
          <div className="dialog">
            <div id="context-selector">
              <div id="header">
                <button className='iconButton' id="close-button" onClick={() => setOpenContextSelector(false)}><FaX /></button>
              </div>
              <div id='context-options'>
              <button className="contextButton" onClick={() => { setContext("mocap"); setOpenContextSelector(false); }}> <FaCamera/> <p className='label'>Live Capture</p> <p className='description'> Motion Capture using your webcam! </p> </button>
              <button className="contextButton" onClick={() => { setContext("process"); setOpenContextSelector(false); }}> <FaPhotoFilm/> <p className='label'>Process Videos</p> <p className='description'> Motion Capture from video files! </p> </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
