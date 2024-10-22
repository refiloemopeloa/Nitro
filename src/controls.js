import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Controls {
    constructor(world) {
        this.world = world;
        this.controls = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        this.pressed = this.controls.reduce((acc, key) => ({ ...acc, [key]: false }), {});
        this.vehicle = null;
        this.carParts = null;
        this.frontWheelSteerRotation = 0;
        this.maxFrontWheelSteerRotation = Math.PI / 4.5;
        this.frontWheelSteerRotationSpeed = 0.05;
        this.wheelRollRotation = 1;
        this.wheelRollRotationSpeed = 1.55;
        this.maxSteerVal = Math.PI / 3;
        this.maxForce = 10;
        this.boost = false;
        this.boostTimer = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    handleKeyDown(event) {
        if (this.controls.includes(event.key)) {
            this.pressed[event.key] = true;
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

        if (this.pressed['a'] || this.pressed['ArrowLeft']) {
            this.vehicle.setSteeringValue(this.maxSteerVal, 0);
            this.vehicle.setSteeringValue(this.maxSteerVal, 1);
            this.frontWheelSteerRotation = Math.min(this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed, this.maxFrontWheelSteerRotation);
        } else if (this.pressed['d'] || this.pressed['ArrowRight']) {
            this.vehicle.setSteeringValue(-this.maxSteerVal, 0);
            this.vehicle.setSteeringValue(-this.maxSteerVal, 1);
            this.frontWheelSteerRotation = Math.max(this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed, -this.maxFrontWheelSteerRotation);
        } else {
            this.vehicle.setSteeringValue(0, 0);
            this.vehicle.setSteeringValue(0, 1);
            if (this.frontWheelSteerRotation > 0) {
                this.frontWheelSteerRotation = Math.max(this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed / 2, 0);
            } else if (this.frontWheelSteerRotation < 0) {
                this.frontWheelSteerRotation = Math.min(this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed / 2, 0);
            }
        }
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
}