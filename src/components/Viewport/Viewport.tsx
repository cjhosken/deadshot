import "./Viewport.css";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import Timeline from "./Timeline";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { GLTFExporter } from "three/examples/jsm/Addons.js";
import { QuaternionKeyframeTrack, AnimationClip } from 'three';


interface ViewportProps {
  recorded?: boolean;
  recording?: boolean;
  pose?: any;
  calibrationPose?: any;
  history?: any[];
  onTrash: () => void;
}

export default function Viewport({ recorded, pose, calibrationPose, history, onTrash }: ViewportProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [fps] = useState(24);
  const clock = useRef(new THREE.Clock(false));
  const currentFrame = useRef(0);

  const sceneRef = useRef<any>(null); // Ref for Scene

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
          onSave={() => sceneRef.current?.handleSave()}
          onTrash={onTrash}
          onMouseDown={() => { }}
          onTouchStart={() => { }}
        />
      )}

      <Canvas camera={{ position: [2, 2, 2], fov: 75 }} onCreated={({ gl }) => gl.setClearColor("#111", 1)}>
        <Scene
          ref={sceneRef}
          isPlaying={isPlaying}
          fps={fps}
          duration={duration}
          setFrame={setFrame}
          currentFrame={currentFrame}
          livePose={recorded ? history?.[frame]?.pose : pose}
          calibrationPose={calibrationPose}
          history={history}
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
  history?: any[];
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

function distance(a, b) {
  return Math.sqrt(
    (a.x - b.x) * (a.x - b.x) +
    (a.y - b.y) * (a.y - b.y) +
    (a.z - b.z) * (a.z - b.z)
  );
}

