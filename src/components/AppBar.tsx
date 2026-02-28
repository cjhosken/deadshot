import "./AppBar.css";
import { FaBook, FaGithub } from "react-icons/fa";

// The appbar appears at the top of the page. 
// It contains a reload button (the logo), as well as links to documentation and source code.

export default function AppBar() {
    return (
        <div id="app-bar">
            <a title="Reload Deadshot" href="/deadshot/"> <img id="logo" src="logo.png" /></a>
            <div id="button-bar">
                <button title="Open Deadshot Documentation" className="iconButton" onClick={() => window.open("https://cjhosken.github.io/blog/deadshot/")}><FaBook/></button>
                <button title="Open Deadshot Github Repository" className="iconButton" onClick={() => window.open("https://github.com/cjhosken/deadshot")}><FaGithub/></button>
            </div>
        </div>
    )
};