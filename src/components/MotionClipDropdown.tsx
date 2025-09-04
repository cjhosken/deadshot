import { useState } from "react";
import { FaTrash, FaDownload } from "react-icons/fa";

import "./MotionClipDropdown.css"
import MotionClip from "../types/MotionClip";

export default function MotionClipDropdown() {
  const [motionClips, setMotionClips] = useState<MotionClip[]>([
    new MotionClip("test")
  ]);
  const [open, setOpen] = useState(false);

  const handleDelete = (name: string) => {
    setMotionClips(motionClips.filter((clip) => clip.name !== name));
  };

  const handleExport = (clip: MotionClip) => {
    clip.export();
  };

  return (
    <div className="dropdown">
      <button id="select" className={open ? "open" : ""} onClick={() => setOpen(!open)}>Select Motion Clip</button>
      {open && (
        <ul className="dropdownMenu">
          {motionClips.map((clip) => (
            <li key={clip.name} className="dropdownItem">
              <span id="name">{clip.name}</span>
              <button className="iconButton" onClick={() => handleExport(clip)}> <FaDownload/> </button>
              <button className="iconButton" onClick={() => handleDelete(clip.name)}> <FaTrash/> </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}