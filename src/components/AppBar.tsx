import { FaFolderOpen, FaSave, FaBook, FaGithub } from "react-icons/fa";
import { Project } from "../types/Project";

import "./AppBar.css";

export default function AppBar() {

    const handleSave = () => {
        const project = new Project({
            name: "",
            description: "",
            createdAt: new Date().toISOString(),
        });

        project.save("demo.deadshot");
    };

    const handleLoad = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const loadedProject = await Project.load(file);
                console.log("Loaded project: ", loadedProject.data);
            }
        };
        input.click();
    };

    return (
        <div id="app-bar">
            <a href="/deadshot/"> <img id="logo" src="logo.png" /> </a>
            <div id="button-bar">
                <div className="buttonBox">
                    <button className="iconButton" onClick={handleLoad}> <FaFolderOpen /> </button>
                    <button className="iconButton" onClick={handleSave}> <FaSave /> </button>
                </div>
                <div className="buttonBox">
                    <button className="iconButton" onClick={() => window.open("https://cjhosken.github.io/blog/deadshot/")}> <FaBook /> </button>
                    <button className="iconButton" onClick={() => window.open("https://github.com/cjhosken/deadshot")}> <FaGithub /> </button>
                </div>
            </div>
        </div>
    )
};