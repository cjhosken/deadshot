import Project from "../types/Project";
import "./MenuBar.css";
import { openProject, saveProject } from "../types/Project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faSave } from "@fortawesome/free-regular-svg-icons";
import { faArrowsToEye, faBug, faPersonRunning, faQuestion } from "@fortawesome/free-solid-svg-icons";

export default function MenuBar({ project, workflow, setWorkflow }: { project: Project; workflow: "mocap" | "track"; setWorkflow: (workflow: "mocap" | "track") => void;}) {
    const handleMenuClick = async (action: string) => {
        if (action === "save") {
            if (!window.electron) return;

            if (project.path) {
                saveProject(project);
            } else {
                const saveResult = await window.electron.showSaveDialog({
                    title: "Save project",
                    defaultPath: "project.deadshot",
                    filters: [{ name: "Deadshot Project (.deadshot)", extensions: ["deadshot"] }]
                })
                if (!saveResult.canceled && saveResult.filePath) {
                    project = new Project(saveResult.filePath);
                }
            }
            project.setData({ "lol": "test" });
            saveProject(project);
        } else if (action === "open") {
            if (!window.electron) return;
            const openResult = await window.electron.showOpenDialog({
                title: "Open project",
                defaultPath: "project.deadshot",
                filters: [{ name: "Deadshot Project (.deadshot)", extensions: ["deadshot"] }]
            })
            if (!openResult.canceled && openResult.filePaths.length > 0) {
                project = await openProject(openResult.filePaths[0]);
                console.log(project.getData());
            }
        }
    };


    function openDocumentation() {
        window.electron.openExternal("https://github.com/cjhosken/deadshot?tab=readme-ov-file#readme");
    }

    async function reportBug() {
        const osInfo = await window.electron.getOS();
        const title = encodeURIComponent("New Issue")
        const body = encodeURIComponent(`Steps to reproduce (please write a short paragraph and include images if possible):

            
System Info:
 - Platform: ${osInfo.platform}
 - Platform Release: ${osInfo.release} 
 - Arch: ${osInfo.arch}
 - Deadshot Version: 0.0.1
        `);
        
        const url = `https://github.com/cjhosken/deadshot/issues/new?title=${title}&body=${body}`;
        window.electron.openExternal(url);
    }

    return (
        <div id="menuBar">
            <button title="Opens an existing Deadshot project." className="iconButton" onClick={() => handleMenuClick("open")}><FontAwesomeIcon icon={faFolderOpen}/></button>
            <button title="Saves the current Deadshot project." className="iconButton" onClick={() => handleMenuClick("save")}><FontAwesomeIcon icon={faSave}/></button>
            <div className="separator"></div>
            <button title="Enters the Motion Capture area." className={`iconButton ${workflow === "mocap" ? "active" : ""}`} onClick={() => setWorkflow("mocap")}><FontAwesomeIcon icon={faPersonRunning}/></button>
            <button title="Enters the Camera Tracking area." className={`iconButton ${workflow === "track" ? "active" : ""}`} onClick={() => setWorkflow("track")}><FontAwesomeIcon icon={faArrowsToEye}/></button>
            <div className="separator"></div>
            <button title="Opens the Documentation." onClick={() => openDocumentation()} className="iconButton"><FontAwesomeIcon icon={faQuestion}/></button>
            <button title="Reports a bug." className="iconButton" onClick={()=>reportBug()}><FontAwesomeIcon icon={faBug}/></button>
        </div>
    );
}
