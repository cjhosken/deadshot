import "./Viewport.css";
import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import Timeline from "./Timeline";
import { MotionCaptureScene } from "./MotionCaptureScene";

interface ViewportProps {
  hasRecorded?: boolean; // Check if recording is finished
  isRecording?: boolean; // Check if recording is active
  pose?: any; // Pose Data
  onTrash: () => void; // Delete Event
  showDebug: boolean; // Show the 3D Debug Skeleton
}

export default function Viewport({ isRecording, hasRecorded, pose, onTrash, showDebug }: ViewportProps) {
  const [frame, setFrame] = useState(0);
  const [fps] = useState(24); // 24fps for playblack
  const sceneRef = useRef<any>(null);

  const [duration, setDuration] = useState(120); // Default sequence duration is 120, even though this will get overriden by the recording.

  return (
    <div id="viewport">
      {hasRecorded && (
        <Timeline
          frame={frame}
          fps={fps}
          duration={duration}
          onSave={() => sceneRef.current?.handleSave()}
          onTrash={onTrash}
          setFrame={setFrame}
        />
      )}

      <Canvas camera={{ position: [2, 2, 2], fov: 75 }} onCreated={({ gl }) => gl.setClearColor("#111", 1)}>
        <MotionCaptureScene
          ref={sceneRef}
          isRecording={isRecording}
          hasRecorded={hasRecorded}
          fps={fps}
          durationCallback={setDuration}
          playbackFrame={frame}
          pose={pose}
          showDebug={showDebug}
        />
      </Canvas>
    </div>
  );
}