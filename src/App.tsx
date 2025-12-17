import './App.css';
import AppBar from './components/AppBar';
import MainWindow from './components/MainWindow';

function App() {
  return (
    <div id="app">
      <AppBar/>
      <div id="main">
        <MainWindow/>
      </div>
    </div>
  );
}

export default App;
