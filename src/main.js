import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createDynamicSkybox, updateSkybox } from './Skybox';

let scene, camera, renderer, controls;
let cube, skybox;
let divThreeJs = document.getElementById("threeJs");

const init = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    divThreeJs.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    addCube();
    skybox = createDynamicSkybox(scene);

    renderer.setAnimationLoop(animate);
}

const addCube = () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x777777
    });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}

function animate(time) {
    time *= 0.001; // Convert time to seconds

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    controls.update();

    updateSkybox(skybox, time);

    renderer.render(scene, camera);
}

init();