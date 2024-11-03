import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/capabilities/WebGL.js';
import { OrbitControls } from 'three/controls/OrbitControls.js';
import { CameraManager } from './camera.js';
import { Controls } from './controls.js';
import { CarLoader } from './loadCar1.js';
import { BuildingLoader } from './loadBuilding.js';
import { WastelandStoreLoader } from './loadWastelandStore.js';
import { GraffitiWallLoader } from './loadGraffitiWall.js';
import { MilitaryBaseLoader } from './abandonedMilitaryBase.js';
import { createDynamicSkybox, updateSkybox } from './skybox';
import CannonDebugger from 'cannon-es-debugger';
import { BoostLoader } from './loadBoost.js';
import { getParticleSystem } from './getParticleSystem.js';
import getLayer from './getLayer.js';
import { WallLoader } from './loadWall.js';
import { CrateLoader } from './loadCrate.js';
import { RubbleLoader } from './rubbleLoader.js';
import { CarAudioManager } from './carAudioManager.js';
import { CheckpointLoader } from './loadCheckpoint.js';
import { BlockLoader } from './block.js';  // Add this import block class
import TriggerSystem from './triggerSystem.js';
import { ArrowLoader } from './loadArrowSign.js';
import { BoundLoader } from './loadBound.js';

// Images
const img = 'src/img/smoke.png'

// Models
const boostModel = 'src/models/atom.glb';
const crateModel = 'src/models/Crate.glb';
const blockModel = 'src/models/road_block_a.glb';   // Add your block model path
const arrowModel = 'src/models/GreenArrowIcon.glb';
const carModel = 'src/models/armor_truck.glb';
const wastelandStoreModel = 'src/models/wasteland_stores.glb';
const buildingModel = 'src/models/building.glb';
const graffitiWallModel = 'src/models/ghetto_hood_graffiti_detroit_building_1.glb';
const militaryBaseModel = 'src/models/post_apocalyptic_building_-_lowpoly.glb';


