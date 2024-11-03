import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';

export class BoundLoader {
    constructor(scene, world, onBoundHit, loadingManager) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.bounds = [];
        this.boundMeshes = [];
        this.boundLights = [];
        this.onBoundHit = onBoundHit;  // Callback function for when bound is hit
    }

    createBound(position, size) {
        // Create physics body for the bound using a properly oriented box
        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
        
        // Create vertices for the box shape
        const vertices = [
            // Front face vertices (z+)
            [-halfExtents.x, -halfExtents.y, halfExtents.z],  // 0
            [halfExtents.x, -halfExtents.y, halfExtents.z],   // 1
            [halfExtents.x, halfExtents.y, halfExtents.z],    // 2
            [-halfExtents.x, halfExtents.y, halfExtents.z],   // 3
            // Back face vertices (z-)
            [-halfExtents.x, -halfExtents.y, -halfExtents.z], // 4
            [halfExtents.x, -halfExtents.y, -halfExtents.z],  // 5
            [halfExtents.x, halfExtents.y, -halfExtents.z],   // 6
            [-halfExtents.x, halfExtents.y, -halfExtents.z]   // 7
        ].map(v => new CANNON.Vec3(...v));

        // Define faces with correct CCW winding order when viewed from outside
        const faces = [
            [0, 1, 2, 3],    // Front face (z+)
            [5, 4, 7, 6],    // Back face (z-)
            [4, 5, 1, 0],    // Bottom face (y-)
            [3, 2, 6, 7],    // Top face (y+)
            [4, 0, 3, 7],    // Left face (x-)
            [1, 5, 6, 2]     // Right face (x+)
        ];

        const boundShape = new CANNON.ConvexPolyhedron({
            vertices: vertices,
            faces: faces
        });

        const boundBody = new CANNON.Body({
            mass: 0,
            shape: boundShape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            isTrigger: true,
            collisionResponse: false
        });

        // Create visual representation
        const boundGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const boundMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,  // Red color for bounds
            transparent: true,
            opacity: 0.3,
            emissive: 0xaa0000,  // Red emissive color
            shininess: 100
        });
        
        const boundMesh = new THREE.Mesh(boundGeometry, boundMaterial);
        boundMesh.position.copy(position);
        this.scene.add(boundMesh);
        this.boundMeshes.push(boundMesh);

        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(
            size.x + 0.4,
            size.y + 0.4,
            size.z + 0.4
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,  // Red glow
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(position);
        this.scene.add(glowMesh);

        // Add point light
        const boundLight = new THREE.PointLight(0xff0000, 1, 20);  // Red light
        boundLight.position.copy(position);
        this.scene.add(boundLight);
        this.boundLights.push({ light: boundLight, glowMesh });

        // Add collision event listener
        boundBody.addEventListener('collide', (event) => {
            this.handleBoundCollision();
        });

        this.world.addBody(boundBody);
        this.bounds.push(boundBody);
    }

    handleBoundCollision() {
        // Call the provided callback function when bound is hit
        if (this.onBoundHit) {
            this.onBoundHit();
        }

        // Visual feedback for bound hit
        this.boundMeshes.forEach((mesh, index) => {
            const originalOpacity = mesh.material.opacity;
            const originalEmissiveIntensity = mesh.material.emissiveIntensity;
            
            mesh.material.opacity = 0.8;
            mesh.material.emissiveIntensity = 2;
            
            setTimeout(() => {
                mesh.material.opacity = originalOpacity;
                mesh.material.emissiveIntensity = originalEmissiveIntensity;
            }, 500);
        });
    }

    update(deltaTime) {
        // Update visual effects for all bounds
        this.boundLights.forEach(({ light, glowMesh }, index) => {
            const pulseFactor = (Math.sin(Date.now() * 0.003 + index) + 1) / 2;
            
            // Update bound transparency
            if (this.boundMeshes[index]) {
                this.boundMeshes[index].material.opacity = 0.2 + 0.2 * pulseFactor;
            }
            
            // Update glow effect
            if (glowMesh) {
                glowMesh.material.opacity = 0.1 + 0.1 * pulseFactor;
            }
            
            // Update light intensity
            light.intensity = 0.8 + 0.4 * pulseFactor;
        });
    }
}