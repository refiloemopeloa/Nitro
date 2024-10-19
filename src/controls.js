import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Controls {
    constructor(world) {
        this.world = world;
        this.controls = ['w', 'a', 's', 'd', 'v'];
        this.pressed = [false, false, false, false, false];
        this.carBody = null;
        this.frontWheelSteerRotation = 0;
        this.maxFrontWheelSteerRotation = Math.PI / 4.5;
        this.frontWheelSteerRotationSpeed = 0.05;
        this.wheelRollRotation = 0;
        this.wheelRollRotationSpeed = 0.05;
        this.maxTurnForce = 1450;
        this.turnForceIncreaseRate = 100;
        this.currentTurnForce = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    handleKeyDown(event) {
        const index = this.controls.indexOf(event.key);
        if (index !== -1) this.pressed[index] = true;
    }

    handleKeyUp(event) {
        const index = this.controls.indexOf(event.key);
        if (index !== -1) this.pressed[index] = false;
    }

    setCarBody(carBody) {
        this.carBody = carBody;
    }

    keyAction() {
        if (!this.carBody) return;

        const force = 2000;
        const turnForce = 1450;

        const velocity = this.carBody.velocity;
        const localVelocity = this.carBody.quaternion.inverse().vmult(velocity);
        const isReversing = localVelocity.x > 0;

        if (this.pressed[this.controls.indexOf('w')]) {
            this.carBody.applyLocalForce(new CANNON.Vec3(-force, 0, 0), new CANNON.Vec3(0, 0, 0));
            this.wheelRollRotation += this.wheelRollRotationSpeed;
        }
        if (this.pressed[this.controls.indexOf('s')]) {
            this.carBody.applyLocalForce(new CANNON.Vec3(force, 0, 0), new CANNON.Vec3(0, 0, 0));
            this.wheelRollRotation -= this.wheelRollRotationSpeed;
        }
        if (this.pressed[this.controls.indexOf('a')]) {
            this.carBody.applyTorque(new CANNON.Vec3(0, isReversing ? -turnForce : turnForce, 0));
            this.frontWheelSteerRotation = Math.min(this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed, this.maxFrontWheelSteerRotation);
        }
        if (this.pressed[this.controls.indexOf('d')]) {
            this.carBody.applyTorque(new CANNON.Vec3(0, isReversing ? turnForce : -turnForce, 0));
            this.frontWheelSteerRotation = Math.max(this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed, -this.maxFrontWheelSteerRotation);
        }

        if (!this.pressed[this.controls.indexOf('a')] && !this.pressed[this.controls.indexOf('d')]) {
            if (this.frontWheelSteerRotation > 0) {
                this.frontWheelSteerRotation = Math.max(this.frontWheelSteerRotation - this.frontWheelSteerRotationSpeed / 2, 0);
            } else if (this.frontWheelSteerRotation < 0) {
                this.frontWheelSteerRotation = Math.min(this.frontWheelSteerRotation + this.frontWheelSteerRotationSpeed / 2, 0);
            }
        }

        this.carBody.applyForce(velocity.scale(-0.1), this.carBody.position);
    }

    applyWheelTransformations(FrontWheel_L, FrontWheel_R, BackWheels) {
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