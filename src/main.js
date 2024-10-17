import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let cube;
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
    addSkybox();

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

const addSkybox = () => {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './resources/meadow/meadow_ft.jpg',   // right
        './resources/meadow/meadow_bk.jpg',    // left
        './resources/meadow/meadow_up.jpg',     // top
        './resources/meadow/meadow_dn.jpg',  // bottom
        './resources/meadow/meadow_rt.jpg',   // front
        './resources/meadow/meadow_lf.jpg',  // back
    ]);
    scene.background = texture;
}

function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    controls.update();
    renderer.render(scene, camera);
}

init();