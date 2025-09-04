import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./Viewport.css";
import { EXRLoader, GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";

export default function Viewport() {
    const containerRef = useRef<HTMLDivElement>(null);

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

        const axisScene = new THREE.Scene();
        const axisCamera = new THREE.OrthographicCamera(
            -1,
            1,
            1,
            -1,
            0.1,
            10
        );
        axisCamera.position.set(1, 1, 1);
        axisCamera.lookAt(0, 0, 0);

        createAxes(axisScene);


        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            // Update controls
            controls.update();

            renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
            renderer.setScissor(0, 0, container.clientWidth, container.clientHeight);
            renderer.setScissorTest(true);
            renderer.clear();

            // Render main scene full screen
            renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
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
        loader.load(
            "assets/actor.glb",
            (gltf) => {
                const model = gltf.scene
                // usdScene is a THREE.Group
                model.position.set(0, 0, 0);
                // Optional: add skeleton helper if it has bones
                const skeletonHelper = new THREE.SkeletonHelper(model);

                scene.add(model);
                scene.add(skeletonHelper);
            }
        );
    }

    return <div id="viewport" ref={containerRef}></div>;
}
