import { FaPause, FaPlay, FaSave, FaStop, FaTrash } from "react-icons/fa";
import "./Timeline.css"

interface TimelineProps {
  isPlaying: boolean;
  togglePlay: () => void;
  frame: number;
  duration: number;
  onStop: () => void;
  onSave: () => void;
  onTrash: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export default function Timeline({
  isPlaying,
  togglePlay,
  frame,
  duration,
  onStop,
  onSave,
  onTrash,
  onMouseDown,
  onTouchStart
}: TimelineProps) {
  return (
    <div id="timeline">
      <div id="bar">
        <button className="iconButton" onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button className="iconButton" onClick={onStop}>
          <FaStop />
        </button>
        <div 
          className="frameInfo" 
          style={{
            width: `${String(duration).length}ch`,
            textAlign: "right"
          }}
        >
          {frame}
        </div>
        <div id="scrollbar" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
          <div id="handle" style={{ left: `${(frame / duration) * 100}%` }}></div>
        </div>
        <div className="frameInfo">{duration}</div>
        <button className="iconButton" onClick={onSave}>
          <FaSave/>
        </button>
        <button className="iconButton" onClick={onTrash}>
          <FaTrash/>
        </button>
      </div>
    </div>
  );
}