import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CarLoader {
    constructor(scene, world, carMaterial, wheelMaterial) {
        this.scene = scene;
        this.world = world;
        this.carMaterial = carMaterial;
        this.wheelMaterial = wheelMaterial;
        this.loader = new GLTFLoader();
    }

    loadCar(carModel) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                carModel,
                (gltf) => {
                    console.log('Model loaded successfully');
                    const carObject = gltf.scene;
                    carObject.scale.set(1, 1, 1);
                    this.scene.add(carObject);

                    const FrontWheel_L = gltf.scene.getObjectByName('FrontWheel_L');
                    const FrontWheel_R = gltf.scene.getObjectByName('FrontWheel_R');
                    const BackWheels = gltf.scene.getObjectByName('BackWheels');

                    FrontWheel_L.userData.originalMatrix = FrontWheel_L.matrix.clone();
                    FrontWheel_R.userData.originalMatrix = FrontWheel_R.matrix.clone();

                    // Create the vehicle
                    const carBody = new CANNON.Body({
                        mass: 5,
                        position: new CANNON.Vec3(0, 2, 0),
                        shape: new CANNON.Box(new CANNON.Vec3(2.8, 0.5, 1.45)),
                        material: this.carMaterial
                    });

                    const vehicle = new CANNON.RigidVehicle({
                        chassisBody: carBody,
                    });

                    // Wheel setup
                    const mass = 0.5;
                    const wheelShape = new CANNON.Sphere(0.5);
                    const down = new CANNON.Vec3(0, -1, 0);

                    // Adjusted wheel positions
                    const wheelPositions = [
                        new CANNON.Vec3(-1.9, -0.5, 0.875), // Front left
                        new CANNON.Vec3(-1.9, -0.5, -0.875), // Front right
                        new CANNON.Vec3(1.2, -0.5, 0.875),  // Back left (moved forward)
                        new CANNON.Vec3(1.2, -0.5, -0.875)  // Back right (moved forward)
                    ];

                    wheelPositions.forEach((position, index) => {
                        const wheelBody = new CANNON.Body({ mass, material: this.wheelMaterial });
                        wheelBody.addShape(wheelShape);
                        wheelBody.angularDamping = 0.4;

                        vehicle.addWheel({
                            body: wheelBody,
                            position: position,
                            axis: new CANNON.Vec3(0, 0, 1),
                            direction: down,
                        });
                    });

                    vehicle.addToWorld(this.world);

                    resolve({
                        carObject,
                        vehicle,
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