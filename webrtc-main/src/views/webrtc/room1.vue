<template>
    <div class="room">
        <!--视频部分-->
        <div class="video-box" ref="video-box">
            <video class="local-video" autoplay playsinline muted ref="local-video"></video>
            <div class="remote-video-outer-box" :class="{'remote-video-box-open': isOpenRemoteVideo}">
                <div class="open-video-arrow" v-if="isShowOpenVideoArrow"  @click="openOrCloseRemoteVideo"></div>
                <div class="remote-video-box" ref="remote-video-box"></div>
            </div>
        </div>
        <!--左上角其他功能-->
        <other-function
                @changeCamera="changeCamera"
                @showIntroduction="showIntroduction"
                @showScan="showScan"
                @showRobot="showRobot"
        ></other-function>
        <!--文字消息部分-->
        <div class="text-box">
            <textarea disabled :value="textFromOthers" ref="receive-text"></textarea>
            <div class="send-box">
                <input v-model="textToOthers" :disabled="isSendTextDisabled"/>
                <button @click="sendText">发送</button>
            </div>
        </div>
        <!--3D动画部分-->
        <model v-if="isShowModel"
               :product-id="productId"
               :cameraStatus="cameraStatus"
               @sendMessage="sendMessage"
        ></model>
        <!--图文/视频介绍弹窗-->
        <transition name="fade">
            <image-or-video-introduction
                    :product-id="productId"
                    :is-image="isShowImage"
                    @close="closeIntroduction"
                    v-if="isShowIntroduction"
            ></image-or-video-introduction>
        </transition>
        <!--扫描弹窗-->
        <transition name="fade">
            <scan
                   v-if="isShowScan"
                   @close="closeScan"
                   @matchSuccess="matchSuccess"
            ></scan>
        </transition>
        <!--图灵机器人-->
        <transition name="fade">
            <robot
                    v-if="isShowRobot"
                    @close="closeRobot"
            ></robot>
        </transition>
    </div>
</template>

