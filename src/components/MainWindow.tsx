import { useEffect, useRef, useState } from 'react';
import './MainWindow.css';
import Viewport from './Viewport';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export default function MainWindow() {
    const [phase, setPhase] = useState<'tpose' | 'demo' | 'countdown' | 'recording' | 'review'>('demo');
    const [showDebug, setShowDebug] = useState<boolean>(true);

    // --- Camera Setup --- // 
    const [noCamera, setNoCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const streamRef = useRef<MediaStream | null>(null);

    async function fetchDevices() {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            const deviceInfos = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
            setDevices(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedDeviceId(videoDevices[0].deviceId);
                setNoCamera(false);
            } else {
                setNoCamera(true);
            }
        } catch (err) {
            console.error('Error accessing camera', err);
            setNoCamera(true);

        }
    }

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
                setNoCamera(true);
                return;
            }

            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setNoCamera(false);
        } catch (err: any) {
            console.error('Error accessing camera', err);
            setNoCamera(true);
        }
    }

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        if (!selectedDeviceId || noCamera) return;

        startCamera();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, [selectedDeviceId]);

    useEffect(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    // --- Recording --- //

    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(isRecording);
    const [recorded, setRecorded] = useState(false);

    useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

    // --- Setup BlazePose --- //
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);

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

    // --- Calibration --- //
    const [calibrationCountdown, setCalibrationCountdown] = useState<number | null>(null);
    const [calibrationPose, setCalibrationPose] = useState<any | null>(null);

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

    // --- Pose detection --- //
    const [poseData, setPoseData] = useState<any | null>(null);

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
                    }
                }
            }

            requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        return () => { running = false; };
    }, [poseLandmarker, recorded, calibrationPose]);

    // --- Draw Points --- //
    const canvasRef = useRef<HTMLCanvasElement>(null);

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


    // --- Handlers --- //
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const frameIntervalRef = useRef<number | null>(null);

    const handleRecord = () => {
        setShowCountdown(true);
        setCountdown(5);
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
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        setRecorded(true);
        setPhase("review");
    };

    const handleTrash = () => {
        setRecorded(false);
        setPhase("demo");
    };

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

            {phase === "countdown" && (
                <div className="countdown-overlay"><span>{countdown}</span></div>
            )}

            <Viewport isRecording={isRecording} hasRecorded={recorded} pose={poseData} onTrash={handleTrash} showDebug={showDebug} />

            <div id='recording-frame' className={isRecording ? "recording" : ""}></div>

            <div className='calibrate-overlay'>
                {phase !== "review" && (
                    <label style={{ display: "flex", alignItems: "center", margin: "0.5rem", fontSize: "0.75em" }}>
                        <input
                            type="checkbox"
                            checked={showDebug}
                            onChange={(e) => setShowDebug(e.target.checked)}
                        />
                        Debug
                    </label>
                )}
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
