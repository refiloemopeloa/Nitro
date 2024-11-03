import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';

export class RubbleLoader {
    constructor(scene, world, groundMaterial, loadingManager) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.rubbleMeshes = [];
        this.rubbleBodies = [];
        this.staticRubble = [];
    }

    createRubbleMesh(size) {
        // Create a random, irregular shape for rubble
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Front face - irregular pentagon
            -size.x, -size.y, size.z,
            size.x, -size.y, size.z,
            size.x * 0.8, size.y, size.z,
            0, size.y * 1.2, size.z,
            -size.x * 0.8, size.y, size.z,
            // Back face - irregular pentagon
            -size.x, -size.y, -size.z,
            size.x, -size.y, -size.z,
            size.x * 0.8, size.y, -size.z,
            0, size.y * 1.2, -size.z,
            -size.x * 0.8, size.y, -size.z,
        ]);

        const indices = new Uint16Array([
            // Front face
            0, 1, 2,
            0, 2, 3,
            0, 3, 4,
            // Back face
            5, 7, 6,
            5, 8, 7,
            5, 9, 8,
            // Connect front to back
            0, 5, 1,
            1, 5, 6,
            1, 6, 2,
            2, 6, 7,
            2, 7, 3,
            3, 7, 8,
            3, 8, 4,
            4, 8, 9,
            4, 9, 5,
            5, 0, 4
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.2 + Math.random() * 1.1),
            roughness: 0.9,
            metalness: 0.1,
        });

        return new THREE.Mesh(geometry, material);
    }

    createPhysicsShape(size) {
        // Create a simplified physics shape (box) for performance
        return new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z));
    }

    addInteractiveRubble(position, rotation = { x: 0, y: 0, z: 0 }) {
        const size = {
            x: 0.6 + Math.random() * 1.2,
            y: 0.5 + Math.random() * 1.15,
            z: 0.55 + Math.random() * 1.2
        };

        // Create visual mesh
        const rubbleMesh = this.createRubbleMesh(size);
        rubbleMesh.position.copy(position);
        rubbleMesh.rotation.set(rotation.x, rotation.y, rotation.z);
        rubbleMesh.castShadow = true;
        rubbleMesh.receiveShadow = true;
        this.scene.add(rubbleMesh);
        this.rubbleMeshes.push(rubbleMesh);

        // Create physics body
        const shape = this.createPhysicsShape(size);
        const mass = 1.5; // Light enough to be moved easily
        const rubbleBody = new CANNON.Body({
            mass,
            shape,
            material: this.groundMaterial,
            angularDamping: 0.3, // Reduce spinning
            linearDamping: 0.3 // Reduce sliding
        });
        
        rubbleBody.position.copy(position);
        rubbleBody.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
        this.world.addBody(rubbleBody);
        this.rubbleBodies.push(rubbleBody);
    }

    addStaticRubble(position) {
        const size = {
            x: 0.2 + Math.random() * 0.1,
            y: 0.15 + Math.random() * 0.1,
            z: 0.2 + Math.random() * 0.1
        };

        const rubbleMesh = this.createRubbleMesh(size);
        rubbleMesh.position.copy(position);
        rubbleMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rubbleMesh.scale.multiplyScalar(0.5); // Make static rubble smaller
        rubbleMesh.castShadow = true;
        rubbleMesh.receiveShadow = true;
        this.scene.add(rubbleMesh);
        this.staticRubble.push(rubbleMesh);
    }

    addRubbleCluster(centerPosition, radius, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const position = new THREE.Vector3(
                centerPosition.x + Math.cos(angle) * distance,
                centerPosition.y,
                centerPosition.z + Math.sin(angle) * distance
            );

            if (Math.random() < 0.3) { // 30% chance for interactive rubble
                this.addInteractiveRubble(position, {
                    x: Math.random() * 0.5,
                    y: Math.random() * Math.PI,
                    z: Math.random() * 0.5
                });
            } else {
                this.addStaticRubble(position);
            }
        }
    }

    update() {
        // Update positions and rotations of interactive rubble
        for (let i = 0; i < this.rubbleMeshes.length; i++) {
            this.rubbleMeshes[i].position.copy(this.rubbleBodies[i].position);
            this.rubbleMeshes[i].quaternion.copy(this.rubbleBodies[i].quaternion);
        }
    }
}