<script>
    import socket from '../../utils/socket';
    import OtherFunction from '../../Components/OtherFunction';
    import ImageOrVideoIntroduction from '../../Components/ImageOrVideoIntroduction';
    import Scan from '../../Components/Scan';
    import Model from '../../Components/Model';
    import Robot from '../../Components/Robot'
    import productData from '../../utils/data';
    import { initPatten } from "../../utils/feat_1";

    export default {
        name: 'room',
        components: {
            OtherFunction,
            ImageOrVideoIntroduction,
            Scan,
            Model,
            Robot
        },
        data() {
            return {
                roomid: this.$route.params.roomid,
                account: this.$route.params.account,
                peerList: {},
                localStream: null,
                textFromOthers: '',
                textToOthers: '',
                isSendTextDisabled: true,
                isUser: true,  //是否是前置摄像头
                productId: -1,
                isShowIntroduction: false,
                isShowImage: true,
                isShowScan: false,
                isOpenRemoteVideo: false,
                isShowModel: false,
                isShowRobot: false,
                cameraStatus: null,
            }
        },
        beforeDestroy() {
            for (let k in this.peerList) {
                this.peerList[k].close();
                this.peerList[k] = null;
            }
        },
        computed: {
            isShowOpenVideoArrow() {
                return Object.keys(this.peerList).length > 1;
            }
        },
        methods: {
            // 获取视频流
            getUserMedia() {
                let constraints = this.isUser ?
                    { audio: false, video: { facingMode: 'user' } } :
                    { audio: false, video: { facingMode: { exact: "environment" } } };
                // 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
                let mediaDevices = navigator.mediaDevices;
                if (mediaDevices === undefined) {
                    mediaDevices = {};
                }
                // 一些浏览器部分支持 mediaDevices。我们不能直接给对象设置 getUserMedia
                // 因为这样可能会覆盖已有的属性。这里我们只会在没有getUserMedia属性的时候添加它。
                if (mediaDevices.getUserMedia === undefined) {
                    mediaDevices.getUserMedia = function(constraints) {
                        // 首先，如果有getUserMedia的话，就获得它
                        let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

                        // 一些浏览器根本没实现它 - 那么就返回一个error到promise的reject来保持一个统一的接口
                        if (!getUserMedia) {
                            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                        }

                        // 否则，为老的navigator.getUserMedia方法包裹一个Promise
                        return new Promise(function(resolve, reject) {
                            getUserMedia.call(navigator, constraints, resolve, reject);
                        });
                    }
                }
                return new Promise((resolve, reject) => {
                    mediaDevices.getUserMedia(constraints)
                        .then((stream) => {
                            let video = this.$refs['local-video'];
                            // 旧的浏览器可能没有srcObject
                            if ("srcObject" in video) {
                                video.srcObject = stream;
                            } else {
                                // 防止在新的浏览器里使用它，应为它已经不再支持了
                                video.src = window.URL.createObjectURL(stream);
                            }
                            this.localStream = stream;
                            video.onloadedmetadata = function() {
                                video.play();
                            };
                            resolve();
                        })
                        .catch(function(err) {
                            reject(err);
                        });
                });
            },
            // 创建PeerConnection对象
            getPeerConnection(v) {
                console.log(v, 'v')
                let remoteVideoBox = this.$refs['remote-video-box'];
                let pc_config = {'iceServers': [{"urls":"stun:stun.l.google.com:19302"}]};
                let pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true},{RtcDataChannels: true}]};

                //兼容浏览器的PeerConnection写法
                let PeerConnection = (window.RTCPeerConnection ||
                    window.webkitRTCPeerConnection ||
                    window.mozRTCPeerConnection);
                // 创建
                let peer = new PeerConnection(pc_config, pc_constraints);
                //向PeerConnection中加入需要发送的流
                // peer.addStream(this.localStream);

                peer.tracks = [];
                this.localStream.getTracks().forEach((track) => {
                    peer.tracks.push(peer.addTrack(track, this.localStream)) ;
                });

                //如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
                peer.ontrack = event => {
                    let videos = document.querySelector('#' + v.account);
                    if (videos) {
                        videos.srcObject = event.streams[0];
                    } else {
                        // 创建远程视频流
                        let video = document.createElement('video');
                        video.className = 'remote-video';
                        video.autoplay = 'true';
                        video.setAttribute('playsinline', true);
                        video.srcObject = event.streams[0];
                        // 增加下方名称
                        let p = document.createElement('p');
                        p.innerText = v.account.split('-').filter(item => item != this.account)[0];

                        let videoItem = document.createElement('div');
                        videoItem.className = 'remote-video-item';
                        videoItem.appendChild(video);
                        videoItem.appendChild(p);
                        videoItem.id = v.account;
                        remoteVideoBox.appendChild(videoItem);
                    }
                };
                //发送ICE候选到其他客户端
                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('__ice_candidate', {'candidate': event.candidate, roomid: this.roomid, account: v.account});
                    }
                };
                //判断通道发起方
                if(v.isOffer){
                    peer.dataChannel = peer.createDataChannel("DataChannel");
                    this.createDataChannel(peer.dataChannel) ;
                    console.log('创建DataChannel！')
                } else {
                    console.log('监听datachannel！')
                    peer.ondatachannel = e => {
                        this.createDataChannel(e.channel) ;
                        peer.dataChannel = e.channel ;
                        console.log('datachannel连接成功！')
                    }
                }
                peer.isOffer = v.isOffer ;
                this.$set(this.peerList, v.account, peer);
            },
            // DataChannel初始化
            createDataChannel(dataChannel){
                dataChannel.onopen = () => {
                    console.log('dataChannel已打开！') ;
                    this.isSendTextDisabled = false;
                } ;
                dataChannel.onclose = () => {
                    console.log('dataChannel已关闭！') ;
                } ;
                dataChannel.onmessage = (e) => {
                    console.log('dataChannel数据：' + e.data) ;
                    let data = JSON.parse(e.data);
                    if(data.type === 'text'){
                        this.textFromOthers += this.textFromOthers === '' ? data.value : '\n' + data.value;
                        this.$nextTick(() => {
                            this.$refs['receive-text'].scrollTop = this.$refs['receive-text'].scrollHeight ;
                        });
                    } else if(data.type === 'match'){
                        this.productId = data.productId;
                        this.isShowModel = true;
                    } else {
                        this.cameraStatus = e.data;
                    }
                } ;
            },
            // 发送offer
            createOffer(account, peer) {
                //发送offer，发送本地session描述
                peer.createOffer({
                    offerToReceiveAudio: 1,
                    offerToReceiveVideo: 1
                }).then((desc) => {
                    console.log('send-offer', desc, account);
                    return peer.setLocalDescription(desc);
                }).then(() => {
                    socket.emit('offer', {'sdp': peer.localDescription, roomid: this.roomid, account: account});
                }).catch(e => {
                    console.log(e)
                })
            },
            // socket初始化
            socketInit() {
                socket.on('joined', (data)=>{
                    console.log('joined', data);
                    if (data.length > 1) {
                        data.forEach(v => {
                            let obj = {};
                            let arr = [v.account, this.account];
                            obj.account = arr.sort().join('-')
                            obj.isOffer = arr[0] == this.account ? true : false ;
                            if (!this.peerList[obj.account] && v.account !== this.account) {
                                if(v !== data[0]) {
                                    alert(v.account + '进入了客服室');
                                }
                                this.getPeerConnection(obj);
                                if(obj.isOffer){
                                    this.createOffer(obj.account, this.peerList[obj.account])
                                }
                            }
                        });
                    } else if(data.length === 1) {
                        alert( data[0].account + '创建了客服室' + this.roomid);
                    }
                });
                // 接收服务器中转的offer并回复answer
                socket.on('offerFromOthers', v => {
                    if(v.account.split('-').indexOf(this.account) == -1){
                        return ;
                    }
                    console.log('take_offer', this.peerList[v.account], v);
                    if(!this.peerList[v.account]){
                        let isOffer = v.account.split('-')[0] == this.account ? true : false ;
                        v.isOffer = isOffer ;
                        console.log('create')
                        this.getPeerConnection(v)
                    }
                    if(!this.peerList[v.account].isOffer){
                        this.peerList[v.account].setRemoteDescription(v.sdp)
                            .then(() => {
                                console.log('setRemote')
                                return this.peerList[v.account].createAnswer()
                            })
                            .then((desc) => {
                                console.log('send-answer', desc, v);
                                return this.peerList[v.account].setLocalDescription(desc)
                            })
                            .then(() => {
                                socket.emit('answer', {'sdp': this.peerList[v.account].localDescription, roomid: this.roomid, account: v.account});
                            })
                            .catch(err => {
                                alert(err);
                            });
                    }
                });
                // 接收服务器中转的answer
                socket.on('answerFromOthers', v => {
                    if(v.account.split('-').indexOf(this.account) == -1){
                        return ;
                    }
                    console.log('take_answer', v.sdp, v);
                    if(!this.peerList[v.account]){
                        let isOffer = v.account.split('-')[0] == this.account ? true : false ;
                        v.isOffer = isOffer ;
                        console.log('create')
                        this.getPeerConnection(v)
                    }
                    if(this.peerList[v.account].isOffer){
                        this.peerList[v.account].setRemoteDescription(v.sdp);
                    }
                });
                // 接收服务器中转的ICE信息
                socket.on('iceCandidate', v => {
                    // console.log('take_candidate', v.candidate);
                    //如果是一个ICE的候选，则将其加入到PeerConnection中
                    if (v.candidate) {
                        this.peerList[v.account] &&
                        this.peerList[v.account]
                            .addIceCandidate(v.candidate)
                            .catch(e => { console.log('err', e)});
                    }
                });
                // 监听客户端leave事件
                socket.on('leave', data => {
                    alert(data.account + '离开了客服室！');
                    let key = [data.account, this.account].sort().join('-');
                    let dom = document.querySelector('#' + key);
                    if (dom) {
                        dom.remove();
                    }
                    if(this.peerList[key]){
                        delete this.peerList[key];
                    }
                    let keys = Object.keys(this.peerList);
                    if(!keys.length){
                        this.isSendTextDisabled = true;
                    }
                })
            },
            // 通过DataChannel发送文字消息
            sendText(){
                if(this.textToOthers == ''){
                    return
                }
                let text = this.textToOthers ;
                text = this.account + ': ' + text ;
                console.log(text)
                // 文字消息类型数据
                let data = {
                    type: 'text',
                    value: text
                };
                this.sendMessage(JSON.stringify(data));
                this.textFromOthers += this.textFromOthers === '' ? text : '\n' + text;
                this.$nextTick(() => {
                    this.$refs['receive-text'].scrollTop = this.$refs['receive-text'].scrollHeight ;
                });
                this.textToOthers = '' ;
            },
            sendMessage(message){
                for (let k in this.peerList) {
                    this.peerList[k].dataChannel && this.peerList[k].dataChannel.send(message) ;
                }
            },
            // 切换摄像头
            changeCamera(){
                this.isUser = !this.isUser;
                let peerList = this.peerList;
                this.$nextTick(() => {
                    this.getUserMedia().then(() => {
                        let videoTrack = this.localStream.getVideoTracks()[0];
                        for(let key in peerList){
                            if(peerList.hasOwnProperty(key)){
                                let sender = peerList[key].getSenders().find(function(s) {
                                    return s.track.kind == videoTrack.kind;
                                });
                                console.log('found sender:', sender);
                                sender.replaceTrack(videoTrack);
                            }
                        }
                    }).catch(err =>{
                        alert(err);
                    });
                });
            },
            // 初始化识别图
            setRecognitionImgs(){
                let imgs = [] ;
                let p = new Array(productData.length) ;
                for(let i = 0; i < productData.length; i ++){
                    p[i] = new Promise(function(resolve){
                        let img = new Image() ;
                        img.src = productData[i].targetImgUrl;
                        img.onload = function(){
                            imgs[i] = img ;
                            resolve() ;
                            // document.body.appendChild(img);
                        } ;
                    }) ;
                }
                Promise.all(p).then(function(){
                    initPatten(imgs, imgs.length) ;
                }) ;
            },
            // 识别成功
            matchSuccess(id){
                this.productId = id - 1;
                this.isShowScan = false;
                this.isShowModel = true;
                let data = {
                    type: 'match',
                    productId: id - 1
                };
                this.sendMessage(JSON.stringify(data));
            },
            // 打开扫描框
            showScan() {
                this.isShowScan = true;
                this.isShowModel = false;
            },
            // 关闭扫描框
            closeScan() {
                this.isShowScan = false;
                this.isShowModel = this.productId === -1 ? false : true;
            },
            // 打开图片/视频介绍
            showIntroduction(type) {
                this.isShowImage = type === 'image' ? true : false;
                this.isShowIntroduction = true;
            },
            // 关闭图片/视频介绍
            closeIntroduction() {
                this.isShowIntroduction = false;
            },
            // 打开图灵机器人
            showRobot() {
                this.isShowRobot = true;
            },
            // 关闭图灵机器人
            closeRobot() {
                this.isShowRobot = false;
            },
            openOrCloseRemoteVideo() {
                this.isOpenRemoteVideo = !this.isOpenRemoteVideo;
            }
        },
        mounted() {
            this.$nextTick(() => {
                this.getUserMedia().then(() => {
                    socket.emit('join', {roomid: this.roomid, account: this.account});
                });
                this.socketInit();
                this.setRecognitionImgs();
            });
        }
    };
