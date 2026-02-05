import { useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { GLTFExporter } from "three/examples/jsm/Addons.js";

const BONE_FORWARD_AXIS = new THREE.Vector3(0, 1, 0); // common for glTF

const BLAZE_TO_RIG = {  
  // Arms
  L_upperArm: { bone: "L_arm_JNT", parent: 11, child: 13 },
  L_forearm: { bone: "L_forearm_JNT", parent: 13, child: 15 },

  R_upperArm: { bone: "R_arm_JNT", parent: 12, child: 14 },
  R_forearm: { bone: "R_forearm_JNT", parent: 14, child: 16 },

  // Legs
  L_thigh: { bone: "L_thigh_JNT", parent: 23, child: 25 },
  L_knee: { bone: "L_knee_JNT", parent: 25, child: 27 },
  L_foot: {bone: "L_foot_JNT", parent: 27, child: 31},

  R_thigh: { bone: "R_thigh_JNT", parent: 24, child: 26 },
  R_knee: { bone: "R_knee_JNT", parent: 26, child: 28 },
  R_foot: {bone: "R_foot_JNT", parent: 28, child: 32}
};

const FORWARD_AXES = {
  L_arm_JNT: new THREE.Vector3(0, 1, 0),
  L_forearm_JNT: new THREE.Vector3(0, 1, 0),

  R_arm_JNT: new THREE.Vector3(0, 1, 0),
  R_forearm_JNT: new THREE.Vector3(0, 1, 0),

  L_thigh_JNT: new THREE.Vector3(0, 1, 0),
  L_knee_JNT: new THREE.Vector3(0, 1, 0),
  L_foot_JNT: new THREE.Vector3(0, 1, 0),

  R_thigh_JNT: new THREE.Vector3(0, 1, 0),
  R_knee_JNT: new THREE.Vector3(0, 1, 0),
  R_foot_JNT: new THREE.Vector3(0, 1, 0),
  C_head_JNT: new THREE.Vector3(0, 0, 1),
};

interface SceneProps {
  isRecording: boolean;
  hasRecorded: boolean;
  fps: number;
  playbackFrame: number;
  pose?: any;
  showDebug: boolean;
  durationCallback: (value: number) => void;
}

export const MotionCaptureScene = forwardRef(function Scene({ isRecording, hasRecorded, fps, durationCallback, playbackFrame, pose, showDebug }: SceneProps, ref) {
  const gltf = useLoader(GLTFLoader, 'assets/actor.glb');
  const actor = gltf.scene;

  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const action = useRef<THREE.AnimationAction | null>(null);
  const clip = useRef<THREE.AnimationClip | null>(null);

  const frameIndex = useRef(0);
  const accumulator = useRef(0);

  type BoneTrackData = {
    times: number[];
    positions: number[];
    rotations: number[];
  };

  const smoothedPoseRef = useRef<any[] | null>(null);
  const prevPoseRef = useRef<any[] | null>(null);

  const recordedTracks = useRef<Map<string, BoneTrackData>>(new Map());

  const normalizedPose = useMemo(() => { return normalizePose(pose) }, [pose]);

  useEffect(() => {
    if (isRecording) {
      recordedTracks.current.clear();
      frameIndex.current = 0;
      accumulator.current = 0;
    } else {
      clip.current = buildAnimationClip();

      const duration = clip.current.duration;
      durationCallback(Math.floor(duration * fps));
      mixer.current = new THREE.AnimationMixer(actor);
      action.current = mixer.current.clipAction(clip.current);
      action.current.play();
      action.current.paused = true;
    }
  }, [isRecording, hasRecorded]);


  useFrame((_, delta) => {
    if (isRecording) {

      const step = 1 / fps;
      accumulator.current += delta;

      while (accumulator.current >= step) {
        const t = frameIndex.current / fps;
        recordSkeletonFrame(t);
        frameIndex.current++;
        accumulator.current -= step;
      }
    } else {
      if (mixer.current && action.current) {
        const time = playbackFrame / fps;
        action.current.time = time;
        mixer.current.update(0);
      }
    }
  });

  useEffect(() => {
    if (hasRecorded) return;

    if (normalizedPose) {
      const smooth = smoothPoseAdaptiveConfidence(normalizedPose);
      applyPoseToActor(smooth);
      applyPoseToSkeleton(smooth);
      actorPostProcess();
    }
  }, [normalizedPose]);

  function applyPoseToActor(pose: any[]) {
    if (!actor || !pose) return;

    const skinnedMesh = actor.getObjectByProperty(
      "type",
      "SkinnedMesh"
    ) as THREE.SkinnedMesh;

    if (!skinnedMesh) return;

    const skeleton = skinnedMesh.skeleton;
    const hips = skeleton.getBoneByName("C_hips_JNT");
    if (!hips) return;

    // --- ROTATION ---
    const frame = computeTorsoFrame(pose);
    const worldQuat = torsoFrameToQuaternion(frame);

    // Convert world rotation → local bone rotation
    const parent = hips.parent as THREE.Object3D;
    const parentWorldQuat = new THREE.Quaternion();
    parent.getWorldQuaternion(parentWorldQuat);

    const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
    hips.quaternion.copy(localQuat);
  }

  function applyPoseToSkeleton(pose: any[]) {
    const skinnedMesh = actor.getObjectByProperty(
      "type",
      "SkinnedMesh"
    ) as THREE.SkinnedMesh;

    if (!skinnedMesh) return;

    const skeleton = skinnedMesh.skeleton;

    for (const key in BLAZE_TO_RIG) {
      const map = BLAZE_TO_RIG[key];
      const bone = skeleton.getBoneByName(map.bone);
      if (!bone) continue;

      const p0 = pose[map.parent];
      const p1 = pose[map.child];

      const dirWorld = new THREE.Vector3(
        -(p1.x - p0.x),
        p1.y - p0.y,
        p1.z - p0.z
      );

      alignBoneToVector(bone, dirWorld);
    }

    const head = skeleton.getBoneByName("C_head_JNT");
    if (head) {
      const { forward } = computeHeadForward(pose);
      alignBoneToVector(head, forward);
    }
  }

  function computeHeadForward(pose: any[]) {
    const nose = new THREE.Vector3(pose[0].x, pose[0].y, pose[0].z);
    const leftEye = new THREE.Vector3(pose[7].x, pose[7].y, pose[7].z);
    const rightEye = new THREE.Vector3(pose[8].x, pose[8].y, pose[8].z);

    // left → right
    const right = rightEye.clone().sub(leftEye).normalize().multiply(new THREE.Vector3(1, 1, -1));

    // eyes midpoint → nose
    const eyesCenter = leftEye.clone().add(rightEye).multiplyScalar(0.5);
    const forward = nose.clone().sub(eyesCenter).normalize();

    // orthogonalize
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();
    forward.crossVectors(right, up).normalize();

    return { forward, up, right };
  }

  function actorPostProcess() {
    if (!actor || !pose) return;
    const skinnedMesh = actor.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh;
    if (!skinnedMesh) return;

    const skeleton = skinnedMesh.skeleton;
    const hips = skeleton.getBoneByName("C_hips_JNT");

    let lowestY = Infinity;
    const tmp = new THREE.Vector3();

    skinnedMesh.skeleton.bones.forEach((bone) => {
      bone.getWorldPosition(tmp);
      lowestY = Math.min(lowestY, tmp.y);
    });

    const correctionWorldY = -lowestY;

    // --- convert correction into hips parent space ---
    const parent = hips.parent;
    const parentWorldQuat = new THREE.Quaternion();
    parent.getWorldQuaternion(parentWorldQuat);

    const correctionLocal = new THREE.Vector3(0, correctionWorldY, 0)
      .applyQuaternion(parentWorldQuat.clone().invert());

    // --- APPLY AS SET, NOT ADD ---
    hips.position.add(correctionLocal);

    const hip = pose[0];
    hips.position.x = 0.5-hip.x;
    hips.position.y = 0.5-hip.y;
  }

  function computeTorsoFrame(pose: any[]) {
    const LH = new THREE.Vector3(pose[23].x, pose[23].y, pose[23].z);
    const RH = new THREE.Vector3(pose[24].x, pose[24].y, pose[24].z);
    const LS = new THREE.Vector3(pose[11].x, pose[11].y, pose[11].z);
    const RS = new THREE.Vector3(pose[12].x, pose[12].y, pose[12].z);

    const hipsCenter = LH.clone().add(RH).multiplyScalar(0.5);
    const shouldersCenter = LS.clone().add(RS).multiplyScalar(0.5);

    const right = RH.clone().sub(LH).normalize();              // left → right
    const up = shouldersCenter.clone().sub(hipsCenter).normalize(); // hips → shoulders
    const forward = new THREE.Vector3().crossVectors(right, up).normalize();

    // Re-orthogonalize to avoid drift
    right.crossVectors(up, forward).normalize();

    return { hipsCenter, right, up, forward };
  }


  function torsoFrameToQuaternion(frame: {
    right: THREE.Vector3;
    up: THREE.Vector3;
    forward: THREE.Vector3;
  }) {
    const m = new THREE.Matrix4();
    m.makeBasis(frame.right, frame.up, frame.forward);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }

  function alignBoneToVector(
    bone: THREE.Bone,
    targetDirWorld: THREE.Vector3,
    forwardAxis = BONE_FORWARD_AXIS
  ) {

    forwardAxis = FORWARD_AXES[bone.name] ?? BONE_FORWARD_AXIS;

    // convert target direction to bone local space
    const parentQuat = new THREE.Quaternion();
    bone.parent!.getWorldQuaternion(parentQuat);

    const targetLocal = targetDirWorld
      .clone()
      .normalize()
      .applyQuaternion(parentQuat.clone().invert());

    const quat = new THREE.Quaternion().setFromUnitVectors(
      forwardAxis,
      targetLocal
    );

    bone.quaternion.copy(quat);
  }

function smoothPoseAdaptiveConfidence(
  current: any[],
  velocityThreshold = 0.03,
  alphaSlow = 0.3,
  alphaFast = 0.8
) {
  if (!smoothedPoseRef.current || !prevPoseRef.current) {
    smoothedPoseRef.current = current.map(p => ({ ...p }));
    prevPoseRef.current = current.map(p => ({ ...p }));
    return smoothedPoseRef.current;
  }

  const smooth = smoothedPoseRef.current;
  const prev = prevPoseRef.current;

  for (let i = 0; i < current.length; i++) {
    const p = current[i];

    const dx = p.x - prev[i].x;
    const dy = p.y - prev[i].y;
    const dz = p.z - prev[i].z;
    const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);
    console.log(p)

    const confidence = p.c;

    // velocity-based alpha
    let alpha =
      speed < velocityThreshold ? alphaSlow : alphaFast;

    // confidence modulation
    alpha *= THREE.MathUtils.clamp(confidence, 0.2, 1.0);

    smooth[i].x += alpha * (p.x - smooth[i].x);
    smooth[i].y += alpha * (p.y - smooth[i].y);
    smooth[i].z += alpha * (p.z - smooth[i].z);

    prev[i].x = p.x;
    prev[i].y = p.y;
    prev[i].z = p.z;
    prev[i].visibility = p.visibility;

  }

  return smooth;
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

  function recordSkeletonFrame(time: number) {
    const skinnedMesh = actor.getObjectByProperty(
      "type",
      "SkinnedMesh"
    ) as THREE.SkinnedMesh;

    if (!skinnedMesh) return;

    skinnedMesh.skeleton.bones.forEach((bone) => {
      let track = recordedTracks.current.get(bone.name);

      if (!track) {
        track = { times: [], positions: [], rotations: [] };
        recordedTracks.current.set(bone.name, track);
      }

      track.times.push(time);

      track.positions.push(
        bone.position.x,
        bone.position.y,
        bone.position.z
      );

      track.rotations.push(
        bone.quaternion.x,
        bone.quaternion.y,
        bone.quaternion.z,
        bone.quaternion.w
      );
    });
  }

  function buildAnimationClip(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    recordedTracks.current.forEach((data, boneName) => {
      tracks.push(
        new THREE.VectorKeyframeTrack(
          `${boneName}.position`,
          data.times,
          data.positions,
          THREE.InterpolateLinear
        )
      );

      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${boneName}.quaternion`,
          data.times,
          data.rotations,
          THREE.InterpolateLinear
        )
      );
    });

    return new THREE.AnimationClip("Animation", -1, tracks);
  }

  function handleSave() {
    const exporter = new GLTFExporter();
    const clip = buildAnimationClip();

    exporter.parse(
      actor,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary', });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "scene.gltf";
        a.click();
        URL.revokeObjectURL(url);
      },
      () => { },
      { binary: true, animations: [clip] }
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
      {(showDebug && !hasRecorded) && (
        <>
          {pose?.length > 0 && <PoseDebug pose={normalizedPose} color="aqua" />}
        </>
      )}

      <primitive object={gltf.scene} />

      {/* Ground grid */}
      <Grid />

      {/* Environment */}
      <Environment files="assets/hdri.exr" background={false} />
      <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} zoomSpeed={1.0} panSpeed={0.5} target={[0, 0.5, 0]} />
    </>
  );
});

///                             ///
///       EXTRA FUNCTIONS       ///
///                             ///

function normalizePose(pose) {
  if (!pose) return null;
  return pose.map((p: any) => ({
    x: -p.x,
    y: -p.y,
    z:-p.z,
    c: p.visibility
  }));
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