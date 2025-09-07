import { useEffect, useRef, useState } from 'react';
import './MotionCapture.css';
import Viewport from './Viewport';

export default function MotionCaptureLive({ onGoHome }: { onGoHome: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const streamRef = useRef<MediaStream | null>(null); // keep active stream

    // Get available cameras
    useEffect(() => {
        async function fetchDevices() {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true }); // request permission
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

    // Start camera
    useEffect(() => {
        if (!selectedDeviceId) return;

        async function startCamera() {
            try {
                // Stop previous stream if exists
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: selectedDeviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 24 },
                        autoGainControl: true


                    },
                });
                streamRef.current = stream; // save stream
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error('Error starting camera', err);
            }
        }

        startCamera();

        // Cleanup on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [selectedDeviceId]);

    // Stop camera and go home
    const handleGoHome = () => {
        if (streamRef.current) {
            // Stop tracks
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            // Clear video
            videoRef.current.srcObject = null;
            videoRef.current.pause(); // stop playback immediately
        }

        onGoHome(); // navigate away
    };


    return (
        <div id="container">
            <div id="live-view">
                <Viewport showTimeline={false}/>
            </div>
            <button onClick={handleGoHome} id="home-button">Exit</button>
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
                <button className="iconButton" id="record-button" title="Record"> ● </button>
            </div>
        </div>
    );
}
