import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Vertex Shader
const buildingVertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
        // Transform the normal into world space for accurate lighting
        vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
        
        // Calculate world position for point light calculations
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment Shader
const buildingFragmentShader = `
    uniform sampler2D map;
    uniform vec3 lightDirection;
    uniform vec3 lightColor;
    uniform vec3 pointLightPositions[2];
    uniform vec3 pointLightColors[2];
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
        vec4 texColor = texture2D(map, vUv);
        vec3 normal = normalize(vNormal);
        
        // Directional light calculation
        float directionalIntensity = max(dot(normal, normalize(lightDirection)), 0.6);
        vec3 directionalLight = lightColor * directionalIntensity * 0.7; // Increased intensity
        
        // Point lights (headlights) calculation
        vec3 pointLighting = vec3(0.0);
        for(int i = 0; i < 2; i++) {
            vec3 lightDir = normalize(pointLightPositions[i] - vWorldPosition);
            float distance = length(pointLightPositions[i] - vWorldPosition);
            
            // Improved attenuation formula for more realistic falloff
            float attenuation = 1.0 / (1.0 + 0.045 * distance + 0.0075 * distance * distance);
            
            float pointDiffuse = max(dot(normal, lightDir), 0.0);
            pointLighting += pointLightColors[i] * pointDiffuse * attenuation * 2.0; // Increased intensity
        }
        
        // Ambient light
        vec3 ambient = texColor.rgb * 0.2;
        
        // Combine all lighting
        vec3 finalColor = texColor.rgb * (ambient + directionalLight + pointLighting);
        
        gl_FragColor = vec4(finalColor, texColor.a);
    }
`;

export class BuildingLoader {
    constructor(scene, world, groundMaterial) {
        this.scene = scene;
        this.world = world;
        this.groundMaterial = groundMaterial;
        this.loader = new GLTFLoader();
    }

    loadBuilding(buildingModel, x, y, z, angleY, size, buildingScale) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                buildingModel,
                (gltf) => {
                    console.log('Building model loaded successfully');
                    const buildingObject = gltf.scene;
                    buildingObject.scale.set(buildingScale.x, buildingScale.y, buildingScale.z); // Adjust scale if needed
                    buildingObject.position.set(x, y, z-6);
                    buildingObject.rotation.y = angleY;

                    // Create shader material
                    buildingObject.traverse((child) => {
                        if (child.isMesh) {
                            // Use the original material as a base
                            const originalMaterial = child.material;
                            // In BuildingLoader class, modify the shader material creation:
                            child.material = new THREE.ShaderMaterial({
                                vertexShader: buildingVertexShader,
                                fragmentShader: buildingFragmentShader,
                                uniforms: {
                                    lightDirection: { value: new THREE.Vector3(0, 1, 0) },
                                    lightColor: { value: new THREE.Color(0xffffff) },
                                    map: { value: originalMaterial.map },
                                    diffuseColor: { value: originalMaterial.color },
                                    pointLightPositions: { value: [new THREE.Vector3(), new THREE.Vector3()] },
                                    pointLightColors: { value: [
                                            new THREE.Color(0xffff00),
                                            new THREE.Color(0xffff00)
                                        ] }
                                }
                            });
                        }
                    });

                    this.scene.add(buildingObject);

                    // Create the building body
                    const buildingBody = new CANNON.Body({
                        mass: 0, // Static body
                        position: new CANNON.Vec3(x, y + size.y, z),
                        shape: new CANNON.Box(size),
                        material: this.groundMaterial
                    });

                    buildingBody.quaternion.setFromEuler(0, angleY, 0);
                    this.world.addBody(buildingBody);

                    resolve(buildingObject);
                },
                undefined,
                (error) => {
                    console.error('An error happened while loading the building model', error);
                    reject(error);
                }
            );
        });
    }
}