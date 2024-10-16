import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { element } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

if (WebGL.isWebGL2Available()) {
    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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
            restitution: 0.0
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

    // Create cube
    const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    const cubeBody = new CANNON.Body({
        mass: 1,
        shape: cubeShape,
        material: defaultMaterial
    });
    cubeBody.position.set(0, 5, 0);
    world.addBody(cubeBody);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Camera setup
    camera.position.set(0, 5, 5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Controls setup
    const controls = ['w', 'a', 's', 'd'];
    let pressed = [false, false, false, false];
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
        const forwardForce = 10;
        const backwardForce = 5; // Reduced force for backward movement
        const sideForce = 0.7; // Force for left/right movement
        const damping = 0.1; // Damping factor for linear motion
        const angularDamping = 0.5; // Damping factor for angular motion
    
        // Apply forces based on key presses
        if (pressed[controls.indexOf('w')]) {
            cubeBody.applyLocalForce(new CANNON.Vec3(forwardForce, 0, 0), cubeBody.position);
        }
        if (pressed[controls.indexOf('s')]) {
            cubeBody.applyLocalForce(new CANNON.Vec3(-backwardForce, 0, 0), cubeBody.position);
        }
        if (pressed[controls.indexOf('a')]) {
            cubeBody.applyLocalForce(new CANNON.Vec3(0, 0, sideForce), cubeBody.position);
            cubeBody.angularVelocity.set(0, 0, 0); // Reset angular velocity on side movement
        }
        if (pressed[controls.indexOf('d')]) {
            cubeBody.applyLocalForce(new CANNON.Vec3(0, 0, -sideForce), cubeBody.position);
            cubeBody.angularVelocity.set(0, 0, 0); // Reset angular velocity on side movement
        }
    
        // Apply damping if no keys are pressed
        if (!pressed[controls.indexOf('w')] && !pressed[controls.indexOf('s')]) {
            cubeBody.velocity.x *= (1 - damping); // Dampen X velocity
        }
        if (!pressed[controls.indexOf('a')] && !pressed[controls.indexOf('d')]) {
            cubeBody.velocity.z *= (1 - damping); // Dampen Z velocity
        }
    
        // Apply angular damping to prevent unwanted rotation
        cubeBody.angularVelocity.x *= (1 - angularDamping);
        cubeBody.angularVelocity.y *= (1 - angularDamping);
        cubeBody.angularVelocity.z *= (1 - angularDamping);
    }
    
    

    function ThirdPerson() {
        camera.position.y = cubeBody.position.y + camHeight;
        camera.position.x = cubeBody.position.x - zoom;
        camera.position.z = cubeBody.position.z;
        camera.lookAt(new THREE.Vector3(cubeBody.position.x, cubeBody.position.y, cubeBody.position.z));
    }

    function animate() {
        world.step(1/60);

        // Sync Three.js objects with Cannon.js bodies
        cube.position.copy(cubeBody.position);
        cube.quaternion.copy(cubeBody.quaternion);
        floor.position.copy(groundBody.position);

        ThirdPerson();
        keyAction();
        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.getElementById('container').appendChild(warning);
}