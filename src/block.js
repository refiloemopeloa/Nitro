import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class BlockLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.loader = new GLTFLoader();
        this.blocks = [];
        this.groundMaterial = groundMaterial;
        this.blockMaterial = new CANNON.Material('block');
        
        // Contact material for block-ground interaction
        const blockGroundContact = new CANNON.ContactMaterial(
            groundMaterial,
            this.blockMaterial,
            {
                friction: 0.4,
                restitution: 0.3
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
            
            // Position high in the sky
            const dropHeight = 50; // Height to drop from
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
                mass: 1,
                position: new CANNON.Vec3(dropPosition.x, dropHeight, dropPosition.z),
                shape: blockShape,
                material: this.blockMaterial
            });

            // Add random initial rotation
            blockBody.quaternion.setFromEuler(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Add some random initial velocity
            const velocity = 3;
            blockBody.velocity.set(
                (2) * velocity,
                0,
                (2) * velocity
            );

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

    // Drop multiple blocks in a pattern
    async dropBlockPattern(modelPath, centerPosition, pattern, spacing = 5) {
        const drops = [];
        for (let z = 0; z < pattern.length; z++) {
            for (let x = 0; x < pattern[z].length; x++) {
                if (pattern[z][x] === 1) {
                    const dropPos = {
                        x: centerPosition.x + (x - pattern[z].length/2) * spacing,
                        z: centerPosition.z + (z - pattern.length/2) * spacing
                    };
                    drops.push(this.loadBlock(modelPath, dropPos));
                }
            }
        }
        return Promise.all(drops);
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