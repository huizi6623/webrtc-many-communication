<template>
    <div class="room" ref="room">
        <div style="height: 0; overflow: hidden">
            <img class="img" ref="targetImg">
        </div>

        <video id="webcam" width="640" height="480" style="display:none;"></video>
        <div style=" width:640px;height:480px;">
            <canvas id="canvas" width="640" height="480" style="position: absolute;"></canvas>
            <div id="model" style="position: absolute;width: 100%;height: 100%"></div>
            <div id="no_rtc" class="alert alert-error" style="display:none;"></div>
            <div id="log" class="alert alert-info" style="z-index: 2;position: absolute;top: 70%;left: 0;"></div>
        </div>
    </div>
</template>

<script>
    import socket from '../../utils/socket';

    import targetUrl from '../../../static/lib/examples/demo_yanhaoran/images/target1.jpg' ;
    import awesomeUrl from '../../../static/lib/examples/demo_yanhaoran/images/awesome.png' ;
    import modelUrl from '../../../static/lib/examples/demo_yanhaoran/model/Spiderman.fbx' ;

    export default {
        name: 'home',
        data() {
            return {
                roomid: this.$route.params.roomid,
                peer: null,
                peerList: {},
                candidate: null,
                // localStream: null,
                // receiveText: '',
                // sendText: '',
                userName: this.$route.params.account,
                markerObject3D: null,
                camera: null,
                timer: null , //定时器
            }
        },
        beforeDestroy() {
            for (let k in this.peerList) {
                this.peerList[k].close();
                this.peerList[k] = null;
            }
            clearInterval(this.timer);
        },
        methods: {
            getPeerConnection(v) {
                // console.log(v, 'v');
                // let videoBox = this.$refs['video-box'];
                let iceServer = {
                    "iceServers": [
                        {
                            "url": "stun:stun.l.google.com:19302"
                        }
                    ]
                };
                //兼容浏览器的PeerConnection写法
                let PeerConnection = (window.RTCPeerConnection ||
                    window.webkitRTCPeerConnection ||
                    window.mozRTCPeerConnection);
                // 创建
                let peer = new PeerConnection(iceServer);
                //向PeerConnection中加入需要发送的流
                // peer.addStream(this.localStream);

                //发送ICE候选到其他客户端
                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('__ice_candidate', {
                            'candidate': event.candidate,
                            roomid: this.$route.params.roomid,
                            account: v.account
                        });
                    }
                };

                //判断通道发起方
                if (v.isOffer) {
                    peer.dataChannel = peer.createDataChannel("DataChannel");
                    this.createDataChannel(peer.dataChannel);
                    alert('创建DataChannel')
                    // console.log(this.peerList)
                } else {
                    alert('监听datachannel')
                    peer.ondatachannel = e => {
                        this.createDataChannel(e.channel);
                        peer.dataChannel = e.channel;
                        alert('datachannel连接成功')
                    }
                }

                peer.isOffer = v.isOffer;
                this.peerList[v.account] = peer;
            },
            createOffer(account, peer) {
                //发送offer，发送本地session描述
                peer.createOffer({
                    offerToReceiveAudio: 1,
                    offerToReceiveVideo: 1
                }).then((desc) => {
                    // console.log('send-offer', desc, account);
                    peer.setLocalDescription(desc, () => {
                        socket.emit('offer', {
                            'sdp': peer.localDescription,
                            roomid: this.$route.params.roomid,
                            account: account
                        });
                    });
                }).catch(e => {
                    console.log(e)
                })
            },
            socketInit() {
                socket.on('joined', (data, account) => {
                    console.log('joined', data, account);
                    if (data.length > 1) {
                        data.forEach(v => {
                            let obj = {};
                            let arr = [v.account, this.$route.params.account];
                            obj.account = arr.sort().join('-')
                            obj.isOffer = arr[0] == this.$route.params.account ? true : false;
                            if (!this.peerList[obj.account] && v.account !== this.$route.params.account) {
                                // console.log('obj', obj);
                                this.getPeerConnection(obj);
                                if (this.peerList[obj.account].isOffer) {
                                    this.createOffer(obj.account, this.peerList[obj.account])
                                }
                            }
                        });
                    }
                });
                socket.on('offer', v => {
                    if (v.account.indexOf(this.$route.params.account) == -1) {
                        return;
                    }
                    // console.log('take_offer', this.peerList[v.account], v);
                    if (!this.peerList[v.account]) {
                        let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false;
                        v.isOffer = isOffer;
                        // console.log('create')
                        this.getPeerConnection(v)
                    }
                    if (!this.peerList[v.account].isOffer) {
                        this.peerList[v.account].setRemoteDescription(v.sdp, () => {
                            this.peerList[v.account].createAnswer().then((desc) => {
                                // console.log('send-answer', desc, v);
                                this.peerList[v.account].setLocalDescription(desc, () => {
                                    socket.emit('answer', {
                                        'sdp': this.peerList[v.account].localDescription,
                                        roomid: this.$route.params.roomid,
                                        account: v.account
                                    });
                                });
                            }).catch(e => {
                                console.log(e)
                            });
                        }, (err) => {
                            console.log(err)
                        });
                    }
                });
                socket.on('answer', v => {
                    if (v.account.indexOf(this.$route.params.account) == -1) {
                        return;
                    }
                    // console.log('take_answer', v.sdp, v);
                    if (!this.peerList[v.account]) {
                        let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false;
                        v.isOffer = isOffer;
                        this.getPeerConnection(v)
                    }
                    if (this.peerList[v.account].isOffer) {
                        this.peerList[v.account].setRemoteDescription(v.sdp, function () {
                        }, () => {
                            // console.log(err)
                        });
                    }
                });
                socket.on('__ice_candidate', v => {
                    // console.log('take_candidate', v.candidate);
                    //如果是一个ICE的候选，则将其加入到PeerConnection中
                    if (v.candidate) {
                        this.peerList[v.account] && this.peerList[v.account].addIceCandidate(v.candidate).catch(() => {
                            }// console.log('err', e)
                        );
                    }
                });
                socket.on('disconnected', id => {
                    // console.log('disconnected', id);
                    let dom = document.querySelector('#' + id);
                    if (dom) {
                        dom.remove();
                    }
                });
                socket.on('updateTime', data => {
                    // 在当前peerConnection对象上增加一个time属性，表示当前链接通过服务器传输数据时延
                    this.peerList[data.peerName].time = data.updateTime;
                })
            },
            sendMessage(data) {
                // 通过datachannel传输数据
                // console.log('传输数据', data);
                for (let k in this.peerList) {
                    this.peerList[k].dataChannel && this.peerList[k].dataChannel.send(data);
                }
            },
            // 将当前时延信息发送给服务器
            sendTimeToServer(data) {
                socket.emit('time', {roomid: this.$route.params.roomid, account: this.$route.params.account, time: data});
            },
            // 将特征点数据发送给服务器
            sendFeatureToServer(data) {
                // 给服务器发送数据
                socket.emit('feature', {roomid: this.$route.params.roomid, account: this.$route.params.account, feature: data});
            },
            createDataChannel(dataChannel) {
                dataChannel.onopen = (e) => {
                    // console.log(dataChannel + 'open', e);
                };
                dataChannel.onclose = (e) => {
                    // console.log(dataChannel + 'close', e);
                };
                dataChannel.onmessage = (e) => {
                    let data = JSON.parse(e.data);
                    let position = data.position;
                    let rotation = data.rotation;
                    // console.log(data, 'data');
                    this.markerObject3D.children[0].position.set(position.x, position.y, position.z);
                    this.camera.rotation.set(rotation._x, rotation._y, rotation._z);
                    // console.log(this.camera.rotation, 'rotation');
                };
            },
            init() {
                var canvas = document.getElementById('canvas');
                var canvasWidth = canvas.width;
                var canvasHeight = canvas.height;

                var flag_result = 0


                var controls;
                var startx, starty;

                // 添加拖拽控件
                let initDragControls = () => {
                    // 添加平移控件
                    var transformControls = new THREE.TransformControls(this.camera, renderer.domElement);
                    this.markerObject3D.add(transformControls);

                    // 过滤不是 Mesh 的物体,例如辅助网格对象
                    var objects = [];
                    for (let i = 0; i < this.markerObject3D.children.length; i++) {
                        /*if (this.markerObject3D.children[i].isMesh) {
                            console.log('afsaf', markerObject3D.children[i])
                            objects.push(markerObject3D.children[i]);
                        }*/
                        objects.push(this.markerObject3D.children[i]);
                    }

                    // 初始化拖拽控件
                    var dragControls = new THREE.DragControls(objects, this.camera, renderer.domElement);

                    // console.log(33333333)

                    // 鼠标略过事件
                    dragControls.addEventListener('hoveron', function (event) {
                        // 让变换控件对象和选中的对象绑定
                        transformControls.attach(event.object);
                    });
                    // 开始拖拽
                    dragControls.addEventListener('dragstart', function (event) {
                        // controls.enabled = false;
                    });
                    // 拖拽中
                    dragControls.addEventListener('drag', event => {
                        this.sendCameraMsg()
                    });
                    // 拖拽结束
                    dragControls.addEventListener('dragend', function (event) {
                        // controls.enabled = true;
                    });


                }

                let ray = (event) => {

                    // var Sx = event.clientX;//鼠标单击位置横坐标
                    // var Sy = event.clientY;//鼠标单击位置纵坐标

                    var Sx = event.clientX || event.changedTouches[0].clientX;
                    var Sy = event.clientY || event.changedTouches[0].clientY;

                    //屏幕坐标转标准设备坐标
                    var x = (Sx / window.innerWidth) * 2 - 1;//标准设备横坐标
                    var y = -(Sy / window.innerHeight) * 2 + 1;//标准设备纵坐标
                    var standardVector = new THREE.Vector3(x, y, 0.5);//标准设备坐标

                    //标准设备坐标转世界坐标
                    var worldVector = standardVector.unproject(this.camera);

                    //射线投射方向单位向量(worldVector坐标减相机位置坐标)
                    var ray = worldVector.sub(this.camera.position).normalize();

                    //创建射线投射器对象
                    var raycaster = new THREE.Raycaster(this.camera.position, ray);

                    // 获取raycaster射线和场景中所有部分相交的数组集合
                    var intersects = raycaster.intersectObjects(this.markerObject3D);


                    //控制点击不同部位，产生不同动画
                    if (intersects.length > 0) {
                        initDragControls();
                    }
                }

                // init renderer
                var renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                });

                renderer.setSize(canvasWidth, canvasHeight);
