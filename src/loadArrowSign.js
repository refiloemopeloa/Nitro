import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ArrowLoader {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.arrowSigns = [];
    }

    loadArrowSign(arrowModel, position, rotation = { x: 0, y: 0, z: 0 }, scale = 1.0) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                arrowModel,
                (gltf) => {
                    const arrowObject = gltf.scene.clone();
                    
                    // Apply scale
                    arrowObject.scale.set(scale, scale, scale);
                    
                    // Apply position
                    arrowObject.position.copy(position);
                    
                    // Apply rotation (in radians)
                    arrowObject.rotation.x = rotation.x;
                    arrowObject.rotation.y = rotation.y;
                    arrowObject.rotation.z = rotation.z;
                    
                    // Add to scene and store reference
                    this.scene.add(arrowObject);
                    this.arrowSigns.push(arrowObject);
                    
                    // Optional: Add emission effect to make signs more visible
                    arrowObject.traverse((child) => {
                        if (child.isMesh) {
                            // Create a new material that emits light
                            child.material = new THREE.MeshStandardMaterial({
                                color: child.material.color || 0xffffff,
                                emissive: 0x444444,
                                emissiveIntensity: 0.5,
                                metalness: 0.5,
                                roughness: 0.5
                            });
                        }
                    });

                    resolve(arrowObject);
                },
                undefined,
                (error) => {
                    console.error('Failed to load arrow sign:', error);
                    reject(error);
                }
            );
        });
    }

    // Method to add multiple arrow signs at once
    loadMultipleArrows(arrowModel, arrowConfigs) {
        const promises = arrowConfigs.map(config => 
            this.loadArrowSign(
                arrowModel, 
                new THREE.Vector3(config.position.x, config.position.y, config.position.z),
                config.rotation || { x: 0, y: 0, z: 0 },
                config.scale || 1.0
            )
        );
        return Promise.all(promises);
    }

    // Remove a specific arrow sign
    removeArrowSign(index) {
        if (index >= 0 && index < this.arrowSigns.length) {
            this.scene.remove(this.arrowSigns[index]);
            this.arrowSigns.splice(index, 1);
        }
    }

    // Remove all arrow signs
    removeAllArrows() {
        this.arrowSigns.forEach(arrow => {
            this.scene.remove(arrow);
        });
        this.arrowSigns = [];
    }

    // Update method (for potential animations or effects)
    update(deltaTime) {
        // Can be used to add animations or effects to the arrows
        // For example, gentle hovering or pulsing effects
        this.arrowSigns.forEach(arrow => {
            // Example: Gentle hovering effect
            arrow.position.y += Math.sin(Date.now() * 0.002) * 0.0005;
        });
    }
}