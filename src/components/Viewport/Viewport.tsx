import "./Viewport.css";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import Timeline from "./Timeline";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

interface ViewportProps {
  recorded?: boolean;
  recording?: boolean;
  pose?: any;
  calibrationPose?: any;
  history?: any[];
  onSave: () => void;
  onTrash: () => void;
}

export default function Viewport({ recorded, pose, calibrationPose, history, onSave, onTrash }: ViewportProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [fps] = useState(24);
  const clock = useRef(new THREE.Clock(false));
  const currentFrame = useRef(0);

  useEffect(() => {
    if (isPlaying) clock.current.start();
    else clock.current.stop();
  }, [isPlaying]);

  const [duration, setDuration] = useState(120);

  useEffect(() => {
    if (recorded && history && history.length > 0) setDuration(history.length - 1);
  }, [recorded, history]);

  return (
    <div id="viewport">
      {recorded && (
        <Timeline
          isPlaying={isPlaying}
          togglePlay={() => setIsPlaying(prev => !prev)}
          frame={frame}
          duration={duration}
          onStop={() => { currentFrame.current = 0; setFrame(0); setIsPlaying(false); clock.current.stop(); }}
          onSave={onSave}
          onTrash={onTrash}
          onMouseDown={() => { }}
          onTouchStart={() => { }}
        />
      )}

      <Canvas camera={{ position: [2, 2, 2], fov: 75 }} onCreated={({ gl }) => gl.setClearColor("#111", 1)}>
        <Scene
          isPlaying={isPlaying}
          fps={fps}
          duration={duration}
          setFrame={setFrame}
          currentFrame={currentFrame}
          livePose={recorded ? history?.[frame]?.pose : pose}
          calibrationPose={calibrationPose}
        />
      </Canvas>
    </div>
  );
}

interface SceneProps {
  isPlaying: boolean;
  fps: number;
  duration: number;
  setFrame: (f: number) => void;
  currentFrame: React.MutableRefObject<number>;
  livePose?: any;
  calibrationPose?: any;
}

type BonePoseMap = {
  [boneName: string]: { fromIndex: number; toIndex: number };
};

const bonePoseMap: BonePoseMap = {
  L_hand_JNT: { fromIndex: 15, toIndex: 17 },
  R_hand_JNT: { fromIndex: 16, toIndex: 18 },
  R_forearm_JNT: { fromIndex: 14, toIndex: 16 },
  L_forearm_JNT: { fromIndex: 13, toIndex: 15 },
  R_arm_JNT: { fromIndex: 12, toIndex: 14 },
  L_arm_JNT: { fromIndex: 11, toIndex: 13 },
  L_thigh_JNT: { fromIndex: 23, toIndex: 25 },
  R_thigh_JNT: { fromIndex: 24, toIndex: 26 },
  L_knee_JNT: { fromIndex: 25, toIndex: 27 },
  R_knee_JNT: { fromIndex: 26, toIndex: 28 },
  L_foot_JNT: { fromIndex: 29, toIndex: 27 },
  R_foot_JNt: { fromIndex: 30, toIndex: 28 },
};

function averagePoints(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}

function normalize(pose : any[]) {

    const scale = 0.3 / distance(pose[11], pose[12]);

    const offsetX = -averagePoints(pose[11], pose[12]).x;
    const offsetY = Math.max(...pose.map((p: any) => p.y));
    const offsetZ = 0;


    return pose.map((p: any) => ({
      x: (p.x + offsetX) * scale,
      y: (-p.y + offsetY) * scale,
      z: (-p.z + offsetZ) * scale
    }));
}

function distance(a, b) {
  const x = (a.x - b.x);
  const y = (a.y - b.y);
  const z = (a.z - b.z);
  return Math.sqrt(x * x + y * y + z * z);
}

