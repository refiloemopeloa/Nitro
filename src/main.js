import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraManager } from './camera.js';
import { Controls } from './controls.js';
import { CarLoader } from './loadCar.js';
import { BuildingLoader } from './loadBuilding.js';
import carModel from './models/armor_truck.glb';
import buildingModel from './models/building.glb';
import { createDynamicSkybox, updateSkybox } from './skybox';
import CannonDebugger from 'cannon-es-debugger';
import { BoostLoader } from './loadBoost.js';
import boostModel from './models/atom.glb';
import { getParticleSystem } from './getParticleSystem.js';
import getLayer from './getLayer.js';
import img from './img/fire.png'
import { WallLoader } from './loadWall.js';

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

    // Add two cubes with fire effects
    // const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    // const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    // const cube1 = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // cube1.position.set(368, 2, 40);
    // scene.add(cube1);

    // const cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // cube2.position.set(360, 2, 45);
    // scene.add(cube2);

    // Create invisible emitters
    // const emitter1 = new THREE.Object3D();
    // const emitter2 = new THREE.Object3D();

    // Add fire effects to invisible emitters
    // const fireEffect1 = getParticleSystem({
    //     camera,
    //     emitter: emitter1,
    //     parent: scene,
    //     rate: 50.0,
    //     texture: img,
    // });

    // const fireEffect2 = getParticleSystem({
    //     camera,
    //     emitter: emitter2,
    //     parent: scene,
    //     rate: 50.0,
    //     texture: img,
    // });

    // Variables for track creation
    let trackEnd = new THREE.Vector3(0, 0, 0);
    let trackMergeDir = new THREE.Quaternion(0, 0, 0);
    let trackPrevDir = [0, 0, 0];
    const trackSegSize = new CANNON.Vec3(5, 0.05, 5);
    let trackDir = new CANNON.Vec3(0, 0, -1);

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

        const floorGeometry = new THREE.BoxGeometry(trackSegSize.x * 2, trackSegSize.y * 2, trackSegSize.z * 2);
        const concreteATexture = new THREE.TextureLoader().load('./src/assets/textures/concreteA.png');
        const floorMaterial = new THREE.MeshStandardMaterial({
            //color: 0xfcfcfc
            map: concreteATexture,
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        scene.add(floor);

        const trackDir = new CANNON.Vec3(-1, 0, 0);
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

    const buildingLoader = new BuildingLoader(scene, world, groundMaterial);
    // add scenery
    function addScenery(x, y, z, angleY, type) {
        switch (type) {
            case 0:
            case 0:
                const buildingSize = new CANNON.Vec3(20, 20, 20);
                const buildingAScale = new THREE.Vector3(1.7, 2, 2.5);
                buildingLoader.loadBuilding(buildingModel, x, y, z, angleY, buildingSize, buildingAScale).then(() => {
                    console.log('Building loaded successfully');
                }).catch(error => {
                    console.error('Failed to load building model:', error);
                });
                break;
                //buildingABody.quaternion.setFromEuler(0, angleY, 0);
                world.addBody(buildingABody);
                buildingABody.position.set(x, y, z);

                const buildingAGeometry = new THREE.BoxGeometry(2 * buildingASize.x, 2 * buildingASize.y, 2 * buildingASize.z);
                const buildingAMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
                const buidlingA = new THREE.Mesh(buildingAGeometry, buildingAMaterial);
                scene.add(buidlingA);

                buidlingA.position.copy(buildingABody.position);
                buidlingA.quaternion.copy(buidlingA.quaternion);
        }
    }

    // creating map
    addScenery(-40, 0, 0, 0, 0);
    addScenery(-40, 0, -40, -0.01, 0);
    addScenery(-40, 0, 40, 0.01, 0);
    addScenery(0, 0, -40, 0, 0);
    addScenery(0, 0, 40, 0, 0);
    addScenery(40, 0, -40, 0, 0);
    addScenery(40, 0, 40, 0, 0);

    addScenery(80, 0, -40, 0, 0);
    addScenery(100, 0, -80, 0, 0);
    addScenery(140, 0, -80, 0, 0);
    addScenery(150, 0, -20, 0.5, 0);
    addScenery(180, 0, -80, 0, 0);
    addScenery(220, 0, -60, -0.4, 0);
    addScenery(260, 0, -45, -0.4, 0);
    addScenery(300, 0, -30, 0.5, 0);
    addScenery(320, 0, 5, 1.75, 0);

    addScenery(150, 0, 40, 0, 0);
    addScenery(190, 0, 10, 0, 0);

    addScenery(80, 0, 80, 0, 0);
    addScenery(120, 0, 120, 0, 0);
    addScenery(160, 0, 120, 0, 0);
    addScenery(200, 0, 120, 0, 0);
    addScenery(240, 0, 120, 0, 0);
    addScenery(280, 0, 120, 0, 0);
    addScenery(320, 0, 120, 0, 0);
    addScenery(360, 0, 110, 0.3, 0);
    addScenery(390, 0, 90, 1.4, 0);
    addScenery(400, 0, 40, 0, 0);

    addScenery(230, 0, 40, 0, 0);
    addScenery(270, 0, 40, 0, 0);
    addScenery(320, 0, 40, 0, 0);

    addScenery(380, 0, 0, 0, 0);
    addScenery(380, 0, -40, 0, 0);
    addScenery(380, 0, -80, 0, 0);
    addScenery(380, 0, -120, 0, 0);
    addScenery(380, 0, -160, 0, 0);
    addScenery(380, 0, -200, 0, 0);

    trackEnd.set(120, -0.5, 80);
    trackSegSize.set(20, 0.05, 20);
    addRoadSeg(0, 3.14, -0.12);
    addRoadSeg(0, 0, -0.12);
    addRoadSeg(0, 0, 0.24);
    addRoadSeg(0, 0, 1.65);
    addRoadSeg(0, 0, -2.8)

    trackPrevDir = [0, 3.14, 0];
    trackEnd.set(250, 12, 80);
    addRoadSeg(-0.08, 0, 0.3);
    addRoadSeg(0, 0, -0.3);
    addRoadSeg(0, 0.2, 0);
    addRoadSeg(0, 0, -0.3);

    trackEnd.set(368, 0, 40);
    trackPrevDir = [0, 3.14, 0];
    addRoadSeg(0, 0, -0.31);


    // Create ground
    const groundSize = { width: 800, length: 800 };
    const groundShape = new CANNON.Box(new CANNON.Vec3(groundSize.width / 2, 0.05, groundSize.length / 2));
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: groundMaterial
    });
    groundBody.position.set(0, 0, 0);
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

    let gameTimer;
    let gameOver = false;
    let frameCounter = 0;

    function startGame() {
        gameOver = false;
        gameTimer = 120; //in seconds
        frameCounter = 0;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(gameTimer / 60);
        const seconds = gameTimer % 60;
        const timerDisplay = document.getElementById('timer');
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function showGameOverPopup() {
        const popup = document.getElementById('game-over-popup');
        popup.style.display = 'block';
    }

    function hideGameOverPopup() {
        const popup = document.getElementById('game-over-popup');
        popup.style.display = 'none';
    }

    // Modify the restart button event listener
    document.getElementById('restart-button').addEventListener('click', () => {
        location.reload(); // This will reload the entire page
    });

    document.getElementById('main-menu-button').addEventListener('click', () => {
        // Implement main menu logic here
        console.log('Main menu button clicked');
    });
    // Load the car
    const carLoader = new CarLoader(scene, world, carMaterial, wheelMaterial);
    let carObject, vehicle, fireEffect1, fireEffect2;

    carLoader.loadCar(carModel).then(({
        carObject: loadedCarObject,
        vehicle: loadedVehicle,
        FrontWheel_L,
        FrontWheel_R,
        BackWheels,
        emitter1,
        emitter2
    }) => {
        carObject = loadedCarObject;
        vehicle = loadedVehicle;

        controls.setVehicle(vehicle);
        controls.setCarParts({ FrontWheel_L, FrontWheel_R, BackWheels });

        // Create fire effects using the emitters from the car
        fireEffect1 = getParticleSystem({
            camera,
            emitter: emitter1,
            parent: scene,
            rate: 50.0,
            texture: img,
        });

        fireEffect2 = getParticleSystem({
            camera,
            emitter: emitter2,
            parent: scene,
            rate: 50.0,
            texture: img,
        });

        // Start the game
        startGame();

        // Start the animation loop
        renderer.setAnimationLoop(animate);
    }).catch(error => {
        console.error('Failed to load car model:', error);
    });

    const boostLoader = new BoostLoader(scene, world);
    const boostPositions = [
        // add boost items here
        new THREE.Vector3(10, 2, 10),
        new THREE.Vector3(12, 2, 10),
    ];
    boostLoader.loadBoost(boostModel, boostPositions).then(() => {
        console.log('Boost objects loaded');
    }).catch(error => {
        console.error('Failed to load boost model:', error);
    });

    // Win Condition: contact wall
    const wallLoader = new WallLoader(scene, world);
    wallLoader.createWall(
        { x: 0, y: 2, z: 10 }, // Position - finish line
        { x: 5, y: 4, z: 10 }    // Size 
    );

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

    function animate(time) {
        time *= 0.001; // Convert time to seconds
        const deltaTime = time * 0.001;

        if (!gameOver && !wallLoader.checkGameStatus()) {
            world.step(1 / 60);
            frameCounter++; // Increment frame counter

            if (frameCounter >= 60) { // Check if a second has passed
                frameCounter = 0; // Reset frame counter
                if (gameTimer > 0) {
                    gameTimer--;
                    updateTimerDisplay();
                } else {
                    gameOver = true;
                    showGameOverPopup();
                    return;
                }
            }

            if (carObject && vehicle) {
                // Define the visual offset for the car model in local space
                const carVisualOffset = new THREE.Vector3(0, -1, 0);

                // Create a matrix from the chassis body's position and rotation
                const chassisMatrix = new THREE.Matrix4().compose(
                    new THREE.Vector3().copy(vehicle.chassisBody.position),
                    new THREE.Quaternion().copy(vehicle.chassisBody.quaternion),
                    new THREE.Vector3(1, 1, 1)
                );

                // Apply the offset in local space
                const offsetMatrix = new THREE.Matrix4().makeTranslation(
                    carVisualOffset.x,
                    carVisualOffset.y,
                    carVisualOffset.z
                );

                // Combine the chassis matrix with the offset
                const finalMatrix = chassisMatrix.multiply(offsetMatrix);

                // Apply the final transformation to the car object
                carObject.matrix.copy(finalMatrix);
                carObject.matrixAutoUpdate = false;
                carObject.updateMatrixWorld(true);

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

                carLoader.updateHeadlightPosition(carObject, vehicle);

                // Check for boost collision
                if (boostLoader.checkBoostCollision(vehicle.chassisBody)) {
                    controls.activateBoost();
                }
                // Update boost objects
                boostLoader.update(deltaTime);
                // Update emitter positions
                if (fireEffect1 && fireEffect2) {
                    // Get the car's world position and rotation
                    carObject.updateMatrixWorld();
                    const carWorldPosition = new THREE.Vector3();
                    const carWorldQuaternion = new THREE.Quaternion();
                    carObject.getWorldPosition(carWorldPosition);
                    carObject.getWorldQuaternion(carWorldQuaternion);

                    // Update emitter positions relative to the car
                    const updateEmitterPosition = (fireEffect, localOffset) => {
                        const worldOffset = localOffset.applyQuaternion(carWorldQuaternion);
                        fireEffect.emitter.position.copy(carWorldPosition).add(worldOffset);
                    };

                    updateEmitterPosition(fireEffect1, new THREE.Vector3(2, 0, 0.5));
                    updateEmitterPosition(fireEffect2, new THREE.Vector3(2, 0, -0.5));

                    // Update fire effects
                    if (fireEffect1) fireEffect1.update(deltaTime);
                    if (fireEffect2) fireEffect2.update(deltaTime);
                }
                wallLoader.update(deltaTime);
            }

            // Rotate cubes
            // cube1.rotation.x += 0.01;
            // cube1.rotation.y += 0.02;
            // cube2.rotation.x += 0.02;
            // cube2.rotation.y += 0.01

            // Update skybox
            updateSkybox(skybox, time);

            // Update Cannon debugger
            //cannonDebugger.update();

            // Update orbit controls only in free camera mode
            if (cameraManager.cameraMode === 2) {
                orbitControls.update();
            }

            renderer.render(scene, camera);
        }
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
        const rotation = Math.min(speed / 200 * 182 - 135, 135); // -135 to 135 degrees
        needle.style.transform = `rotate(${rotation}deg)`;
    }

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}