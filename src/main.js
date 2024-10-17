import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { element } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import carModel from './models/armor_truck.glb'; // Import the GLB file

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

    // Cannon.js world setup
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -6.82, 0) // m/s²
    });

    // Physics materials
    const groundMaterial = new CANNON.Material('ground');
    const carMaterial = new CANNON.Material('car');

    // Contact material for car-ground interaction
    const carGroundContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        carMaterial,
        {
            friction: 0.01,
            restitution: 0.2
        }
    );
    world.addContactMaterial(carGroundContactMaterial);

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

    // Create grid texture
    const gridSize = 1;
    const gridTexture = new THREE.TextureLoader().load(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
        function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(groundSize.width / gridSize, groundSize.length / gridSize);
        }
    );

    // Create floor with grid texture
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
    scene.add(floor);

    // Add grid lines
    const gridHelper = new THREE.GridHelper(Math.max(groundSize.width, groundSize.length), Math.max(groundSize.width, groundSize.length) / gridSize, 0x000000, 0x000000);
    gridHelper.position.y = floor.position.y + 0.01; // Slightly above the floor to prevent z-fighting
    scene.add(gridHelper);

    // Load the car model
    const loader = new GLTFLoader();
    let carObject;
    let carBody;
    let FrontWheel_L;
    let FrontWheel_R;
    let BackWheels;

    // Variables for wheel rotation
    let frontWheelSteerRotation = 0;
    const maxFrontWheelSteerRotation = Math.PI / 4.5; // 40 degrees in radians
    const frontWheelSteerRotationSpeed = 0.05;
    let wheelRollRotation = 0;
    const wheelRollRotationSpeed = 0.05;

    // Matrices for wheel transformations
    const steerMatrix = new THREE.Matrix4();
    const rollMatrix = new THREE.Matrix4();

    loader.load(
        carModel,
        function (gltf) {
            console.log('Model loaded successfully');
            carObject = gltf.scene;
            carObject.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
            scene.add(carObject);

            FrontWheel_L = gltf.scene.getObjectByName('FrontWheel_L');
            FrontWheel_R = gltf.scene.getObjectByName('FrontWheel_R');
            BackWheels = gltf.scene.getObjectByName('BackWheels');

            // Store original matrices
            FrontWheel_L.userData.originalMatrix = FrontWheel_L.matrix.clone();
            FrontWheel_R.userData.originalMatrix = FrontWheel_R.matrix.clone();

            // Create a simple box shape for the car
            const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
            
            // Create the car body
            carBody = new CANNON.Body({
                mass: 100, // Adjust mass as needed
                shape: carShape,
                material: carMaterial,  // Use the car material
                angularDamping: 0.9,
                linearDamping: 0.5
            });
            carBody.position.set(0, 0, 0);
            world.addBody(carBody);

            // Start the animation loop
            renderer.setAnimationLoop(animate);
        },
        undefined,
        function (error) {
            console.error('An error happened', error);
        }
    );

    // Camera setup
    camera.position.set(0, 5, 5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Controls setup
    const controls = ['w', 'a', 's', 'd', 'v'];
    let pressed = [false, false, false, false, false];
    let cameraMode = 0; // 0: Third-person, 1: First-person, 2: Free Camera

    // Camera parameters
    const cameraOffset = new THREE.Vector3(3.7, 2, 0); // For third-person view
    const cameraLookAhead = new THREE.Vector3(0, 2, 0); // For third-person view
    let zoom = 3; // For free camera
    let camHeight = 3; // For free camera

    // Parameters for camera lateral movement
    const maxCameraLateralOffset = 0.7; // Maximum lateral offset in meters
    const cameraLateralSpeed = 0.05; // Speed of lateral movement
    const cameraCenteringSpeed = 0.05; // Speed at which camera returns to center
    let currentCameraLateralOffset = 0;

    document.addEventListener('keydown', function(event) {
        const index = controls.indexOf(event.key);
        if (index !== -1) pressed[index] = true;
        if (event.key === 'v') {
            cameraMode = (cameraMode + 1) % 3; // Cycle through camera modes
        }
    });

    document.addEventListener('keyup', function(event) {
        const index = controls.indexOf(event.key);
        if (index !== -1) pressed[index] = false;
    });

    function keyAction() {
        if (!carBody) return; // Exit if carBody is not yet defined

        const force = 2000; // Increased force for a heavier vehicle
        const turnForce = 1550; // Increased turn force

        // Determine if the car is moving forwards or backwards
        const velocity = carBody.velocity;
        const localVelocity = carBody.quaternion.inverse().vmult(velocity);
        const isReversing = localVelocity.x > 0; // Assuming positive x is backwards in local space

        if (pressed[controls.indexOf('w')]) {
            carBody.applyLocalForce(new CANNON.Vec3(-force, 0, 0), new CANNON.Vec3(0, 0, 0));
            // Rotate wheels forward
            wheelRollRotation += wheelRollRotationSpeed;
        }
        if (pressed[controls.indexOf('s')]) {
            carBody.applyLocalForce(new CANNON.Vec3(force, 0, 0), new CANNON.Vec3(0, 0, 0));
            // Rotate wheels backward
            wheelRollRotation -= wheelRollRotationSpeed;
        }
        if (pressed[controls.indexOf('a')]) {
            // Apply opposite torque when reversing
            carBody.applyTorque(new CANNON.Vec3(0, isReversing ? -turnForce : turnForce, 0));
            // Rotate front wheels left
            frontWheelSteerRotation = Math.min(frontWheelSteerRotation + frontWheelSteerRotationSpeed, maxFrontWheelSteerRotation);
        }
        if (pressed[controls.indexOf('d')]) {
            // Apply opposite torque when reversing
            carBody.applyTorque(new CANNON.Vec3(0, isReversing ? turnForce : -turnForce, 0));
            // Rotate front wheels right
            frontWheelSteerRotation = Math.max(frontWheelSteerRotation - frontWheelSteerRotationSpeed, -maxFrontWheelSteerRotation);
        }


        // If neither 'a' nor 'd' is pressed, gradually return front wheels to center
        if (!pressed[controls.indexOf('a')] && !pressed[controls.indexOf('d')]) {
            if (frontWheelSteerRotation > 0) {
                frontWheelSteerRotation = Math.max(frontWheelSteerRotation - frontWheelSteerRotationSpeed / 2, 0);
            } else if (frontWheelSteerRotation < 0) {
                frontWheelSteerRotation = Math.min(frontWheelSteerRotation + frontWheelSteerRotationSpeed / 2, 0);
            }
        }

        // Apply wheel transformations
        if (FrontWheel_L && FrontWheel_R) {
            // Set up transformation matrices
            steerMatrix.makeRotationZ(frontWheelSteerRotation);
            rollMatrix.makeRotationX(wheelRollRotation);

            // Combine transformations
            const combinedMatrix = new THREE.Matrix4().multiplyMatrices(steerMatrix, rollMatrix);

            // Apply transformations to front wheels
            FrontWheel_L.matrix.copy(FrontWheel_L.userData.originalMatrix).multiply(combinedMatrix);
            FrontWheel_R.matrix.copy(FrontWheel_R.userData.originalMatrix).multiply(combinedMatrix);

            // Update matrix world
            FrontWheel_L.matrixAutoUpdate = false;
            FrontWheel_R.matrixAutoUpdate = false;
            FrontWheel_L.updateMatrixWorld(true);
            FrontWheel_R.updateMatrixWorld(true);
        }
        if (BackWheels) {
            BackWheels.rotation.x = wheelRollRotation;
        }

        // Apply artificial friction to reduce sliding
        //const velocity = carBody.velocity;
        carBody.applyForce(velocity.scale(-0.1), carBody.position);
    }

    function updateCamera() {
        if (!carBody || !carObject) return; // Exit if carBody or carObject is not yet defined
    
        switch (cameraMode) {
            case 0: // Third-person view
                const carPosition = carBody.position;
                const carQuaternion = carBody.quaternion;
                
                // Get the car's velocity
                const velocity = carBody.velocity;
                const localVelocity = carBody.quaternion.inverse().vmult(velocity);
                
                // Calculate desired lateral offset based on car's lateral velocity
                const desiredLateralOffset = Math.sign(localVelocity.z) * Math.min(Math.abs(localVelocity.z) * 0.5, maxCameraLateralOffset);
                
                // Determine if the car is moving laterally
                const isMovingLaterally = Math.abs(localVelocity.z) > 0.1; // You can adjust this threshold
                
                if (isMovingLaterally) {
                    // Smoothly interpolate the current offset towards the desired offset
                    currentCameraLateralOffset += (desiredLateralOffset - currentCameraLateralOffset) * cameraLateralSpeed;
                } else {
                    // Gradually return to center when not moving laterally
                    currentCameraLateralOffset *= (1 - cameraCenteringSpeed);
                }
                
                // Calculate camera position relative to the car
                const lateralOffsetVector = new THREE.Vector3(0, 0, currentCameraLateralOffset);
                const rotatedOffset = cameraOffset.clone().add(lateralOffsetVector).applyQuaternion(carQuaternion);
                camera.position.copy(carPosition).add(rotatedOffset);
                
                // Calculate look-at point relative to the car
                const rotatedLookAhead = cameraLookAhead.clone().applyQuaternion(carQuaternion);
                const lookAtPoint = new THREE.Vector3().copy(carPosition).add(rotatedLookAhead);
                camera.lookAt(lookAtPoint);
                break;
            
            case 1: // First-person view
                const offset = new CANNON.Vec3(0, 1.1, 0); // Adjust these values to position the camera correctly
                const worldPosition = new CANNON.Vec3();
                carBody.pointToWorldFrame(offset, worldPosition);
                
                camera.position.copy(worldPosition);
                
                // Calculate the direction vector
                const direction = new CANNON.Vec3(-1, 0, 0); // Assuming the car's front is along its local -X axis
                const worldDirection = new CANNON.Vec3();
                carBody.vectorToWorldFrame(direction, worldDirection);
                
                // Set the camera's lookAt point
                const fpLookAtPoint = new THREE.Vector3(
                    camera.position.x + worldDirection.x,
                    camera.position.y + worldDirection.y,
                    camera.position.z + worldDirection.z
                );
                camera.lookAt(fpLookAtPoint);
                break;
            
            case 2: // Free Camera
                camera.position.y = carBody.position.y + camHeight;
                // Reverse the x and z calculations to position the camera behind the car
                camera.position.x = carBody.position.x + (zoom * Math.cos(carBody.quaternion.y));
                camera.position.z = carBody.position.z - (zoom * Math.sin(carBody.quaternion.y));
                camera.lookAt(new THREE.Vector3(carObject.position.x, carObject.position.y, carObject.position.z));
                break;
        }
    }

    function animate() {
        world.step(1/60);

        if (carObject && carBody) {
            // Sync car model with Cannon.js body
            carObject.position.copy(carBody.position);
            carObject.quaternion.copy(carBody.quaternion);
        }

        updateCamera();
        updateCamera();
        keyAction();
        renderer.render(scene, camera);
    }

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}