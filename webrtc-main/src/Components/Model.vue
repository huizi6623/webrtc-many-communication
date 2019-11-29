<template>
    <div class="model-box" ref="modelBox"></div>
</template>

<script>
    import * as Three from 'three';
    import OrbitControls from 'three-orbitcontrols';
    import FbxLoader from 'three-fbx-loader';
    import modelUrl from '../assets/model/panda.fbx';
    import productData from '../utils/data';

    export default {
        name: "Model",
        props: {
            productId: {
                required: true,
                type: Number
            }
        },
        data() {
            return {
                camera: null,  //相机 定义了我们观察场景的位置
                scene: null,  // 场景
                renderer: null,  // 渲染器
                mesh: null,  //网格
                mixers: [],
                clocl: new Three.Clock(),
                modelUrl: productData[this.productId].modelUrl
            }
        },
        watch: {
            camera: {
                handler(value){

                },
                deep: true
            }
        },
        methods: {
            init: function() {
                let container = this.$refs['modelBox'];

                this.scene = new Three.Scene();

                // PerspectiveCamera参数：45度视野角、宽高比、最近平面和最远平面的坐标位置
                this.camera = new Three.PerspectiveCamera(70, container.clientWidth/container.clientHeight, 0.01, 10);
                this.camera.position.z = 1;
                this.scene.add(this.camera);

                // let light = new Three.DirectionalLight(0xffffff, 1.5);
                // light.position.set(0,0,1);
                // this.scene.add(light);

                // 添加网格，一个网格包括一个几何形状geometry和一个材质material
                // let geometry = new Three.BoxGeometry(0.2, 0.2, 0.2);
                // let material = new Three.MeshNormalMaterial();
                // // let material = new Three.MeshPhongMaterial( { color: 0x00ff00 } );
                // let cube = new Three.Mesh(geometry, material);
                //
                // this.mesh = new Three.Object3D();
                // this.mesh.add(cube);
                //
                // this.scene.add( this.mesh);

                let light = new Three.HemisphereLight(0xffffff, 0x444444, 1.0);
                light.position.set(0, 1, 0);
                this.scene.add(light);
                light = new Three.DirectionalLight(0xffffff, 1.0);
                light.position.set(0, 1, 0);
                this.scene.add(light);

                let fbxLoader = new FbxLoader();
                console.log(this.modelUrl)
                this.scene.add(new Three.AxesHelper(5000));
                fbxLoader.load(this.modelUrl, object => {
                    console.log('222222')
                    object.mixer = new Three.AnimationMixer(object);
                    this.mixers.push(object.mixer);
                    let action = object.mixer.clipAction(object.animations[0]);

                    action.play();
                    action.setDuration(18).play();
                    // action.setEffectiveTimeScale ( 0.8 ).play();
                    this.scene.add(object);
                }, error=> {
                    console.log(error);
                });

                // antialias，用于告知Three.js开启基于硬件的多重采样抗锯齿，使物体边缘平滑
                // this.renderer = new Three.WebGLRenderer({antialias: true, alpha: true});
                this.renderer = new Three.WebGLRenderer({alpha: true});
                this.renderer.setPixelRatio( window.devicePixelRatio );
                this.renderer.setSize(container.clientWidth, container.clientHeight);
                container.appendChild(this.renderer.domElement);

                let controls = new OrbitControls(this.camera, this.renderer.domElement);
                //controls.target.set( 0, 12, 0 );
                // this.camera.position.set(0, 200, 500);
                controls.update();
            },
            animate: function() {
                requestAnimationFrame(this.animate);
                if ( this.mixers.length > 0 ) {
                    for ( let i = 0; i < this.mixers.length; i ++ ) {
                        let delta = this.clock.getDelta();
                        this.mixers[i].update( delta );
                    }
                }
                // this.mesh.rotation.x += 0.01;
                // this.mesh.rotation.y += 0.02;
                this.renderer.render(this.scene, this.camera);
            }
        },
        mounted() {
            this.init();
            this.animate()
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