import { useEffect, useRef, useState } from 'react';

export function useCamera(selectedDeviceId: string, setSelectedDeviceId: (id: string) => void) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    // Fetch devices
    useEffect(() => {
        async function fetchDevices() {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);

                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Camera error', err);
            }
        }
        fetchDevices();
    }, []);

    // Start selected camera
    useEffect(() => {
        if (!selectedDeviceId) return;

        async function startCamera() {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } },
                    audio: false
                });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error('Error starting camera', err);
            }
        }

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, [selectedDeviceId]);

    return { videoRef, devices };
}
