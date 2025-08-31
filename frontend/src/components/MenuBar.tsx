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
                if (!saveResult.cancelled && saveResult.filePath) {
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
            if (!openResult.cancelled && openResult.filePaths.length > 0) {
                project = await openProject(openResult.filePaths[0]);
                console.log(project.getData());
            }
        }
    };

    return (
        <div id="menuBar">
            <button className="iconButton" onClick={() => handleMenuClick("open")}><FontAwesomeIcon icon={faFolderOpen}/></button>
            <button className="iconButton" onClick={() => handleMenuClick("save")}><FontAwesomeIcon icon={faSave}/></button>
            <div className="seperator"></div>
            <button className={`iconButton ${workflow === "mocap" ? "active" : ""}`} onClick={() => setWorkflow("mocap")}><FontAwesomeIcon icon={faPersonRunning}/></button>
            <button className={`iconButton ${workflow === "track" ? "active" : ""}`} onClick={() => setWorkflow("track")}><FontAwesomeIcon icon={faArrowsToEye}/></button>
            <div className="seperator"></div>
            <button className="iconButton"><FontAwesomeIcon icon={faQuestion}/></button>
            <button className="iconButton"><FontAwesomeIcon icon={faBug}/></button>
        </div>
    );
}
