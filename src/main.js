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
        gravity: new CANNON.Vec3(0, -9.82, 0) // m/s²
    });

    // Physics materials
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
            friction: 0.1,
            restitution: 0.3
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

    // Create sphere
    const radius = 0.5;
    const sphereShape = new CANNON.Sphere(radius);
    const sphereBody = new CANNON.Body({
        mass: 1,
        shape: sphereShape,
        material: defaultMaterial
    });
    sphereBody.position.set(0, 5, 0);
    world.addBody(sphereBody);

    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

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
        const maxSpeed = 5; // Maximum speed
        const acceleration = 15; // Acceleration
        const deceleration = 5; // Deceleration

        // Get current velocity
        const velocity = sphereBody.velocity; //(xf-xi/t)

        // Calculate desired velocity based on key presses
        let desiredVelocityX = 0;
        let desiredVelocityZ = 0;

        if (pressed[controls.indexOf('w')]) desiredVelocityX = maxSpeed; //Move forward
        if (pressed[controls.indexOf('s')]) desiredVelocityX = -maxSpeed; //Move backward
        if (pressed[controls.indexOf('a')]) desiredVelocityZ = -maxSpeed; // left
        if (pressed[controls.indexOf('d')]) desiredVelocityZ = maxSpeed; // right

        // Calculate force to apply
        const forceX = (desiredVelocityX - velocity.x) * (desiredVelocityX !== 0 ? acceleration : deceleration); //decides whether to use the acceleration or deceleration value
        const forceZ = (desiredVelocityZ - velocity.z) * (desiredVelocityZ !== 0 ? acceleration : deceleration);

        // Apply force
        sphereBody.applyForce(new CANNON.Vec3(forceX, 0, forceZ));

        // Limit maximum speed
        const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
        if (speed > maxSpeed) {
            const factor = maxSpeed / speed;
            sphereBody.velocity.x *= factor;
            sphereBody.velocity.z *= factor;
        }
    }

    function ThirdPerson() {
        camera.position.y = sphereBody.position.y + camHeight;
        camera.position.x = sphereBody.position.x - zoom;
        camera.position.z = sphereBody.position.z;
        camera.lookAt(new THREE.Vector3(sphereBody.position.x, sphereBody.position.y, sphereBody.position.z));
    }

    function animate() {
        world.step(1/60);

        // Sync Three.js objects with Cannon.js bodies
        sphere.position.copy(sphereBody.position);
        sphere.quaternion.copy(sphereBody.quaternion);
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