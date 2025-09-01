import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import "./Viewport.css";
import type Project from '../types/Project';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-regular-svg-icons';
import CustomSelect from './CustomSelect';

export default function Viewport({ project, workflow }: { project: Project, workflow: "mocap" | "track" }) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [showGrid, setShowGrid] = useState(true);

    const [showClips, setShowClips] = useState(false);
    const [showCameras, setShowCamers] = useState(false);

    const [showGeo, setShowGeo] = useState(true);
    const [showRig, setShowRig] = useState(true);

    const [showPoints, setShowPoints] = useState(true);

    const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
    const toggleVisibilityPanel = () => setShowVisibilityPanel(!showVisibilityPanel);

    const gridRef = useRef<THREE.Mesh | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);


    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.visible = showGrid;
        }
    }, [showGrid]);

    useEffect(() => {
        if (skeletonHelperRef.current) {
            skeletonHelperRef.current.visible = showRig;
        }
        if (modelRef.current) {
            modelRef.current.visible = showGeo;
        }
    }, [showRig, showGeo]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowVisibilityPanel(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        console.log(project);
        console.log(workflow);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x131313);

        // Setup Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            mount.clientWidth / mount.clientHeight,
            0.1,
            1000
        );

        // Setup Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(renderer.domElement);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        // Setup Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.rotateSpeed = 0.5;
        controls.panSpeed = 0.5;
        controls.zoomSpeed = 0.5;
        controls.dampingFactor = 0.1;

        const resetCamera = () => {
            camera.position.set(3, 3, 3);
            controls.target.set(0, 0, 0);
            controls.update();
        };
        resetCamera();

        let resizeRequested = false;

        const handleResize = () => {
            if (!mountRef.current) return;
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };

        const resizeObserver = new ResizeObserver(() => {
            if (!resizeRequested) {
                resizeRequested = true;
                requestAnimationFrame(() => {
                    handleResize();
                    resizeRequested = false;
                })
            }
        });
        resizeObserver.observe(mount);

        window.addEventListener('resize', handleResize);
        handleResize();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'h' || event.key === 'H') {
                resetCamera();
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        // Add Lighting
        new EXRLoader()
            .setPath('/assets/hdri/') // folder where your HDR file is stored
            .load('photo_studio_01_1k.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture;  // For reflections
            });



        const grid = createGrid();
        scene.add(grid);
        gridRef.current = grid;
        gridRef.current.visible = showGrid;


        createActor(scene);

        // Axis Scene (the little gizmo in the corner)
        const axisSize = 1;
        const axisScene = new THREE.Scene();
        const axisCamera = new THREE.OrthographicCamera(
            -axisSize,
            axisSize,
            axisSize,
            -axisSize,
            0.1,
            10
        );
        axisCamera.position.set(1, 1, 1);
        axisCamera.lookAt(0, 0, 0);

        createAxes(axisScene);

        const animate = () => {
            requestAnimationFrame(animate);

            // Update controls
            controls.update();

            renderer.setViewport(0, 0, mount.clientWidth, mount.clientHeight);
            renderer.setScissor(0, 0, mount.clientWidth, mount.clientHeight);
            renderer.setScissorTest(true);
            renderer.clear();

            // Render main scene full screen
            renderer.setViewport(0, 0, mount.clientWidth, mount.clientHeight);
            renderer.setScissorTest(false);
            renderer.render(scene, camera);

            const size = 50; // axis size in pixels
            const offset = new THREE.Vector3();
            offset.copy(camera.position).sub(controls.target).normalize();
            axisCamera.position.copy(offset);
            axisCamera.lookAt(new THREE.Vector3(0, 0, 0));
            renderer.autoClear = false;
            renderer.clearDepth();

            // Use renderer.domElement.clientWidth / clientHeight to scale
            const left = 10;  // horizontal padding from left
            const bottom = 10;   // vertical padding from top

            renderer.setViewport(left, bottom, size, size);
            renderer.setScissor(left, bottom, size, size);
            renderer.setScissorTest(true);

            renderer.render(axisScene, axisCamera);
            renderer.setScissorTest(false);
        };

        animate();

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        }
    }, [])

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

    function createAxes(scene: THREE.Scene) {
        // Create X axis (red)
        const xMat = new THREE.MeshBasicMaterial({ color: 0xe65519 });
        const xGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const xArrow = new THREE.Mesh(xGeom, xMat);
        xArrow.position.set(0.4, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        scene.add(xArrow);

        // Create Y axis (green)
        const yMat = new THREE.MeshBasicMaterial({ color: 0x4daa57 });
        const yGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const yArrow = new THREE.Mesh(yGeom, yMat);
        yArrow.position.set(0, 0.4, 0);
        scene.add(yArrow);

        // Create Z axis (blue)
        const zMat = new THREE.MeshBasicMaterial({ color: 0x0971ec });
        const zGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const zArrow = new THREE.Mesh(zGeom, zMat);
        zArrow.position.set(0, 0, 0.4);
        zArrow.rotation.x = Math.PI / 2;
        scene.add(zArrow);
    }

    function createActor(scene: THREE.Scene) {
        const loader = new GLTFLoader();
        loader.load(
            "/assets/models/actor.glb",
            (gltf) => {
                const model = gltf.scene
                // usdScene is a THREE.Group
                model.position.set(0, 0, 0);
                model.visible = showGeo;
                // Optional: add skeleton helper if it has bones
                const skeletonHelper = new THREE.SkeletonHelper(model);
                skeletonHelper.visible = showRig;

                scene.add(model);
                scene.add(skeletonHelper);

                modelRef.current = model;
                skeletonHelperRef.current = skeletonHelper;
            }
        );
    }
    /*
    function setActorAnimation(animations: THREE.AnimationClip[], animationName? : string) {
        if (!modelRef) return;
        const model = modelRef;
    }

    function createPointCloud() {

    }

    function createCameras() {

    }
    */
    return (
        <div id="viewport">
            <div id="canvas" ref={mountRef} />
            <div id='viewport-overlay'>
                <div id="visibility-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
                    <button
                        className="iconButton"
                        onClick={toggleVisibilityPanel}
                        title="Set visibility options"
                    >
                        <FontAwesomeIcon icon={faEye} />
                    </button>

                    {showVisibilityPanel && (
                        <div id="visibility-panel">
                            <label title="Show grid" className='checkbox'><input type="checkbox" id="show-grid" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Grid</label>
                            <label title="Show cameras" className='checkbox'><input type="checkbox" id="show-debug-cameras" checked={showCameras} onChange={(e) => setShowCamers(e.target.checked)} />Cameras</label>
                            <label title="Show source videos as planes" className='checkbox'><input type="checkbox" id="show-clips" checked={showClips} onChange={(e) => setShowClips(e.target.checked)} />Clips</label>
                            {workflow === "mocap" ? (
                                <>
                                    <label title="Show actor rig" className='checkbox'><input type="checkbox" id="show-rig" checked={showRig} onChange={(e) => setShowRig(e.target.checked)} />Rig</label>
                                    <label title="Show actor geometry" className='checkbox'><input type="checkbox" id="show-geo" checked={showGeo} onChange={(e) => setShowGeo(e.target.checked)} />Geo</label>
                                </>
                            ) : (
                                <>
                                    <label title="Show generated point cloud" className='checkbox'><input type="checkbox" id="show-points" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} />Points</label>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <CustomSelect options={["persp"]} title='Select view' />
            </div>
            <div id="timeline">
                <div id="timeline-track">
                    <div id="timeline-playhead" />
                    <div className="timeline-keyframe" style={{ left: '25%' }}></div>
                    <div className="timeline-keyframe" style={{ left: '50%' }}></div>
                </div>
            </div>
        </div>
    );
}