</script>

<style lang="scss" scoped>
    .room{
        width: 100%;
        height: 100%;
    }
    .video-box{
        position: absolute;
        width: 100%;
        height: 100%;
        video{
            box-sizing: border-box;
            z-index: 2;
        }
        .local-video{
            width: 100%;
            height: 100%;
            left:0;
            object-fit: cover;
        }
        .remote-video-outer-box{
            position: absolute;
            top: 0;
            right: 0;
            height: 25vh;
            display: flex;
            max-width: 80vw;
            align-items: center;
            z-index: 2;
            .open-video-arrow{
                width: 8vw;
                height: 8vw;
                transform: rotate(90deg);
                transition: transform 0.2s;
                background: url('../../assets/images/arrow.svg') no-repeat center center / 70% 70%;
            }
            .remote-video-box{
                flex: 1;
                font-size: 0;
                white-space: nowrap;
                overflow-x: scroll;
                /deep/ .remote-video-item{
                    position: relative;
                    font-size: 0;
                    display: none;
                    .remote-video{
                        height: 25vh;
                    }
                    p{
                        position: absolute;
                        top: 5px;
                        left: 5px;
                        height: 3vh;
                        color: #fff;
                        font-size: 16px;
                        line-height: 3vh;
                    }
                }
                /deep/ .remote-video-item:first-child{
                    display: inline-block;
                }
            }
        }

        .remote-video-box-open{
            max-width: 85%;
            overflow-x: scroll;
            .open-video-arrow{
                transform: rotate(270deg);
            }
            /deep/ .remote-video-item{
                display: inline-block !important;
            }
            /deep/ .remote-video-item ~ .remote-video-item{
                margin-left: 5vw;
            }
        }
    }
    .text-box {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 140px;
        z-index: 2;
        textarea {
            width: 100%;
            height: 100px;
            bottom: 40px;
            box-sizing: border-box;
            border: none;
            background: none;
            color: red;
            font-weight: bold;
            font-size: 14px;
            line-height: 20px;
            padding: 10px;
        }
        .send-box{
            width: 100%;
            input{
                position: absolute;
                left: 0;
                bottom: 0;
                height: 30px;
                width: 80%;
                border: 1px solid #ccc;
                font-size: 14px;
                line-height: 16px;
                padding: 0 10px;
                vertical-align: bottom;
                box-sizing: border-box;
            }
            button{
                position: absolute;
                bottom: 0;
                right: 0;
                left: 80%;
                width: 20%;
                height: 30px;
                box-sizing: border-box;
                border: 1px solid #ccc;
                background: #5ac6ca;
            }
        }
    }

    .fade-enter-active, .fade-leave-active {
        transition: opacity .5s;
    }
    .fade-enter, .fade-leave-to {
        opacity: 0;
    }

</style>
