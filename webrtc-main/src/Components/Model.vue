<template>
    <div class="model-box" ref="modelBox"></div>
</template>

<script>
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
    import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
    import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
    import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
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
        },
        methods: {
            init() {
                let container = this.$refs['modelBox'];
                // antialias，用于告知THREE.js开启基于硬件的多重采样抗锯齿，使物体边缘平滑
                // this.renderer = new THREE.WebGLRenderer({antialias: true});
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

                this.controls = new TrackballControls(this.camera, this.renderer.domElement);
                //是否可以缩放
                // this.controls.enableZoom = true;
                // 是否自动旋转
                // this.controls.autoRotate = true;
                // 是否开启右键拖拽
                // this.controls.enablePan = true;

                let loadStartTime = performance.now();
                let GltfLoader = new GLTFLoader();
                // this.scene.add(new THREE.AxesHelper(5000));
                GltfLoader.load(this.model.url, gltf => {
                    let object = gltf.scene;
                    console.log(object, 'object');
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
                // // 变换控件对象
                // var transformControls = new TransformControls(this.camera, this.renderer.domElement);
                // // 添加到场景中
                // this.scene.add(transformControls);
                //
                // // 拖拽控件对象
                // var dragControls = new DragControls(this.scene.children,this.camera,this.renderer.domElement);
                // // 设置鼠标事件
                // dragControls.addEventListener('hoveron', function (event) {
                //     // 变换控件对象与选中的对戏那个object绑定
                //     transformControls.attach(event.object);
                //     // 设置三维坐标轴的大小，这个坐标轴不会随着模型的缩放而缩放
                //     transformControls.setSize(0.4);
                // });
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
                // console.log(this.camera, 'daaaaa');
                this.$emit('sendMessage', JSON.stringify(data));
            }
        },
        mounted() {
            this.init();
            this.animate();

            let container = this.$refs['modelBox'];
            container = container.getElementsByTagName('canvas')[0];
            container.addEventListener('mousemove', () => {
                this.sendControlMessage();
            });
            container.addEventListener('mousedown', () => {
                this.sendControlMessage();
            });
            container.addEventListener('mouseup', () => {
                this.sendControlMessage();
            });
            container.addEventListener('touchstart', () => {
                this.sendControlMessage();
            });
            container.addEventListener('touchmove', () => {
                this.sendControlMessage();
            });
            container.addEventListener('touchend', () => {
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