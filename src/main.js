import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraManager } from './camera.js';
import { Controls } from './controls.js';
import { CarLoader } from './loadCar.js';
import { BuildingLoader } from './loadBuilding.js';
import { WastelandStoreLoader } from './loadWastelandStore.js';
import { GraffitiWallLoader } from './loadGraffitiWall.js';
import { MilitaryBaseLoader } from './abandonedMilitaryBase.js';
import carModel from './models/armor_truck.glb';
import wastelandStoreModel from './models/wasteland_stores.glb';
import buildingModel from './models/building.glb';
import graffitiWallModel from './models/ghetto_hood_graffiti_detroit_building_1.glb';
import militaryBaseModel from './models/post_apocalyptic_building_-_lowpoly.glb';
import { createDynamicSkybox, updateSkybox } from './skybox';
import CannonDebugger from 'cannon-es-debugger';
import { BoostLoader } from './loadBoost.js';
import boostModel from './models/atom.glb';
import { getParticleSystem } from './getParticleSystem.js';
import getLayer from './getLayer.js';
import img from './img/smoke.png'
import { WallLoader } from './loadWall.js';
import { CrateLoader } from './loadCrate.js';
import crateModel from './models/Crate.glb';

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
    directionalLight.position.set(1, 1, 1).normalize();
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
            friction: 0.0,
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
    let trackSegSize = new CANNON.Vec3(5, 0.05, 10);

    let isPaused = false;
    let lastTime = 0;
    let accumulatedTime = 0;

    // Menu functionality
    const menuButton = document.getElementById('menuButton');
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modalOverlay');
    const settingsButton = document.getElementById('settingsButton');
    const quitButton = document.getElementById('quitButton');
    const resumeButton = document.getElementById('resumeButton');

    menuButton.addEventListener('click', openModal);
    modalOverlay.addEventListener('click', closeModal);
    settingsButton.addEventListener('click', openSettings);
    quitButton.addEventListener('click', quitGame);
    resumeButton.addEventListener('click', closeModal);

    function openModal() {
        modal.style.display = 'block';
        modalOverlay.style.display = 'block';
        isPaused = true;
        controls.disable(); // Disable car controls
    }

    function closeModal() {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
        isPaused = false;
        controls.enable(); // Re-enable car controls
    }

    function openSettings() {
        // Implement settings functionality here
        console.log('Settings opened');
    }

    function quitGame() {
        window.location.href = 'startPage.html';
    }

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

        let centered = Math.abs(angleY) / 1.6;

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
    const graffitiWallLoader = new GraffitiWallLoader(scene, world, groundMaterial);
    const militaryBaseLoader = new MilitaryBaseLoader(scene, world, groundMaterial);
    const wastelandStoreLoader = new WastelandStoreLoader(scene, world, groundMaterial);
    // add scenery
    function addScenery(x, y, z, angleY, type) {
        switch (type) {
            case 0:
                const buildingSize = new CANNON.Vec3(20, 16, 20);
                const buildingAScale = new THREE.Vector3(1.7, 2, 2.5);
                buildingLoader.loadBuilding(buildingModel, x, y, z, angleY, buildingSize, buildingAScale).then(() => {
                    console.log('Building loaded successfully');
                }).catch(error => {
                    console.error('Failed to load building model:', error);
                });

            break;

            case 1: // New case for graffiti wall
            const wallSize = new CANNON.Vec3(10, 22, 40); // Adjust size as needed
            graffitiWallLoader.loadGraffitiWall(graffitiWallModel, x, y, z, angleY, wallSize).then(() => {
                console.log('Graffiti wall loaded successfully');
            }).catch(error => {
                console.error('Failed to load graffiti wall model:', error);
            });
            break;
            case 2: // New case for military base
            const baseSize = new CANNON.Vec3(20, 20, 13); // Adjust size as needed
            militaryBaseLoader.loadMilitaryBase(militaryBaseModel, x, y, z, angleY, baseSize).then(() => {
                console.log('Base loaded successfully');
            }).catch(error => {
                console.error('Failed to load base model:', error);
            });
            break;
            case 3: // Wasteland store
            const storeSize = new CANNON.Vec3(40, 16, 14.5);
            wastelandStoreLoader.loadWastelandStore(wastelandStoreModel, x, y, z, angleY, storeSize).then(() => {
                console.log('Wasteland store loaded successfully');
            }).catch(error => {
                console.error('Failed to load wasteland store model:', error);
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
    addScenery(-40, 0, 0, 0, 1);
    addScenery(-40, 0, -40, -0.01, 0);
    addScenery(-40, 0, 40, 0.01, 0);
    addScenery(0, 0, -40, 0, 3);
    addScenery(0, 0, 40, 0, 0);
    addScenery(40, 0, -40, 0, 0);
    addScenery(40, 0, 40, 0, 0);

    addScenery(80, 0, -50, 0.1, 3);
    addScenery(100, 0, -80, 0, 0);
    addScenery(140, 0, -60, 0, 2);
    addScenery(150, 0, -10, 0.5, 0);
    addScenery(180, 0, -80, 0, 0);
    addScenery(220, 0, -60, -0.4, 0);
    addScenery(260, 0, -45, -0.4, 0);
    addScenery(300, 0, -30, 0.5, 0);
    addScenery(320, 0, 0, 0.1, 0);

    addScenery(150, 0, 40, 0, 0);
    addScenery(190, 0, 10, 0, 2);

    addScenery(80, 0, 80, 0, 0);
    addScenery(120, 0, 120, 0, 2);
    addScenery(160, 0, 120, 0, 2);
    addScenery(200, 0, 120, 0, 0);
    addScenery(240, 0, 120, 0, 0);
    addScenery(280, 0, 120, 0, 2);
    addScenery(320, 0, 120, 0, 0);
    addScenery(360, 0, 110, 0.3, 0);
    addScenery(390, 0, 90, 1.4, 0);
    addScenery(400, 0, 40, 0, 0);

    addScenery(230, 0, 40, 0, 3);
    addScenery(270, 0, 40, 0, 2);
    addScenery(320, 0, 40, 0, 0);

    addScenery(380, 0, 0, 0, 0);
    addScenery(380, 0, -40, 0, 0);
    addScenery(380, 0, -80, 0, 0);
    addScenery(380, 0, -120, 0, 0);
    addScenery(380, 0, -160, 0, 0);
    addScenery(380, 0, -200, 0, 0);


    // After loading buildings, update their shader uniforms
    scene.traverse((object) => {
        if (object.isMesh && object.material && object.material.type === 'ShaderMaterial' && object.material.uniforms) {
            if (object.material.uniforms.lightDirection) {
                object.material.uniforms.lightDirection.value.copy(directionalLight.position).normalize();
            }
            if (object.material.uniforms.lightColor) {
                object.material.uniforms.lightColor.value.copy(directionalLight.color);
            }
        }
    });

    addScenery(380, 0, -240, 0, 0);
    addScenery(340, 0, -240, 0, 0);
    addScenery(300, 0, -240, 0, 0);
    addScenery(260, 0, -240, 0, 0);
    addScenery(220, 0, -250, 0, 2);
    addScenery(180, 0, -250, 0, 3);
    addScenery(140, 0, -250, 0, 0);
    addScenery(100, 0, -250, 0, 0);

    addScenery(280, 0, -170, 0, 0);
    addScenery(240, 0, -170, 0, 0);
    addScenery(200, 0, -160, -0.1, 2);
    addScenery(80, 0, -160, 0, 0);
    addScenery(140, 0, -115, -0.4, 2);

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

    trackPrevDir = [0, 0, 0];
    trackEnd.set(220, 0, -120);
    addRoadSeg(0, -0.3, -0.1);
    addRoadSeg(-0.04, -0.3, -0.1);
    addRoadSeg(-0.09, -0.3, -0.1);
    addRoadSeg(0.1, 0.3, 0.2);
    addRoadSeg(0, 0.2, 0.1);
    addRoadSeg(0, 0.3, 0.1);
    addRoadSeg(0, 0.3, 0.1);
    addRoadSeg(0, 0.3, 0.1);


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

    let isGameStarted = false;
    let gameTimer;
    let gameOver = false;
    let frameCounter = 0;

    function startGame() {
        gameOver = false;
        gameTimer = 120;
        frameCounter = 0;
        carHealth = MAX_HEALTH; // Reset health
        lastCollisionTime = 0;
        updateHealthBar(); // Initialize health bar
        updateTimerDisplay();
        if (!isGameStarted) {
            isGameStarted = true;
            gameOver = false;
            gameTimer = 120; // in seconds
            frameCounter = 0;
            updateTimerDisplay();
            console.log('Game started!');
        }
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
    const carLoader = new CarLoader(scene, world, carMaterial, wheelMaterial, camera);
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

        // Add collision event listener to the chassis body
        vehicle.chassisBody.addEventListener('collide', (event) => {
            const relativeVelocity = event.contact.getImpactVelocityAlongNormal();

            // Only register significant collisions
            if (Math.abs(relativeVelocity) > 5) {
                const damage = Math.min(COLLISION_DAMAGE, Math.abs(relativeVelocity * 2));
                damageVehicle(damage);
            }
        });

        crateLoader.setCarBody(vehicle.chassisBody);

        controls.setVehicle(vehicle);
        controls.setCarParts({ FrontWheel_L, FrontWheel_R, BackWheels });
        controls.setCarLoader(carLoader);

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
        //startGame();

        // Start the animation loop
        renderer.setAnimationLoop(animate);
    }).catch(error => {
        console.error('Failed to load car model:', error);
    });


    let carHealth = 100;
    const MAX_HEALTH = 100;
    const COLLISION_DAMAGE = 10;
    const HEALTH_REGEN_RATE = 2;
    const HEALTH_REGEN_DELAY = 3000; // 3 seconds
    let lastCollisionTime = 0;

    // Add this function to update the health bar display
    function updateHealthBar() {
        const healthBar = document.getElementById('health-bar');
        const healthPercent = (carHealth / MAX_HEALTH) * 100;
        healthBar.style.width = `${healthPercent}%`;

        // Change color based on health level
        if (healthPercent > 60) {
            healthBar.style.backgroundColor = '#2ecc71'; // Green
        } else if (healthPercent > 30) {
            healthBar.style.backgroundColor = '#f1c40f'; // Yellow
        } else {
            healthBar.style.backgroundColor = '#e74c3c'; // Red
        }
    }

    // Add this function to handle damage
    function damageVehicle(damage) {
        carHealth = Math.max(0, carHealth - damage);
        lastCollisionTime = Date.now();
        updateHealthBar();

        if (carHealth <= 0) {
            gameOver = true;
            showGameOverPopup();
        }
    }

    // Add this function to handle health regeneration
    function regenerateHealth(currentTime) {
        if (carHealth < MAX_HEALTH && (currentTime - lastCollisionTime) > HEALTH_REGEN_DELAY) {
            carHealth = Math.min(MAX_HEALTH, carHealth + HEALTH_REGEN_RATE * (1 / 60));
            updateHealthBar();
        }
    }

    const boostLoader = new BoostLoader(scene, world);
    const boostPositions = [
        // add boost items here
        new THREE.Vector3(20, 2, 10),
        new THREE.Vector3(210, 15, 80),
        new THREE.Vector3(220, 2, -120),
        new THREE.Vector3(220, 2, -200),
        new THREE.Vector3(290, 2, -200),
    ];
    boostLoader.loadBoost(boostModel, boostPositions).then(() => {
        console.log('Boost objects loaded');
    }).catch(error => {
        console.error('Failed to load boost model:', error);
    });

    const crateLoader = new CrateLoader(scene, world, camera);
    const cratePositions = [
        // Add crate positions here
        new THREE.Vector3(0, 2, 2),
        new THREE.Vector3(280, 2, -90),
        new THREE.Vector3(260, 2, -100),
        new THREE.Vector3(280, 2, -130),
        new THREE.Vector3(260, 2, -140),
    ];

    // Load the crates
    crateLoader.loadCrates(crateModel, cratePositions).then(() => {
        console.log('Crate objects loaded');
    }).catch(error => {
        console.error('Failed to load crate model:', error);
    });


    //event listener for crate damage
    window.addEventListener('crateDamage', (event) => {
        damageVehicle(event.detail.damage);
    });

    // Win Condition: contact wall
    const wallLoader = new WallLoader(scene, world);
    wallLoader.createWall(
        { x: -100, y: 2, z: -150 }, // Position - finish line
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

// Modify your existing event listener for keydown
document.addEventListener('keydown', (event) => {
    // Existing camera switch code
    if (event.key === 'v') {
        cameraManager.switchCameraMode();
        if (cameraManager.cameraMode === 2) {
            orbitControls.enabled = true;
            if (carObject) {
                orbitControls.target.copy(carObject.position);
                const offset = new THREE.Vector3(5, 3, 5);
                camera.position.copy(carObject.position).add(offset);
            }
        } else {
            orbitControls.enabled = false;
        }
    }

    // Start game on WASD press
    if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase()) && !isGameStarted) {
        startGame();
    }
});

    function animate(time) {


        if (isPaused) {
            lastTime = time;
            return;
        }

        const deltaTime = (time - lastTime) * 0.001; // Convert to seconds
        lastTime = time;

        accumulatedTime += deltaTime;

        while (accumulatedTime >= 1 / 60) {
            world.step(1 / 60);
            accumulatedTime -= 1 / 60;
        }

        if (isGameStarted && !gameOver) {
            frameCounter++;
            if (frameCounter >= 60) { // Check if a second has passed
                frameCounter = 0;
                if (gameTimer > 0) {
                    gameTimer--;
                    updateTimerDisplay();
                } else {
                    gameOver = true;
                    showGameOverPopup();
                    return;
                }
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

                regenerateHealth(Date.now());

                // Apply wheel transformations
                controls.applyWheelTransformations();

                carLoader.updateHeadlightPosition(carObject, vehicle);

                // Check for boost collision
                if (boostLoader.checkBoostCollision(vehicle.chassisBody)) {
                    controls.activateBoost();
                }
                // Update boost objects
                boostLoader.update(deltaTime);

                if (fireEffect1 && fireEffect2) {
                    // Get the car's world position and rotation
                    carObject.updateMatrixWorld();
                    const carWorldPosition = new THREE.Vector3();
                    const carWorldQuaternion = new THREE.Quaternion();
                    carObject.getWorldPosition(carWorldPosition);
                    carObject.getWorldQuaternion(carWorldQuaternion);

                    // Get the car's velocity in world space
                    const velocity = vehicle.chassisBody.velocity;
                    const carVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);

                    // Scale the velocity for the particle effect
                    const velocityScale = 2.0; // Adjust this value to control the particle spread
                    const particleVelocity = carVelocity.multiplyScalar(-velocityScale); // Negative to emit backwards

                    // Add some upward velocity to make it more visually interesting
                    particleVelocity.y += 2;

                    // Update emitter positions and velocities
                    const updateEmitter = (fireEffect, localOffset) => {
                        const worldOffset = localOffset.clone().applyQuaternion(carWorldQuaternion);
                        fireEffect.emitter.position.copy(carWorldPosition).add(worldOffset);
                        fireEffect.setVelocity(particleVelocity);
                    };

                    updateEmitter(fireEffect1, new THREE.Vector3(2, 0, 0.5));
                    updateEmitter(fireEffect2, new THREE.Vector3(2, 0, -0.5));

                    // Update fire effects
                    fireEffect1.update(deltaTime);
                    fireEffect2.update(deltaTime);

                }
                wallLoader.update(deltaTime);
                // Update crates
                crateLoader.update(deltaTime);


                const headlightPositions = [
                    new THREE.Vector3().setFromMatrixPosition(carObject.children[0].matrixWorld),
                    new THREE.Vector3().setFromMatrixPosition(carObject.children[1].matrixWorld)
                ];

                // Update building shaders with headlight positions
                // In your animate function, when updating building shaders:
                scene.traverse((object) => {
                    if (object.isMesh && object.material.type === 'ShaderMaterial' && object.material.uniforms) {
                        // Update directional light
                        if (object.material.uniforms.lightDirection) {
                            object.material.uniforms.lightDirection.value.copy(directionalLight.position).normalize();
                        }
                        if (object.material.uniforms.lightColor) {
                            object.material.uniforms.lightColor.value.copy(directionalLight.color);
                        }

                        // Update headlight positions
                        if (object.material.uniforms.pointLightPositions) {
                            object.material.uniforms.pointLightPositions.value = headlightPositions;
                        }
                        if (object.material.uniforms.pointLightColors) {
                            object.material.uniforms.pointLightColors.value = [
                                new THREE.Color(0xffff00),
                                new THREE.Color(0xffff00)
                            ];
                        }
                    }
                });
            }

        // Update skybox
        updateSkybox(skybox, time * 0.001);

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
        const rotation = Math.min(speed / 200 * 182 - 135, 135); // -135 to 135 degrees
        needle.style.transform = `rotate(${rotation}deg)`;
    }

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}