//            renderer.setSize( window.innerWidth, window.innerHeight )


                document.getElementById('model').appendChild(renderer.domElement);


                // array of functions for the rendering loop
                var onRenderFcts = [];

                // init scene and camera
                var scene = new THREE.Scene()
                this.camera = new THREE.PerspectiveCamera(40, canvasWidth / canvasHeight, 0.01, 1000);
                this.camera.position.z = 2;

                //////////////////////////////////////////////////////////////////////////////////
                //		create a markerObject3D
                //////////////////////////////////////////////////////////////////////////////////
                this.markerObject3D = new THREE.Object3D()
                scene.add(this.markerObject3D)

                //////////////////////////////////////////////////////////////////////////////////
                //		add an object in the markerObject3D
                //////////////////////////////////////////////////////////////////////////////////

                // add some debug display


                var geometry = new THREE.PlaneGeometry(1, 1, 10, 10)
                var material = new THREE.MeshBasicMaterial({
                    wireframe: true
                })
                var mesh1 = new THREE.Mesh(geometry, material);
                mesh1.name = "mesh"
                this.markerObject3D.add(mesh1);
                initDragControls();

                // var mesh2 = new THREE.AxisHelper
                // mesh2.name = "axis"
                // markerObject3D.add(mesh2);
                // add a awesome logo to the scene
                // /*;(function(){
                //     var material = new THREE.SpriteMaterial({
                //         map: THREE.ImageUtils.loadTexture( awesomeUrl),
                //     });
                //     //                var geometry = new THREE.BoxGeometry(1,1,1)
                //     var object3d = new THREE.Sprite(material );
                //     object3d.scale.set( 1, 1, 1 );
                //     object3d.name = 'png'
                //     markerObject3D.add(object3d)
                //
                // })()*/

                // 加载人物模型
                /*  var loader = new THREE.FBXLoader();
                  loader.load(modelUrl, fbx => {

                      fbx.name = "Spiderman";
  //                fbx.rotation.y = -Math.PI/2;
                      fbx.scale.set(0.01, 0.01, 0.01)
                      fbx.position.set(0, 0, 0)
                      this.markerObject3D.add(fbx)

  //                console.log(2131243123123,markerObject3D)
                      initDragControls();
                  });*/

                // function randerBase(data) {
                //     var mesh = null;
                //     var matArray = createMaterials(data);
                //     if (data.type == "SkinnedMesh") {
                //         mesh = new THREE.SkinnedMesh(data.objects[i].geometry, matArray);
                //     } else { // Mesh
                //         mesh = new THREE.Mesh(data.objects[i].geometry, matArray);
                //     }
                //     meshes.push(mesh);
                //     this.markerObject3D.add(mesh);
                // }

                // 初始化触控点击监听函数

