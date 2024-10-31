// waterPuddles.js
import * as THREE from 'three';

export class WaterPuddles {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.puddles = new Map(); // Store puddles and their properties
        this.clock = new THREE.Clock();
    }

    createPuddle(position, radius = 5) {
        // Create geometry with more segments for better ripple effect
        const geometry = new THREE.CircleGeometry(radius, 64);
        
        // Create custom shader material for ripple effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x111111) },
                envMap: { value: null },
                metalness: { value: 0.9 },
                roughness: { value: 0.1 },
                rippleSpeed: { value: 1.0 },
                rippleIntensity: { value: 0.3 },
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform samplerCube envMap;
                uniform float metalness;
                uniform float roughness;
                uniform float rippleSpeed;
                uniform float rippleIntensity;
                
                varying vec2 vUv;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    // Calculate distance from center for ripple
                    float dist = length(vUv - vec2(0.5));
                    
                    // Create multiple ripples
                    float ripple1 = sin(dist * 10.0 - time * rippleSpeed) * rippleIntensity;
                    float ripple2 = sin(dist * 15.0 - time * rippleSpeed * 1.3) * rippleIntensity * 0.7;
                    float ripple3 = sin(dist * 20.0 - time * rippleSpeed * 0.8) * rippleIntensity * 0.5;
                    
                    // Combine ripples
                    float ripple = ripple1 + ripple2 + ripple3;
                    
                    // Base color with ripple effect
                    vec3 baseColor = color + vec3(ripple);
                    
                    // Simple environment reflection
                    vec3 viewDir = normalize(cameraPosition - vPosition);
                    vec3 normal = normalize(vNormal);
                    vec3 reflectDir = reflect(-viewDir, normal);
                    
                    // Mix between base color and reflection based on metalness
                    gl_FragColor = vec4(baseColor, 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const puddle = new THREE.Mesh(geometry, material);
        puddle.rotation.x = -Math.PI / 2;
        puddle.position.copy(position);
        puddle.position.y += 0.02; // Slightly above ground to prevent z-fighting

        // Store puddle with its properties
        this.puddles.set(puddle, {
            rippleSpeed: Math.random() * 0.5 + 0.5,
            rippleIntensity: Math.random() * 0.2 + 0.2
        });

        this.scene.add(puddle);
        return puddle;
    }

    createRandomPuddles(count = 5, areaSize = 50) {
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * areaSize,
                0,
                (Math.random() - 0.5) * areaSize
            );
            const radius = Math.random() * 3 + 2; // Random radius between 2 and 5
            this.createPuddle(position, radius);
        }
    }

    update() {
        const time = this.clock.getElapsedTime();
        
        // Update environment map and ripple effect for each puddle
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromScene(this.scene).texture;
        
        this.puddles.forEach((properties, puddle) => {
            puddle.material.uniforms.time.value = time;
            puddle.material.uniforms.envMap.value = envMap;
            puddle.material.uniforms.rippleSpeed.value = properties.rippleSpeed;
            puddle.material.uniforms.rippleIntensity.value = properties.rippleIntensity;
        });
        
        pmremGenerator.dispose();
    }

    // Add ripple at specific point (e.g., when car drives through)
    addRipple(position, intensity = 1.0) {
        this.puddles.forEach((properties, puddle) => {
            const distance = position.distanceTo(puddle.position);
            if (distance < puddle.geometry.parameters.radius) {
                properties.rippleIntensity = Math.min(properties.rippleIntensity + intensity, 1.0);
            }
        });
    }

    // Remove all puddles
    clear() {
        this.puddles.forEach((_, puddle) => {
            this.scene.remove(puddle);
            puddle.geometry.dispose();
            puddle.material.dispose();
        });
        this.puddles.clear();
    }
}