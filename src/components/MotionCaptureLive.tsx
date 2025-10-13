import { useEffect, useRef, useState } from 'react';
import './MotionCaptureLive.css';
import Viewport from './Viewport';
import { FaSave, FaTrash } from 'react-icons/fa';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

export default function MotionCaptureLive() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const streamRef = useRef<MediaStream | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(isRecording);
    useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [recorded, setRecorded] = useState(false);

    const frameIntervalRef = useRef<number | null>(null);

    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
    const [poseData, setPoseData] = useState<any | null>(null);
    const [poseHistory, setPoseHistory] = useState<any[]>([]);

    // --- Setup BlazePose ---
    useEffect(() => {
        async function initPose() {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            const landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
                    delegate: "GPU",
                },
                runningMode: "VIDEO",
                numPoses: 1,
            });
            setPoseLandmarker(landmarker);
        }
        initPose();
    }, []);

    // --- Pose detection ---
    useEffect(() => {
        if (!poseLandmarker || !videoRef.current) return;
        let running = true;
        let lastTime = performance.now();
        const frameInterval = 1000 / 24;

        const detectPose = async (now: number) => {
            if (!running) return;

            const elapsed = now - lastTime;
            if (elapsed >= frameInterval) {
                lastTime = now;

                if (
                    videoRef.current &&
                    poseLandmarker &&
                    videoRef.current.videoWidth > 0 &&
                    videoRef.current.videoHeight > 0 &&
                    !recorded // stop detection when timeline playback
                ) {
                    const results = poseLandmarker.detectForVideo(videoRef.current, now);
                    if (results.landmarks?.[0]) {
                        setPoseData(results.landmarks[0]); // always update live pose
                        if (isRecordingRef.current) {
                            setPoseHistory(prev => [
                                ...prev,
                                { pose: results.landmarks[0], timestamp: performance.now() }
                            ]);
                        }
                    }
                }
            }

            requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        return () => { running = false; };
    }, [poseLandmarker, recorded]);

    const handleRecord = () => {
        setShowCountdown(true);
        setCountdown(5);
        setPoseHistory([]);
        setRecorded(false);
    };

    const handleStop = () => {
        setIsRecording(false);
        if (poseData) setPoseHistory(prev => [...prev, { pose: poseData, timestamp: performance.now() }]);
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        setRecorded(true);
    };

    const handleSave = () => {
        if (!poseHistory.length) return;

        const firstFrame = poseHistory[0].pose;
        if (!firstFrame || !firstFrame.length) {
            console.error('No valid pose data to export.');
            return;
        }

        const scene = new THREE.Scene();
        const skeleton = new THREE.Group();

        interface Landmark {
            x: number;
            y: number;
            z: number;
        }

        (firstFrame as Landmark[]).forEach((landmark: Landmark, index: number) => {
            if (!landmark) return;
            const bone = new THREE.Object3D();
            bone.name = `joint_${index}`;
            const x = landmark.x ?? 0;
            const y = landmark.y ?? 0;
            const z = landmark.z ?? 0;
            bone.position.set(x, y, z);
            skeleton.add(bone);
        });


        scene.add(skeleton);

        const exporter = new USDZExporter();
        exporter.parse(
            scene,
            (result) => {
                const blob = new Blob([result], { type: 'model/vnd.usdz+zip' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'motion_capture.usdz';
                a.click();
            },
            (error) => console.error('USDZ export failed', error)
        );
    };

    const handleCancel = () => setRecorded(false);

    // --- Camera setup ---
    useEffect(() => {
        async function fetchDevices() {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
            } catch (err) {
                console.error('Error accessing camera', err);
            }
        }
        fetchDevices();
    }, []);

    useEffect(() => {
        if (!selectedDeviceId) return;

        async function startCamera() {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 }, autoGainControl: true }
                });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) { console.error('Error starting camera', err); }
        }

        startCamera();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, [selectedDeviceId]);

    return (
        <div id="container" className={isRecording ? 'recording' : ''}>
            {showCountdown && <div className="countdown-overlay"><span>{countdown}</span></div>}

            <div id="live-view">
                <Viewport recorded={recorded} pose={poseData} history={poseHistory} />
            </div>

            {isRecording && <div id="frame-counter"><span>Frame: {poseHistory.length + 1}</span></div>}

            <div id="camera-overlay">
                <video ref={videoRef} autoPlay playsInline />
                <div>
                    <select value={selectedDeviceId} onChange={e => setSelectedDeviceId(e.target.value)}>
                        {devices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div id="record-bar">
                {!recorded ? (
                    <button
                        id="record-button"
                        className={`${isRecording ? "recording" : "idle"}`}
                        title={isRecording ? "Stop" : "Record"}
                        onClick={isRecording ? handleStop : handleRecord}
                    />
                ) : (
                    <div id="record-actions">
                        <div id="bar">
                            <button className="iconButton" onClick={handleSave}><FaSave /></button>
                            <button className="iconButton" onClick={handleCancel}><FaTrash /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
