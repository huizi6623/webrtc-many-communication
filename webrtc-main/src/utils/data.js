import * as THREE from 'three';

const data = [
    {
        name: '头盔',
        targetImgUrl: '../static/img/logo0.png',
        model: {
            name: 'DamagedHelmet',
            url: '../static/model/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
            cameraPos: new THREE.Vector3( 0, 0, 3 ),
            center: new THREE.Vector3( 0, - 0.2, - 0.2 ),
        },
        modelUrl: '../static/model/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
        imageUrl: '../static/img/introduce1.jpg',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=z3018qntrgf'
    },
    {
        name: '播放器',
        targetImgUrl: '../static/img/logo1.png',
        model: {
            name: 'BoomBox',
            url: '../static/model/gltf/BoomBox/glTF/BoomBox.gltf',
            cameraPos: new THREE.Vector3( 0, 0.01, 0.04 ),
            objectRotation: new THREE.Euler( 0, Math.PI, 0 ),
        },
        imageUrl: '../static/img/1.jpg',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=e3019j64f6i'
    },
    {
        name: '机器人',
        targetImgUrl: '../static/img/logo2.png',
        model: {
            name: 'Bot Skinned',
            url: '../static/model/gltf/BotSkinned/glTF-MaterialsUnlit/Bot_Skinned.gltf',
            cameraPos: new THREE.Vector3( 0, 1.5, 2.2 ),
            center: new THREE.Vector3( 0, 1.2, 0 ),
            objectRotation: new THREE.Euler( 0, 0, 0 ),
        },
        imageUrl: '../static/img/2.jpg',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=x3018n6oxp9'
    }
];

export default data;