import './App.css';
import AppBar from './components/AppBar';
import Viewport from './components/Viewport';

function App() {
  return (
    <div id="root">
      <AppBar />
      <div id="main">
        <Viewport/>
      </div>
    </div>
  );
}

export default App;
