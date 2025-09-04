import { useState } from 'react';
import './App.css';
import { Project } from './types/Project'; // make sure your Project.ts file is in the same folder
import AppBar from './components/AppBar';
import Viewport from './components/Viewport';

function App() {
  const [projectName, setProjectName] = useState('Deadshot Demo');
  const [description, setDescription] = useState('Testing browser save/load');
  const [loadedData, setLoadedData] = useState<any>(null);

  // Save project
  const handleSave = () => {
    const project = new Project({
      name: projectName,
      description: description,
      createdAt: new Date().toISOString(),
    });
    project.save('demo.deadshot');
  };

  // Load project
  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.deadshot';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const loadedProject = await Project.load(file);
        setLoadedData(loadedProject.data);
      }
    };
    input.click();
  };

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
