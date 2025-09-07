import { FaFolderOpen, FaSave, FaBook, FaGithub } from "react-icons/fa";
import { Project } from "../types/Project";

import "./AppBar.css";
import { useEffect, useState } from "react";

export default function AppBar() {
  const [projectName, setProjectName] = useState("Untitled"); // initial project name

    useEffect(() => {
        document.title = `Deadshot | ${projectName}`;
    }, [projectName]);


    const handleSave = () => {
        // Ensure there is a project name
        const nameToSave = projectName.trim() || "Untitled";

        const project = new Project({
            name: nameToSave,
            createdAt: new Date().toISOString(),
        });

        const filename = `${nameToSave}.deadshot`;
        project.save(filename);

        // Update the project name in case it was empty before
        setProjectName(nameToSave);
    };


    const handleLoad = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const loadedProject = await Project.load(file);
                const data = loadedProject.data;
                setProjectName(data.name);
            }
        };
        input.click();
    };

    return (
        <div id="app-bar">
            <a title="Reload Deadshot" href="/deadshot/"> <img id="logo" src="logo.png" /> </a>
            <div id="button-bar">
                <div className="buttonBox">
                    <button title="Open Existing Deadshot Project" className="iconButton" onClick={handleLoad}> <FaFolderOpen /> </button>
                    <button title="Save Current Deadshot Project" className="iconButton" onClick={handleSave}> <FaSave /> </button>
                </div>
                <input
                    id="project-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name"
                />
                <div className="buttonBox">
                    <button title="Open Deadshot Documentation" className="iconButton" onClick={() => window.open("https://cjhosken.github.io/blog/deadshot/")}> <FaBook /> </button>
                    <button title="Open Deadshot Github Repository" className="iconButton" onClick={() => window.open("https://github.com/cjhosken/deadshot")}> <FaGithub /> </button>
                </div>
            </div>
        </div>
    )
};