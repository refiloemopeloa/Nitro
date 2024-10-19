import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CarLoader {
    constructor(scene, world, carMaterial) {
        this.scene = scene;
        this.world = world;
        this.carMaterial = carMaterial;
        this.loader = new GLTFLoader();
    }

    loadCar(carModel) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                carModel,
                (gltf) => {
                    console.log('Model loaded successfully');
                    const carObject = gltf.scene;
                    carObject.scale.set(0.5, 0.5, 0.5);
                    this.scene.add(carObject);

                    const FrontWheel_L = gltf.scene.getObjectByName('FrontWheel_L');
                    const FrontWheel_R = gltf.scene.getObjectByName('FrontWheel_R');
                    const BackWheels = gltf.scene.getObjectByName('BackWheels');

                    FrontWheel_L.userData.originalMatrix = FrontWheel_L.matrix.clone();
                    FrontWheel_R.userData.originalMatrix = FrontWheel_R.matrix.clone();

                    const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
                    const carBody = new CANNON.Body({
                        mass: 100,
                        shape: carShape,
                        material: this.carMaterial,
                        angularDamping: 0.9,
                        linearDamping: 0.5
                    });
                    carBody.position.set(0, 2, 0);
                    this.world.addBody(carBody);

                    resolve({
                        carObject,
                        carBody,
                        FrontWheel_L,
                        FrontWheel_R,
                        BackWheels
                    });
                },
                undefined,
                (error) => {
                    console.error('An error happened', error);
                    reject(error);
                }
            );
        });
    }
}