function Scene({ isPlaying, fps, duration, setFrame, currentFrame, livePose, calibrationPose }: SceneProps) {
  const accumulator = useRef(0);

  const gltf = useLoader(GLTFLoader, 'assets/actor.glb');
  const actor = gltf.scene;

  const processedCalibrationPose = useMemo(() => {
    if (!calibrationPose) return null;

    const normalized = normalize(calibrationPose);

    return normalized;
  }, [calibrationPose]);

  const processedPose = useMemo(() => {
    if (!livePose) return null;

    const normalized = normalize(livePose);

    if (processedCalibrationPose && processedCalibrationPose.length === livePose.length) {
      console.log("Applying calibration to live pose");
    }

    return normalized;
  }, [livePose]);

  useEffect(() => {
    if (processedPose) {
      applyPoseToActor(processedPose);
      actorPostProcess();
    }
  }, [processedPose]);


  function applyPoseToActor(pose: any[]) {
    if (!actor || !pose) return;
    const skinnedMesh = actor.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh;
    if (!skinnedMesh) return;

    let boneForward = new THREE.Vector3(0, 1, 0);

    const skeleton = skinnedMesh.skeleton;
    for (const boneName in bonePoseMap) {
      boneForward = new THREE.Vector3(0, 0, 1);
      const bone = skeleton.getBoneByName(boneName);
      if (!bone) continue;

      const { fromIndex, toIndex } = bonePoseMap[boneName];
      const from = pose[fromIndex];
      const to = pose[toIndex];

      if (!from || !to) continue;

      const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(boneForward, dir);
      bone.quaternion.slerp(quaternion, 0.5);
    }

    const hips = skeleton.getBoneByName("C_hips_JNT");

    const hips_from = averagePoints(pose[23], pose[24]);
    const hips_to = averagePoints(pose[11], pose[12]);

    const hips_dir = new THREE.Vector3(hips_to.x - hips_from.x, hips_to.y - hips_from.y, hips_to.z - hips_from.z).normalize();
    const hips_quat = new THREE.Quaternion().setFromUnitVectors(boneForward, hips_dir);
    hips.quaternion.slerp(hips_quat, 0.5);

    const neck = skeleton.getBoneByName("C_neck_JNT");

    const neck_from = averagePoints(pose[11], pose[12]);
    const neck_to = pose[0];

    const head_dir = new THREE.Vector3(neck_to.x - neck_from.x, neck_to.y - neck_from.y, neck_to.z - neck_from.z).normalize();
    const head_quat = new THREE.Quaternion().setFromUnitVectors(boneForward, head_dir);
    neck.quaternion.slerp(head_quat, 0.8);
  }

  function actorPostProcess() {
    console.log("Actor post-processing step");
  }

  // --- PoseDebug component for rendering joints + bones ---
  const PoseDebug = ({ pose, color = "lime" }: { pose: any[]; color?: string }) => {
    const points = useMemo(() => {
      const arr = new Float32Array(pose.length * 3);
      for (let i = 0; i < pose.length; i++) {
        const p = pose[i];
        arr[i * 3 + 0] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      return arr;
    }, [pose]);

    const connections: [number, number][] = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
      [24, 26], [26, 28],
    ];

    const linePositions = useMemo(() => {
      const arr = new Float32Array(connections.length * 2 * 3);
      connections.forEach(([a, b], i) => {
        const pa = pose[a];
        const pb = pose[b];
        arr.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      });
      return arr;
    }, [pose]);

    return (
      <group>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[points, 3]} />
          </bufferGeometry>
          <pointsMaterial color={color} size={0.02} />
        </points>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={color} linewidth={2} />
        </lineSegments>
      </group>
    );
  };

  // --- Frame update for playback ---
  useFrame((_, delta) => {
    if (!isPlaying || !livePose) return;
    accumulator.current += delta;
    const frameTime = 1 / fps;
    if (accumulator.current >= frameTime) {
      accumulator.current = 0;
      currentFrame.current = (currentFrame.current + 1) % duration;
      setFrame(currentFrame.current);

      console.log("Applying pose for frame", currentFrame.current);

      applyPoseToActor(processedPose);
      actorPostProcess();
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1} />

      {/* Live Pose Skeleton */}
      {livePose?.length > 0 && <PoseDebug pose={processedPose} color="aqua" />}

      {calibrationPose?.length > 0 && <PoseDebug pose={processedCalibrationPose} color="red" />}

      <primitive object={gltf.scene} />

      {/* Ground grid */}
      <Grid />

      {/* Environment */}
      <Environment files="assets/hdri.exr" background={false} />
      <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} zoomSpeed={1.0} panSpeed={0.5} target={[0, 0.5, 0]} />
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