import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class BuildingLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.loader = new GLTFLoader();
    }

    loadBuilding(buildingModel, x, y, z, angleY, size) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                buildingModel,
                (gltf) => {
                    console.log('Building model loaded successfully');
                    const buildingObject = gltf.scene;
                    buildingObject.scale.set(1.7, 2, 2.5); // Adjust scale if needed
                    buildingObject.position.set(x, y, z-6);
                    buildingObject.rotation.y = angleY;
                    this.scene.add(buildingObject);

                    // Create the building body
                    const buildingBody = new CANNON.Body({
                        mass: 0, // Static body
                        position: new CANNON.Vec3(x, y + size.y, z),
                        shape: new CANNON.Box(size),
                        material: this.groundMaterial
                    });

                    buildingBody.quaternion.setFromEuler(0, angleY, 0);
                    this.world.addBody(buildingBody);

                    resolve(buildingObject);
                },
                undefined,
                (error) => {
                    console.error('An error happened while loading the building model', error);
                    reject(error);
                }
            );
        });
    }
}