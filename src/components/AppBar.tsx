import { FaFolderOpen, FaSave, FaBook, FaGithub, FaVideo, FaImages } from "react-icons/fa";

import "./AppBar.css";
import { FaPerson } from "react-icons/fa6";

export default function AppBar(
    {setContext} : {setContext: (context: "mocap" | "process") => void}
) {

    return (
        <div id="app-bar">
            <a title="Reload Deadshot" href="/deadshot/"> <img id="logo" src="logo.png" /> </a>
            <div id="button-bar">
                <div className="buttonBox">
                    <button title="Switch to Live Motion Capture Context" className="iconButton" onClick={() => setContext("mocap")}> <FaPerson/> </button>
                    <button title="Switch to Video Processing Context" className="iconButton" onClick={() => setContext("process")}> <FaImages/> </button>
                </div>
                <div className="buttonBox">
                    <button title="Open Deadshot Documentation" className="iconButton" onClick={() => window.open("https://cjhosken.github.io/blog/deadshot/")}> <FaBook /> </button>
                    <button title="Open Deadshot Github Repository" className="iconButton" onClick={() => window.open("https://github.com/cjhosken/deadshot")}> <FaGithub /> </button>
                </div>
            </div>
        </div>
    )
};