import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Controls {
    constructor(world) {
        this.world = world;
        this.controls = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'o'];
        this.pressed = this.controls.reduce((acc, key) => ({ ...acc, [key]: false }), {});
        this.vehicle = null;
        this.carParts = null;
        this.carLoader = null; // Add reference to carLoader

        //visual
        this.frontWheelSteerRotation = 0;
        this.maxFrontWheelSteerRotation = Math.PI / 4.5;
        this.frontWheelSteerRotationSpeed = 0.05;
        this.wheelRollRotation = 1;
        this.wheelRollRotationSpeed = 1.55;
        

        // Steering properties
        this.currentSteerValue = 0;
        this.steerSpeed = 0.1;         // Base steering speed
        this.returnSteerSpeed = 0.5;  // Speed for returning to center
        this.maxSteerVal = Math.PI / 6;

        this.maxForce = 20;

        this.boost = false;
        this.boostTimer = null;

        this.setupEventListeners();
    }

    setCarLoader(carLoader) {
        this.carLoader = carLoader;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    handleKeyDown(event) {
        if (this.controls.includes(event.key)) {
            this.pressed[event.key] = true;
        }

        // Handle headlight toggle
        if (event.key === 'o' && this.carLoader) {
            this.carLoader.toggleHeadlights();
        }
    }

    handleKeyUp(event) {
        if (this.controls.includes(event.key)) {
            this.pressed[event.key] = false;
        }
    }

    setVehicle(vehicle) {
        this.vehicle = vehicle;
    }

    setCarParts(carParts) {
        this.carParts = carParts;
    }
    
    activateBoost() {
        this.boost = true;
        clearTimeout(this.boostTimer);
        this.boostTimer = setTimeout(() => {
            this.boost = false;
        }, 1000);
    }

    update() {
        if (!this.vehicle) return;

        const currentMaxForce = this.boost ? 35 : 10;

        if (this.pressed['w'] || this.pressed['ArrowUp']) {
            this.vehicle.setWheelForce(currentMaxForce, 2);
            this.vehicle.setWheelForce(currentMaxForce, 3);
            this.wheelRollRotation -= this.wheelRollRotationSpeed;
        } else if (this.pressed['s'] || this.pressed['ArrowDown']) {
            this.vehicle.setWheelForce(-currentMaxForce / 1, 2);
            this.vehicle.setWheelForce(-currentMaxForce / 1, 3);
            this.wheelRollRotation += this.wheelRollRotationSpeed;
        } else {
            this.vehicle.setWheelForce(0, 2);
            this.vehicle.setWheelForce(0, 3);
        }

        // Calculate vehicle speed for non-linear steering
        const velocity = this.vehicle.chassisBody.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // Adjust steering speed based on velocity (slower turning at higher speeds)
        const speedFactor = Math.max(0.3, 1 - speed / 30);
        const currentSteerSpeed = this.steerSpeed * speedFactor;

        // Determine target steering value
        let targetSteerValue = 0;

        if (this.pressed['a'] || this.pressed['ArrowLeft']) {
            targetSteerValue = this.maxSteerVal;
            this.frontWheelSteerRotation = Math.min(
                this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed,
                this.maxFrontWheelSteerRotation
            );
        } else if (this.pressed['d'] || this.pressed['ArrowRight']) {
            targetSteerValue = -this.maxSteerVal;
            this.frontWheelSteerRotation = Math.max(
                this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed,
                -this.maxFrontWheelSteerRotation
            );
        } else {
            targetSteerValue = 0;
            if (this.frontWheelSteerRotation > 0) {
                this.frontWheelSteerRotation = Math.max(
                    this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed / 2,
                    0
                );
            } else if (this.frontWheelSteerRotation < 0) {
                this.frontWheelSteerRotation = Math.min(
                    this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed / 2,
                    0
                );
            }
        }

        // Apply gradual steering with different speeds for turning and returning to center
        if (targetSteerValue === 0) {
            // Return to center more quickly
            if (this.currentSteerValue < targetSteerValue) {
                this.currentSteerValue = Math.min(
                    this.currentSteerValue + this.returnSteerSpeed,
                    targetSteerValue
                );
            } else if (this.currentSteerValue > targetSteerValue) {
                this.currentSteerValue = Math.max(
                    this.currentSteerValue - this.returnSteerSpeed,
                    targetSteerValue
                );
            }
        } else {
            // Normal turning with speed-based adjustment
            if (this.currentSteerValue < targetSteerValue) {
                this.currentSteerValue = Math.min(
                    this.currentSteerValue + currentSteerSpeed,
                    targetSteerValue
                );
            } else if (this.currentSteerValue > targetSteerValue) {
                this.currentSteerValue = Math.max(
                    this.currentSteerValue - currentSteerSpeed,
                    targetSteerValue
                );
            }
        }

        // Apply the gradual steering value
        this.vehicle.setSteeringValue(this.currentSteerValue, 0);
        this.vehicle.setSteeringValue(this.currentSteerValue, 1);
    }

    applyWheelTransformations() {
        if (!this.carParts) return;

        const { FrontWheel_L, FrontWheel_R, BackWheels } = this.carParts;

        if (FrontWheel_L && FrontWheel_R) {
            const steerMatrix = new THREE.Matrix4().makeRotationZ(this.frontWheelSteerRotation);
            const rollMatrix = new THREE.Matrix4().makeRotationX(this.wheelRollRotation);
            const combinedMatrix = new THREE.Matrix4().multiplyMatrices(steerMatrix, rollMatrix);

            FrontWheel_L.matrix.copy(FrontWheel_L.userData.originalMatrix).multiply(combinedMatrix);
            FrontWheel_R.matrix.copy(FrontWheel_R.userData.originalMatrix).multiply(combinedMatrix);

            FrontWheel_L.matrixAutoUpdate = false;
            FrontWheel_R.matrixAutoUpdate = false;
            FrontWheel_L.updateMatrixWorld(true);
            FrontWheel_R.updateMatrixWorld(true);
        }

        if (BackWheels) {
            BackWheels.rotation.x = this.wheelRollRotation;
        }
    }

    updateDebugInfo(speed) {
        const debugSteerValue = document.getElementById('debug-steer-value');
        const debugSteerSpeed = document.getElementById('debug-steer-speed');
        const debugVehicleSpeed = document.getElementById('debug-vehicle-speed');
    
        if (debugSteerValue) {
            debugSteerValue.textContent = this.currentSteerValue.toFixed(3);
        }
        if (debugSteerSpeed) {
            const velocity = this.vehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            const speedFactor = Math.max(0.5, 1 - speed / 50);
            const currentSteerSpeed = this.steerSpeed * speedFactor;
            debugSteerSpeed.textContent = currentSteerSpeed.toFixed(3);
        }
        if (debugVehicleSpeed) {
            debugVehicleSpeed.textContent = speed.toFixed(2);
        }
    }
}