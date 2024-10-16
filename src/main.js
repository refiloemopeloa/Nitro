import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { element } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import humveeModel from './models/Humvee.glb'; // Import the GLB file

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
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
            friction: 0.0,
            restitution: 0.7
        }
    );
    world.addContactMaterial(defaultContactMaterial);

    // Create ground
    const groundShape = new CANNON.Box(new CANNON.Vec3(5, 0.05, 10));
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: defaultMaterial
    });
    groundBody.position.set(0, -0.5, 0);
    world.addBody(groundBody);

    const floorGeometry = new THREE.BoxGeometry(10, 0.1, 20);
    const floorMaterial = new THREE.MeshBasicMaterial({color: 0xfcfcfc});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.copy(groundBody.position);
    scene.add(floor);

    // Load the Humvee model
    const loader = new GLTFLoader();
    let humveeObject;
    let humveeBody;
    loader.load(
        humveeModel,
        function (gltf) {
            console.log('Model loaded successfully');
            humveeObject = gltf.scene;
            humveeObject.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
            scene.add(humveeObject);

            // Create a simple box shape for the Humvee
            const humveeShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
            
            // Create the Humvee body
            humveeBody = new CANNON.Body({
                mass: 1500, // Adjust mass as needed
                shape: humveeShape,
                material: defaultMaterial,
                angularDamping: 0.9,  // Added to reduce rotation
                linearDamping: 0.5    // Added to reduce sliding
            });
            humveeBody.position.set(0, 5, 0);
            world.addBody(humveeBody);

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
    const controls = ['w', 'a', 's', 'd'];
    let pressed = [false, false, false, false];
    let zoom = 3;
    let zoom = 3;
    let camHeight = 3;

    document.addEventListener('keydown', function(event) {
        const index = controls.indexOf(event.key);
        if (index !== -1) pressed[index] = true;
    });

    document.addEventListener('keyup', function(event) {
        const index = controls.indexOf(event.key);
        if (index !== -1) pressed[index] = false;
    });

    function keyAction() {
        if (!humveeBody) return; // Exit if humveeBody is not yet defined

        const force = 2000; // Increased force for a heavier vehicle
        const turnForce = 1350; // Increased turn force

        if (pressed[controls.indexOf('w')]) {
            humveeBody.applyLocalForce(new CANNON.Vec3(-force, 0, 0), new CANNON.Vec3(0, 0, 0));
        }
        if (pressed[controls.indexOf('s')]) {
            humveeBody.applyLocalForce(new CANNON.Vec3(force, 0, 0), new CANNON.Vec3(0, 0, 0));
        }
        if (pressed[controls.indexOf('a')]) {
            humveeBody.applyTorque(new CANNON.Vec3(0, turnForce, 0));
        }
        if (pressed[controls.indexOf('d')]) {
            humveeBody.applyTorque(new CANNON.Vec3(0, -turnForce, 0));
        }

        // Apply artificial friction to reduce sliding
        const velocity = humveeBody.velocity;
        humveeBody.applyForce(velocity.scale(-0.1), humveeBody.position);
    }

    function ThirdPerson() {
        if (!humveeBody) return; // Exit if humveeBody is not yet defined
    
        camera.position.y = humveeBody.position.y + camHeight;
        // Reverse the x and z calculations to position the camera behind the Humvee
        camera.position.x = humveeBody.position.x + (zoom * Math.cos(humveeBody.quaternion.y));
        camera.position.z = humveeBody.position.z - (zoom * Math.sin(humveeBody.quaternion.y));
        camera.lookAt(new THREE.Vector3(humveeBody.position.x, humveeBody.position.y, humveeBody.position.z));
    }

    function animate() {
        world.step(1/60);

        if (humveeObject && humveeBody) {
            // Sync Humvee model with Cannon.js body
            humveeObject.position.copy(humveeBody.position);
            humveeObject.quaternion.copy(humveeBody.quaternion);
        }

        ThirdPerson();
        keyAction();
        renderer.render(scene, camera);
    }

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}