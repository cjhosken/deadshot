import { useEffect, useRef, useState } from 'react';
import './MotionCaptureLive.css';
import Viewport from '../Viewport/Viewport';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';


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
    const [phase, setPhase] = useState<'tpose' | 'demo' | 'countdown' | 'recording' | 'review'>('demo');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [calibrationCountdown, setCalibrationCountdown] = useState<number | null>(null);
    const [calibrationPose, setCalibrationPose] = useState<any | null>(null);

    const [noCamera, setNoCamera] = useState(false); // NEW: tracks if a camera is available


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

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !poseData) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Match video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#0971e8";
        ctx.fillStyle = "#e86209";
        ctx.lineWidth = 2;

        // Draw points
        poseData.forEach((landmark: any) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw some key connections (example: shoulders–wrists)
        const drawLine = (a: number, b: number) => {
            const p1 = poseData[a];
            const p2 = poseData[b];
            if (!p1 || !p2) return;
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
        };

        drawLine(11, 13); // left shoulder to left elbow
        drawLine(13, 15); // left elbow to left wrist
        drawLine(12, 14); // right shoulder to right elbow
        drawLine(14, 16); // right elbow to right wrist
        drawLine(11, 12); // shoulders
        drawLine(23, 24); // hips
        drawLine(11, 23); // left side
        drawLine(12, 24); // right side
    }, [poseData]);

    useEffect(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

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
                        setPoseData(results.landmarks[0]);

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
    }, [poseLandmarker, recorded, calibrationPose]);

    const handleRecord = () => {
        setShowCountdown(true);
        setCountdown(5);
        setPoseHistory([]);
        setRecorded(false);

        let counter = 5;
        const interval = setInterval(() => {
            counter -= 1;
            setCountdown(counter);

            if (counter <= 0) {
                clearInterval(interval);
                setShowCountdown(false);
                setIsRecording(true);
            }
        }, 1000);
    };

    const handleStop = () => {
        setIsRecording(false);
        if (poseData) setPoseHistory(prev => [...prev, { pose: poseData, timestamp: performance.now() }]);
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        setRecorded(true);
        setPhase("review");
    };

    const startCalibration = () => {
        setCalibrationCountdown(5);

        let counter = 5;
        const interval = setInterval(() => {
            counter -= 1;
            setCalibrationCountdown(counter);

            if (counter <= 0) {
                clearInterval(interval);
                setCalibrationCountdown(null);
                finishCalibration();
            }
        }, 1000);
    };

    const finishCalibration = () => {
        if (poseData && poseData.length) {
            setCalibrationPose(poseData);
            console.log("Calibration pose set:", poseData);
        } else {
            console.warn("No valid pose data for calibration yet");
        }
        setCalibrationCountdown(null);
        setPhase("demo");
    };

    const handleTrash = () => {
        console.log("Discarding recording...");
        setRecorded(false);
        setPoseHistory([]);
        setPhase("demo"); // back to live preview
    };

    // --- Camera setup ---
    useEffect(() => {
        async function fetchDevices() {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                    setNoCamera(false); // NEW: set noCamera to false if video devices found
                } else {
                    setNoCamera(true); // NEW: set noCamera to true if no video devices found
                }
            } catch (err) {
                console.error('Error accessing camera', err);
                setNoCamera(true); // NEW: set noCamera to true if no video devices found

            }
        }
        fetchDevices();
    }, []);

    useEffect(() => {
        if (!selectedDeviceId) return;

        async function startCamera() {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 }, autoGainControl: true }
                });

                if (!stream || stream.getVideoTracks().length === 0) {
                    setNoCamera(true); // No video track available
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setNoCamera(false);
            } catch (err: any) {
                console.error('Error accessing camera', err);
                setNoCamera(true); // Treat all errors (NotAllowedError, NotFoundError, etc.) as no webcam
            }
        }

        if (noCamera) return; // NEW: do not start camera if noCamera is true
        startCamera();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, [selectedDeviceId]);

    return (
        <div id="container" className={phase === 'recording' ? 'recording' : ''}>
            {noCamera && (
                <div className="no-camera-popup">
                    <div>
                        <h1>No webcam detected!</h1>
                        <p>Please connect a webcam to continue.</p>
                    </div>
                </div>
            )}

            {phase === "tpose" && (
                <div className="tpose-phase">
                    <div className="tpose-container">
                        <div id="camera-overlay">
                            <video ref={videoRef} autoPlay playsInline />
                            <canvas ref={canvasRef}></canvas>
                            {calibrationCountdown} && (
                            <div id="calibration-countdown">{calibrationCountdown}</div>
                            )
                        </div>
                        <div className='camera-controls'>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                            >
                                {devices.map((device) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${device.deviceId}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="tpose-overlay">
                            <h2>Stand in a T-pose</h2>
                            <p>Please keep within the frame until calibration completes.</p>
                            <div id="tpose-buttons">
                                <button onClick={() => startCalibration()}> Calibrate </button>
                                <button onClick={() => setPhase("demo")}> Cancel </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {phase === "countdown" && (
                <div className="countdown-overlay"><span>{countdown}</span></div>
            )}

            <Viewport recording={phase === "recording"} recorded={recorded} pose={poseData} calibrationPose={calibrationPose} history={poseHistory} onTrash={handleTrash} />

            <div id='recording-frame' className={isRecording ? "recording" : ""}></div>

            <div className='calibrate-overlay'>
                <button
                    onClick={() => setPhase("tpose")}
                > Calibrate </button>
            </div>

            {((phase === "recording" || phase === "demo") && !recorded) && (
                <div id="camera-preview">
                    <video ref={videoRef} autoPlay playsInline />
                    <canvas ref={canvasRef}></canvas>
                </div>
            )}

            {(!isRecording && showCountdown) && (
                <div id="countdown-container">
                    {countdown}
                </div>
            )}

            {((phase === "recording" || phase === "demo") && !recorded) && (
                <button
                    id="record-button"
                    className={`${isRecording ? "recording" : "idle"}`}
                    title={isRecording ? "Stop" : "Record"}
                    onClick={isRecording ? handleStop : handleRecord}
                />
            )}

        </div>
    );
}
