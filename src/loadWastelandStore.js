import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class WastelandStoreLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.loader = new GLTFLoader();
    }

    loadWastelandStore(storeModel, x, y, z, angleY, size) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                storeModel,
                (gltf) => {
                    console.log('Wasteland store model loaded successfully');
                    const storeObject = gltf.scene;
                    
                    // Set initial scale - adjust these values based on your model's size
                    storeObject.scale.set(5, 3.5, 4);
                    
                    // Position the store with slight elevation
                    storeObject.position.set(x+9, y, z);
                    storeObject.rotation.y = angleY;
                    
                    // Add shadows and weathering effects
                    storeObject.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Add weathered/abandoned appearance
                            if (child.material) {
                                // Make the surface look worn
                                child.material.roughness = 0.85;
                                child.material.metalness = 0.15;
                                
                                // Add slight darkness/wear to the material
                                child.material.color.multiplyScalar(0.75);
                                
                                // Optional: Add some rust-like coloring
                                child.material.color.lerp(new THREE.Color(0x8B4513), 0.2);
                            }
                        }
                    });

                    this.scene.add(storeObject);

                    // Create compound collision shape for the store
                    const mainStoreShape = new CANNON.Box(
                        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
                    );

                    // Add collision for storefront/awning
                    // const awningShape = new CANNON.Box(
                    //     new CANNON.Vec3(size.x / 1.8, size.y / 6, size.z / 1.5)
                    // );

                    // Create the store physics body
                    const storeBody = new CANNON.Body({
                        mass: 0,
                        material: this.groundMaterial,
                        position: new CANNON.Vec3(x, y + size.y / 2, z)
                    });

                    // Add shapes with offsets
                    storeBody.addShape(mainStoreShape);
                    //storeBody.addShape(awningShape, new CANNON.Vec3(0, size.y / 3, size.z / 4));

                    // Set rotation
                    storeBody.quaternion.setFromEuler(0, angleY, 0);
                    
                    this.world.addBody(storeBody);

                    // Add environmental details
                    this.addEnvironmentalDetails(x, y, z, size);

                    resolve(storeObject);
                },
                (progress) => {
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log(`Loading wasteland store: ${Math.round(percentComplete)}%`);
                },
                (error) => {
                    console.error('An error happened while loading the wasteland store model', error);
                    reject(error);
                }
            );
        });
    }

    // Method to add environmental details around the store
    addEnvironmentalDetails(storeX, storeY, storeZ, storeSize) {
        // Add scattered debris
        this.addDebris(storeX, storeY, storeZ, storeSize);
        
        // Add abandoned items
        this.addAbandonedItems(storeX, storeY, storeZ, storeSize);
    }

    // Method to add debris around the store
    addDebris(x, y, z, size) {
        const debrisGeometries = [
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
            new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8),
            new THREE.SphereGeometry(0.3, 8, 8)
        ];

        const debrisMaterials = [
            new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.9,
                metalness: 0.1
            }),
            new THREE.MeshStandardMaterial({ 
                color: 0x708090,
                roughness: 0.8,
                metalness: 0.2
            })
        ];

        // Add random debris around the store
        for (let i = 0; i < 25; i++) {
            const geometry = debrisGeometries[Math.floor(Math.random() * debrisGeometries.length)];
            const material = debrisMaterials[Math.floor(Math.random() * debrisMaterials.length)];
            const debris = new THREE.Mesh(geometry, material);
            
            // Random position around the store
            const angle = Math.random() * Math.PI * 2;
            const radius = (Math.random() * size.x / 2) + size.x / 1.5;
            
            debris.position.set(
                x + Math.cos(angle) * radius,
                y,
                z + Math.sin(angle) * radius
            );
            
            // Random rotation and scale
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = 0.5 + Math.random() * 1.5;
            debris.scale.set(scale, scale, scale);
            
            debris.castShadow = true;
            debris.receiveShadow = true;
            
            this.scene.add(debris);
        }
    }

    // Method to add abandoned items around the store
    addAbandonedItems(x, y, z, size) {
        // Create simple shopping cart geometry
        const cartGeometry = new THREE.BoxGeometry(1, 1, 1.5);
        const cartMaterial = new THREE.MeshStandardMaterial({
            color: 0x707070,
            roughness: 0.9,
            metalness: 0.4
        });

        // Add a few abandoned shopping carts
        for (let i = 0; i < 3; i++) {
            const cart = new THREE.Mesh(cartGeometry, cartMaterial);
            const angle = Math.random() * Math.PI * 2;
            const radius = (Math.random() * size.x / 3) + size.x / 2;
            
            cart.position.set(
                x + Math.cos(angle) * radius,
                y,
                z + Math.sin(angle) * radius
            );
            
            cart.rotation.y = Math.random() * Math.PI * 2;
            cart.scale.set(0.8, 0.8, 0.8);
            
            cart.castShadow = true;
            cart.receiveShadow = true;
            
            this.scene.add(cart);
        }
    }
}