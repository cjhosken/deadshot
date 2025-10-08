import { useEffect, useRef, useState } from 'react';
import './MotionCapture.css';
import Viewport from './Viewport';
import { FaSave, FaTrash } from 'react-icons/fa';

export default function MotionCaptureLive({ onGoHome }: { onGoHome: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const streamRef = useRef<MediaStream | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [recorded, setRecorded] = useState(false); // recording finished, timeline visible

    const [frameCount, setFrameCount] = useState(0);
    const frameRef = useRef(0);
    const frameIntervalRef = useRef<number | null>(null);


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
                    video: {
                        deviceId: { exact: selectedDeviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 24 },
                        autoGainControl: true,
                    },
                });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error('Error starting camera', err);
            }
        }

        startCamera();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, [selectedDeviceId]);

    const handleGoHome = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        onGoHome();
    };

    // --- Recording workflow ---
    const handleRecord = () => {
        setShowCountdown(true);
        setCountdown(5);

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setShowCountdown(false);
                    setIsRecording(true);
                    // Start frame counter
                    frameRef.current = 0;
                    setFrameCount(0);
                    frameIntervalRef.current = window.setInterval(() => {
                    frameRef.current += 1;
                    setFrameCount(frameRef.current);
                    }, 1000 / 24); // 24 fps
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleStop = () => {
        setIsRecording(false);
        setRecorded(true); // show timeline and save/cancel

        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
    };

    const handleSave = () => {
        console.log("Save recording");
        setRecorded(false);
    };

    const handleCancel = () => {
        console.log("Cancel recording");
        setRecorded(false);
    };

    return (
        <div
            id="container"
            className={isRecording ? 'recording' : ''}
        >
            {/* Countdown overlay */}
            {showCountdown && (
                <div className="countdown-overlay">
                    <span>{countdown}</span>
                </div>
            )}

            <div id="live-view">
                <Viewport showTimeline={recorded} />
            </div>

            <button onClick={handleGoHome} id="home-button">Exit</button>
            {isRecording && (
            <div id="frame-counter">
                <span>Frame: {frameCount}</span>
            </div>
            )}


            <div id="camera-overlay">
                <video ref={videoRef} autoPlay playsInline />
                <div>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                        {devices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div id="record-bar">
                {!recorded && (
                    <button
                        id="record-button"
                        className={`${isRecording ? "recording" : "idle"}`}
                        title={isRecording ? "Stop" : "Record"}
                        onClick={isRecording ? handleStop : handleRecord}
                    ></button>
                )}

                {recorded && (
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
