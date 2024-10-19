import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class CameraManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.cameraMode = 0; // 0: Third-person, 1: First-person, 2: Free Camera
        this.cameraOffset = new THREE.Vector3(3.7, 2, 0);
        this.cameraLookAhead = new THREE.Vector3(0, 2, 0);
        this.zoom = 3;
        this.camHeight = 3;
        this.maxCameraLateralOffset = 0.7;
        this.cameraLateralSpeed = 0.05;
        this.cameraCenteringSpeed = 0.05;
        this.currentCameraLateralOffset = 0;
    }

    updateCamera(carBody, carObject) {
        if (!carBody || !carObject) return;

        switch (this.cameraMode) {
            case 0:
                this.updateThirdPersonCamera(carBody);
                break;
            case 1:
                this.updateFirstPersonCamera(carBody);
                break;
            case 2:
                this.updateFreeCameraMode(carBody, carObject);
                break;
        }
    }

    updateThirdPersonCamera(carBody) {
        const carPosition = carBody.position;
        const carQuaternion = carBody.quaternion;
        const velocity = carBody.velocity;
        const localVelocity = carBody.quaternion.inverse().vmult(velocity);

        const desiredLateralOffset = Math.sign(localVelocity.z) * Math.min(Math.abs(localVelocity.z) * 0.5, this.maxCameraLateralOffset);
        const isMovingLaterally = Math.abs(localVelocity.z) > 0.1;

        if (isMovingLaterally) {
            this.currentCameraLateralOffset += (desiredLateralOffset - this.currentCameraLateralOffset) * this.cameraLateralSpeed;
        } else {
            this.currentCameraLateralOffset *= (1 - this.cameraCenteringSpeed);
        }

        const lateralOffsetVector = new THREE.Vector3(0, 0, this.currentCameraLateralOffset);
        const rotatedOffset = this.cameraOffset.clone().add(lateralOffsetVector).applyQuaternion(carQuaternion);
        this.camera.position.copy(carPosition).add(rotatedOffset);

        const rotatedLookAhead = this.cameraLookAhead.clone().applyQuaternion(carQuaternion);
        const lookAtPoint = new THREE.Vector3().copy(carPosition).add(rotatedLookAhead);
        this.camera.lookAt(lookAtPoint);
    }

    updateFirstPersonCamera(carBody) {
        const offset = new CANNON.Vec3(0, 1.1, 0);
        const worldPosition = new CANNON.Vec3();
        carBody.pointToWorldFrame(offset, worldPosition);

        this.camera.position.copy(worldPosition);

        const direction = new CANNON.Vec3(-1, 0, 0);
        const worldDirection = new CANNON.Vec3();
        carBody.vectorToWorldFrame(direction, worldDirection);

        const fpLookAtPoint = new THREE.Vector3(
            this.camera.position.x + worldDirection.x,
            this.camera.position.y + worldDirection.y,
            this.camera.position.z + worldDirection.z
        );
        this.camera.lookAt(fpLookAtPoint);
    }

    updateFreeCameraMode(carBody, carObject) {
        this.camera.position.y = carBody.position.y + this.camHeight;
        this.camera.position.x = carBody.position.x + (this.zoom * Math.cos(carBody.quaternion.y));
        this.camera.position.z = carBody.position.z - (this.zoom * Math.sin(carBody.quaternion.y));
        this.camera.lookAt(new THREE.Vector3(carObject.position.x, carObject.position.y, carObject.position.z));
    }

    switchCameraMode() {
        this.cameraMode = (this.cameraMode + 1) % 3;
    }
}