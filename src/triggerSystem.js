import * as THREE from 'three';

class TriggerSystem {
    constructor(scene, blockLoader) {
        this.triggers = [];
        this.blockLoader = blockLoader;
        this.scene = scene;
        this.triggeredZones = new Set(); // Keep track of activated triggers
    }

    addTrigger(position, radius, blockConfig) {
        const trigger = {
            position: position,
            radius: radius,
            activated: false,
            blockConfig: blockConfig
        };

        // Optionally visualize the trigger zone
        if (this.scene) {
            const geometry = new THREE.RingGeometry(radius - 0.2, radius, 32);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Lay flat on the ground
            mesh.position.set(position.x, 0.1, position.z); // Slightly above ground
            this.scene.add(mesh);
            trigger.visualMesh = mesh;
        }

        this.triggers.push(trigger);
        return trigger;
    }

    checkTriggers(carPosition) {
        this.triggers.forEach(trigger => {
            if (!trigger.activated) {
                const distance = Math.sqrt(
                    Math.pow(carPosition.x - trigger.position.x, 2) +
                    Math.pow(carPosition.z - trigger.position.z, 2)
                );

                if (distance < trigger.radius && !this.triggeredZones.has(trigger)) {
                    this.triggeredZones.add(trigger);
                    trigger.activated = true;
                    
                    // Update visual feedback
                    if (trigger.visualMesh) {
                        trigger.visualMesh.material.color.setHex(0x00ff00);
                    }

                    // Drop the block with configured parameters
                    const dropPosition = {
                        x: trigger.position.x - 30, // Add small random offset
                        z: trigger.position.z 
                    };

                    this.blockLoader.loadBlock(
                        trigger.blockConfig.model,
                        dropPosition,
                        trigger.blockConfig.size || { x: 2, y: 2, z: 2 },
                        trigger.blockConfig.scale || 1
                    );
                }
            }
        });
    }

    reset() {
        this.triggeredZones.clear();
        this.triggers.forEach(trigger => {
            trigger.activated = false;
            if (trigger.visualMesh) {
                trigger.visualMesh.material.color.setHex(0xff0000);
            }
        });
    }

    removeTrigger(trigger) {
        const index = this.triggers.indexOf(trigger);
        if (index > -1) {
            if (trigger.visualMesh) {
                this.scene.remove(trigger.visualMesh);
            }
            this.triggers.splice(index, 1);
        }
    }

    removeAllTriggers() {
        while (this.triggers.length > 0) {
            this.removeTrigger(this.triggers[0]);
        }
    }
}

export default TriggerSystem;