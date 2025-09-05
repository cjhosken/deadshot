import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./Viewport.css";
import { EXRLoader, GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import { FaPause, FaPlay, FaStop } from "react-icons/fa";

export default function Viewport() {
    const containerRef = useRef<HTMLDivElement>(null);

    const modelRef = useRef<THREE.Group | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionRef = useRef<THREE.AnimationAction | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(120); // seconds
    const [frame, setFrame] = useState(0);
    const [fps] = useState(24);

    const currentFrameRef = useRef(0);
    const isPlayingRef = useRef(isPlaying);

    const clockRef = useRef(new THREE.Clock(false));
    const accumulatorRef = useRef(0);

    const togglePlay = () => {
        const newState = !isPlayingRef.current;
        isPlayingRef.current = newState;
        setIsPlaying(newState);

        if (newState) clockRef.current.start();
        else clockRef.current.stop();
    }

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // === Renderer ===
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );
        container.appendChild(renderer.domElement);

        // === Scene setup ===
        const scene = new THREE.Scene();

        // === Camera ===
        const camera = new THREE.PerspectiveCamera(
            75, // fov
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );

        // === Controls ===
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.rotateSpeed = 0.5;
        controls.panSpeed = 0.5;
        controls.zoomSpeed = 0.5;
        controls.dampingFactor = 0.1;

        const resetCamera = () => {
            camera.position.set(2, 2, 2);
            controls.target.set(0, 0.5, 0);
            controls.update();
        };
        resetCamera();

        const grid = createGrid();
        scene.add(grid);

        createLighting(scene);

        // === Geometry & Material ===
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
                    if (currentFrameRef.current > duration) {
                        currentFrameRef.current = 0;
                    }
                    accumulatorRef.current -= frameTime;
                }

                if (mixerRef.current && actionRef.current) {
                    // Update mixer to reflect the exact frame
                    actionRef.current.time = currentFrameRef.current / fps;
                    mixerRef.current.update(0); // update once to set pose

                }

                setFrame(currentFrameRef.current);

                const pct = (currentFrameRef.current / duration) * 100;
                const handle = document.getElementById("handle");
                if (handle) {
                    (handle as HTMLElement).style.left = `${pct}%`;
                }
            }

            // Render main scene full screen
            renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
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
            uniforms: {
                fadeDistance: { value: 25 },
            },
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
                    // Line thicknesses
                    float medium = 0.005;
                    float thick = 0.01;

                    // Medium grid every 1 unit
                    float fxMed = abs(fract(vPosition.x / 1.0 - 0.5) - 0.5);
                    float fzMed = abs(fract(vPosition.z / 1.0 - 0.5) - 0.5);
                    float medLine = (1.0 - step(medium, min(fxMed, fzMed))) * 0.5;

                    // Thick center lines
                    float centerX = 1.0 - step(thick, abs(vPosition.x));
                    float centerZ = 1.0 - step(thick, abs(vPosition.z));
                    float centerLine = max(centerX, centerZ);

                    float grid = max(centerLine, medLine);

                    grid *= 1.0 - smoothstep(length(vPosition), 0.0, fadeDistance);

                    gl_FragColor = vec4(vec3(0.5), grid);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const grid = new THREE.Mesh(geometry, material);
        return grid;
    }

    function createLighting(scene: THREE.Scene) {
        // Add Lighting
        new EXRLoader()
            .setPath('assets/') // folder where your HDR file is stored
            .load('hdri.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture;  // For reflections
            });
    }

    function createActor(scene: THREE.Scene) {
        const loader = new GLTFLoader();
        loader.load("assets/actor.glb", (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            scene.add(model);
            modelRef.current = model;

            // Optional: skeleton helper
            const skeletonHelper = new THREE.SkeletonHelper(model);
            scene.add(skeletonHelper);

            if (gltf.animations.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(model);
                const action = mixerRef.current.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true; // start paused
                actionRef.current = action;

                setDuration(Math.floor(gltf.animations[0].duration * fps));
            }
        });
    }

    return (
        <div id="viewport">
            <div id="timeline">
                <div id="bar">
                    <button className="iconButton"
                        onClick={() => {
                            togglePlay();
                        }
                        }> {isPlaying ? <FaPause /> : <FaPlay />} </button>
                    <button className="iconButton"
                        onClick={() => {
                            if (mixerRef.current && actionRef.current) {
                                actionRef.current.time = 0;
                                mixerRef.current.update(0);
                            }
                            currentFrameRef.current = 0;
                            isPlayingRef.current = false;
                            setFrame(0);
                            setIsPlaying(false);
                            clockRef.current.stop();
                            const pct = (currentFrameRef.current / duration) * 100;
                            const handle = document.getElementById("handle");
                            if (handle) {
                                (handle as HTMLElement).style.left = `${pct}%`;
                            }
                        }}
                    > <FaStop /> </button>
                    <div className="frameInfo">{frame}</div>
                    <div id="scrollbar">
                        <div id="handle"></div>
                    </div>
                    <div className="frameInfo">{duration}</div>

                </div>
            </div>
            <div id="canvas" ref={containerRef}></div>
        </div>
    );
}
