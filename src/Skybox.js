import * as THREE from 'three';

// Import skybox textures
import mysticFt from './assets/mystic/mystic_ft.jpg';
import mysticBk from './assets/mystic/mystic_bk.jpg';
import mysticUp from './assets/mystic/mystic_up.jpg';
import mysticDn from './assets/mystic/mystic_dn.jpg';
import mysticRt from './assets/mystic/mystic_rt.jpg';
import mysticLf from './assets/mystic/mystic_lf.jpg';

const vertexShader = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fragmentShader = `
uniform samplerCube tCube;
uniform float time;
varying vec3 vWorldPosition;

void main() {
    vec3 direction = normalize(vWorldPosition);
    
    // Apply rotation to create movement illusion
    float theta = time * 0.011;
    mat3 rotation = mat3(
        cos(theta), 0, sin(theta),
        0, 1, 0,
        -sin(theta), 0, cos(theta)
    );
    vec3 rotatedDirection = rotation * direction;
    
    vec4 texColor = textureCube(tCube, rotatedDirection);
    
    gl_FragColor = texColor;
}
`;



export function createDynamicSkybox(scene) {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        mysticFt,
        mysticBk,
        mysticUp,
        mysticDn,
        mysticRt,
        mysticLf
    ]);

    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            tCube: { value: texture },
            time: { value: 0 }
        },
        side: THREE.BackSide
    });

    const skybox = new THREE.Mesh(geometry, material);

    
    skybox.position.y += 480; 
    scene.add(skybox);

    return skybox;
}

export function updateSkybox(skybox, time) {
    if (skybox && skybox.material.uniforms) {
        skybox.material.uniforms.time.value = time;
    }
}
