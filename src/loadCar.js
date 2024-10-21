import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class HeadLight {
    constructor(color, intensity) {
        this.light = new THREE.SpotLight(color, intensity);
    }

    setPosition(position) {
        this.light.position.set(position.x, position.y, position.z);
    }

    setAngle(angle) {
        this.light.angle = angle;
    }

    setPenumbra(penumbra) {
        this.light.penumbra = penumbra;
    }

    setDecay(decay) {
        this.light.decay = decay;
    }

    setShadow(shadow) {
        this.light.castShadow = shadow;
    }

    setTarget(carObject, x, y, z) {// Create a target for the spotlight
        const target = new THREE.Object3D();
        target.position.set(-10, 0, 0); // Adjust as needed
        carObject.add(target);
        this.light.target = target;
    }

    setDistance(distance) {
        this.light.distance = distance;
    }
}

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
                        mass: 10,
                        position: new CANNON.Vec3(0, 2, -10),
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

                    // Add the headlights to the car object
                    const leftHeadLight = new HeadLight(0xffff55, 100);
                    leftHeadLight.setPosition(new THREE.Vector3(-1, 1, 1))
                    leftHeadLight.setAngle(Math.PI / 6);
                    leftHeadLight.setPenumbra(0.5);
                    leftHeadLight.setDecay(2);
                    leftHeadLight.setShadow(true);
                    leftHeadLight.setTarget(carObject, 10, 1, 0);
                    carObject.add(leftHeadLight.light);

                    const rightHeadLight = new HeadLight(0xffff55, 100);
                    rightHeadLight.setPosition(new THREE.Vector3(-1, 1, -1))
                    rightHeadLight.setAngle(Math.PI / 6);
                    rightHeadLight.setPenumbra(0.5);
                    rightHeadLight.setDecay(2);
                    rightHeadLight.setShadow(true);
                    rightHeadLight.setTarget(carObject, 10, 1, 0);
                    carObject.add(rightHeadLight.light);

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
    updateHeadlightPosition(carObject, vehicle) {
        const position = vehicle.chassisBody.position;
        const quaternion = vehicle.chassisBody.quaternion;

        carObject.position.copy(position);
        carObject.quaternion.copy(quaternion);
    }

}