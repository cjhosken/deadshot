import "./Viewport.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import Timeline from "./Timeline";

interface ViewportProps {
  showTimeline?: boolean;
}

export default function Viewport({ showTimeline = true }: ViewportProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [duration, setDuration] = useState(120);
  const [fps] = useState(24);

  const clock = useRef(new THREE.Clock(false));
  const currentFrame = useRef(0);

  // --- Start / stop playback ---
  useEffect(() => {
    if (isPlaying) clock.current.start();
    else clock.current.stop();
  }, [isPlaying]);

  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
  const onStop = useCallback(() => {
    currentFrame.current = 0;
    setFrame(0);
    setIsPlaying(false);
    clock.current.stop();
  }, []);

  return (
    <div id="viewport">
      {showTimeline && (
        <Timeline
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          frame={frame}
          duration={duration}
          onStop={onStop}
          onMouseDown={() => {}}
          onTouchStart={() => {}}
        />
      )}

      <Canvas
        camera={{ position: [2, 2, 2], fov: 75 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#111", 1);
        }}
      >
        <Scene
          isPlaying={isPlaying}
          frame={frame}
          setFrame={setFrame}
          duration={duration}
          setDuration={setDuration}
          fps={fps}
          currentFrame={currentFrame}
        />
      </Canvas>
    </div>
  );
}

interface SceneProps {
  isPlaying: boolean;
  frame: number;
  setFrame: (f: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  fps: number;
  currentFrame: React.MutableRefObject<number>;
}

function Scene({
  isPlaying,
  frame,
  setFrame,
  duration,
  setDuration,
  fps,
  currentFrame,
}: SceneProps) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const accumulator = useRef(0);

  // --- Load GLTF actor ---
  const { scene: model, animations } = useGLTF("assets/actor.glb");

  // --- Setup animation mixer once ---
  useEffect(() => {
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(animations[0]);
      action.play();
      action.paused = true;
      mixerRef.current = mixer;
      actionRef.current = action;
      setDuration(Math.floor(animations[0].duration * fps));
    }
  }, [animations, model, fps, setDuration]);

  // --- Frame update ---
  useFrame((_, delta) => {
    if (!isPlaying) return;

    accumulator.current += delta;
    const frameTime = 1 / fps;

    while (accumulator.current >= frameTime) {
      currentFrame.current++;
      if (currentFrame.current > duration) currentFrame.current = 0;
      accumulator.current -= frameTime;
    }

    if (mixerRef.current && actionRef.current) {
      actionRef.current.time = currentFrame.current / fps;
      mixerRef.current.update(0);
    }

    console.log(frame);

    setFrame(currentFrame.current);
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1} />

      {/* Model + skeleton */}
      <primitive object={model} />
      <SkeletonHelper object={model} />

      {/* Ground grid */}
      <Grid />

      {/* Environment map */}
      <Environment files="assets/hdri.exr" background={false} />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.5}
        zoomSpeed={1.0}
        panSpeed={0.5}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

function Grid() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = useRef({ fadeDistance: { value: 25 } });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms.current}
        vertexShader={`
          varying float vDist;
          varying vec3 vPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDist = length(mvPosition.xyz);
            vPosition = position;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vDist;
          varying vec3 vPosition;
          uniform float fadeDistance;
          void main() {
            float medium = 0.005;
            float thick = 0.01;
            float fxMed = abs(fract(vPosition.x / 1.0 - 0.5) - 0.5);
            float fzMed = abs(fract(vPosition.z / 1.0 - 0.5) - 0.5);
            float medLine = (1.0 - step(medium, min(fxMed, fzMed))) * 0.5;
            float centerX = 1.0 - step(thick, abs(vPosition.x));
            float centerZ = 1.0 - step(thick, abs(vPosition.z));
            float centerLine = max(centerX, centerZ);
            float grid = max(centerLine, medLine);
            grid *= 1.0 - smoothstep(length(vPosition), 0.0, fadeDistance);
            gl_FragColor = vec4(vec3(0.5), grid);
          }
        `}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SkeletonHelper({ object }: { object: THREE.Object3D }) {
  const helper = new THREE.SkeletonHelper(object);
  return <primitive object={helper} />;
}
