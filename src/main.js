import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { CameraManager } from './camera.js';
import { Controls } from './controls.js';
import { CarLoader } from './loadCar.js';
import carModel from './models/armor_truck.glb';
import { createDynamicSkybox, updateSkybox } from './skybox';

if (WebGL.isWebGL2Available()) {
    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Add dynamic skybox
    const skybox = createDynamicSkybox(scene);

    // Cannon.js world setup
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });

    // Physics materials
    const groundMaterial = new CANNON.Material('ground');
    const carMaterial = new CANNON.Material('car');

    // Contact material for car-ground interaction
    const carGroundContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        carMaterial,
        {
            friction: 0.005,
            restitution: 0.3
        }
    );
    world.addContactMaterial(carGroundContactMaterial);

    // Variables for track creation
    let trackEnd = new THREE.Vector3(0, 0, 0);
    let trackMergeDir = new THREE.Quaternion(0, 0, 0);
    let trackPrevDir = [0, 0, 0];
    let trackSegSize = new CANNON.Vec3(5, 0.05, 10);

    // Function to add road segments
    function addRoadSeg(angleX, angleY, angleZ) {
        // Create ground
        const groundShape = new CANNON.Box(trackSegSize);
        const groundBody = new CANNON.Body({
            mass: 0,
            shape: groundShape,
            material: groundMaterial
        });
        groundBody.quaternion.setFromEuler(trackPrevDir[0] + angleX, trackPrevDir[1] + angleY, trackPrevDir[2] + angleZ);
        world.addBody(groundBody);

        const floorGeometry = new THREE.BoxGeometry(10, 0.1, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xfcfcfc });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        scene.add(floor);

        const trackDir = new CANNON.Vec3(0, 0, -1);
        groundBody.quaternion.vmult(trackDir, trackDir);

        let centered = angleY / 1.8;

        groundBody.position.set(
            trackEnd.x + (trackDir.x * trackSegSize.z) - (trackMergeDir.x * trackSegSize.z * centered),
            trackEnd.y + (trackDir.y * trackSegSize.z) - (trackMergeDir.y * trackSegSize.z * centered),
            trackEnd.z + (trackDir.z * trackSegSize.z) - (trackMergeDir.z * trackSegSize.z * centered)
        );

        trackEnd.set(
            trackEnd.x + (2 * trackDir.x * trackSegSize.z) - (trackMergeDir.x * trackSegSize.z * centered),
            trackEnd.y + (2 * trackDir.y * trackSegSize.z) - (trackMergeDir.y * trackSegSize.z * centered),
            trackEnd.z + (2 * trackDir.z * trackSegSize.z) - (trackMergeDir.z * trackSegSize.z * centered)
        );

        floor.position.copy(groundBody.position);
        floor.quaternion.copy(groundBody.quaternion);

        trackPrevDir[0] += angleX;
        trackPrevDir[1] += angleY;
        trackPrevDir[2] += angleZ;

        trackMergeDir.copy(trackDir);
    }

    // Create road segments
    addRoadSeg(0, 0, 0);
    addRoadSeg(0, 1.6, 0);
    addRoadSeg(0, 0.6, 0);
    addRoadSeg(0, 0.6, 0);
    addRoadSeg(0, 0.6, 0);
    addRoadSeg(0, 0.6, 0);
    addRoadSeg(0, 0.6, 0);

    // Create larger ground
    const groundSize = { width: 100, length: 100 };
    const groundShape = new CANNON.Box(new CANNON.Vec3(groundSize.width / 2, 0.05, groundSize.length / 2));
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: groundMaterial
    });
    groundBody.position.set(0, -0.5, 0);
    world.addBody(groundBody);

    // Create grid texture and floor
    const gridTexture = createGridTexture(groundSize);
    const floor = createFloor(groundSize, gridTexture, groundBody);
    scene.add(floor);

    // Add grid lines
    const gridHelper = createGridHelper(groundSize);
    scene.add(gridHelper);

    // Initialize camera manager
    const cameraManager = new CameraManager(camera, scene);

    // Initialize controls
    const controls = new Controls(world);

    // Load the car
    const carLoader = new CarLoader(scene, world, carMaterial);
    let carObject, carBody, FrontWheel_L, FrontWheel_R, BackWheels;

    carLoader.loadCar(carModel).then(({
        carObject: loadedCarObject,
        carBody: loadedCarBody,
        FrontWheel_L: loadedFrontWheel_L,
        FrontWheel_R: loadedFrontWheel_R,
        BackWheels: loadedBackWheels
    }) => {
        carObject = loadedCarObject;
        carBody = loadedCarBody;
        FrontWheel_L = loadedFrontWheel_L;
        FrontWheel_R = loadedFrontWheel_R;
        BackWheels = loadedBackWheels;

        controls.setCarBody(carBody);

        // Start the animation loop
        renderer.setAnimationLoop(animate);
    }).catch(error => {
        console.error('Failed to load car model:', error);
    });

    // Event listener for camera mode switch
    document.addEventListener('keydown', (event) => {
        if (event.key === 'v') {
            cameraManager.switchCameraMode();
        }
    });

    function animate(time) {
        time *= 0.001; // Convert time to seconds
        world.step(1 / 60);

        if (carObject && carBody) {
            // Sync car model with Cannon.js body
            carObject.position.copy(carBody.position);
            carObject.quaternion.copy(carBody.quaternion);

            // Calculate speed in km/h
            const velocity = carBody.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 3.6; // Convert m/s to km/h

            // Update speedometer
            updateSpeedometer(speed);

            // Update camera
            cameraManager.updateCamera(carBody, carObject);

            // Apply controls
            controls.keyAction();

            // Apply wheel transformations
            controls.applyWheelTransformations(FrontWheel_L, FrontWheel_R, BackWheels);
        }

        // Update skybox
        updateSkybox(skybox, time);

        renderer.render(scene, camera);
    }

    function createGridTexture(groundSize) {
        const gridSize = 1;
        const gridTexture = new THREE.TextureLoader().load(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(groundSize.width / gridSize, groundSize.length / gridSize);
            }
        );
        return gridTexture;
    }

    function createFloor(groundSize, gridTexture, groundBody) {
        const floorGeometry = new THREE.PlaneGeometry(groundSize.width, groundSize.length);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: gridTexture,
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.copy(groundBody.position);
        return floor;
    }

    function createGridHelper(groundSize) {
        const gridHelper = new THREE.GridHelper(Math.max(groundSize.width, groundSize.length), Math.max(groundSize.width, groundSize.length), 0x000000, 0x000000);
        gridHelper.position.y = -0.49; // Slightly above the floor to prevent z-fighting
        return gridHelper;
    }

    function updateSpeedometer(speed) {
        const speedDisplay = document.getElementById('speed-display');
        const needle = document.getElementById('needle');
    
        // Update speed display
        speedDisplay.textContent = `${Math.round(speed)} km/h`;
    
        // Rotate needle (assuming max speed of 200 km/h)
        const rotation = Math.min(speed / 200 * 270 - 135, 135); // -135 to 135 degrees
        needle.style.transform = `rotate(${rotation}deg)`;
    }

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}