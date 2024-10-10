import * as THREE from 'three';

import WebGL from 'three/addons/capabilities/WebGL.js';
import { element } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


if ( WebGL.isWebGL2Available() ) {

	const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const floorGeometry = new THREE.BoxGeometry(10, 0.1, 20);
    const floorMaterial = new THREE.MeshBasicMaterial({color: 0xfcfcfc});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    floor.position.y = -0.5;

    camera.position.z = 5;
    camera.position.y = 5;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const cubePosition = new THREE.Vector3();
    cube.getWorldPosition(cubePosition);

    // CONTROLS AND CONTROL VARIABLES

    const controls = ['w', 'a', 's', 'd'];      // ADD KEYBOARD CHARACTERS HERE FOR ADDITIONAL INPUTS
    let pressed = [false, false, false, false]; // MUST BE A LIST OF False FOR EVERY KEY CHARACTER
    let move = 0.1;                             // MOVE SPEED
    let turn = 0.04;                            // TURN SPEED
    let zoom = 3;                               // DISTANCE BETWEEN CUBE AND CAMERA
    let camHieght = 3;                          // CAMERA HEIGHT
    

        document.addEventListener('keydown', function(event){
            pressed[controls.indexOf(event.key)] = true;
        })
        document.addEventListener('keyup', function(event){
            pressed[controls.indexOf(event.key)] = false;
        })

        function keyAction(){
            if (pressed[controls.indexOf('w')]){
                w();
            }
            if (pressed[controls.indexOf('a')]){
                a();
            }
            if (pressed[controls.indexOf('s')]){
                s();
            }
            if (pressed[controls.indexOf('d')]){
                d();
            }
        }

        // function cameraDistance(object){
        //     //let distance = Math.sqrt(Math.pow((cube.position.x - camera.position.x), 2) + Math.pow((cube.position.y - camera.position.y), 2) + Math.pow((cube.position.z - camera.position.z), 2));
        //     let distance = cubePosition.distanceTo()
        //     return (distance);
        // }

        function ThirdPerson(){
            camera.position.y = cube.position.y + camHieght;
            camera.position.x = cube.position.x + (-zoom * Math.cos(cube.rotation.y));
            camera.position.z = cube.position.z + (zoom * Math.sin(cube.rotation.y));
            camera.lookAt(new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z));
        }

        function w(){
            let theta = cube.rotation.y;
            cube.position.z -= move*Math.sin(theta);
            cube.position.x += move*Math.cos(theta);
        }
        function a(){
            cube.rotation.y +=turn;
        }
        function s(){
            let theta = cube.rotation.y;
            cube.position.z += move*Math.sin(theta);
            cube.position.x -= move*Math.cos(theta);
        }
        function d(){
            cube.rotation.y -=turn;
        }

    

    function animate(){
        ThirdPerson();
        keyAction();
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

} else {

	const warning = WebGL.getWebGL2ErrorMessage();
	document.getElementById( 'container' ).appendChild( warning );

}


