import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class CheckpointLoader {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.checkpoints = [];
        this.currentCheckpoint = new THREE.Vector3(0, 2, -10); // Initial spawn point
        this.checkpointMeshes = [];
        this.checkpointLights = [];
    }

    createCheckpoint(position, size) {
        // Create physics body for the checkpoint using a properly oriented box
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
            [3, 2, 6, 7],    // Top face (y+) - Changed order to maintain CCW from above
            [4, 0, 3, 7],    // Left face (x-)
            [1, 5, 6, 2]     // Right face (x+)
        ];

        const checkpointShape = new CANNON.ConvexPolyhedron({
            vertices: vertices,
            faces: faces
        });

        const checkpointBody = new CANNON.Body({
            mass: 0,
            shape: checkpointShape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            isTrigger: true,
            collisionResponse: false
        });

        // Create visual representation
        const checkpointGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const checkpointMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            emissive: 0x00aa44,
            shininess: 100
        });
        
        const checkpointMesh = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
        checkpointMesh.position.copy(position);
        this.scene.add(checkpointMesh);
        this.checkpointMeshes.push(checkpointMesh);

        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(
            size.x + 0.4,
            size.y + 0.4,
            size.z + 0.4
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(position);
        this.scene.add(glowMesh);

        // Add point light
        const checkpointLight = new THREE.PointLight(0x00ff00, 1, 20);
        checkpointLight.position.copy(position);
        this.scene.add(checkpointLight);
        this.checkpointLights.push({ light: checkpointLight, glowMesh });

        // Add collision event listener
        checkpointBody.addEventListener('collide', (event) => {
            this.handleCheckpointCollision(position);
        });

        this.world.addBody(checkpointBody);
        this.checkpoints.push(checkpointBody);
    }

    // Rest of the class implementation remains the same...
    handleCheckpointCollision(position) {
        this.currentCheckpoint.set(position.x, position.y, position.z);
        
        const checkpointIndex = this.checkpoints.findIndex(cp => 
            cp.position.x === position.x && 
            cp.position.y === position.y && 
            cp.position.z === position.z
        );
        
        if (checkpointIndex !== -1) {
            const mesh = this.checkpointMeshes[checkpointIndex];
            const originalOpacity = mesh.material.opacity;
            const originalEmissiveIntensity = mesh.material.emissiveIntensity;
            
            mesh.material.opacity = 0.8;
            mesh.material.emissiveIntensity = 2;
            
            setTimeout(() => {
                mesh.material.opacity = originalOpacity;
                mesh.material.emissiveIntensity = originalEmissiveIntensity;
            }, 500);
        }

        console.log('Checkpoint reached:', this.currentCheckpoint);
    }

    update(deltaTime) {
        this.checkpointLights.forEach(({ light, glowMesh }, index) => {
            const pulseFactor = (Math.sin(Date.now() * 0.003 + index) + 1) / 2;
            
            if (this.checkpointMeshes[index]) {
                this.checkpointMeshes[index].material.opacity = 0.2 + 0.2 * pulseFactor;
            }
            
            if (glowMesh) {
                glowMesh.material.opacity = 0.1 + 0.1 * pulseFactor;
            }
            
            light.intensity = 0.8 + 0.4 * pulseFactor;
        });
    }

    getCurrentCheckpoint() {
        return this.currentCheckpoint;
    }
}