//            initDragControls();
                let room = this.$refs.room;
                room.addEventListener('click', ray);// 监听窗口鼠标单击事件

                room.addEventListener('touchend', ray);

                room.addEventListener("touchstart", function (e) {
                    startx = e.touches[0].pageX;
                    starty = e.touches[0].pageY;
                }, false);
                room.addEventListener('touchmove', e => {
                    this.sendCameraMsg()
                });
                room.addEventListener('mousemove', e => {
                    this.sendCameraMsg()
                });
                //手指离开屏幕
                room.addEventListener("touchend", function (e) {
//                var speedControl = document.getElementById("speed");
                    var endx, endy;
                    endx = e.changedTouches[0].pageX;
                    endy = e.changedTouches[0].pageY;
                    var direction = getDirection(startx, starty, endx, endy);

                    switch (direction) {
                        case 0:
                            // alert("未滑动！");
                            break;
                        case 1:
                            //alert("faster！");

                            return n = n * 2;

                            break;
                        case 2:
                            //alert("slower！");

                            return n = n * 0.5;

                            break;
                        case 3:
                            //alert("向左！");
                            break;
                        case 4:
                            //alert("向右！");
                            break;
                        default:
                            return n = 1;
                    }

                }, false);

                //根据起点终点返回方向 1向上 2向下 3向左 4向右 0未滑动
                function getDirection(startx, starty, endx, endy) {
                    var angx = endx - startx;
                    var angy = endy - starty;
                    var result = 0;

                    //如果滑动距离太短
                    if (Math.abs(angx) < 2 && Math.abs(angy) < 2) {
                        return result;
                    }

                    var angle = getAngle(angx, angy);
                    if (angle >= -135 && angle <= -45) {
                        result = 1;
                    } else if (angle > 45 && angle < 135) {
                        result = 2;
                    } else if ((angle >= 135 && angle <= 180) || (angle >= -180 && angle < -135)) {
                        result = 3;
                    } else if (angle >= -45 && angle <= 45) {
                        result = 4;
                    }

                    return result;
                }

                function getAngle(angx, angy) {
                    return Math.atan2(angy, angx) * 180 / Math.PI;
                }


                // 初始化控件
                if (!controls)
                    controls = new THREE.OrbitControls(this.camera, renderer.domElement);

                controls.target.copy({
                    x: 0,
                    y: 0,
                    z: 0
                });

