import "./AppBar.css";
import { FaBook, FaGithub } from "react-icons/fa";

export default function AppBar() {
    return (
        <div id="app-bar">
            <a title="Reload Deadshot" href="/deadshot/"> <img id="logo" src="logo.png" /></a>
            DEADSHOT
            <div id="button-bar">
                <button title="Open Deadshot Documentation" className="iconButton" onClick={() => window.open("https://cjhosken.github.io/blog/deadshot/")}><FaBook/></button>
                <button title="Open Deadshot Github Repository" className="iconButton" onClick={() => window.open("https://github.com/cjhosken/deadshot")}><FaGithub/></button>
            </div>
        </div>
    )
};