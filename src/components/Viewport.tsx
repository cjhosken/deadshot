import "./Viewport.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import Timeline from "./Timeline";

interface ViewportProps {
  recorded?: boolean;
  pose?: any;
  history?: any[];
}

export default function Viewport({ recorded, pose, history }: ViewportProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
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

  const [duration, setDuration] = useState(120);

  useEffect(() => {
    if (recorded && history && history.length > 0) {
      setDuration(history.length - 1);
    }
  }, [recorded, history]);



  return (
    <div id="viewport">
      {recorded && (
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
          setFrame={setFrame}
          duration={duration}
          fps={fps}
          currentFrame={currentFrame}
          pose={recorded ? history?.[frame]?.pose : pose}
        />
      </Canvas>
    </div>
  );
}

interface SceneProps {
  isPlaying: boolean;
  setFrame: (f: number) => void;
  duration: number;
  fps: number;
  currentFrame: React.MutableRefObject<number>;
  pose?: any;
}

function Scene({
  isPlaying,
  setFrame,
  duration,
  fps,
  currentFrame,
  pose,
}: SceneProps) {
  const accumulator = useRef(0);

  // --- Load GLTF actor ---
  const { scene: model } = useGLTF("assets/actor.glb");
  const skeletonRef = useRef<THREE.Skeleton | null>(null);

  useEffect(() => {
    model.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinnedMesh = object as THREE.SkinnedMesh;
        skeletonRef.current = skinnedMesh.skeleton;
      }
    });
  }, [model]);

function PoseDebug({ pose }: { pose: any[] }) {
  // --- build joint point cloud ---
  const points = useMemo(() => {
    const arr = new Float32Array(pose.length * 3);
    for (let i = 0; i < pose.length; i++) {
      const p = pose[i];
      arr[i * 3 + 0] = (p.x - 0.5) * 2;
      arr[i * 3 + 1] = (0.5 - p.y) * 2;
      arr[i * 3 + 2] = -p.z * 2;
    }
    return arr;
  }, [pose]);

  // --- define skeleton connections (based on BlazePose topology) ---
  const connections: [number, number][] = [
    [11, 12], // shoulders
    [11, 13], [13, 15], // left arm
    [12, 14], [14, 16], // right arm
    [11, 23], [12, 24], // torso
    [23, 24], // hips
    [23, 25], [25, 27], // left leg
    [24, 26], [26, 28], // right leg
  ];

  // --- build line segments ---
  const linePositions = useMemo(() => {
    const arr = new Float32Array(connections.length * 2 * 3);
    for (let i = 0; i < connections.length; i++) {
      const [a, b] = connections[i];
      const pa = pose[a];
      const pb = pose[b];
      arr[i * 6 + 0] = (pa.x - 0.5) * 2;
      arr[i * 6 + 1] = (0.5 - pa.y) * 2;
      arr[i * 6 + 2] = -pa.z * 2;

      arr[i * 6 + 3] = (pb.x - 0.5) * 2;
      arr[i * 6 + 4] = (0.5 - pb.y) * 2;
      arr[i * 6 + 5] = -pb.z * 2;
    }
    return arr;
  }, [pose]);

  return (
    <group>
      {/* Points (joints) */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial color="lime" size={0.02} />
      </points>

      {/* Lines (bones) */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="aqua" linewidth={2} />
      </lineSegments>
    </group>
  );
}


  // --- Frame update ---
  useFrame((_, delta) => {
    if (!isPlaying) return;
    if (!pose) return;

    accumulator.current += delta;
    const frameTime = 1 / fps;

    if (accumulator.current >= frameTime) {
      accumulator.current = 0;
      currentFrame.current = (currentFrame.current + 1) % duration;
      setFrame(currentFrame.current);
    }
  });


  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1} />

      {/* Model + skeleton */}
      <primitive object={model} />
      {/*<SkeletonHelper object={model} />*/}
      {pose?.length > 0 && <PoseDebug pose={pose} />}

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
