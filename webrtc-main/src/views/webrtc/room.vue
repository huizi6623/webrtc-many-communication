<template>
    <div class="room">
        <div style="height: 0; overflow: hidden">
        <img src="images/target.jpg" class="img" id="targetImg">
        </div>

        <video id="webcam" width="640" height="480" style="display:none;"></video>
        <div style=" width:640px;height:480px;">
        <canvas id="canvas" width="640" height="480" style="position: absolute;" ></canvas>
        <div id="model" style="position: absolute;width: 100%;height: 100%"></div>
        <div id="no_rtc" class="alert alert-error" style="display:none;"></div>
        <div id="log" class="alert alert-info" style="z-index: -2;position: absolute"></div>
        </div>
        <div class="text-box">
            <textarea :value="receiveText"></textarea>
            <div class="send-box">
                <input v-model="sendText"/>
                <button @click="sendMessage">发送</button>
            </div>
        </div>
    </div>
</template>

<script>
    import socket from '../../utils/socket';

    export default {
        name: 'home',
        data() {
            return {
                roomid: this.$route.params.roomid,
                peer: null,
                peerList: {},
                candidate: null,
                // localStream: null,
                receiveText: '',
                sendText: '',
                userName: this.$route.params.account
            }
        },
        beforeDestroy() {
            for (let k in this.peerList) {
                this.peerList[k].close();
                this.peerList[k] = null;
            }
        },
        methods: {
            getPeerConnection(v) {
                console.log(v, 'v')
                let videoBox = this.$refs['video-box'];
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
                    console.log('createDataChannel')
                    console.log(this.peerList)
                } else {
                    console.log('ondatachannel')
                    peer.ondatachannel = e => {
                        this.createDataChannel(e.channel);
                        peer.dataChannel = e.channel;
                        console.log('adddatachannel')
                    }
                }

                peer.isOffer = v.isOffer;
                this.peerList[v.account] = peer;
                console.log(this.peerList, 'peerList')
            },
            createOffer(account, peer) {
                //发送offer，发送本地session描述
                peer.createOffer({
                    offerToReceiveAudio: 1,
                    offerToReceiveVideo: 1
                }).then((desc) => {
                    console.log('send-offer', desc, account);
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
                socket.on('offer', v => {
                    if (v.account.indexOf(this.$route.params.account) == -1) {
                        return;
                    }
                    console.log('take_offer', this.peerList[v.account], v);
                    if (!this.peerList[v.account]) {
                        let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false;
                        v.isOffer = isOffer;
                        console.log('create')
                        this.getPeerConnection(v)
                    }
                    if (!this.peerList[v.account].isOffer) {
                        this.peerList[v.account].setRemoteDescription(v.sdp, () => {
                            console.log('setremote')
                            this.peerList[v.account].createAnswer().then((desc) => {
                                console.log('send-answer', desc, v);
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
                    console.log('take_answer', v.sdp, v);
                    if (!this.peerList[v.account]) {
                        let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false;
                        v.isOffer = isOffer;
                        console.log('create')
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
                })
            },
            sendMessage() {
                if (this.sendText == '') {
                    return
                }
                let text = this.sendText;
                text = this.userName + ': ' + text;
                console.log(text)
                for (let k in this.peerList) {
                    this.peerList[k].dataChannel && this.peerList[k].dataChannel.send(text);
                }
                this.receiveText += text + '\n';
                this.sendText = '';
            },
            createDataChannel(dataChannel) {
                dataChannel.onopen = (e) => {
                    console.log(dataChannel + 'open', e);
                };
                dataChannel.onclose = (e) => {
                    console.log(dataChannel + 'close', e);
                };
                dataChannel.onmessage = (e) => {
                    console.log(e.data, 'data');
                    this.receiveText += e.data + '\n';
                };
            },
            init(){
                var canvas = document.getElementById('canvas');
                var canvasWidth  = canvas.width;
                var canvasHeight = canvas.height;

                var flag_result = 0
                // init renderer
                var renderer	= new THREE.WebGLRenderer({
                    antialias	: true,
                    alpha		: true,
                });

                renderer.setSize( canvasWidth, canvasHeight );
//            renderer.setSize( window.innerWidth, window.innerHeight )

                document.getElementById('model').appendChild( renderer.domElement );

                // array of functions for the rendering loop
                var onRenderFcts = [];

                // init scene and camera
                var scene = new THREE.Scene()
                var camera	= new THREE.PerspectiveCamera(40, canvasWidth/canvasHeight, 0.01, 1000);
                camera.position.z = 2;

                //////////////////////////////////////////////////////////////////////////////////
                //		create a markerObject3D
                //////////////////////////////////////////////////////////////////////////////////
                var markerObject3D = new THREE.Object3D()
                scene.add(markerObject3D)

                //////////////////////////////////////////////////////////////////////////////////
                //		add an object in the markerObject3D
                //////////////////////////////////////////////////////////////////////////////////

                // add some debug display
                ;(function(){
                    var geometry = new THREE.PlaneGeometry(1,1,10,10)
                    var material = new THREE.MeshBasicMaterial( {
                        wireframe : true
                    })
                    var mesh = new THREE.Mesh(geometry, material);
                    markerObject3D.add( mesh );

                    var mesh = new THREE.AxisHelper
                    markerObject3D.add( mesh );
                })()

                // add a awesome logo to the scene
                ;(function(){
                    var material = new THREE.SpriteMaterial({
                        map: THREE.ImageUtils.loadTexture( 'images/awesome.png' ),
                    });
                    var geometry = new THREE.BoxGeometry(1,1,1)
                    var object3d = new THREE.Sprite(material );
                    object3d.scale.set( 1, 1, 1 );
                    markerObject3D.add(object3d)
                })()

                //////////////////////////////////////////////////////////////////////////////////
                //		render the whole thing on the page
                //////////////////////////////////////////////////////////////////////////////////
                // handle window resize
                window.addEventListener('resize', function(){
                    renderer.setSize(canvasWidth, canvasHeight )
                    camera.aspect	= canvasWidth / canvasHeight
                    camera.updateProjectionMatrix()
                }, false)

                // render the scene
                onRenderFcts.push(function(){
                    renderer.render( scene, camera );
                })

                // run the rendering loop
                var previousTime = performance.now()
                requestAnimationFrame(function animate(now){
                    requestAnimationFrame( animate );
                    onRenderFcts.forEach(function(onRenderFct){
                        onRenderFct(now, now - previousTime)
                    })

                    previousTime	= now
                })

                //////////////////////////////////////////////////////////////////////////////////
                //		Do the Augmented Reality part
                //////////////////////////////////////////////////////////////////////////////////

                // init the marker recognition
                var jsArucoMarker	= new THREEx.JsArucoMarker()

                //////////////////////////////////////////////////////////////////////////////////
                //		Process video source to find markers
                //////////////////////////////////////////////////////////////////////////////////
                // set the markerObject3D as visible
                markerObject3D.visible	= false
                // process the image source with the marker recognition
                onRenderFcts.push(function(){
                    markerObject3D.visible = false

                    // see if this.markerId has been found
                    var shape_pts = tCorners(homo3x3.data, 520, 524);
//                var result = calculate_transform(format_xy(pattern_xy, point_count), format_xy(curr_xy, point_count), point_count);

                    var temp0 = shape_pts[0]
                    var temp1 = shape_pts[1]
                    var temp2 = shape_pts[2]
                    var temp3 = shape_pts[3]
//                console.log(temp0,temp1,temp2,temp3)
                    shape_pts[0] = temp0
                    shape_pts[1] = temp3
                    shape_pts[2] = temp2
                    shape_pts[3] = temp1
                    if (flag_result > 0) {

                        jsArucoMarker.markerToObject3D(shape_pts, markerObject3D)
                    }
                    console.log(markerObject3D.position)
//                jsArucoMarker.markerToObject3D(shape_pts, markerObject3D)

                    markerObject3D.visible = true
                })
//---------------------------------------------------------------------------

                var WIDTH = 640;
                var HEIGHT = 480;
                // lets do some fun
                var video = document.getElementById('webcam');
                try {
                    var attempts = 0;
                    var readyListener = function(event) {
                        findVideoSize();
                    };
                    var findVideoSize = function() {
                        if(video.videoWidth > 0 && video.videoHeight > 0) {
                            video.removeEventListener('loadeddata', readyListener);
                            onDimensionsReady(video.videoWidth, video.videoHeight);
                        } else {
                            if(attempts < 10) {
                                attempts++;
                                setTimeout(findVideoSize, 200);
                            } else {
                                onDimensionsReady(WIDTH, HEIGHT);
                            }
                        }
                    };
                    var onDimensionsReady = function(width, height) {
                        console.log(width)
                        demo_app(width, height);
                        compatibility.requestAnimationFrame(tick);
                    };

                    video.addEventListener('loadeddata', readyListener);

                    compatibility.getUserMedia({video: true}, function(stream) {
                        // compatibility.getUserMediaNew(function(stream) {
                        try {
                            video.srcObject = stream;
                        } catch (error) {
                            video.src = stream;
                        }
                        setTimeout(function() {
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
                var gui,options,ctx;
                var curr_img_pyr, prev_img_pyr, point_count, point_status, prev_xy, curr_xy;

                var trainer = new FeatTrainer();
                var targetImg = document.getElementById("targetImg");
                var grayTarget = trainer.getGrayScaleMat(targetImg);
                var pattern = trainer.trainPattern(grayTarget);
                var mm_kernel = new jsfeat.motion_model.homography2d();
                var frameId = 0
                var homo3x3 = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
                var match_mask = new jsfeat.matrix_t(500,1,jsfeat.U8C1_t);
                // var mm_kernel = new jsfeat.motion_model.affine2d();

                var demo_opt = function(){
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
                    curr_img_pyr.allocate(WIDTH, HEIGHT, jsfeat.U8_t|jsfeat.C1_t);
                    prev_img_pyr.allocate(WIDTH, HEIGHT, jsfeat.U8_t|jsfeat.C1_t);

                    point_count = 0;
                    point_status = new Uint8Array(100);
                    prev_xy = new Float32Array(100*2);
                    curr_xy = new Float32Array(100*2);

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
                        jsfeat.optical_flow_lk.track(prev_img_pyr, curr_img_pyr, prev_xy, curr_xy, point_count, options.win_size|0, options.max_iterations|0, point_status, options.epsilon, options.min_eigen);
                        var run_time = (new Date().getTime() - start_time);
                        console.log('光流耗时：' + run_time + ' ms');
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
                            }
                            else{
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
                var pattern_xy = new Float32Array(100*2);
                function format_xy(xy,count) {
                    var new_xy = [];
                    var tmp = 0;
                    for (var i = 0; i < count; ++i) {
                        new_xy[i]= {"x":xy[tmp++], "y":xy[tmp++]};
                    }
                    return new_xy;
                }

                function on_canvas_click(e) {
                    var imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
                    // var trainer = new FeatTrainer();
                    var grayImage = trainer.getGrayScaleMat(imageData);
                    var features = trainer.describeFeatures(grayImage);


                    var matches = trainer.matchPattern(features.descriptors , pattern.descriptors);
                    var result = trainer.findTransform(matches, features.keyPoints , pattern.keyPoints);

                    var keyPoints;
                    if (result && result.goodMatch > 8) {
                        keyPoints = result.goodPoint;
                        patternPoint = result.patternPoint;
                    } else {
                        keyPoints = features.keyPoints;
                    }

                    for (var i = 0; i < keyPoints.length; ++i) {
                        if (keyPoints[i].x < canvasWidth & keyPoints[i].y < canvasHeight) {
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
                    if(ok) {
                        for(var i=0; i < count; ++i) {
                            if(match_mask.data[i]) {
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

                    // console.log(pattern_xy);
                    // return good_cnt;
                    return { goodMatch: good_cnt, goodPoint: screen_xy, patternPoint: pattern_xy };
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
                    var pt = [ {'x':0,'y':0}, {'x':w,'y':0}, {'x':w,'y':h}, {'x':0,'y':h} ];
                    var z=0.0, i=0, px=0.0, py=0.0;

                    for (; i < 4; ++i) {
                        px = M[0]*pt[i].x + M[1]*pt[i].y + M[2];
                        py = M[3]*pt[i].x + M[4]*pt[i].y + M[5];
                        z = M[6]*pt[i].x + M[7]*pt[i].y + M[8];
                        pt[i].x = px/z;
                        pt[i].y = py/z;
                    }

                    return pt;
                }

                function render_pattern_shape(ctx, shape_pts) {
                    // get the projected pattern corners
                    // target图像长宽
                    ctx.strokeStyle = "rgb(0,255,0)";
                    ctx.beginPath();

                    ctx.moveTo(shape_pts[0].x,shape_pts[0].y);
                    ctx.lineTo(shape_pts[1].x,shape_pts[1].y);
                    ctx.lineTo(shape_pts[2].x,shape_pts[2].y);
                    ctx.lineTo(shape_pts[3].x,shape_pts[3].y);
                    ctx.lineTo(shape_pts[0].x,shape_pts[0].y);

                    ctx.lineWidth=4;
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
                    var totalOffsetX=0,totalOffsetY=0,canvasX=0,canvasY=0;
                    var currentElement = this;

                    do {
                        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
                    } while(currentElement = currentElement.offsetParent)

                    canvasX = event.pageX - totalOffsetX;
                    canvasY = event.pageY - totalOffsetY;

                    return {x:canvasX, y:canvasY}
                }
                HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

                $(window).unload(function() {
                    video.pause();
                    video.src=null;
                });
            }
        },
        mounted() {
            this.$nextTick(() => {
                socket.emit('join', {roomid: this.$route.params.roomid, account: this.$route.params.account});
                this.socketInit();
                socket.on('joined', (data, account) => {
                    console.log('joined', data, account);
                    if (data.length > 1) {
                        data.forEach(v => {
                            let obj = {};
                            let arr = [v.account, this.$route.params.account];
                            obj.account = arr.sort().join('-')
                            obj.isOffer = arr[0] == this.$route.params.account ? true : false;
                            if (!this.peerList[obj.account] && v.account !== this.$route.params.account) {
                                console.log('obj', obj);
                                this.getPeerConnection(obj);
                                if (this.peerList[obj.account].isOffer) {
                                    this.createOffer(obj.account, this.peerList[obj.account])
                                }
                            }
                        });
                    }
                });
            });
            this.init()
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

</style>
