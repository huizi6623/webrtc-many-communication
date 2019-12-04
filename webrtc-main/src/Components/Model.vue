<template>
    <div class="model-box" ref="modelBox"></div>
</template>

<script>
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import productData from '../utils/data';

    export default {
        name: "Model",
        props: {
            productId: {
                required: true,
                type: Number
            },
            cameraStatus: {}
        },
        data() {
            return {
                camera: null,  //相机 定义了我们观察场景的位置
                scene: null,  // 场景
                renderer: null,  // 渲染器
                mesh: null,  //网格
                controls: null,
                model: productData[this.productId].model
            }
        },
        watch: {
            productId: {
                handler(value){
                    this.init();
                    this.animate();
                }
            },
            cameraStatus: {
                handler(value){
                    let data = JSON.parse(value);
                    this.camera.position.copy(data.position);
                    this.camera.rotation.copy(data.rotation);
                    this.camera.quaternion.copy(data.quaternion);
                }
            }
            // position: camera.position,
            // rotation: camera.rotation,
            // quaternion: camera.quaternion
            // "camera.rotation": {
            //     handler(value, oldValue){
            //         console.log(value, oldValue);
            //     },
            //     deep: true
            // }
        },
        methods: {
            init() {
                let container = this.$refs['modelBox'];
                // antialias，用于告知THREE.js开启基于硬件的多重采样抗锯齿，使物体边缘平滑
                // this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
                this.renderer = new THREE.WebGLRenderer({alpha: true});
                this.renderer.setPixelRatio( window.devicePixelRatio );
                this.renderer.setSize(container.clientWidth, container.clientHeight);
                this.renderer.gammaOutput = true;
                this.renderer.gammaFactor = 2.2;
                this.renderer.physicallyCorrectLights = true;
                container.appendChild(this.renderer.domElement);

                this.scene = new THREE.Scene();

                // PerspectiveCamera参数：45度视野角、宽高比、最近平面和最远平面的坐标位置
                this.camera = new THREE.PerspectiveCamera(70, container.clientWidth/container.clientHeight, 0.001, 1000);
                this.scene.add(this.camera);

                this.addLight();

                this.controls = new OrbitControls(this.camera, this.renderer.domElement);

                let loadStartTime = performance.now();
                let GltfLoader = new GLTFLoader();
                this.scene.add(new THREE.AxesHelper(5000));
                GltfLoader.load(this.model.url, gltf => {
                    let object = gltf.scene;
                    console.info( 'Load time: ' + ( performance.now() - loadStartTime ).toFixed( 2 ) + ' ms.' );
                    if ( this.model.cameraPos ) {
                        this.camera.position.copy( this.model.cameraPos );
                    }
                    if ( this.model.center ) {
                        this.controls.target.copy( this.model.center );
                    }
                    if ( this.model.objectRotation ) {
                        object.rotation.copy( this.model.objectRotation );
                    }
                    this.scene.add(object);
                }, undefined, error=> {
                    console.log(error);
                });
            },
            addLight() {
                let ambient = new THREE.AmbientLight( 0xffffff );
                this.scene.add( ambient );

                let directionalLight = new THREE.DirectionalLight( 0xffffff, 4 );
                directionalLight.position.set( 0, 0, 1 ).normalize();
                this.scene.add( directionalLight );

                let spot1 = new THREE.SpotLight( 0xffffff, 1 );
                spot1.position.set( 5, 10, 5 );
                spot1.angle = 0.50;
                spot1.penumbra = 0.75;
                spot1.intensity = 100;
                spot1.decay = 2;

                spot1.castShadow = true;
                spot1.shadow.bias = 0.0001;
                spot1.shadow.mapSize.width = 2048;
                spot1.shadow.mapSize.height = 2048;

                this.scene.add( spot1 );
            },
            animate() {
                requestAnimationFrame(this.animate);
                this.controls.update();
                this.renderer.render(this.scene, this.camera);
            },
            sendControlMessage() {
                let data = {
                    type: 'controlMessage',
                    startTime: new Date().getTime(),
                    position: this.camera.position,
                    rotation: this.camera.rotation,
                    quaternion: this.camera.quaternion
                };
                this.$emit('sendMessage', JSON.stringify(data));
            }
        },
        mounted() {
            this.init();
            this.animate();

            let container = this.$refs['modelBox'];
            container = container.getElementsByTagName('canvas')[0];
            container.addEventListener('mousemove', () => {
                console.log('222')
                this.sendControlMessage();
            });
            container.addEventListener('mousedown', () => {
                console.log('111')
                this.sendControlMessage();
            });
            container.addEventListener('mouseup', () => {
                console.log('333')
                this.sendControlMessage();
            });
            container.addEventListener('touchstart', () => {
                console.log('444')
                this.sendControlMessage();
            });
            container.addEventListener('touchmove', () => {
                console.log('555')
                this.sendControlMessage();
            });
            container.addEventListener('touchend', () => {
                console.log('666')
                this.sendControlMessage();
            });
        }
    }
</script>

<style scoped>
    .model-box{
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
    }
</style>