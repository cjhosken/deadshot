import { FaPlus } from 'react-icons/fa';
import './App.css';
import AppBar from './components/AppBar';
import MotionClipDropdown from './components/MotionClipDropdown';
import Viewport from './components/Viewport';

function App() {


  return (
    <div id="app">
      <AppBar />
      <div id="main">
        <div id="overlay">
          <button title="Create New Motion Clip" className="iconButton" id="add-button"><FaPlus/></button>
          <MotionClipDropdown/>
        </div>
        <Viewport/>
      </div>
    </div>
  );
}

export default App;
