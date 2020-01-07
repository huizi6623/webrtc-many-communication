import * as THREE from 'three';

const data = [
    {
        name: '头盔',
        targetImgUrl: '../assets/img/helmet.png',
        model: {
            name: 'DamagedHelmet',
            url: '../assets/model/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
            cameraPos: new THREE.Vector3( 0, 0, 3 ),
            center: new THREE.Vector3( 0, - 0.2, - 0.2 ),
        },
        imageUrl: '../assets/img/helmetIntroduction.png',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=j0888jfoc1w'
    },
    {
        name: '播放器',
        targetImgUrl: '../assets/img/boombox.png',
        model: {
            name: 'BoomBox',
            url: '../assets/model/gltf/BoomBox/glTF/BoomBox.gltf',
            cameraPos: new THREE.Vector3( 0, 0.01, 0.04 ),
            objectRotation: new THREE.Euler( 0, Math.PI, 0 ),
        },
        imageUrl: '../assets/img/boomboxIntroduction.png',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=x0819icerfk'
    },
    {
        name: '机器人',
        targetImgUrl: '../assets/img/robot.png',
        model: {
            name: 'Bot Skinned',
            url: '../assets/model/gltf/BotSkinned/glTF-MaterialsUnlit/Bot_Skinned.gltf',
            cameraPos: new THREE.Vector3( 0, 1.5, 2.2 ),
            center: new THREE.Vector3( 0, 1.2, 0 ),
            objectRotation: new THREE.Euler( 0, 0, 0 ),
        },
        imageUrl: '../assets/img/robotIntroduction.png',
        videoUrl: 'https://v.qq.com/txp/iframe/player.html?vid=m0555n8nir0'
    }
];

export default data;