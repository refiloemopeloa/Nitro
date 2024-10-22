import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class GraffitiWallLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.loader = new GLTFLoader();
    }

    loadGraffitiWall(graffitiWallModel, x, y, z, angleY, size) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                graffitiWallModel,
                (gltf) => {
                    console.log('Graffiti wall model loaded successfully');
                    const graffitiWallObject = gltf.scene;
                    graffitiWallObject.scale.set(4.5, 3, 1); // Adjust scale as needed
                    graffitiWallObject.position.set(x+5, y+10, z);
                    graffitiWallObject.rotation.y = Math.PI/2;
                    this.scene.add(graffitiWallObject);

                    // Create the graffiti wall body
                    const graffitiWallBody = new CANNON.Body({
                        mass: 0, // Static body
                        position: new CANNON.Vec3(x, y + size.y / 2, z),
                        shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
                        material: this.groundMaterial
                    });

                    graffitiWallBody.quaternion.setFromEuler(0, angleY, 0);
                    this.world.addBody(graffitiWallBody);

                    resolve(graffitiWallObject);
                },
                undefined,
                (error) => {
                    console.error('An error happened while loading the graffiti wall model', error);
                    reject(error);
                }
            );
        });
    }
}