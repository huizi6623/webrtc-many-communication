<template>
    <div class="room">
        <div class="video-box" ref="video-box">
            <video class="video-mine" autoplay controls ref="video-mine"></video>
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
                localStream: null,
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
            getUserMedia() {
                //兼容浏览器的getUserMedia写法
                let myVideo = this.$refs['video-mine'];
                let getUserMedia = (navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia);
                //获取本地的媒体流，并绑定到一个video标签上输出，并且发送这个媒体流给其他客户端
                return new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, {
                        "audio": true,
                        "video": true
                    }, (stream) => {
                        //绑定本地媒体流到video标签用于输出
                        myVideo.srcObject = stream;
                        this.localStream = stream;
                        resolve();
                    }, function(error){
                        reject(error);
                        // console.log(error);
                        //处理媒体流创建失败错误
                    });
                })
            },
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
                peer.addStream(this.localStream);

                //如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
                peer.onaddstream = function(event){
                    // console.log('event-stream', event);
                    let videos = document.querySelector('#' + v.account);
                    if (videos) {
                        videos.srcObject = event.stream;
                    } else {
                        let video = document.createElement('video');
                        video.controls = true;
                        video.autoplay = 'autoplay';
                        video.srcObject = event.stream;
                        video.id = v.account;
                        videoBox.append(video);
                    }
                };
                //发送ICE候选到其他客户端
                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('__ice_candidate', {'candidate': event.candidate, roomid: this.$route.params.roomid, account: v.account});
                    }
                };

                //判断通道发起方
                if(v.isOffer){
                    peer.dataChannel = peer.createDataChannel("DataChannel");
                    this.createDataChannel(peer.dataChannel) ;
                    console.log('createDataChannel')
                    console.log(this.peerList)
                } else {
                    console.log('ondatachannel')
                    peer.ondatachannel = e => {
                        this.createDataChannel(e.channel) ;
                        peer.dataChannel = e.channel ;
                        console.log('adddatachannel')
                    }
                }

                peer.isOffer = v.isOffer ;
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
                        socket.emit('offer', {'sdp': peer.localDescription, roomid: this.$route.params.roomid, account: account});
                    });
                }).catch(e => {
                    console.log(e)
                })
            },
            socketInit() {
                socket.on('offer', v => {
                    if(v.account.indexOf(this.$route.params.account) == -1){
                        return ;
                    }
                     console.log('take_offer', this.peerList[v.account], v);
                     if(!this.peerList[v.account]){
                         let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false ;
                         v.isOffer = isOffer ;
                         console.log('create')
                         this.getPeerConnection(v)
                     }
                     if(!this.peerList[v.account].isOffer){
                         this.peerList[v.account].setRemoteDescription(v.sdp, () => {
                             console.log('setremote')
                             this.peerList[v.account].createAnswer().then((desc) => {
                                 console.log('send-answer', desc, v);
                                 this.peerList[v.account].setLocalDescription(desc, () => {
                                     socket.emit('answer', {'sdp': this.peerList[v.account].localDescription, roomid: this.$route.params.roomid, account: v.account});
                                 });
                             }).catch( e => {
                                 console.log(e)
                             });
                         }, (err) => { console.log(err)
                         });
                     }
                });
                socket.on('answer', v => {
                    if(v.account.indexOf(this.$route.params.account) == -1){
                        return ;
                    }
                    console.log('take_answer', v.sdp, v);
                    if(!this.peerList[v.account]){
                        let isOffer = v.account.split('-')[0] == this.$route.params.account ? true : false ;
                        v.isOffer = isOffer ;
                        console.log('create')
                        this.getPeerConnection(v)
                    }
                    if(this.peerList[v.account].isOffer){
                        this.peerList[v.account].setRemoteDescription(v.sdp, function(){}, () => {
                            // console.log(err)
                        });
                    }
                });
                socket.on('__ice_candidate', v => {
                     // console.log('take_candidate', v.candidate);
                    //如果是一个ICE的候选，则将其加入到PeerConnection中
                    if (v.candidate) {
                        this.peerList[v.account] && this.peerList[v.account].addIceCandidate(v.candidate).catch(() => {}// console.log('err', e)
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
            sendMessage(){
                if(this.sendText == ''){
                    return
                }
                let text = this.sendText ;
                text = this.userName + ': ' + text ;
                console.log(text)
                for (let k in this.peerList) {
                    this.peerList[k].dataChannel && this.peerList[k].dataChannel.send(text) ;
                }
                this.receiveText += text + '\n';
                this.sendText = '' ;
            },
            createDataChannel(dataChannel){
                dataChannel.onopen = (e) => {
                    console.log(dataChannel + 'open', e) ;
                } ;
                dataChannel.onclose = (e) => {
                    console.log(dataChannel + 'close', e) ;
                } ;
                dataChannel.onmessage = (e) => {
                    console.log(e.data, 'data') ;
                    this.receiveText += e.data + '\n';
                } ;
            }
        },
        mounted() {
            this.$nextTick(() => {
                this.getUserMedia().then(() => {
                    socket.emit('join', {roomid: this.$route.params.roomid, account: this.$route.params.account});
                });
                this.socketInit();
                socket.on('joined', (data, account)=>{
                    console.log('joined', data, account);
                    if (data.length> 1) {
                        data.forEach(v => {
                            let obj = {};
                            let arr = [v.account, this.$route.params.account];
                            obj.account = arr.sort().join('-')
                            obj.isOffer = arr[0] == this.$route.params.account ? true : false ;
                            if (!this.peerList[obj.account] && v.account !== this.$route.params.account) {
                                console.log('obj', obj);
                                this.getPeerConnection(obj);
                                if(this.peerList[obj.account].isOffer){
                                    this.createOffer(obj.account, this.peerList[obj.account])
                                }
                            }
                        });
                        // if (account === this.$route.params.account) {
                        //     console.log('account', account);
                        //     console.log(this.peerList, 'list')
                        //     for (let k in this.peerList) {
                        //         this.createOffer(k, this.peerList[k]);
                        //     }
                        // }
                    }
                });
            });
        }
    };
</script>

<style lang="scss">
    .room{
        padding: 30px;
    }
    .video-box{
        display: flex;
        justify-content: flex-start;
        flex-wrap: wrap;
        video{
            width:400px;
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
        .send-box{
            overflow: hidden;
            width: 400px;
            input{
                box-sizing: border-box;
                width: 300px;
                height: 30px;
                margin: 5px;
                float: left;
            }
            button{
                box-sizing: border-box;
                width: 80px;
                height: 30px;
                float: right;
            }
        }
    }

</style>
