import { useEffect, useRef, useState } from "react";
import { FaTrash, FaDownload } from "react-icons/fa";

import "./MotionClipDropdown.css"
import MotionClip from "../types/MotionClip";

export default function MotionClipDropdown() {
  const [motionClips, setMotionClips] = useState<MotionClip[]>([
    new MotionClip("test")
  ]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // ref for the dropdown container


  const handleDelete = (name: string) => {
    setMotionClips(motionClips.filter((clip) => clip.name !== name));
  };

  const handleExport = (clip: MotionClip) => {
    clip.export();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button id="select" className={open ? "open" : ""} onClick={() => setOpen(!open)}>Select Motion Clip</button>
      {open && (
        <ul className="dropdownMenu">
          <li key="NONE" className="dropdownItem">
            <span id="name">None</span>
          </li>
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