import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';

export class BoostLoader {
    constructor(scene, world, loadingManager) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.boostModels = [];
        this.boostBodies = [];
        this.boostData = []; // Store all boost-related data in a single array
        this.boostTemplate = null; // Cache for the boost model
        this.glowTemplate = null; // Cache for the glow mesh
        
        // Pre-create materials
        this.boostMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            emissive: 0x0044aa,
            shininess: 100
        });
        
        this.glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
    }

    loadBoost(boostModel, positions) {
        return new Promise((resolve, reject) => {
            // Load model only once
            this.loader.load(boostModel, (gltf) => {
                this.boostTemplate = gltf.scene;
                this.boostTemplate.scale.set(0.4, 0.4, 0.4);
                
                // Create glow geometry template
                const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16); // Reduced segments
                this.glowTemplate = new THREE.Mesh(glowGeometry, this.glowMaterial);
                
                // Create all boost instances
                positions.forEach(position => {
                    this.createBoostInstance(position);
                });
                
                resolve();
            }, undefined, reject);
        });
    }

    createBoostInstance(position) {
        // Clone boost model
        const boostObject = this.boostTemplate.clone();
        boostObject.position.copy(position);
        
        // Apply optimized materials
        boostObject.traverse((child) => {
            if (child.isMesh) {
                child.material = this.boostMaterial;
            }
        });
        
        // Create glow effect
        const glowMesh = this.glowTemplate.clone();
        glowMesh.position.copy(position);
        
        // Create physics body
        const boostShape = new CANNON.Sphere(0.5);
        const boostBody = new CANNON.Body({
            mass: 0,
            shape: boostShape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            collisionResponse: false
        });
        
        const light = new THREE.PointLight(0x0088ff, 1, 5);
        light.position.copy(position);
        
        this.boostData.push({
            model: boostObject,
            glow: glowMesh,
            light: light,
            body: boostBody,
            baseIntensity: 1,
            phase: Math.random() * Math.PI * 2 // Randomize initial phase
        });
        
        this.scene.add(boostObject);
        this.scene.add(glowMesh);
        this.scene.add(light);
        this.world.addBody(boostBody);
    }

    checkBoostCollision(carBody) {
        const carPos = carBody.position;
        const threshold = 2; // Collision threshold
        
        for (let i = 0; i < this.boostData.length; i++) {
            const boostPos = this.boostData[i].body.position;
            
            const dx = carPos.x - boostPos.x;
            const dy = carPos.y - boostPos.y;
            const dz = carPos.z - boostPos.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            
            if (distanceSquared < threshold * threshold) {
                this.removeBoost(i);
                return true;
            }
        }
        return false;
    }

    removeBoost(index) {
        const boost = this.boostData[index];
        
        // Remove from scene
        this.scene.remove(boost.model);
        this.scene.remove(boost.glow);
        this.scene.remove(boost.light);
        
        // Remove from physics world
        this.world.removeBody(boost.body);
        
        // Remove from array
        this.boostData.splice(index, 1);
    }

    update(deltaTime) {
        // Use a single sine calculation per frame
        const time = Date.now() * 0.005;
        
        this.boostData.forEach(boost => {
            // Rotate boost model and glow
            boost.model.rotation.y += deltaTime;
            boost.glow.rotation.y += deltaTime;
            
            // Efficient pulsing effect using pre-calculated time
            const pulseFactor = (Math.sin(time + boost.phase) + 1) * 0.5;
            boost.light.intensity = boost.baseIntensity + pulseFactor;
            boost.glow.material.opacity = 0.2 + 0.2 * pulseFactor;
        });
    }
}