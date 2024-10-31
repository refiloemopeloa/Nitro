import * as THREE from 'three';

class TriggerSystem {
    constructor(scene, blockLoader) {
        this.triggers = [];
        this.blockLoader = blockLoader;
        this.scene = scene;
        this.triggeredZones = new Set();
    }

    addTrigger(position, radius, blockConfig, dropPositions) {
        const trigger = {
            position: position,
            radius: radius,
            activated: false,
            blockConfig: blockConfig,
            dropPositions: dropPositions || [{ x: position.x, z: position.z }] // Default to trigger position if no drops specified
        };

        // Visualize the trigger zone
        if (this.scene) {
            // Create trigger visualization
            const geometry = new THREE.RingGeometry(radius - 0.2, radius, 32);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(position.x, 0.1, position.z);
            this.scene.add(mesh);
            trigger.visualMesh = mesh;

            // Visualize drop positions (optional)
            trigger.dropMarkers = [];
            dropPositions.forEach(pos => {
                const markerGeometry = new THREE.CircleGeometry(0.5, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.3
                });
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.rotation.x = -Math.PI / 2;
                marker.position.set(pos.x, 0.15, pos.z);
                this.scene.add(marker);
                trigger.dropMarkers.push(marker);
            });
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

                    // Drop blocks at all specified positions
                    trigger.dropPositions.forEach(pos => {
                        this.blockLoader.loadBlock(
                            trigger.blockConfig.model,
                            pos,
                            trigger.blockConfig.size || { x: 1, y: 1, z: 1 },
                            trigger.blockConfig.scale || 1
                        );
                    });
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
            if (trigger.dropMarkers) {
                trigger.dropMarkers.forEach(marker => {
                    this.scene.remove(marker);
                });
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