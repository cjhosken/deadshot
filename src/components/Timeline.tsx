import { FaPause, FaPlay, FaSave, FaStop, FaTrash } from "react-icons/fa";
import "./Timeline.css"
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

interface TimelineProps {
  frame: number;
  fps: number;
  duration: number;
  onSave: () => void;
  onTrash: () => void;
  setFrame: Dispatch<SetStateAction<number>>;
}

export default function Timeline({
  frame,
  duration,
  fps,
  onSave,
  onTrash,
  setFrame,
}: TimelineProps) {

  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  function togglePlay() {
    setIsPlaying(prev => !prev);
  }

  function onStop() {
    setIsPlaying(false);
    setFrame(0);
  }

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const frameDurationMs = 1000 / fps;

    intervalRef.current = window.setInterval(() => {
      setFrame(prev => {
        if (prev > duration) {
          return 0;
        }
        return prev + 1;
      });
    }, frameDurationMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, fps, duration, setFrame]);

  function setFrameFromClientX(clientX: number, target: HTMLDivElement) {
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = x / rect.width;
    setFrame(Math.round(ratio * duration));
  }


  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setIsPlaying(false);

    const target = e.currentTarget;
    setFrameFromClientX(e.clientX, target);

    function onMouseMove(ev: MouseEvent) {
      setFrameFromClientX(ev.clientX, target);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setIsPlaying(false);

    const target = e.currentTarget;
    setFrameFromClientX(e.touches[0].clientX, target);

    function onTouchMove(ev: TouchEvent) {
      setFrameFromClientX(ev.touches[0].clientX, target);
    }

    function onTouchEnd() {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    }

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  }

  return (
    <div id="timeline">
      <div id="bar">
        <button className="iconButton" onClick={togglePlay}>{isPlaying ? <FaPause /> : <FaPlay />}</button>
        <button className="iconButton" onClick={onStop}><FaStop /></button>

        <div className="frameInfo" style={{ width: `${String(duration).length}ch`, textAlign: "right" }}>{frame}</div>

        <div id="scrollbar" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
          <div id="handle" style={{ left: `${(frame / duration) * 100}%` }}></div>
        </div>

        <div className="frameInfo">{duration}</div>

        <button className="iconButton" onClick={onSave}><FaSave /></button>
        <button className="iconButton" onClick={onTrash}><FaTrash /></button>
      </div>
    </div>
  );
}