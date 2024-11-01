import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraManager } from './camera.js';
import { Controls } from './controls.js';
import { CarLoader } from './loadCar.js';
import { BlockLoader } from './block.js';  // Add this import
import carModel from './models/armor_truck.glb';
import TriggerSystem from './triggerSystem.js'; 
import blockModel from './models/road_block_a.glb';   // Add your block model path
import { WaterPuddles } from './waterPuddles.js'; 

import { createDynamicSkybox, updateSkybox } from './skybox';
import CannonDebugger from 'cannon-es-debugger';

if (WebGL.isWebGL2Available()) {
    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Orbit controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enabled = false; // Disable by default
    camera.position.set(0, 5, 10);
    orbitControls.update();

    // Initialize camera manager
    const cameraManager = new CameraManager(camera, scene);

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
    const wheelMaterial = new CANNON.Material('wheel');

    // Contact material for car-ground interaction
    const carGroundContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        carMaterial,
        {
            friction: 0.1,
            restitution: 0.3
        }
    );
    world.addContactMaterial(carGroundContactMaterial);

    // Contact material for car-ground interaction
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        wheelMaterial,
        {
            friction: 0.1,
            restitution: 0.3
        }
    );
    world.addContactMaterial(wheelGroundContactMaterial);


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

    // Create ground
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
    scene.add(gridHelper);;

    // Initialize controls
    const controls = new Controls(world);

    // Load the car
    const carLoader = new CarLoader(scene, world, carMaterial, wheelMaterial);
    let carObject, vehicle;

    carLoader.loadCar(carModel).then(({
        carObject: loadedCarObject,
        vehicle: loadedVehicle,
        FrontWheel_L,
        FrontWheel_R,
        BackWheels
    }) => {
        carObject = loadedCarObject;
        vehicle = loadedVehicle;

        controls.setVehicle(vehicle);
        controls.setCarParts({ FrontWheel_L, FrontWheel_R, BackWheels });

        // Start the animation loop
        renderer.setAnimationLoop(animate);
    }).catch(error => {
        console.error('Failed to load car model:', error);
    });

    // Cannon debugger
    const cannonDebugger = new CannonDebugger(scene, world);

    // Event listener for camera mode switch
    document.addEventListener('keydown', (event) => {
        if (event.key === 'v') {
            cameraManager.switchCameraMode();
            if (cameraManager.cameraMode === 2) {
                orbitControls.enabled = true;
                if (carObject) {
                    // Set orbit controls target to car position
                    orbitControls.target.copy(carObject.position);
                    // Reset camera position relative to the car
                    const offset = new THREE.Vector3(5, 3, 5);
                    camera.position.copy(carObject.position).add(offset);
                }
            } else {
                orbitControls.enabled = false;
            }
        }
    });


     // Initialize BlockLoader and TriggerSystem
    const blockLoader = new BlockLoader(scene, world, groundMaterial);
    const triggerSystem = new TriggerSystem(scene, blockLoader);

    //example trigger zones
    const triggers = [
        {
            position: { x: -10, z: 44 },
            dropPositions: [
                { x: 4, z: 44 },
                { x: -1, z: 48 },
                { x: -1, z: 41 }
            ]
        },
        {
            position: { x: -36, z: 20 },
            dropPositions: [
                // { x: -35, z: 25 },
                { x: -28, z: 30 },
                { x: -15, z: 40 }
            ]
        },
        {
            position: { x: 0, z: -10 },
            dropPositions: [
                { x: -5, z: -7.5 },
                // { x: -25, z: 0 },
                { x: -32, z: 15 }
            ]
        }
    ];

    triggers.forEach(trigger => {
        triggerSystem.addTrigger(
            trigger.position,
            2, // radius of trigger zone
            {
                model: blockModel,
                size: { x: 2, y: 2, z: 2 },
                scale: 1
            },
            trigger.dropPositions
        );
    });

    // Add key handler for resetting triggers
    document.addEventListener('keydown', (event) => {
        if (event.key === 'r') {
            triggerSystem.reset();
            blockLoader.clearBlocks();
        }
    });

     // Add key handler for dropping blocks
     document.addEventListener('keydown', (event) => {
         if (event.key === 'b') {
             // Drop a single block at a random position near the car
             if (carObject) {
                 const randomOffset = {
                     x: ( - 1) * 20, // Random position within 20 units
                     z: (1 - 0.5) * 20
                 };
                 
                 const dropPosition = {
                     x: carObject.position.x + randomOffset.x,
                     z: carObject.position.z + randomOffset.z
                 };
                 
                 blockLoader.loadBlock(blockModel, dropPosition, { x: 2, y: 2, z: 2 }, 1);
             }
         } else if (event.key === 'n') {
             // Drop a pattern of blocks
             if (carObject) {
                 const pattern = [
                     [1, 1, 1],
                     [1, 0, 1],
                     [1, 1, 1]
                 ];
                 
                 const centerPosition = {
                     x: carObject.position.x,
                     z: carObject.position.z
                 };
                 
                 blockLoader.dropBlockPattern(blockModel, centerPosition, pattern, 4);
             }
         } else if (event.key === 'm') {
             // Clear all blocks
             blockLoader.clearBlocks();
         }
     });
 
     // Add this after scene and renderer setup
    const waterPuddles = new WaterPuddles(scene, renderer);

    // Create random puddles
    waterPuddles.createRandomPuddles(5, 50); // 5 puddles within 50 units
    

    function animate(time) {
        time *= 0.001; // Convert time to seconds
        world.step(1 / 60);

        // Update blocks
        blockLoader.update();

        // Check triggers if car exists
        if (carObject) {
            triggerSystem.checkTriggers(carObject.position);
        }

        waterPuddles.update();


    
    //Add ripple effect when car drives through puddles
    if (carObject && vehicle) {
        const carPosition = new THREE.Vector3();
        carObject.getWorldPosition(carPosition);
        waterPuddles.addRipple(carPosition, 0.5);
    }



        if (carObject && vehicle) {
            // Define the visual offset for the car model
            const carVisualOffset = new THREE.Vector3(0, -1, 0); // Adjust the Y value to shift the car down

            // Sync car model with Cannon.js body
            carObject.position.copy(vehicle.chassisBody.position).add(carVisualOffset);
            carObject.quaternion.copy(vehicle.chassisBody.quaternion);

            // Calculate speed in km/h
            const velocity = vehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 3.6; // Convert m/s to km/h

            // Update speedometer
            updateSpeedometer(speed);


            // Update camera based on mode
            if (cameraManager.cameraMode !== 2) {
                cameraManager.updateCamera(vehicle.chassisBody, carObject);
            } else {
                // In free camera mode, update orbit controls target to follow the car
                orbitControls.target.copy(carObject.position);
            }

            // Apply controls
            controls.update();

            // Apply wheel transformations
            controls.applyWheelTransformations();
        }

        // Update skybox
        updateSkybox(skybox, time);

        // Update Cannon debugger
        cannonDebugger.update();

        // Update orbit controls only in free camera mode
        if (cameraManager.cameraMode === 2) {
            orbitControls.update();
        }

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