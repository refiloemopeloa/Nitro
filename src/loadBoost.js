import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class BoostLoader {
    constructor(scene, world, loadingManager) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.boostModels = [];
        this.boostBodies = [];
        this.boostLights = [];
        this.glowMeshes = [];
    }

    loadBoost(boostModel, positions) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                boostModel,
                (gltf) => {
                    console.log('Boost model loaded successfully');
                    
                    positions.forEach(position => {
                        const boostObject = gltf.scene.clone();
                        boostObject.scale.set(0.4, 0.4, 0.4);
                        boostObject.position.copy(position);
                        this.scene.add(boostObject);
                        this.boostModels.push(boostObject);

                        boostObject.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshPhongMaterial({
                                    color: 0x0088ff,
                                    emissive: 0x0044aa,
                                    shininess: 100
                                });
                            }
                        });

                        // Add glow effect
                        const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
                        const glowMaterial = new THREE.MeshBasicMaterial({
                            color: 0x0088ff,
                            transparent: true,
                            opacity: 0.3,
                            side: THREE.BackSide
                        });
                        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                        glowMesh.position.copy(position);
                        this.scene.add(glowMesh);
                        this.glowMeshes.push(glowMesh);

                        // Add point light
                        const light = new THREE.PointLight(0x0088ff, 1, 5);
                        light.position.copy(position);
                        this.scene.add(light);
                        this.boostLights.push(light);

                        // Create a physics body for the boost
                        const boostShape = new CANNON.Sphere(0.5); // Adjust radius as needed
                        const boostBody = new CANNON.Body({
                            mass: 0, // Static body
                            shape: boostShape,
                            position: new CANNON.Vec3(position.x, position.y, position.z),
                            collisionResponse: false // Allow car to pass through
                        });
                        this.world.addBody(boostBody);
                        this.boostBodies.push(boostBody);
                    });

                    resolve();
                },
                undefined,
                (error) => {
                    console.error('An error happened', error);
                    reject(error);
                }
            );
        });
    }

    checkBoostCollision(carBody) {
        for (let i = 0; i < this.boostBodies.length; i++) {
            const distance = carBody.position.distanceTo(this.boostBodies[i].position);
            if (distance < 2) { // Adjust this value based on your boost and car sizes
                this.removeBoost(i);
                return true;
            }
        }
        return false;
    }

    removeBoost(index) {
        this.scene.remove(this.boostModels[index]);
        this.scene.remove(this.boostLights[index]);
        this.scene.remove(this.glowMeshes[index]);
        this.world.removeBody(this.boostBodies[index]);
        this.boostModels.splice(index, 1);
        this.boostLights.splice(index, 1);
        this.glowMeshes.splice(index, 1);
        this.boostBodies.splice(index, 1);
    }

    update(deltaTime) {
        // Rotate boost models and glow meshes
        this.boostModels.forEach((model, index) => {
            model.rotation.y += 1 * deltaTime; // Adjust rotation speed as needed
            this.glowMeshes[index].rotation.y += 1 * deltaTime;
            
            // Make the light intensity and glow opacity pulsate
            const pulseFactor = (Math.sin(Date.now() * 0.005) + 1) / 2; // Pulsate between 0 and 1
            this.boostLights[index].intensity = 1 + pulseFactor;
            this.glowMeshes[index].material.opacity = 0.2 + 0.2 * pulseFactor;

            // Make the boost model's emissive intensity pulsate
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissiveIntensity = 0.5 + 0.5 * pulseFactor;
                }
            });
        });
    }
}