import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getParticleSystem } from './getParticleSystem2.js';
import img from './img/fire.png';

export class CrateLoader {
    constructor(scene, world, camera) { 
        this.scene = scene;
        this.world = world;
        this.camera = camera; 
        this.loader = new GLTFLoader();
        this.crateModels = [];
        this.crateBodies = [];
        this.fireEffects = [];
        this.fireEmitters = [];
        this.damageAmount = 10;
        this.lastDamageTime = 0;
        this.damageCooldown = 2000;
        this.carBody = null;
        this.crateMaterial = new CANNON.Material('crate');
    }

    setCarBody(carBody) {
        this.carBody = carBody;
        
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

                        // Create crate as fire emitter
                        const crateEmitter = new THREE.Object3D();
                        crateEmitter.position.copy(position);
                        crateEmitter.position.y += 0; // Offset fire slightly above crate
                        this.scene.add(crateEmitter);
                        this.fireEmitters.push(crateEmitter);

                        // Create fire effect using getParticleSystem2 with proper camera reference
                        const fireEffect = getParticleSystem({
                            camera: this.camera, 
                            emitter: crateEmitter,
                            parent: this.scene,
                            rate: 35.0,
                            texture: img
                        });
                        this.fireEffects.push(fireEffect);

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

                        // Add point light for fire illumination
                        const light = new THREE.PointLight(0xff6600, 1, 4);
                        light.position.copy(position);
                        light.position.y += 1;
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
            
            // Remove fire emitter and effect
            if (this.fireEmitters[index]) {
                this.scene.remove(this.fireEmitters[index]);
            }
            
            this.fireEffects.splice(index, 1);
            this.fireEmitters.splice(index, 1);
            this.crateModels.splice(index, 1);
            this.crateBodies.splice(index, 1);
        }
    }

    update(deltaTime) {
        // Update crate positions and rotations
        this.crateModels.forEach((crate, index) => {
            const crateBody = this.crateBodies[index];
            const emitter = this.fireEmitters[index];
            const fireEffect = this.fireEffects[index];
            
            // Update crate position and rotation
            crate.position.copy(crateBody.position);
            crate.quaternion.copy(crateBody.quaternion);
            
            // Update fire emitter position to follow crate
            if (emitter) {
                emitter.position.copy(crateBody.position);
                emitter.position.y += 1; // Keep fire above crate
            }
            
            // Update fire particle system
            if (fireEffect) {
                fireEffect.update(deltaTime);
            }
        });
    }

    isNearCrate(position, threshold = 2) {
        return this.crateBodies.some(crateBody => {
            const distance = position.distanceTo(crateBody.position);
            return distance < threshold;
        });
    }
}