//        initDragControls()

                //////////////////////////////////////////////////////////////////////////////////
                //		render the whole thing on the page
                //////////////////////////////////////////////////////////////////////////////////

                // handle window resize
                window.addEventListener('resize', () => {
                    renderer.setSize(canvasWidth, canvasHeight)
                    this.camera.aspect = canvasWidth / canvasHeight
                    this.camera.updateProjectionMatrix()
                }, false)


                // render the scene
                onRenderFcts.push(() => {
                    renderer.render(scene, this.camera);
                })

                // run the rendering loop
                var previousTime = performance.now()
                requestAnimationFrame(function animate(now) {

                    if (controls) controls.update();

                    requestAnimationFrame(animate);

                    onRenderFcts.forEach(function (onRenderFct) {
                        onRenderFct(now, now - previousTime)
                    })

                    previousTime = now
                })

                //////////////////////////////////////////////////////////////////////////////////
                //		Do the Augmented Reality part
                //////////////////////////////////////////////////////////////////////////////////


                // init the marker recognition
                var jsArucoMarker = new THREEx.JsArucoMarker()

                //////////////////////////////////////////////////////////////////////////////////
                //		Process video source to find markers
                //////////////////////////////////////////////////////////////////////////////////
                // set the markerObject3D as visible
                this.markerObject3D.visible = false
                // process the image source with the marker recognition
                onRenderFcts.push(() => {
                    this.markerObject3D.visible = false

                    // see if this.markerId has been found
                    var shape_pts = tCorners(homo3x3.data, 520, 524);
//                var result = calculate_transform(format_xy(pattern_xy, point_count), format_xy(curr_xy, point_count), point_count);

                    var temp0 = shape_pts[0]
                    var temp1 = shape_pts[1]
                    var temp2 = shape_pts[2]
                    var temp3 = shape_pts[3]

                    shape_pts[0] = temp0
                    shape_pts[1] = temp3
                    shape_pts[2] = temp2
                    shape_pts[3] = temp1
                    if (flag_result > 0) {

                        jsArucoMarker.markerToObject3D(shape_pts, this.markerObject3D)
                    }
                    //输出模型位置坐标
//            console.log(markerObject3D.position)


//                jsArucoMarker.markerToObject3D(shape_pts, markerObject3D)

                    this.markerObject3D.visible = true
                })


