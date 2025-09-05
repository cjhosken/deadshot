import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./Viewport.css";
import { EXRLoader, GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import { FaPause, FaPlay, FaStop } from "react-icons/fa";

export default function Viewport() {
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const wasDraggingRef = useRef(false);

    const modelRef = useRef<THREE.Group | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionRef = useRef<THREE.AnimationAction | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(120); // frames
    const [frame, setFrame] = useState(0);
    const [fps] = useState(24);

    const currentFrameRef = useRef(0);
    const wasPlayingRef = useRef(false);

    const clockRef = useRef(new THREE.Clock(false));
    const accumulatorRef = useRef(0);

    // Keep a ref synced with isPlaying for the animation loop
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        if (isPlaying) clockRef.current.start();
        else clockRef.current.stop();
    }, [isPlaying]);

    const onScrub = (clientX: number) => {
        const scrollbar = document.getElementById("scrollbar");
        if (!scrollbar) return;

        const rect = scrollbar.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        const pct = x / rect.width;

        const newFrame = Math.round(pct * duration);
        currentFrameRef.current = newFrame;
        setFrame(newFrame);

        if (mixerRef.current && actionRef.current) {
            actionRef.current.time = newFrame / fps;
            mixerRef.current.update(0);
        }

        const handle = document.getElementById("handle");
        if (handle) {
            (handle as HTMLElement).style.left = `${pct * 100}%`;
        }
    };

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        wasPlayingRef.current = isPlayingRef.current;
        if (isPlayingRef.current) clockRef.current.stop();
        isPlayingRef.current = false;
        setIsPlaying(false);
        onScrub(e.clientX);
    };

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length !== 1) return; // single touch only
        isDraggingRef.current = true;
        wasPlayingRef.current = isPlayingRef.current;
        if (isPlayingRef.current) clockRef.current.stop();
        isPlayingRef.current = false;
        setIsPlaying(false);
        onScrub(e.touches[0].clientX);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        onScrub(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!isDraggingRef.current || e.touches.length !== 1) return;
        onScrub(e.touches[0].clientX);
    };

    const onMouseUp = () => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;

            // Only restore play state if the user actually dragged
            if (wasDraggingRef.current) {
                setIsPlaying(wasPlayingRef.current);
                if (wasPlayingRef.current) clockRef.current.start();
            }

            wasDraggingRef.current = false;
        }
    };

    const onTouchEnd = () => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;

            if (wasDraggingRef.current) {
                setIsPlaying(wasPlayingRef.current);
                if (wasPlayingRef.current) clockRef.current.start();
            }

            wasDraggingRef.current = false;
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        window.addEventListener("touchmove", onTouchMove);
        window.addEventListener("touchend", onTouchEnd);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);

            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, []);

    const togglePlay = () => {
        setIsPlaying((prev) => !prev);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // === Renderer ===
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // === Scene ===
        const scene = new THREE.Scene();

        // === Camera ===
        const camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = 1.0; // faster pinch zoom
        controls.panSpeed = 0.5;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;

        camera.position.set(2, 2, 2);
        controls.target.set(0, 0.5, 0);
        controls.update();

        const grid = createGrid();
        scene.add(grid);
        createLighting(scene);
        createActor(scene);

        const handleResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();

            if (isPlayingRef.current) {
                const delta = clockRef.current.getDelta();
                accumulatorRef.current += delta;
                const frameTime = 1 / fps;

                while (accumulatorRef.current >= frameTime) {
                    currentFrameRef.current++;
                    if (currentFrameRef.current > duration) currentFrameRef.current = 0;
                    accumulatorRef.current -= frameTime;
                }

                if (mixerRef.current && actionRef.current) {
                    actionRef.current.time = currentFrameRef.current / fps;
                    mixerRef.current.update(0);
                }

                setFrame(currentFrameRef.current);

                const pct = (currentFrameRef.current / duration) * 100;
                const handle = document.getElementById("handle");
                if (handle) handle.style.left = `${pct}%`;
            }

            renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    function createGrid() {
        const size = 1000;
        const divisions = 100;

        const geometry = new THREE.PlaneGeometry(size, size, divisions, divisions);
        geometry.rotateX(-Math.PI / 2);
        const material = new THREE.ShaderMaterial({
            uniforms: { fadeDistance: { value: 25 } },
            vertexShader: `
                varying float vDist;
                varying vec3 vPosition;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vDist = length(mvPosition.xyz);
                    vPosition = position;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
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
            `,
            transparent: true,
            side: THREE.DoubleSide,
        });

        return new THREE.Mesh(geometry, material);
    }

    function createLighting(scene: THREE.Scene) {
        new EXRLoader()
            .setPath("assets/")
            .load("hdri.exr", (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture;
            });
    }

    function createActor(scene: THREE.Scene) {
        const loader = new GLTFLoader();
        loader.load("assets/actor.glb", (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            scene.add(model);
            modelRef.current = model;

            const skeletonHelper = new THREE.SkeletonHelper(model);
            scene.add(skeletonHelper);

            if (gltf.animations.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(model);
                const action = mixerRef.current.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
                actionRef.current = action;

                setDuration(Math.floor(gltf.animations[0].duration * fps));
            }
        });
    }

    return (
        <div id="viewport">
            <div id="timeline">
                <div id="bar">
                    <button className="iconButton" onClick={togglePlay}>
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <button
                        className="iconButton"
                        onClick={() => {
                            if (mixerRef.current && actionRef.current) {
                                actionRef.current.time = 0;
                                mixerRef.current.update(0);
                            }
                            currentFrameRef.current = 0;
                            setFrame(0);
                            setIsPlaying(false);
                            clockRef.current.stop();
                            const handle = document.getElementById("handle");
                            if (handle) handle.style.left = `0%`;
                        }}
                    >
                        <FaStop />
                    </button>
                    <div className="frameInfo" style={{
                        width: `${String(duration).length}ch`,
                        textAlign: "right"
                    }}>{frame}</div>
                    <div id="scrollbar" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
                        <div id="handle"></div>
                    </div>
                    <div className="frameInfo">{duration}</div>
                </div>
            </div>
            <div id="canvas" ref={containerRef}></div>
        </div>
    );
}
