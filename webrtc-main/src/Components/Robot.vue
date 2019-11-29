<template>
    <div class="shade">
        <div class="content-box">
            <div class="close-btn" @click="close"></div>
            <div class="line"></div>
            <div class="robot-box">
                <div class="chat-msg" ref="chat-box">
                    <div v-for="item in chatMessage" class="chat-item" :class="{'people-msg': !item.isRobot}">
                        <div class="icon"></div>
                        <div class="message">{{ item.message }}</div>
                    </div>
                </div>
                <div class="text-box">
                    <textarea v-model="messageToRobot"/>
                    <button @click="sendMessage">发送</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import socket from '../utils/socket';

    export default {
        name: "Robot",
        data() {
            return {
                messageToRobot: '',
                chatMessage: [
                    {
                        isRobot: true,
                        message: '您好，您想咨询什么问题?'
                    }
                ]
            }
        },
        methods: {
            close() {
                this.$emit('close');
            },
            sendMessage() {
                if(this.messageToRobot === ''){
                    return ;
                }
                socket.emit('robotReqMsg', encodeURI(this.messageToRobot));  //好像socket.io不能传递汉字，所以需要先编码
                this.chatMessage.push({
                    isRobot: false,
                    message: this.messageToRobot
                });
                this.$nextTick(() => {
                    this.$refs['chat-box'].scrollTop = this.$refs['chat-box'].scrollHeight ;
                });
                this.messageToRobot = '';
            }
        },
        mounted() {
            socket.on('robotAnswer', data => {
                data = JSON.parse(data);
                if(! data.results){
                    return;
                }
                this.chatMessage.push({
                    isRobot: true,
                    message: data.results[0].values.text
                });
                this.$nextTick(() => {
                    this.$refs['chat-box'].scrollTop = this.$refs['chat-box'].scrollHeight ;
                });
            })
        }
    }
</script>

<style scoped lang="scss">
    .shade {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 3;
        .content-box {
            position: absolute;
            left: 10%;
            top: 50%;
            width: 80%;
            transform: translate(0, -50%);
            .close-btn {
                width: 9vw;
                height: 9vw;
                margin: 0 auto;
                background: url(../assets/images/close.svg) no-repeat center / 100% 100%;
            }
            .line {
                width: 1px;
                height: 10vw;
                margin: -2vw auto 0;
                background: #ffcf06;
            }
            .robot-box{
                width: 100%;
                height: 80vh;
                border-radius: 5px;
                box-shadow: 0 0 10px 2px #ffcf06;
                overflow: scroll;
                .chat-msg{
                    height: 100%;
                    box-sizing: border-box;
                    padding: 2.667vw 2.667vw 110px;
                    background: #dad6d6;
                    overflow: scroll;
                    .chat-item{
                        display: flex;
                        flex-direction: row;
                        margin: 8px 0;
                        .icon{
                            width: 8vw;
                            height: 8vw;
                            border-radius: 50%;
                            background: #fff url(../assets/images/robot.svg) no-repeat center / 70% 70%;
                        }
                        .message{
                            max-width: 52vw;
                            background: #fff;
                            border-radius: 5px;
                            margin-left: 2.667vw;
                            text-align: left;
                            padding: 2vw;
                            word-break: break-all;
                        }
                    }
                    .chat-item.people-msg{
                        flex-direction: row-reverse;
                        .icon{
                            background-image: url(../assets/images/people.svg);
                        }
                        .message{
                            margin-left: 0;
                            margin-right: 2.667vw;
                        }
                    }
                }
                .text-box{
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100px;
                    background: #fff;
                    border-top: 1px solid #ccc;
                    border-radius: 0 0 5px 5px;
                    color: #000;
                    font-size: 16px;
                    textarea{
                        box-sizing: border-box;
                        width: 100%;
                        height: 70px;
                        padding: 8px;
                        border: none;
                    }
                    button{
                        position: absolute;
                        right: 5px;
                        bottom: 5px;
                        height: 25px;
                        width: 80px;
                    }
                }
            }
        }
    }
</style>