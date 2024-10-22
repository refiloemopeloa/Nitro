import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class BlockLoader {
    constructor(scene, world, blockModelPath, carObject) {
        this.scene = scene;
        this.world = world;
        this.loader = new GLTFLoader();
        this.blockModelPath = blockModelPath;
        this.blockObject = null;
        this.blockBody = null;
        this.isDropped = false;
        this.carObject = carObject;
        this.dropDistance = 3; // Distance in front of the car to drop the block
    }

    // Load the block model
    loadBlock() {
        return new Promise((resolve, reject) => {
            this.loader.load(
                this.blockModelPath,
                (gltf) => {
                    this.blockObject = gltf.scene;
                    this.blockObject.scale.set(0.5, 0.5, 0.5);
                    this.blockObject.visible = false;
                    this.scene.add(this.blockObject);
                    resolve(this.blockObject);
                },
                undefined,
                (error) => {
                    console.error('Error loading block model', error);
                    reject(error);
                }
            );
        });
    }

    // Check if the car is in the right position to trigger the block drop
    checkCarPosition() {
        const carPosition = this.carObject.position;
        // Adjust the threshold as needed for when the block should drop
        if (carPosition.z >= this.dropDistance && !this.isDropped) {
            this.dropBlock({
                x: carPosition.x,
                y: carPosition.y,
                z: carPosition.z - this.dropDistance // A few cm in front of the car
            });
        }
    }

    // Drop the block at the specified position
    dropBlock(dropPosition) {
        if (this.isDropped) return; // Block has already dropped
        this.isDropped = true;

        // Set the initial position of the block above the ground
        this.blockObject.position.set(dropPosition.x, dropPosition.y + 5, dropPosition.z); // Drop from height
        this.blockObject.visible = true;

        // Create Cannon.js body for block physics
        this.blockBody = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(dropPosition.x, dropPosition.y + 5, dropPosition.z),
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) // Adjust size as needed
        });

        this.world.addBody(this.blockBody);
    }

    // Update the block position based on physics
    updateBlockPosition() {
        if (this.blockBody && this.blockObject) {
            this.blockObject.position.copy(this.blockBody.position);
            this.blockObject.quaternion.copy(this.blockBody.quaternion);
        }
    }
}
