import type Project from "../types/Project";
import "./Workflow.css";

export default function Workflow({ project, workflow }: { project: Project, workflow: "mocap" | "track" }) {
    return (
        <div className="workflow">
            {project.path}
            {workflow}
        </div>
    )
}