if (WebGL.isWebGL2Available()) {

    const loadingPromises = [];
    // Loading manager setup
    const loadingManager = new THREE.LoadingManager();
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingStatus = document.querySelector('.loading-status');

    loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        loadingBar.style.width = progress + '%';
        loadingStatus.textContent = `Loading assets... ${Math.round(progress)}%`;
    };


    loadingManager.onError = function (url) {
        console.error('Error loading:', url);
        loadingStatus.textContent = 'Error loading game assets';
        loadingStatus.style.color = '#ff0000';
    };

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Car revving sounds
    const carAudioManager = new CarAudioManager();
    carAudioManager.init();
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

    const checkpointLoader = new CheckpointLoader(scene, world, loadingManager);
    const boundLoader = new BoundLoader(scene, world, loadingManager, () => {
        if (vehicle) {  // Make sure vehicle exists
            respawnCar(performance.now());  // Use performance.now() if time isn't available
        }
    });
    // Initialize BlockLoader and TriggerSystem
    const blockLoader = new BlockLoader(scene, world, groundMaterial, loadingManager);
    const triggerSystem = new TriggerSystem(scene, blockLoader, loadingManager);


    // Variables for track creation
    let trackEnd = new THREE.Vector3(0, 0, 0);
    let trackMergeDir = new THREE.Quaternion(0, 0, 0);
    let trackPrevDir = [0, 0, 0];
    let trackSegSize = new CANNON.Vec3(5, 0.05, 10);

    let isPaused = false;
    let lastTime = 0;
    let accumulatedTime = 0;

    //     let isUpsideDown = false;
    // let upsideDownStartTime = 0;
    // const RESPAWN_DELAY = 2000; // 2 seconds in milliseconds
    // const UPSIDE_DOWN_THRESHOLD = -0.5; // Threshold for considering the car upside down
    // const TRACK_BOUNDS = {
    //     minX: -100,
    //     maxX: 400,
    //     minZ: -250,
    //     maxZ: 150,
    //     minY: -10, // If car falls below this Y value, consider it off-track
    // };
    // const START_POSITION = { x: 0, y: 2, z: 0 };

    // Menu functionality
    const menuButton = document.getElementById('menuButton');
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modalOverlay');
    //const settingsButton = document.getElementById('settingsButton');
    const quitButton = document.getElementById('quitButton');
    const resumeButton = document.getElementById('resumeButton');

    menuButton.addEventListener('click', openModal);
    modalOverlay.addEventListener('click', closeModal);
    //settingsButton.addEventListener('click', openSettings);
    quitButton.addEventListener('click', quitGame);
    resumeButton.addEventListener('click', closeModal);

    function openModal() {
        modal.style.display = 'block';
        modalOverlay.style.display = 'block';
        isPaused = true;
        //controls.disable(); // Disable car controls
    }

    function closeModal() {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
        isPaused = false;
        //controls.enable(); // Re-enable car controls
    }

    function openSettings() {
        // Implement settings functionality here
        console.log('Settings opened');
    }

    function quitGame() {
        window.location.href = 'index.html';
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
        const concreteATexture = new THREE.TextureLoader(loadingManager).load('./src/assets/textures/concreteA.png');
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
            trackEnd.x + (trackDir.x * trackSegSize.x) - (trackMergeDir.x * trackSegSize.z * centered),
            trackEnd.y + (trackDir.y * trackSegSize.x) - (trackMergeDir.y * trackSegSize.z * centered),
            trackEnd.z + (trackDir.z * trackSegSize.x) - (trackMergeDir.z * trackSegSize.z * centered)
        );

        trackEnd.set(
            trackEnd.x + (2 * trackDir.x * trackSegSize.x) - (trackMergeDir.x * trackSegSize.z * centered),
            trackEnd.y + (2 * trackDir.y * trackSegSize.x) - (trackMergeDir.y * trackSegSize.z * centered),
            trackEnd.z + (2 * trackDir.z * trackSegSize.x) - (trackMergeDir.z * trackSegSize.z * centered)
        );

        floor.position.copy(groundBody.position);
        floor.quaternion.copy(groundBody.quaternion);

        trackPrevDir[0] += angleX;
        trackPrevDir[1] += angleY;
        trackPrevDir[2] += angleZ;

        trackMergeDir.copy(trackDir);
    }

    function addBlock(x, y, z, ax, ay, az, size) {
        return new Promise((resolve) => {
            // Create ground
            const groundShape = new CANNON.Box(size);
            const groundBody = new CANNON.Body({
                mass: 0,
                shape: groundShape,
                material: groundMaterial
            });
            groundBody.quaternion.setFromEuler(ax, ay, az);
            groundBody.position.set(x, y, z);
            world.addBody(groundBody);

            const floorGeometry = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);

            // Use loading manager for texture
            const concreteATexture = new THREE.TextureLoader(loadingManager).load(
                './src/assets/textures/concreteA.png',
                () => {
                    const floorMaterial = new THREE.MeshStandardMaterial({
                        map: concreteATexture,
                    });
                    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                    scene.add(floor);

                    const trackDir = new CANNON.Vec3(-1, 0, 0);
                    groundBody.quaternion.vmult(trackDir, trackDir);

                    floor.position.copy(groundBody.position);
                    floor.quaternion.copy(groundBody.quaternion);
                    resolve();
                }
            );
        });
    }

    const buildingLoader = new BuildingLoader(scene, world, groundMaterial, loadingManager);
    const graffitiWallLoader = new GraffitiWallLoader(scene, world, groundMaterial, loadingManager);
    const militaryBaseLoader = new MilitaryBaseLoader(scene, world, groundMaterial, loadingManager);
    const wastelandStoreLoader = new WastelandStoreLoader(scene, world, groundMaterial, loadingManager);
    const rubbleLoader = new RubbleLoader(scene, world, groundMaterial, loadingManager);
    // add scenery
    function addScenery(x, y, z, angleY, type) {
        switch (type) {
            case 0:
                const buildingSize = new CANNON.Vec3(20, 16, 20);
                const buildingAScale = new THREE.Vector3(1.7, 2, 2.5);
                return buildingLoader.loadBuilding(buildingModel, x, y, z, angleY, buildingSize, buildingAScale);

            case 1:
                const wallSize = new CANNON.Vec3(10, 22, 40);
                return graffitiWallLoader.loadGraffitiWall(graffitiWallModel, x, y, z, angleY, wallSize);

            case 2:
                const baseSize = new CANNON.Vec3(20, 20, 13);
                return militaryBaseLoader.loadMilitaryBase(militaryBaseModel, x, y, z, angleY, baseSize);

            case 3:
                const storeSize = new CANNON.Vec3(40, 16, 14.5);
                return wastelandStoreLoader.loadWastelandStore(wastelandStoreModel, x, y, z, angleY, storeSize);

            default:
                return Promise.resolve();
        }
    }

    // function isWithinTrackBounds(position) {
    //     return position.x >= TRACK_BOUNDS.minX &&
    //            position.x <= TRACK_BOUNDS.maxX &&
    //            position.z >= TRACK_BOUNDS.minZ &&
    //            position.z <= TRACK_BOUNDS.maxZ &&
    //            position.y >= TRACK_BOUNDS.minY;
    // }

    // // Function to respawn the car
    // function respawnCar(forceStartPosition = false) {
    //     if (!vehicle || !vehicle.chassisBody) return;

    //     let respawnPosition;

    //     if (forceStartPosition) {
    //         // Respawn at start position if off track
    //         respawnPosition = START_POSITION;
    //     } else {
    //         // Local respawn - keep current X and Z, just lift the Y position
    //         const currentPos = vehicle.chassisBody.position;
    //         respawnPosition = {
    //             x: currentPos.x,
    //             y: 2, // Lift slightly above ground
    //             z: currentPos.z
    //         };
    //     }

    //     // Reset physics
    //     vehicle.chassisBody.velocity.set(0, 0, 0);
    //     vehicle.chassisBody.angularVelocity.set(0, 0, 0);
    //     vehicle.chassisBody.position.set(respawnPosition.x, respawnPosition.y, respawnPosition.z);

    //     // Reset rotation to upright position
    //     vehicle.chassisBody.quaternion.set(0, 0, 0, 1);

    //     // Reset controls if they exist
    //     if (controls && typeof controls.reset === 'function') {
    //         controls.reset();
    //     }

    //     // Reset upside down tracking
    //     isUpsideDown = false;
    //     upsideDownStartTime = 0;
    // }

    // // Check for upside down state and off-track position
    // function checkVehicleState() {
    //     if (!vehicle || !vehicle.chassisBody) return;

    //     // Check if car is off track
    //     if (!isWithinTrackBounds(vehicle.chassisBody.position)) {
    //         console.log("Car is off track - respawning at start");
    //         respawnCar(true); // Force respawn at start position
    //         return;
    //     }

    //     // Check if car is upside down
    //     const chassisUp = new CANNON.Vec3(0, 1, 0);
    //     vehicle.chassisBody.quaternion.vmult(chassisUp, chassisUp);
    //     const worldUp = new CANNON.Vec3(0, 1, 0);
    //     const dotProduct = worldUp.dot(chassisUp);

    //     if (dotProduct < UPSIDE_DOWN_THRESHOLD) {
    //         if (!isUpsideDown) {
    //             isUpsideDown = true;
    //             upsideDownStartTime = Date.now();
    //             console.log("Car detected upside down");
    //         } else if (Date.now() - upsideDownStartTime >= RESPAWN_DELAY) {
    //             console.log("Respawning car in place");
    //             respawnCar(false); // Local respawn
    //         }
    //     } else {
    //         isUpsideDown = false;
    //         upsideDownStartTime = 0;
    //     }
    // }

    async function addAllBuildingsLvl1() {
        // creating map
        const sceneryPromises = [
            addScenery(-40, 0, 0, 0, 1),
            addScenery(-40, 0, -40, -0.01, 0),
            addScenery(-40, 0, 40, 0.01, 0),
            addScenery(0, 0, -40, 0, 3),
            addScenery(0, 0, 40, 0, 0),
            addScenery(40, 0, -40, 0, 0),
            addScenery(40, 0, 40, 0, 0),

            addScenery(80, 0, -50, 0.1, 3),
            addScenery(100, 0, -80, 0, 0),
            addScenery(140, 0, -60, 0, 2),
            addScenery(150, 0, -10, 0.5, 0),
            addScenery(180, 0, -80, 0, 0),
            addScenery(220, 0, -60, -0.4, 0),
            addScenery(260, 0, -45, -0.4, 0),
            addScenery(300, 0, -30, 0.5, 0),
            addScenery(320, 0, 0, 0.1, 0),

            addScenery(150, 0, 40, 0, 0),
            addScenery(190, 0, 10, 0, 2),

            addScenery(80, 0, 80, 0, 0),
            addScenery(120, 0, 120, 0, 2),
            addScenery(160, 0, 120, 0, 2),
            addScenery(200, 0, 120, 0, 0),
            addScenery(240, 0, 120, 0, 0),
            addScenery(280, 0, 120, 0, 2),
            addScenery(320, 0, 120, 0, 0),
            addScenery(360, 0, 110, 0.3, 0),
            addScenery(390, 0, 90, 1.4, 0),
            addScenery(400, 0, 40, 0, 0),

            addScenery(230, 0, 40, 0, 3),
            addScenery(270, 0, 40, 0, 2),
            addScenery(320, 0, 40, 0, 0),

            addScenery(380, 0, 0, 0, 2),
            addScenery(380, 0, -40, 0, 0),
            addScenery(380, 0, -80, 0, 0),
            addScenery(380, 0, -120, 0, 0),
            addScenery(380, 0, -160, 0, 1),
            addScenery(380, 0, -200, 0, 0),

            addScenery(380, 0, -240, 0, 0),
            addScenery(340, 0, -240, 0, 0),
            addScenery(300, 0, -240, 0, 2),
            addScenery(260, 0, -240, 0, 0),
            addScenery(220, 0, -250, 0, 2),
            addScenery(180, 0, -250, 0, 3),
            addScenery(140, 0, -230, 0, 0),
            addScenery(100, 0, -250, 0, 0),

            addScenery(280, 0, -170, 0, 0),
            addScenery(240, 0, -170, 0, 0),
            addScenery(200, 0, -160, -0.1, 2),
            addScenery(80, 0, -160, 0, 0),
            addScenery(140, 0, -115, -0.4, 2),
        ];
        loadingPromises.push(...sceneryPromises);
        try {
            // Wait for all scenery to load
            await Promise.all(sceneryPromises);
            console.log('All buildings loaded successfully');
            return Promise.resolve(); // Explicitly return a resolved promise
        } catch (error) {
            console.error('Error loading buildings:', error);
            return Promise.reject(error); // Return a rejected promise if there's an error
        }
    }





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

    // trackEnd.set(120, -0.5, 80);
    // trackSegSize.set(20, 0.05, 20);
    // addRoadSeg(0, 3.14, -0.12);
    // addRoadSeg(0, 0, -0.12);
    // addRoadSeg(0, 0, 0.24);
    // addRoadSeg(0, 0, 1.65);
    // addRoadSeg(0, 0, -2.8)

    // trackPrevDir = [0, 3.14, 0];
    // trackEnd.set(250, 12, 80);
    // addRoadSeg(-0.08, 0, 0.3);
    // addRoadSeg(0, 0, -0.3);
    // addRoadSeg(0, 0.2, 0);
    // addRoadSeg(0, 0, -0.3);

    // trackEnd.set(368, 0, 40);
    // trackPrevDir = [0, 3.14, 0];
    // addRoadSeg(0, 0, -0.31);

    const blockA = new CANNON.Vec3(20, 5, 25);
    const blockB = new CANNON.Vec3(20, 5, 45);

    const blockPromises = [

        addBlock(140, -3, 85, 0, 0, 0.15, blockA),
        addBlock(170, 3, 85, 0, 0, 0.25, blockA),
        addBlock(208.15, 7.79, 85, 0, 0, 0, blockA),

        addBlock(255, -3.6, 85, 0, 0, -0.5, blockA),
        addBlock(265, -4.4, 85, 0, 0, -0.3, blockA),
        addBlock(275, -4.5, 85, 0, 0, -0.1, blockA),

        addBlock(362, -4.4, 50, 0, 0, 0.3, blockB),
    ];
    loadingPromises.push(...blockPromises);


    // trackPrevDir = [0, 0, 0];
    // trackEnd.set(220, -2, -120);
    // trackSegSize.set(10, 2, 20);
    // addRoadSeg(0, -0.3, -0.1);
    // addRoadSeg(-0.02, -0.15, -0.05);
    // addRoadSeg(-0.02, -0.15, -0.05);
    // addRoadSeg(-0.045, -0.15, -0.05);
    // addRoadSeg(-0.045, -0.15, -0.05);
    // addRoadSeg(0.05, 0.15, 0.1);
    // addRoadSeg(0.05, 0.15, 0.1);
    // addRoadSeg(0, 0.1, 0.05);
    // addRoadSeg(0, 0.1, 0.05);
    // addRoadSeg(0, 0.15, 0.05);
    // addRoadSeg(0, 0.15, 0.05);
    // addRoadSeg(0, 0.15, 0.05);
    // addRoadSeg(0, 0.15, 0.05);
    // addRoadSeg(0, 0.15, 0.05);
    // addRoadSeg(0, 0.15, 0.05);

    // addRoadSeg(0, -0.3, -0.1);
    // addRoadSeg(0, 0, -0.1);
    // addRoadSeg(0, 0, -0.1);
    // addRoadSeg(0, 0, 0.3);
    // addRoadSeg(0, -0.6, 0);
    // addRoadSeg(0, 0, 0.1);
    // addRoadSeg(0, 0, 0.1);
    // addRoadSeg(0, 0, 0.1);
    // addRoadSeg(0, 0, 0);

    //Rubble placement for the road
    rubbleLoader.addRubbleCluster(new THREE.Vector3(120, 0, 80), 8, 15);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(260, 0, 80), 8, 12);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(368, 0, 40), 8, 10);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(220, 0, -120), 8, 20);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(120, 1, -192), 8, 20);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(131, 1, -156), 8, 30);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(222, 1, -97), 8, 30);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(48, 1, -3), 8, 30);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(330, 1, -86), 8, 30);
    rubbleLoader.addRubbleCluster(new THREE.Vector3(345, 1, 84), 8, 30);

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
        gameTimer = 150;
        frameCounter = 0;
        carHealth = MAX_HEALTH;
        lastCollisionTime = 0;
        updateHealthBar();
        updateTimerDisplay();
        if (!isGameStarted) {
            isGameStarted = true;
            gameOver = false;
            wallLoader.initializeTimer(); // Add this line
            console.log('Game started!');
        }
    }

    // Start the animation loop only after loading is complete
    loadingManager.onLoad = function () {
        loadingStatus.textContent = 'Loading additional assets...';

        Promise.resolve() // Start a promise chain
            .then(() => addAllBuildingsLvl1()) // Add buildings first
            .then(() => Promise.all(loadingPromises)) // Then wait for all other promises
            .then(() => {
                loadingStatus.textContent = 'Starting game...';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    renderer.setAnimationLoop(animate);
                    //startGame();
                }, 1500);
            })
            .catch(error => {
                console.error('Error during loading:', error);
                loadingStatus.textContent = 'Error loading game assets';
                loadingStatus.style.color = '#ff0000';
            });
    };

    function updateTimerDisplay() {
        const minutes = Math.floor(gameTimer / 60);
        const seconds = gameTimer % 60;
        const timerDisplay = document.getElementById('timer');
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function showGameOverPopup() {
        const popup = document.getElementById('game-over-popup');
        popup.style.display = 'block';
        isPaused = true;
    }

    function hideGameOverPopup() {
        const popup = document.getElementById('game-over-popup');
        popup.style.display = 'none';
    }

    // Modify the restart button event listener
    document.getElementById('restart-button').addEventListener('click', () => {
        location.reload(); // This will reload the entire page
    });

    document.getElementById('restart-button2').addEventListener('click', () => {
        location.reload(); // This will reload the entire page
    });

    document.getElementById('main-menu-button').addEventListener('click', () => {
        // Implement main menu logic here
        console.log('Main menu button clicked');
    });


    // Load the car
    const initialCarPosition = new CANNON.Vec3(-20, 1, -3);
    //const initialCarPosition = new CANNON.Vec3(341, 1, -36);
    const carLoader = new CarLoader(scene, world, carMaterial, wheelMaterial, camera, loadingManager);
    let carObject, vehicle, fireEffect1, fireEffect2;

    carLoader.loadCar(carModel, initialCarPosition).then(({
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

        // Store initial wheel offsets
        const wheelOffsets = [
            new CANNON.Vec3(-1.9, -0.5, 0.875),  // Front left
            new CANNON.Vec3(-1.9, -0.5, -0.875), // Front right
            new CANNON.Vec3(1.2, -0.5, 0.875),   // Back left
            new CANNON.Vec3(1.2, -0.5, -0.875)   // Back right
        ];
        vehicle.wheelOffsets = wheelOffsets;  // Store offsets on vehicle object

        // Add collision event listener to the chassis body
        vehicle.chassisBody.addEventListener('collide', (event) => {
            // Check if the collision is with a checkpoint
            const otherBody = event.contact.bi === vehicle.chassisBody ? event.contact.bj : event.contact.bi;

            // Skip damage if the other body is a checkpoint or if invulnerable
            if (isInvulnerable || otherBody.isTrigger) {
                return;
            }

            const relativeVelocity = event.contact.getImpactVelocityAlongNormal();
            const damageVelocity = 8
            // Only register significant collisions
            if (Math.abs(relativeVelocity) > damageVelocity) {
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
        //renderer.setAnimationLoop(animate);
    }).catch(error => {
        console.error('Failed to load car model:', error);
    });


    let carHealth = 100;
    const MAX_HEALTH = 100;
    const COLLISION_DAMAGE = 10;
    const HEALTH_REGEN_RATE = 2;
    const HEALTH_REGEN_DELAY = 3000; // 3 seconds
    let lastCollisionTime = 0;

    let lastMovementTime = 0;
    const RESPAWN_DELAY = 10000; // 10 seconds in milliseconds
    const MOVEMENT_THRESHOLD = 0.1; // Minimum speed to be considered "moving"

    const INVULNERABILITY_DURATION = 3000; // 3 seconds of invulnerability after respawn
    let isInvulnerable = false;
    let invulnerabilityEndTime = 0;

    function showRespawnWarning() {
        const warning = document.getElementById('respawn-warning');
        warning.style.display = 'block';
        setTimeout(() => {
            warning.style.display = 'none';
        }, 1000); // Show for 1 second
    }

    let collisionTimeout = null;

    function respawnCar(time) {
        showRespawnWarning();

        // Get current checkpoint
        const checkpoint = checkpointLoader.getCurrentCheckpoint();
        checkpoint.y += 1;

        // Set specific forward-facing orientation
        const euler = new THREE.Euler(0, -Math.PI / 2, 0);
        const quaternion = new THREE.Quaternion().setFromEuler(euler);

        // Reset chassis
        vehicle.chassisBody.position.copy(checkpoint);
        vehicle.chassisBody.quaternion.copy(quaternion);
        vehicle.chassisBody.velocity.set(0, 0, 0);
        vehicle.chassisBody.angularVelocity.set(0, 0, 0);
        vehicle.chassisBody.force.set(0, 0, 0);
        vehicle.chassisBody.torque.set(0, 0, 0);
        vehicle.chassisBody.collisionResponse = false;

        // Reset wheels with proper orientation
        vehicle.wheelBodies.forEach((wheel, index) => {
            wheel.velocity.set(0, 0, 0);
            wheel.angularVelocity.set(0, 0, 0);
            wheel.force.set(0, 0, 0);
            wheel.torque.set(0, 0, 0);
            wheel.collisionResponse = false;

            // Reset wheel quaternion to match chassis orientation
            wheel.quaternion.copy(quaternion);

            // Convert CANNON.Vec3 to THREE.Vector3, apply rotation, and convert back
            const cannonOffset = vehicle.wheelOffsets[index];
            const threeOffset = new THREE.Vector3(cannonOffset.x, cannonOffset.y, cannonOffset.z);
            threeOffset.applyQuaternion(quaternion);

            // Apply rotated offset to wheel position
            wheel.position.copy(checkpoint);
            wheel.position.x += threeOffset.x;
            wheel.position.y += threeOffset.y;
            wheel.position.z += threeOffset.z;
        });

        // Update visual position
        carObject.position.copy(checkpoint);
        carObject.quaternion.copy(quaternion);

        // Reset last movement time
        lastMovementTime = time;

        // Restore full health
        carHealth = MAX_HEALTH;
        updateHealthBar();

        // Enable invulnerability
        isInvulnerable = true;
        invulnerabilityEndTime = time + INVULNERABILITY_DURATION;

        // Visual feedback
        if (carObject) {
            carObject.traverse((child) => {
                if (child.isMesh) {
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material.clone();
                    }
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x00ff00,
                        transparent: true,
                        opacity: 0.8,
                        emissive: 0x00ff00,
                        emissiveIntensity: 0.5
                    });
                }
            });
        }

        // Clear any existing timeout
        if (collisionTimeout) {
            clearTimeout(collisionTimeout);
        }

        // Re-enable collisions after 500ms
        collisionTimeout = setTimeout(() => {
            vehicle.chassisBody.collisionResponse = true;
            vehicle.wheelBodies.forEach(wheel => {
                wheel.collisionResponse = true;
            });
        }, 300);

        console.log('Car respawned at checkpoint');
    }

    // Add this function to restore normal car appearance
    function restoreCarAppearance() {
        if (carObject) {
            carObject.traverse((child) => {
                if (child.isMesh && child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            });
        }
    }


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
        // If invulnerable, don't take damage
        if (isInvulnerable) {
            return;
        }

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

    const boostLoader = new BoostLoader(scene, world, loadingManager);
    const boostPositions = [
        // add boost items here
        //new THREE.Vector3(20, 2, 10),
        new THREE.Vector3(210, 15, 80),
        new THREE.Vector3(220, 2, -120),
        new THREE.Vector3(220, 2, -200),
        new THREE.Vector3(290, 2, -200),
        new THREE.Vector3(300, 2, -80),
        new THREE.Vector3(320, 2, -70),
    ];
    boostLoader.loadBoost(boostModel, boostPositions).then(() => {
        console.log('Boost objects loaded');
    }).catch(error => {
        console.error('Failed to load boost model:', error);
    });

    const crateLoader = new CrateLoader(scene, world, camera, loadingManager);
    const cratePositions = [
        // Add crate positions here
        new THREE.Vector3(0, 2, 2),
        new THREE.Vector3(280, 2, -90),
        new THREE.Vector3(260, 2, -80),
        new THREE.Vector3(280, 2, -100),
        new THREE.Vector3(260, 2, -110),
        new THREE.Vector3(280, 2, -85),
        new THREE.Vector3(102, 2, -211),
        new THREE.Vector3(80, 2, -192),
        new THREE.Vector3(198, 2, -109),
        new THREE.Vector3(96, 2, 20),
        new THREE.Vector3(200, 13, 92),
        new THREE.Vector3(285, 2, 94),
        new THREE.Vector3(359, 2, 45),
        new THREE.Vector3(356, 2, -9),
        new THREE.Vector3(322, 2, -56),
        new THREE.Vector3(150, 1, -190),
    ];

    // Load the crates
    crateLoader.loadCrates(crateModel, cratePositions).then(() => {
        console.log('Crate objects loaded');
    }).catch(error => {
        console.error('Failed to load crate model:', error);
    });

    boostPositions.push(new THREE.Vector3(20, 2, 10));


    //event listener for crate damage
    window.addEventListener('crateDamage', (event) => {
        damageVehicle(event.detail.damage);
    });

    // Win Condition: contact wall
    const wallLoader = new WallLoader(scene, world, 'lvl1', loadingManager, 150, (pauseState) => {
        isPaused = pauseState;
    });
    wallLoader.createWall(
        { x: 70, y: 2, z: -200 }, // Position - finish line
        { x: 2, y: 50, z: 80 }    // Size
    );

    // Create checkpoints at various positions
    checkpointLoader.createCheckpoint(
        { x: -10, y: 2, z: -3 }, // position
        { x: 2, y: 20, z: 40 }   // size
    );
    checkpointLoader.createCheckpoint(
        { x: 122, y: 2, z: 74 }, // position
        { x: 2, y: 20, z: 40 }   // size
    );
    checkpointLoader.createCheckpoint(
        { x: 336, y: 2, z: -53 }, // position
        { x: 40, y: 20, z: 2 }   // size
    );

    /// Create boundaries
    boundLoader.createBound(
        { x: 230, y: 2, z: 65 }, // position
        { x: 6, y: 6, z: 10 }
    );

    // add arrors
    const arrowLoader = new ArrowLoader(scene, loadingManager);

    // Multiple arrows at once
    const arrowConfigs = [
        {
            position: { x: 78, y: 7, z: 0 },
            rotation: { x: 0, y: Math.PI / 2, z: 0 },
            scale: 20.0
        },
        {
            position: { x: 360, y: 8, z: 80 },
            rotation: { x: 0, y: -Math.PI / 2, z: 0 },
            scale: 20.0
        },
        {
            position: { x: 336, y: 8, z: -140 },
            rotation: { x: 0, y: Math.PI * 2, z: 0 },
            scale: 20.0
        },
        {
            position: { x: 150, y: 8, z: -130 },
            rotation: { x: 0, y: -Math.PI / 3, z: 0 },
            scale: 20.0
        }
    ];
    arrowLoader.loadMultipleArrows(arrowModel, arrowConfigs);

    // To get current checkpoint position:
    const currentCheckpoint = checkpointLoader.getCurrentCheckpoint();

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

        carAudioManager.handleKeyDown(event.key.toLowerCase());

        // Start game on WASD press
        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase()) && !isGameStarted) {
            startGame();
        }
    });

    document.addEventListener('keyup', (event) => {
        carAudioManager.handleKeyUp(event.key.toLowerCase());
    });


    //trigger zones
    const triggers = [
        {
            position: { x: 110, z: 38 },
            dropPositions: [
                { x: 100, z: 30 },
                { x: 90, z: 15 },
                { x: 110, z: 20 }
            ]
        },
        {
            position: { x: 290, z: 82 },
            dropPositions: [
                { x: 330, z: 80 },
                { x: 340, z: 90 },
                { x: 350, z: 70 }
            ]
        },
        {
            position: { x: 345, z: -60 },
            dropPositions: [
                { x: 315, z: -90 },
                { x: 335, z: -100 },
                { x: 325, z: -120 }
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
                    x: (- 1) * 20, // Random position within 20 units
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

        rubbleLoader.update();

        // Update blocks
        blockLoader.update();

        // Check triggers if car exists
        if (carObject) {
            triggerSystem.checkTriggers(carObject.position);
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
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

            // Update speedometer
            updateSpeedometer(speed * 3.6); // Convert m/s to km/h

            // Add this line to update debug info
            controls.updateDebugInfo(speed);

            // Update camera based on mode
            if (cameraManager.cameraMode !== 2) {
                cameraManager.updateCamera(vehicle.chassisBody, carObject);
            } else {
                // In free camera mode, update orbit controls target to follow the car
                orbitControls.target.copy(carObject.position);
            }

            // Apply controls
            controls.update();
            //checkVehicleState();

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
            checkpointLoader.update(deltaTime);
            boundLoader.update(deltaTime);


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


            // Get the up vector of the car in world space
            const carUp = new THREE.Vector3(0, 1, 0);
            const carQuat = new THREE.Quaternion().copy(vehicle.chassisBody.quaternion);
            carUp.applyQuaternion(carQuat);

            // Calculate the angle between car's up vector and world up vector
            const angleFromUp = carUp.angleTo(new THREE.Vector3(0, 1, 0));

            // Check if car is moving
            if (speed > MOVEMENT_THRESHOLD || !isGameStarted) {
                lastMovementTime = time;
            }

            // Only check for respawn if game has started
            if (isGameStarted && !gameOver) {
                const timeSinceMovement = time - lastMovementTime;
                const isUpsideDown = angleFromUp > Math.PI / 2; // More than 90 degrees from up

                if (isUpsideDown || timeSinceMovement > RESPAWN_DELAY) {
                    respawnCar(time);
                }
            }

            // Check if invulnerability should end
            if (isInvulnerable && time > invulnerabilityEndTime) {
                isInvulnerable = false;
                restoreCarAppearance();
            }

            // const position = vehicle.chassisBody.position;
            // document.getElementById('debug-pos-x').textContent = position.x.toFixed(2);
            // document.getElementById('debug-pos-y').textContent = position.y.toFixed(2);
            // document.getElementById('debug-pos-z').textContent = position.z.toFixed(2);

        }

        // Update skybox
        updateSkybox(skybox, time * 0.001);

        // Update Cannon debugger
        //cannonDebugger.update();

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
        const concreteBTexture = new THREE.TextureLoader(loadingManager).load('./src/assets/textures/zombie texture.png');
        concreteBTexture.wrapS = THREE.RepeatWrapping;
        concreteBTexture.wrapT = THREE.RepeatWrapping;
        concreteBTexture.repeat.set(10, 10);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: concreteBTexture,
            //color: 0xffffff,
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