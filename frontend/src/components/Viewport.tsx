import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import "./Viewport.css";
import type Project from '../types/Project';

export default function Viewport({ project, workflow }: { project: Project, workflow: "mocap" | "track" }) {
    const mountRef = useRef<HTMLDivElement | null>(null);

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

        // Setup Grid
        createGrid(scene);

        // Test Geometry
        const loader = new GLTFLoader();
        loader.load(
            '/assets/models/actor.glb', // path to your .glb file
            (gltf) => {
                const model = gltf.scene;
                scene.add(model);   // add model to your scene
                model.position.set(0, 0, 0); // optional positioning
            },
            (xhr) => {
                console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading GLB:', error);
            }
        );

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

            const size = 100; // axis size in pixels
            const offset = new THREE.Vector3();
            offset.copy(camera.position).sub(controls.target).normalize();
            axisCamera.position.copy(offset);
            axisCamera.lookAt(new THREE.Vector3(0, 0, 0));
            renderer.autoClear = false;
            renderer.clearDepth();

            // Use renderer.domElement.clientWidth / clientHeight to scale
            const left = 10;
            const bottom = 10;
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
    }, [project, workflow])

    function createGrid(scene: THREE.Scene) {
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
        scene.add(grid);
    }

    function createAxes(scene: THREE.Scene) {
        // Create X axis (red)
        const xMat = new THREE.MeshBasicMaterial({ color: 0xbf212f });
        const xGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const xArrow = new THREE.Mesh(xGeom, xMat);
        xArrow.position.set(0.4, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        scene.add(xArrow);

        // Create Y axis (green)
        const yMat = new THREE.MeshBasicMaterial({ color: 0x006f3c });
        const yGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const yArrow = new THREE.Mesh(yGeom, yMat);
        yArrow.position.set(0, 0.4, 0);
        scene.add(yArrow);

        // Create Z axis (blue)
        const zMat = new THREE.MeshBasicMaterial({ color: 0x264b96 });
        const zGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
        const zArrow = new THREE.Mesh(zGeom, zMat);
        zArrow.position.set(0, 0, 0.4);
        zArrow.rotation.x = Math.PI / 2;
        scene.add(zArrow);
    }

    return (<div className="viewport" ref={mountRef}/>);
}