//---------------------------------------------------------------------------


                var WIDTH = 640;
                var HEIGHT = 480;
                // lets do some fun
                var video = document.getElementById('webcam');
                try {
                    var attempts = 0;
                    var readyListener = function (event) {
                        findVideoSize();
                    };
                    var findVideoSize = function () {
                        if (video.videoWidth > 0 && video.videoHeight > 0) {
                            video.removeEventListener('loadeddata', readyListener);
                            onDimensionsReady(video.videoWidth, video.videoHeight);
                        } else {
                            if (attempts < 10) {
                                attempts++;
                                setTimeout(findVideoSize, 200);
                            } else {
                                onDimensionsReady(WIDTH, HEIGHT);
                            }
                        }
                    };
                    var onDimensionsReady = function (width, height) {
                        // console.log(width)
                        demo_app(width, height);
                        compatibility.requestAnimationFrame(tick);
                    };

                    video.addEventListener('loadeddata', readyListener);

                    compatibility.getUserMedia({video: true}, function (stream) {
                        // compatibility.getUserMediaNew(function(stream) {
                        try {
                            video.srcObject = stream;
                        } catch (error) {
                            video.src = stream;
                        }
                        setTimeout(function () {
                            video.play();
                        }, 500);
                    }, function (error) {
                        $('#canvas').hide();
                        $('#log').hide();
                        $('#no_rtc').html('<h4>WebRTC not available.</h4>');
                        $('#no_rtc').show();
                    });
                } catch (error) {
                    $('#canvas').hide();
                    $('#log').hide();
                    $('#no_rtc').html('<h4>Something goes wrong...</h4>');
                    $('#no_rtc').show();
                }

                var stat = new profiler();

