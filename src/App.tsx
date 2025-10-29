import './App.css';
import AppBar from './components/AppBar';
import MotionCaptureLive from './components/MotionCaptureLive/MotionCaptureLive';

function App() {
  return (
    <div id="app">
      <AppBar/>
      <div id="main">
        <MotionCaptureLive/>
      </div>
    </div>
  );
}

export default App;
