// reflectiveMirrors.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ReflectiveMirrors {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.mirrors = [];
        this.loader = new GLTFLoader();
        this.reflectionCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.reflectionTarget = new THREE.Vector3();
        
        // Create render target for reflections
        this.renderTarget = new THREE.WebGLCubeRenderTarget(256, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        });
    }

    async loadMirrors(mirrorModelPath, positions) {
        try {
            const gltf = await this.loader.loadAsync(mirrorModelPath);
            
            positions.forEach(pos => {
                // Clone the mirror model
                const mirrorModel = gltf.scene.clone();
                
                // Find the mirror surface in the model
                const mirrorSurface = this.findMirrorSurface(mirrorModel);
                
                if (mirrorSurface) {
                    // Create reflective material
                    const reflectiveMaterial = new THREE.MeshPhysicalMaterial({
                        metalness: 1.0,
                        roughness: 0.0,
                        envMapIntensity: 1.0,
                        side: THREE.DoubleSide,
                        color: 0xffffff
                    });

                    // Apply material to mirror surface
                    mirrorSurface.material = reflectiveMaterial;
                    
                    // Position the mirror
                    mirrorModel.position.copy(pos.position);
                    mirrorModel.rotation.copy(pos.rotation);
                    mirrorModel.scale.set(pos.scale, pos.scale, pos.scale);

                    // Store mirror data
                    this.mirrors.push({
                        model: mirrorModel,
                        surface: mirrorSurface,
                        reflectionMatrix: new THREE.Matrix4()
                    });

                    this.scene.add(mirrorModel);
                }
            });
        } catch (error) {
            console.error('Error loading mirror model:', error);
        }
    }

    findMirrorSurface(model) {
        let mirrorSurface = null;
        model.traverse((child) => {
            // Look for mesh with 'mirror' or 'glass' in the name
            if (child.isMesh && 
                (child.name.toLowerCase().includes('mirror') || 
                 child.name.toLowerCase().includes('glass'))) {
                mirrorSurface = child;
            }
        });
        return mirrorSurface;
    }

    update(carObject) {
        if (!carObject || this.mirrors.length === 0) return;

        const carPosition = new THREE.Vector3();
        carObject.getWorldPosition(carPosition);

        this.mirrors.forEach(mirror => {
            // Update reflection camera position relative to mirror
            const mirrorPosition = new THREE.Vector3();
            mirror.surface.getWorldPosition(mirrorPosition);
            
            // Get mirror normal direction
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(mirror.surface.matrixWorld);
            const normal = new THREE.Vector3(0, 0, 1).applyMatrix3(normalMatrix).normalize();
            
            // Calculate reflection
            const view = new THREE.Vector3().subVectors(carPosition, mirrorPosition).normalize();
            const reflection = new THREE.Vector3().copy(view).reflect(normal);
            
            // Position camera for reflection
            const camPos = new THREE.Vector3().copy(mirrorPosition).add(normal.multiplyScalar(0.1));
            this.reflectionCamera.position.copy(camPos);
            this.reflectionTarget.copy(mirrorPosition).add(reflection);
            this.reflectionCamera.lookAt(this.reflectionTarget);
            
            // Update reflection matrix
            mirror.reflectionMatrix.makeRotationFromQuaternion(this.reflectionCamera.quaternion);
            
            // Render reflection
            const currentRenderTarget = this.renderer.getRenderTarget();
            
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.reflectionCamera);
            
            mirror.surface.material.envMap = this.renderTarget.texture;
            
            this.renderer.setRenderTarget(currentRenderTarget);
        });
    }

    addMirror(position, rotation, scale = 1) {
        if (this.mirrors.length > 0) {
            const sourceMirror = this.mirrors[0];
            const newMirror = sourceMirror.model.clone();
            
            newMirror.position.copy(position);
            newMirror.rotation.copy(rotation);
            newMirror.scale.set(scale, scale, scale);

            const newSurface = this.findMirrorSurface(newMirror);
            if (newSurface) {
                this.mirrors.push({
                    model: newMirror,
                    surface: newSurface,
                    reflectionMatrix: new THREE.Matrix4()
                });
                this.scene.add(newMirror);
            }
        }
    }

    removeMirror(index) {
        if (index >= 0 && index < this.mirrors.length) {
            const mirror = this.mirrors[index];
            this.scene.remove(mirror.model);
            this.mirrors.splice(index, 1);
        }
    }

    clear() {
        this.mirrors.forEach(mirror => {
            this.scene.remove(mirror.model);
        });
        this.mirrors = [];
    }
}

export default ReflectiveMirrors;