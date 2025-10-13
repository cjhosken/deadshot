import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export function usePoseCapture(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
    const [poseHistory, setPoseHistory] = useState<any[]>([]);
    const [tPose, setTPose] = useState<any | null>(null);
    const [calibration, setCalibration] = useState<{ floorY: number; scale: number } | null>(null);

    const poseRef = useRef<any | null>(null);           // latest pose, not state
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isRecordingRef = useRef(false);
    const [isRecording, setIsRecording] = useState(false);
    useEffect(() => { isRecordingRef.current = isRecording }, [isRecording]);

    // --- Initialize BlazePose ---
    useEffect(() => {
        async function initPose() {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            const landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numPoses: 1,
            });
            setPoseLandmarker(landmarker);

            // create offscreen canvas for downscaling
            const canvas = document.createElement('canvas');
            offscreenCanvasRef.current = canvas;
        }
        initPose();
    }, []);

    // --- Calibrate T-Pose ---
    function calibrateTPose(landmarks: any[]) {
        const leftFoot = landmarks[31];
        const rightFoot = landmarks[32];
        const head = landmarks[0];
        const floorY = Math.min(leftFoot.y, rightFoot.y);
        const height = head.y - floorY;
        setTPose(landmarks);
        setCalibration({ floorY, scale: 1 / height });
    }

    // --- Cleanup live pose ---
    function cleanupLivePose(landmarks: any[]) {
        return landmarks;
    }

    // --- Pose detection loop ---
    useEffect(() => {
        if (!poseLandmarker || !videoRef.current || !offscreenCanvasRef.current) return;

        const offscreenCanvas = offscreenCanvasRef.current;

        const running = true;

        let lastTime = performance.now();
        const interval = 1000 / 24; // 24fps ~41.67ms per frame

        const detectPose = async (now: number) => {
            if (!running) return;
            {
                if (now - lastTime >= interval) {
                    lastTime = now;

                    const video = videoRef.current;
                    if (video!.videoWidth > 0 && video!.videoHeight > 0) {
                        const aspect = video!.videoWidth / video!.videoHeight;

                        const minSize = 256;
                        if (video!.videoWidth >= video!.videoHeight) {
                            offscreenCanvas.height = minSize;
                            offscreenCanvas.width = minSize * aspect;
                        } else {
                            offscreenCanvas.width = minSize;
                            offscreenCanvas.height = minSize / aspect;
                        }

                        const ctx = offscreenCanvas.getContext('2d')!;
                        ctx.drawImage(video!, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

                        const results = poseLandmarker.detectForVideo(offscreenCanvas, now);
                        if (results.landmarks?.[0]) {
                            const rawPose = results.landmarks[0];
                            const cleanedPose = cleanupLivePose(rawPose);
                            poseRef.current = cleanedPose;

                            if (isRecordingRef.current) {
                                setPoseHistory(prev => [...prev, { pose: cleanedPose, timestamp: performance.now() }]);
                            }
                        }
                    }
                }
            }
            requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
    }, [poseLandmarker]);

    const startRecording = () => {
        if (poseRef.current && !tPose) calibrateTPose(poseRef.current);
        setIsRecording(true);
    };

    const stopRecording = () => setIsRecording(false);
    const resetHistory = () => setPoseHistory([]);

    return {
        poseRef,        // raw pose for overlay (no lag)
        poseHistory,
        isRecording,
        startRecording,
        stopRecording,
        resetHistory,
        calibrateTPose,
        tPose,
        calibration,
        setIsRecording
    };
}
