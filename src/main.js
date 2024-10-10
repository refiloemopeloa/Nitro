import * as THREE from 'three';

let scene, camera, renderer;

let cube;

let divThreeJs = document.getElementById("threeJs");

const init = () => {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    divThreeJs.appendChild(renderer.domElement);

    addCube();
    renderer.setAnimationLoop(animate);
}

const addCube = () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
            color: 0x777777
        }
    );
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}

function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

init();