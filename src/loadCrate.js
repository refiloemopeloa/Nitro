import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CrateLoader {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.loader = new GLTFLoader();
        this.crateModels = [];
        this.crateBodies = [];
        this.damageAmount = 20;
        this.lastDamageTime = 0;
        this.damageCooldown = 2000; // Reduced cooldown to 500ms for more responsive damage
        this.carBody = null;
        this.crateMaterial = new CANNON.Material('crate');
    }

    setCarBody(carBody) {
        this.carBody = carBody;
        
        // Create contact material between crate and car
        const crateCarContact = new CANNON.ContactMaterial(
            this.crateMaterial,
            carBody.material,
            {
                friction: 0.3,
                restitution: 0.4,
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(crateCarContact);
    }

    loadCrates(crateModel, positions) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                crateModel,
                (gltf) => {
                    console.log('Crate model loaded successfully');
                    
                    positions.forEach(position => {
                        const crateObject = gltf.scene.clone();
                        crateObject.scale.set(2, 2, 2);
                        crateObject.position.copy(position);
                        this.scene.add(crateObject);
                        this.crateModels.push(crateObject);

                        crateObject.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshPhongMaterial({
                                    color: 0xff4444,
                                    emissive: 0x441111,
                                    shininess: 30
                                });
                            }
                        });

                        const crateShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
                        const crateBody = new CANNON.Body({
                            mass: 1,
                            shape: crateShape,
                            position: new CANNON.Vec3(position.x, position.y, position.z),
                            material: this.crateMaterial
                        });

                        crateBody.addEventListener('collide', (event) => {
                            const currentTime = Date.now();
                            // Check if we're colliding with the car and enough time has passed since last damage
                            if (this.carBody && event.body === this.carBody && 
                                currentTime - this.lastDamageTime >= this.damageCooldown) {
                                    
                                this.lastDamageTime = currentTime;
                                
                                const damageEvent = new CustomEvent('crateDamage', {
                                    detail: { damage: this.damageAmount }
                                });
                                window.dispatchEvent(damageEvent);

                                crateObject.traverse((child) => {
                                    if (child.isMesh) {
                                        child.material = new THREE.MeshPhongMaterial({
                                            color: 0xff0000,
                                            emissive: 0xff0000,
                                            emissiveIntensity: 0.5
                                        });
                                    }
                                });

                                setTimeout(() => {
                                    crateObject.traverse((child) => {
                                        if (child.isMesh) {
                                            child.material = new THREE.MeshPhongMaterial({
                                                color: 0xff4444,
                                                emissive: 0x441111,
                                                shininess: 30
                                            });
                                        }
                                    });
                                }, 100);
                            }
                        });

                        this.world.addBody(crateBody);
                        this.crateBodies.push(crateBody);

                        const light = new THREE.PointLight(0xff0000, 0.5, 3);
                        light.position.copy(position);
                        this.scene.add(light);
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

    removeCrate(index) {
        if (index >= 0 && index < this.crateModels.length) {
            this.scene.remove(this.crateModels[index]);
            this.world.removeBody(this.crateBodies[index]);
            this.crateModels.splice(index, 1);
            this.crateBodies.splice(index, 1);
        }
    }

    update(deltaTime) {
        this.crateModels.forEach((crate, index) => {
            crate.position.copy(this.crateBodies[index].position);
            crate.quaternion.copy(this.crateBodies[index].quaternion);
        });
    }

    isNearCrate(position, threshold = 2) {
        return this.crateBodies.some(crateBody => {
            const distance = position.distanceTo(crateBody.position);
            return distance < threshold;
        });
    }
}