//            var gui,options,ctx,canvasWidth,canvasHeight;
                var gui, options, ctx;
                var curr_img_pyr, prev_img_pyr, point_count, point_status, prev_xy, curr_xy;

                var trainer = new FeatTrainer();
                var targetImg = this.$refs.targetImg
                var grayTarget = trainer.getGrayScaleMat(targetImg);
                var pattern = trainer.trainPattern(grayTarget);
                var mm_kernel = new jsfeat.motion_model.homography2d();
                var frameId = 0
                var homo3x3 = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
                var match_mask = new jsfeat.matrix_t(500, 1, jsfeat.U8C1_t);
                // var mm_kernel = new jsfeat.motion_model.affine2d();

                var demo_opt = function () {
                    this.win_size = 20;
                    this.max_iterations = 30;
                    this.epsilon = 0.01;
                    this.min_eigen = 0.001;
                }

                function demo_app(videoWidth, videoHeight) {
//                canvasWidth  = canvas.width;
//                canvasHeight = canvas.height;
                    ctx = canvas.getContext('2d');

                    ctx.fillStyle = "rgb(0,255,0)";
                    ctx.strokeStyle = "rgb(0,255,0)";

                    curr_img_pyr = new jsfeat.pyramid_t(3);
                    prev_img_pyr = new jsfeat.pyramid_t(3);
                    curr_img_pyr.allocate(WIDTH, HEIGHT, jsfeat.U8_t | jsfeat.C1_t);
                    prev_img_pyr.allocate(WIDTH, HEIGHT, jsfeat.U8_t | jsfeat.C1_t);

                    point_count = 0;
                    point_status = new Uint8Array(100);
                    prev_xy = new Float32Array(100 * 2);
                    curr_xy = new Float32Array(100 * 2);

                    options = new demo_opt();
                    gui = new dat.GUI();

                    gui.add(options, 'win_size', 7, 30).step(1);
                    gui.add(options, 'max_iterations', 3, 30).step(1);
                    gui.add(options, 'epsilon', 0.001, 0.1).step(0.0025);
                    gui.add(options, 'min_eigen', 0.001, 0.01).step(0.0025);

                    stat.add("灰度化");
                    stat.add("构建图像金字塔");
                    stat.add("通过光流追踪已有特征点");
                    stat.add("计算单应性矩阵");
                    stat.add("刷新特征点");
                }


                function tick() {
                    compatibility.requestAnimationFrame(tick);
                    stat.new_frame();
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
                        var imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);

                        // swap flow data
                        var _pt_xy = prev_xy;
                        prev_xy = curr_xy;
                        curr_xy = _pt_xy;
                        var _pyr = prev_img_pyr;
                        prev_img_pyr = curr_img_pyr;
                        curr_img_pyr = _pyr;

                        stat.start("灰度化");
                        jsfeat.imgproc.grayscale(imageData.data, WIDTH, HEIGHT, curr_img_pyr.data[0]);
                        stat.stop("灰度化");

                        stat.start("构建图像金字塔");
                        curr_img_pyr.build(curr_img_pyr.data[0], true);
                        stat.stop("构建图像金字塔");

                        stat.start("通过光流追踪已有特征点");
                        var start_time = new Date().getTime();
                        jsfeat.optical_flow_lk.track(prev_img_pyr, curr_img_pyr, prev_xy, curr_xy, point_count, options.win_size | 0, options.max_iterations | 0, point_status, options.epsilon, options.min_eigen);
                        var run_time = (new Date().getTime() - start_time);
                        // console.log('光流耗时：' + run_time + ' ms');
                        stat.stop("通过光流追踪已有特征点");

                        stat.start("计算单应性矩阵");

                        if (true) {
                            // console.log(curr_xy);
                            // mm_kernel.run(format_xy(pattern_xy, point_count), format_xy(curr_xy, point_count), homo3x3, point_count);
                            var result = calculate_transform(format_xy(pattern_xy, point_count), format_xy(curr_xy, point_count), point_count);
                            // filterPoint();
                            // console.log('good_match:' + result.goodMatch);
                            if (result.goodMatch > 6) {
                                flag_result = 1
                                var shape_pts = tCorners(homo3x3.data, 520, 524);

                                var temp0 = shape_pts[0]
                                var temp1 = shape_pts[1]
                                var temp2 = shape_pts[2]
                                var temp3 = shape_pts[3]
//                            console.log(temp0,temp1,temp2,temp3)
                                shape_pts[0] = temp0
                                shape_pts[1] = temp3
                                shape_pts[2] = temp2
                                shape_pts[3] = temp1


                                render_pattern_shape(ctx, shape_pts);
                            } else {
                                flag_result = 0
                            }
                            // console.log('point_count:' + point_count);
                            // console.log('pattern_count: ' + format_xy(pattern_xy, point_count).length);
                            // console.log('curr_count: ' + format_xy(curr_xy, point_count).length);

                        }

                        stat.stop("计算单应性矩阵");
                        // prune_oflow_points(ctx);


                        if (frameId % 60 === 0 || point_count <= 4) {
                            stat.start("刷新特征点");
                            var start_time = new Date().getTime();
                            on_canvas_click();
                            var run_time = (new Date().getTime() - start_time);
                            console.log('目标检测耗时：' + run_time + ' ms');
                            stat.stop("刷新特征点");
                        }

                        frameId = (frameId + 1) % 60;
                        $('#log').html(stat.log() + '<br/>强制刷新跟踪点： ' + point_count);
                    }
                }

                var patternPoint;
                var pattern_xy = new Float32Array(100 * 2);

                function format_xy(xy, count) {
                    var new_xy = [];
                    var tmp = 0;
                    for (var i = 0; i < count; ++i) {
                        new_xy[i] = {"x": xy[tmp++], "y": xy[tmp++]};
                    }
                    return new_xy;
                }

                function on_canvas_click(e) {


                    var imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
                    // var trainer = new FeatTrainer();
                    var grayImage = trainer.getGrayScaleMat(imageData);

                    var features = trainer.describeFeatures(grayImage);


                    var matches = trainer.matchPattern(features.descriptors, pattern.descriptors);
                    var result = trainer.findTransform(matches, features.keyPoints, pattern.keyPoints);

                    var keyPoints;
                    if (result && result.goodMatch > 8) {
                        keyPoints = result.goodPoint;
                        patternPoint = result.patternPoint;
                    } else {
                        keyPoints = features.keyPoints;
                    }


                    for (var i = 0; i < keyPoints.length; ++i) {
                        if (patternPoint && keyPoints[i].x < canvasWidth && keyPoints[i].y < canvasHeight) {
                            curr_xy[i << 1] = keyPoints[i].x;
                            curr_xy[(i << 1) + 1] = keyPoints[i].y;
                            pattern_xy[i << 1] = patternPoint[i].x;
                            pattern_xy[(i << 1) + 1] = patternPoint[i].y;
                        }
                    }
                    point_count = keyPoints.length;
                    // console.log(point_count);
                    // console.log(format_xy(pattern_xy, point_count));

                }

                canvas.addEventListener('click', on_canvas_click, false);

                function calculate_transform(pattern_xy, screen_xy, count) {
                    // ransac params
                    var num_model_points = 4;
                    var reproj_threshold = 3;
                    var ransac_param = new jsfeat.ransac_params_t(num_model_points,
                        reproj_threshold, 0.5, 0.99);

                    // estimate motion
                    var ok = false;
                    ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel,
                        pattern_xy, screen_xy, count, homo3x3, match_mask, 10000);

                    // extract good matches and re-estimate
                    var good_cnt = 0;
                    if (ok) {
                        for (var i = 0; i < count; ++i) {
                            if (match_mask.data[i]) {
                                pattern_xy[good_cnt].x = pattern_xy[i].x;
                                pattern_xy[good_cnt].y = pattern_xy[i].y;
                                screen_xy[good_cnt].x = screen_xy[i].x;
                                screen_xy[good_cnt].y = screen_xy[i].y;
                                good_cnt++;
                            }
                        }
                        // run kernel directly with inliers only
                        mm_kernel.run(pattern_xy, screen_xy, homo3x3, good_cnt);
                    } else {
                        jsfeat.matmath.identity_3x3(homo3x3, 1.0);
                    }

                    return {goodMatch: good_cnt, goodPoint: screen_xy, patternPoint: pattern_xy};
                }

                function filterPoint() {
                    var good_cnt = 0;
                    for (var i = 0; i < point_count; ++i) {
                        if (match_mask.data[i]) {
                            prev_xy[good_cnt << 1] = prev_xy[i << 1];
                            prev_xy[(good_cnt << 1) + 1] = prev_xy[(i << 1) + 1];
                            curr_xy[good_cnt << 1] = curr_xy[i << 1];
                            curr_xy[(good_cnt << 1) + 1] = curr_xy[(i << 1) + 1];
                            good_cnt++;
                        }
                    }
                    point_count = good_cnt;

                }

                /*  function draw_circle(ctx, x, y) {
                 ctx.beginPath();
                 ctx.arc(x, y, 2, 0, Math.PI*2, true);
                 ctx.closePath();
                 ctx.fill();
                 }*/

                function tCorners(M, w, h) {
                    var pt = [{'x': 0, 'y': 0}, {'x': w, 'y': 0}, {'x': w, 'y': h}, {'x': 0, 'y': h}];
                    var z = 0.0, i = 0, px = 0.0, py = 0.0;

                    for (; i < 4; ++i) {
                        px = M[0] * pt[i].x + M[1] * pt[i].y + M[2];
                        py = M[3] * pt[i].x + M[4] * pt[i].y + M[5];
                        z = M[6] * pt[i].x + M[7] * pt[i].y + M[8];
                        pt[i].x = px / z;
                        pt[i].y = py / z;
                    }

                    return pt;
                }

                function render_pattern_shape(ctx, shape_pts) {
                    // get the projected pattern corners
                    // target图像长宽


                    ctx.strokeStyle = "rgb(0,255,0)";
                    ctx.beginPath();

                    ctx.moveTo(shape_pts[0].x, shape_pts[0].y);
                    ctx.lineTo(shape_pts[1].x, shape_pts[1].y);
                    ctx.lineTo(shape_pts[2].x, shape_pts[2].y);
                    ctx.lineTo(shape_pts[3].x, shape_pts[3].y);
                    ctx.lineTo(shape_pts[0].x, shape_pts[0].y);

                    ctx.lineWidth = 4;
                    ctx.stroke();
                }

                /*function prune_oflow_points(ctx) {
                 var n = point_count;
                 var i=0,j=0;

                 for(; i < n; ++i) {
                 if(point_status[i] == 1) {
                 if(j < i) {
                 curr_xy[j<<1] = curr_xy[i<<1];
                 curr_xy[(j<<1)+1] = curr_xy[(i<<1)+1];
                 }
                 draw_circle(ctx, curr_xy[j<<1], curr_xy[(j<<1)+1]);
                 ++j;
                 }
                 }
                 point_count = j;
                 }*/

                function relMouseCoords(event) {
                    var totalOffsetX = 0, totalOffsetY = 0, canvasX = 0, canvasY = 0;
                    var currentElement = this;

                    do {
                        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
                    } while (currentElement = currentElement.offsetParent)

                    canvasX = event.pageX - totalOffsetX;
                    canvasY = event.pageY - totalOffsetY;

                    return {x: canvasX, y: canvasY}
                }

                HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

                $(window).unload(function () {
                    video.pause();
                    video.src = null;
                });


                //----------------------------------------------------------------------------------


            },
            sendCameraMsg() {
                let data = {};
                data.position = this.markerObject3D.children[0].position;
                data.rotation = this.camera.rotation;
                this.sendMessage(JSON.stringify(data));
            }
        },
        mounted() {
            this.$nextTick(() => {
                socket.emit('join', {roomid: this.$route.params.roomid, account: this.$route.params.account});
                this.socketInit();
                let i = 0;
                this.timer = setInterval(() => {
                    i ++;
                    this.sendTimeToServer(i);  //暂时随便写一个数据传递
                }, 2000) // 1秒钟传递一次时延
            });
            let targetImg = this.$refs.targetImg;
            targetImg.src = targetUrl;
            targetImg.onload = () => {
                this.init();
            };
        }
    };
</script>

<style lang="scss">
    .room {
        padding: 30px;
    }

    .video-box {
        display: flex;
        justify-content: flex-start;
        flex-wrap: wrap;

        video {
            width: 400px;
            height: 300px;
            margin-right: 10px;
        }
    }

    .text-box {
        margin-top: 10px;
        text-align: left;

        textarea {
            width: 400px;
            height: 300px;
            overflow-x: hidden;
            overflow-y: hidden;
        }

        .send-box {
            overflow: hidden;
            width: 400px;

            input {
                box-sizing: border-box;
                width: 300px;
                height: 30px;
                margin: 5px;
                float: left;
            }

            button {
                box-sizing: border-box;
                width: 80px;
                height: 30px;
                float: right;
            }
        }
    }

    canvas {
        position: absolute;
        left: 0;
        top: 0;
    }

</style>
