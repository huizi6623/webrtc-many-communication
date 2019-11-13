<template>
    <div class="room">
        <div class="video-box" ref="video-box">
            <video class="local-video" autoplay playsinline muted ref="local-video"></video>
        </div>
        <other-function
                @changeCamera="changeCamera"
        ></other-function>
        <div class="text-box">
            <textarea disabled :value="receiveText" ref="receive-text"></textarea>
            <div class="send-box">
                <input v-model="sendText" :disabled="isSendTextDisabled"/>
                <button @click="sendMessage">发送</button>
            </div>
        </div>
    </div>
</template>

<script>
    import socket from '../../utils/socket';
    import OtherFunction from '../../Components/OtherFunction';
    import { getBrowser } from '../../utils/common';

    export default {
        name: 'room',
        components: {
            OtherFunction,
        },
        data() {
            return {
                roomid: this.$route.params.roomid,
                account: this.$route.params.account,
                peerList: {},
                localStream: null,
                receiveText: '',
                sendText: '',
                isSendTextDisabled: true,
                isUser: true
            }
        },
        beforeDestroy() {
            for (let k in this.peerList) {
                this.peerList[k].close();
                this.peerList[k] = null;
            }
        },
        methods: {
            // 获取视频流
            getUserMedia() {
                let constraints = this.isUser ?
                    { audio: true, video: { facingMode: 'user' } } :
                    { audio: true, video: { facingMode: { exact: "environment" } } };
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
                            video.onloadedmetadata = function(e) {
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
                let videoBox = this.$refs['video-box'];
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
                        let video = document.createElement('video');
                        video.className = 'remote-video';
                        video.autoplay = 'true';
                        video.setAttribute('playsinline', true);
                        video.srcObject = event.streams[0];
                        video.id = v.account;
                        videoBox.append(video);
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
                this.peerList[v.account] = peer;
                console.log(this.peerList, 'peerList')
            },
            // DataChannel初始化
            createDataChannel(dataChannel){
                dataChannel.onopen = (e) => {
                    console.log('dataChannel已打开！') ;
                    this.isSendTextDisabled = false;
                } ;
                dataChannel.onclose = (e) => {
                    console.log('dataChannel已关闭！') ;
                } ;
                dataChannel.onmessage = (e) => {
                    console.log('dataChannel数据：' + e.data) ;
                    this.receiveText += this.receiveText === '' ? e.data : '\n' + e.data;
                    this.$nextTick(() => {
                        this.$refs['receive-text'].scrollTop = this.$refs['receive-text'].scrollHeight ;
                    });
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
                                    console.log(v.account + '进入了房间');
                                }
                                this.getPeerConnection(obj);
                                if(obj.isOffer){
                                    this.createOffer(obj.account, this.peerList[obj.account])
                                }
                            }
                        });
                    } else if(data.length === 1) {
                        console.log( data[0].account + '创建了房间' + this.roomid);
                    }
                });
                // 接收服务器中转的offer并回复answer
                socket.on('offerFromOthers', v => {
                    if(v.account.indexOf(this.account) == -1){
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
                    if(v.account.indexOf(this.account) == -1){
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
                        this.peerList[v.account] && this.peerList[v.account].addIceCandidate(v.candidate).catch(() => {}// console.log('err', e)
                        );
                    }
                });
                // 监听客户端leave事件
                socket.on('leave', data => {
                    console.log(data.account + '离开了房间！');
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
            sendMessage(){
                if(this.sendText == ''){
                    return
                }
                let text = this.sendText ;
                text = this.account + ': ' + text ;
                console.log(text)
                for (let k in this.peerList) {
                    this.peerList[k].dataChannel && this.peerList[k].dataChannel.send(text) ;
                }
                this.receiveText += this.receiveText === '' ? text : '\n' + text;
                this.$nextTick(() => {
                    this.$refs['receive-text'].scrollTop = this.$refs['receive-text'].scrollHeight ;
                });
                this.sendText = '' ;
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
            }
        },
        mounted() {
            this.$nextTick(() => {
                this.getUserMedia().then(() => {
                    socket.emit('join', {roomid: this.roomid, account: this.account});
                });
                this.socketInit();
            });
        }
    };
</script>

<style lang="scss">
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
            border: 1px solid #ccc;
            z-index: 2;
        }
        .local-video{
            width: 100%;
            height: 100%;
            left:0;
            object-fit: cover;
        }
        .remote-video{
            position: absolute;
            top: 0;
            right: 0;
            height: 25%;
        }
    }

    #dataChannelSend {
        bottom: 0;
        width: 80%;
        height: 23px;
        border: 1px solid #ccc;
        font-size: 14px;
        line-height: 16px;
        vertical-align: bottom;
    }

    #sendButton {
        position: absolute;
        bottom: 0;
        left: 82%;
        width: 18%;
        height: 25px;
        border: 1px solid #ccc;
    }
    .text-box {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 210px;
        textarea {
            width: 100%;
            height: 170px;
            bottom: 40px;
            box-sizing: border-box;
            border: none;
            background: none;
            color: rgba(255, 0, 0, .8);
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

</style>
