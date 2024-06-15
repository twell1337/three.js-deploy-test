// Расстановка света: directional, point. с помощью g,r,лкм,drag_mousу
// Влияние света на шейдер
// Bones Animations
// ShapeKeys Animations
//
// UI Загрузка glTF с сайта в базу данных
// UI переключение и добавление шейдеров
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.01, 1000 );
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const sceneBox = document.getElementById('scene-box');
sceneBox.appendChild(renderer.domElement);


// Ваш GLSL-код для вершинного шейдера
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightDir;
    varying vec3 vViewDir;
    varying vec3 vertex_color;

    varying vec2 vUv;

    void main() {
        vUv = uv;

        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vec3 lightPosition = vec3(100.0, 100.0, 100.0); // Положение источника света
        vLightDir = normalize(lightPosition - vPosition);
        vViewDir = normalize(-vPosition);

        // Вычисление освещения
        vec3 ambientColor = vec3(0.2, 0.2, 0.2); // Фоновая составляющая освещения
        vec3 diffuseColor = vec3(0.8, 0.8, 0.8); // Диффузная составляющая освещения
        vec3 specularColor = vec3(1.0, 1.0, 1.0); // Зеркальная составляющая освещения
        float shininess = 45.0; // Степень блеска материала

        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(vLightDir);
        vec3 viewDir = normalize(vViewDir);

        float lambertian = max(dot(normal, lightDir), 0.0);
        float specular = 0.0;

        if (lambertian > 0.0) {
            vec3 reflectDir = reflect(-lightDir, normal);
            float specAngle = max(dot(reflectDir, viewDir), 0.0);
            specular = pow(specAngle, shininess);
        }

        vertex_color = ambientColor + lambertian * diffuseColor + specular * specularColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Фрагментный шейдер с текстурой
const fragmentShader_tex = `
    uniform sampler2D uTexture;

    varying vec3 vertex_color;
    varying vec2 vUv;

    void main() {
        vec2 invertedUv = vec2(vUv.x, 1.0 - vUv.y); // Инвертируем UV-координаты по вертикали
        vec4 texColor = texture2D(uTexture, invertedUv);
        gl_FragColor = vec4(vertex_color, 1.0) * texColor;
    }
`;
// Фрагментный шейдер с цветом
const fragmentShader_color = `
    uniform vec3 uColor;

    varying vec3 vertex_color;
    varying vec2 vUv;

    void main() {
        gl_FragColor = vec4(vertex_color, 1.0) * vec4(uColor, 1.0);
    }
`;

const texture = new THREE.TextureLoader().load('static/shapes/textures/default.png');
/*nearest interpolation
texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
*/

const GouraudMaterial_1 = new THREE.ShaderMaterial({
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader_tex,
                    uniforms: {
                        uTexture: { value: texture },
                    }
                });
const GouraudMaterial_2 = new THREE.ShaderMaterial({
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader_color,
                    uniforms: {
                        uColor : { value: new THREE.Color(0xfff000) },
                    }
                });

const WireMat = new THREE.MeshBasicMaterial( {color: 0x000000, wireframe: true} );

const Geometry = new THREE.SphereGeometry(0.2,12,8);
const obj = new THREE.Mesh( Geometry, GouraudMaterial_2);
const obj1 = new THREE.Mesh( Geometry, WireMat);
obj.position.set(0.4,0,0.45);

obj1.position.copy(obj.position);
obj1.scale.set(1.01,1.01,1.01);

let objs = [obj, obj1];
const loader = new GLTFLoader();
let dog;

// load a resource
loader.load(
    // resource URL
    "static/shapes/models/dog.gltf",
    // called when resource is loaded
    function ( gltf ) {
        // Получаем сцену из загруженного объекта
        dog = gltf.scene;
        const worldPosition = new THREE.Vector3();
        dog.getWorldPosition(worldPosition);
        console.log(worldPosition);


        dog.scale.set(0.3, 0.3, 0.3);
        dog.rotation.y = Math.PI;

        // Проходимся по всем объектам в сцене и добавляем к ним материал
        dog.traverse( function ( child ) {
            // Проверяем, является ли текущий объект Mesh
            if ( child.isMesh ) {
                // Применяем новый материал к текущему объекту
                child.material = GouraudMaterial_1;
            }
        });
        // Добавляем сцену в сцену вашего three.js проекта
        obj.add(dog);
        
        // Преобразуем мировую позицию в локальную позицию относительно родителя
        obj.worldToLocal(worldPosition);
        dog.position.copy(worldPosition);
    },
    // called while loading is progressing
    function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
    // called when loading has errors
    function ( error ) {
        console.log( 'An error happened' );
    }
);
for (const i of objs) {
    scene.add(i);
}
//three.js lightning

const directionalLight = new THREE.DirectionalLight( "#ffffff", 1 );
directionalLight.position.set(-0.3, -0.1, 1); // x,z,y, но в действительности названы x,y,z
scene.add(directionalLight);

const helper = new THREE.DirectionalLightHelper( directionalLight, 0.1 );
scene.add( helper );

/*
const ambientLight = new THREE.AmbientLight( "#ffffff", 0.1 );
scene.add(ambientLight);

const pointLight = new THREE.PointLight('#ffffff', 3, 50); // Второй параметр - интенсивность света
pointLight.position.set(1, 1.5, 1);
scene.add(pointLight);
*/

const controls = new OrbitControls(camera, renderer.domElement);

const animate = () => {
	requestAnimationFrame(animate);
    /*
    if (dog) {
        dog.rotation.y += 0.05;
    }
    */
    for (const i of objs) {
        i.rotation.y += 0.01;
    }
	renderer.render(scene, camera);
}

animate()