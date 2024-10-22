import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MilitaryBaseLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.loader = new GLTFLoader();
    }

    loadMilitaryBase(militaryBaseModel, x, y, z, angleY, size) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                militaryBaseModel,
                (gltf) => {
                    console.log('Military base model loaded successfully');
                    const militaryBaseObject = gltf.scene;
                    
                    // Set initial scale - adjust these values based on your model's size
                    militaryBaseObject.scale.set(7, 4, 5);
                    
                    // Position the base with a slight elevation to account for ground level
                    militaryBaseObject.position.set(x+2, y , z);
                    militaryBaseObject.rotation.y = angleY;
                    
                    // Add shadows
                    militaryBaseObject.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Optional: Add weathered/abandoned appearance
                            if (child.material) {
                                child.material.roughness = 0.9; // Make surface rough
                                child.material.metalness = 0.1; // Reduce metallic appearance
                                // Add slight darkness/wear to the material
                                child.material.color.multiplyScalar(0.8);
                            }
                        }
                    });

                    this.scene.add(militaryBaseObject);

                    // Create compound shape for complex collision
                    const mainBuildingShape = new CANNON.Box(
                        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
                    );

                    // Add additional collision boxes for various parts of the base
                    const wallsShape = new CANNON.Box(
                        new CANNON.Vec3(size.x / 1.8, size.y / 4, size.z / 1.8)
                    );

                    // Create the military base physics body
                    const militaryBaseBody = new CANNON.Body({
                        mass: 0, // Static body
                        material: this.groundMaterial,
                        position: new CANNON.Vec3(x, y + size.y / 2, z)
                    });

                    // Add shapes with offsets for better collision detection
                    militaryBaseBody.addShape(mainBuildingShape);
                    militaryBaseBody.addShape(wallsShape, new CANNON.Vec3(0, -size.y / 4, 0));

                    // Set rotation
                    militaryBaseBody.quaternion.setFromEuler(0, angleY, 0);
                    
                    // Add to physics world
                    this.world.addBody(militaryBaseBody);

                    // Create debris/rubble around the base (visual only)
                    this.addDebris(x, y, z, size);

                    resolve(militaryBaseObject);
                },
                // Loading progress callback
                (progress) => {
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log(`Loading military base: ${Math.round(percentComplete)}%`);
                },
                // Error callback
                (error) => {
                    console.error('An error happened while loading the military base model', error);
                    reject(error);
                }
            );
        });
    }

    // Method to add visual debris around the base
    addDebris(baseX, baseY, baseZ, baseSize) {
        const debrisGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const debrisMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });

        // Add random debris around the base
        for (let i = 0; i < 20; i++) {
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
            
            // Random position around the base
            const angle = Math.random() * Math.PI * 2;
            const radius = (Math.random() * baseSize.x / 2) + baseSize.x / 1.5;
            
            debris.position.set(
                baseX + Math.cos(angle) * radius,
                baseY,
                baseZ + Math.sin(angle) * radius
            );
            
            // Random rotation
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Random scale
            const scale = 0.5 + Math.random() * 1.5;
            debris.scale.set(scale, scale, scale);
            
            debris.castShadow = true;
            debris.receiveShadow = true;
            
            this.scene.add(debris);
        }
    }
}