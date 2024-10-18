import * as THREE from 'three';

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
    float theta = time * 0.02;
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
        './resources/mystic/mystic_ft.jpg',
        './resources/mystic/mystic_bk.jpg',
        './resources/mystic/mystic_up.jpg',
        './resources/mystic/mystic_dn.jpg',
        './resources/mystic/mystic_rt.jpg',
        './resources/mystic/mystic_lf.jpg',
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
    scene.add(skybox);

    return skybox;
}

export function updateSkybox(skybox, time) {
    if (skybox && skybox.material.uniforms) {
        skybox.material.uniforms.time.value = time;
    }
}