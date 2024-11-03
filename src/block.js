import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';

export class BlockLoader {
    constructor(scene, world, groundMaterial, loadingManager) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.loader = new GLTFLoader();
        this.blocks = [];
        this.groundMaterial = groundMaterial;
        this.blockMaterial = new CANNON.Material('block');
        
        // Contact material for block-ground interaction - reduced bounce and increased friction
        const blockGroundContact = new CANNON.ContactMaterial(
            groundMaterial,
            this.blockMaterial,
            {
                friction: 1.8,     // Increased friction
                restitution: 0.0   // No bounce
            }
        );
        this.world.addContactMaterial(blockGroundContact);
    }

    async loadBlock(modelPath, dropPosition, size = { x: 1, y: 1, z: 1 }, scale = 1) {
        try {
            const gltf = await this.loader.loadAsync(modelPath);
            const blockObject = gltf.scene;
            
            // Scale the model
            blockObject.scale.set(scale, scale, scale);
            
            // Position at drop point
            const dropHeight = 40; // Height to drop from
            blockObject.position.set(
                dropPosition.x,
                dropHeight,
                dropPosition.z
            );
            
            // Add to scene
            this.scene.add(blockObject);

            // Create physics body
            const blockShape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z));
            const blockBody = new CANNON.Body({
                mass: 20,  // Increased mass for faster falling
                position: new CANNON.Vec3(dropPosition.x, dropHeight, dropPosition.z),
                shape: blockShape,
                material: this.blockMaterial,
                linearDamping: 0.1,  // Reduced air resistance
                angularDamping: 0.1  // Reduced rotation damping
            });

            // Add high initial downward velocity
            blockBody.velocity.set(0, -90, 0);  // Increased downward velocity

            // Lock rotation to keep blocks falling straight
            blockBody.fixedRotation = true;

            // Add to physics world
            this.world.addBody(blockBody);

            // Store block data
            this.blocks.push({
                object: blockObject,
                body: blockBody
            });

            return { object: blockObject, body: blockBody };
        } catch (error) {
            console.error('Error loading block model:', error);
            throw error;
        }
    }

    // Update all blocks' positions
    update() {
        for (const block of this.blocks) {
            if (block.object && block.body) {
                block.object.position.copy(block.body.position);
                block.object.quaternion.copy(block.body.quaternion);
            }
        }
    }

    // Remove a block from the scene and physics world
    removeBlock(index) {
        if (index >= 0 && index < this.blocks.length) {
            const block = this.blocks[index];
            this.scene.remove(block.object);
            this.world.removeBody(block.body);
            this.blocks.splice(index, 1);
        }
    }

    // Clear all blocks
    clearBlocks() {
        for (const block of this.blocks) {
            this.scene.remove(block.object);
            this.world.removeBody(block.body);
        }
        this.blocks = [];
    }
}