const Scene = forwardRef(function Scene({ isPlaying, fps, duration, setFrame, currentFrame, livePose, calibrationPose, history }: SceneProps, ref) {
  const accumulator = useRef(0);

  const gltf = useLoader(GLTFLoader, 'assets/actor.glb');
  const actor = gltf.scene;

  const processedCalibrationPose = useMemo(() => {
    if (!calibrationPose) return null;
    return calibrationPose.map((p: any) => ({
      x: p.x,
      y: -p.y,
      z: -p.z
    }));
  }, [calibrationPose]);

  const processedPose = useMemo(() => {
    if (!livePose) return null;
    return livePose.map((p: any) => ({
      x: p.x,
      y: -p.y,
      z: -p.z
    }));
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

    const skeleton = skinnedMesh.skeleton;
    const tmpV1 = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();

    // helper: compute world-space forward for a bone:
    function computeBoneWorldForward(bone: THREE.Bone): THREE.Vector3 {
      // prefer vector from bone -> first child (common rig convention)
      if (bone.children && bone.children.length > 0) {
        bone.getWorldPosition(tmpV1);
        bone.children[0].getWorldPosition(tmpV2);
        const v = tmpV2.sub(tmpV1);
        if (v.lengthSq() > 1e-8) return v.normalize();
      }
      // fallback: use bone's -Z world direction (Object3D.getWorldDirection returns -Z)
      const dir = new THREE.Vector3();
      bone.getWorldDirection(dir); // returns direction of -Z axis in world space
      dir.negate(); // now it's +Z
      if (dir.lengthSq() > 1e-8) return dir.normalize();
      // ultimate fallback
      return new THREE.Vector3(0, 1, 0);
    }

    // helper: map pose points -> world-space Vector3
    // NOTE: YOU MUST ADJUST THIS mapping to match your pose data coordinate system.
    function posePointToVector(p: any): THREE.Vector3 {
      // Common mapping assumption: pose.x = right (X), pose.y = up (Y), pose.z = forward (Z)
      // If your pose data uses a different ordering (e.g. y<->z swapped), change here.
      return new THREE.Vector3(p.x, p.y, p.z);
    }

    for (const boneName in bonePoseMap) {
      const bone = skeleton.getBoneByName(boneName);
      if (!bone) continue;

      const { fromIndex, toIndex } = bonePoseMap[boneName];
      const fromP = pose[fromIndex];
      const toP = pose[toIndex];
      if (!fromP || !toP) continue;

      // build target direction in world space (from pose)
      const fromV = posePointToVector(fromP);
      const toV = posePointToVector(toP);
      const targetDirWorld = new THREE.Vector3().subVectors(toV, fromV);
      if (targetDirWorld.lengthSq() < 1e-8) continue;
      targetDirWorld.normalize();

      // compute current bone forward in world space
      const boneForwardWorld = computeBoneWorldForward(bone); // already normalized

      // convert BOTH world-space vectors into bone.parent's local space
      // so setFromUnitVectors is applied in the same space that bone.quaternion is defined in.
      const parent = bone.parent || skinnedMesh; // ensure there's a parent
      const parentWorldQuat = new THREE.Quaternion();
      parent.getWorldQuaternion(parentWorldQuat);
      const parentWorldQuatInv = parentWorldQuat.clone().invert();

      const boneForwardLocal = boneForwardWorld.clone().applyQuaternion(parentWorldQuatInv).normalize();
      const targetDirLocal = targetDirWorld.clone().applyQuaternion(parentWorldQuatInv).normalize();



      // now create quaternion that rotates boneForwardLocal -> targetDirLocal
      tmpQuat.setFromUnitVectors(boneForwardLocal, targetDirLocal);

      // slerp the bone's local quaternion toward the target
      bone.quaternion.slerp(tmpQuat, 0.5);
    }

    // Example for hips and neck using same mapping + parent-space approach:
    function applyBoneByPose(boneName: string, fromIdxA: number, fromIdxB: number, toIdxA: number, toIdxB: number, weight = 0.5) {
      const bone = skeleton.getBoneByName(boneName);
      if (!bone) return;
      const from = averagePoints(pose[fromIdxA], pose[fromIdxB]);
      const to = averagePoints(pose[toIdxA], pose[toIdxB]);
      if (!from || !to) return;
      const targetDirWorld = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
      const boneForwardWorld = computeBoneWorldForward(bone);

      const parent = bone.parent || skinnedMesh;
      const parentWorldQuat = new THREE.Quaternion();
      parent.getWorldQuaternion(parentWorldQuat);
      const parentWorldQuatInv = parentWorldQuat.clone().invert();

      const boneForwardLocal = boneForwardWorld.clone().applyQuaternion(parentWorldQuatInv).normalize();
      const targetDirLocal = targetDirWorld.clone().applyQuaternion(parentWorldQuatInv).normalize();

      tmpQuat.setFromUnitVectors(boneForwardLocal, targetDirLocal);
      bone.quaternion.slerp(tmpQuat, weight);
    }

    // hips in your original code used averages of some indices:
    applyBoneByPose("C_hips_JNT", 23, 24, 11, 12, 0.8);
    applyBoneByPose("C_neck_JNT", 11, 12, 0, 0, 0.8);
  }

  function actorPostProcess() {
    if (!actor || !livePose) return;
    const skinnedMesh = actor.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh;
    if (!skinnedMesh) return;

    const skeleton = skinnedMesh.skeleton;

    const hipBone = skeleton.getBoneByName("C_hips_JNT");

    const hip = averagePoints(livePose[23], livePose[24]);

    hipBone.position.setX(-(hip.x - 0.5) * 100);

    let lowestY = Infinity;
    const tmp = new THREE.Vector3();

    for (const bone of skeleton.bones) {
      bone.getWorldPosition(tmp);
      if (tmp.y < lowestY) lowestY = tmp.y;
    }

    hipBone.translateZ(lowestY * 100);

    const scale = 1 / distance(livePose[12], livePose[24]);

    hipBone.position.setY(-scale * 50);
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

  function bakeAnimation(skinnedMesh: THREE.SkinnedMesh, history: any[], fps: number) {
    const skeleton = skinnedMesh.skeleton;
    const tracks: THREE.KeyframeTrack[] = [];

    // Prepare empty arrays for each bone
    const timesPerBone: number[][] = skeleton.bones.map(() => []);
    const valuesPerBone: number[][] = skeleton.bones.map(() => []);


    history.forEach((frameData, frameIndex) => {
      let pose = frameData.pose;

      pose = pose.map((p: any) => ({
        x: p.x,
        y: -p.y,
        z: -p.z
      }));

      // Apply the pose to skeleton
      applyPoseToActor(pose);
      actorPostProcess();

      skeleton.bones.forEach((bone, i) => {
        timesPerBone[i].push(frameIndex / fps);
        valuesPerBone[i].push(bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
      });
    });

    skeleton.bones.forEach((bone, i) => {
      tracks.push(
        new QuaternionKeyframeTrack(
          `${bone.name}.quaternion`,
          timesPerBone[i],
          valuesPerBone[i]
        )
      );
    });

    return new AnimationClip('ActorAnimation', history.length / fps, tracks);
  }


  function handleSave() {
    console.log("Saving GLTF...");
    const skinnedMesh = actor.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh;
    if (!skinnedMesh) return;

    const clip = bakeAnimation(skinnedMesh, history, fps);
    if (!clip) return;

    const exporter = new GLTFExporter();
    exporter.parse(
      actor,
      (result) => {
        const blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "scene.gltf";
        a.click();
        URL.revokeObjectURL(url);
      },
      () => { },
      { binary: false, animations: [clip] }
    );
  }

  useImperativeHandle(ref, () => ({
    handleSave
  }));

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
});

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