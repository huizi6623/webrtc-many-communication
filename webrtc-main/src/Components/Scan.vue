<template>
    <div class="scan-box">
        <div class="return-btn" @click="close">返回</div>
        <p>识别中...</p>
        <div class="shade" ref="scan-frame">
            <div class="turn-line"></div>
        </div>
    </div>
</template>

<script>
    import { patten } from "../utils/feat_1";

    export default {
        name: "Scan",
        data(){
            return {
                capTimer: null
            }
        },
        methods: {
            takePictureAndMatch() {
                let self = this;
                let canvas = document.createElement('canvas') ;
                let context = canvas.getContext('2d');

                let winWidth = window.screen.width;//屏幕宽度
                let video = this.$parent.$refs['local-video'] ;
                let frameWidth, sx, sy, w, h ;

                frameWidth = winWidth * 0.8 + 10 ;
                sx = (video.videoWidth - frameWidth) / 2 ;
                sy = (video.videoHeight - frameWidth) / 2 ;
                w = frameWidth;
                h = w;

                canvas.width = w;
                canvas.height = h;

                this.capTimer = setInterval(takePicture, 500);//间隔1000ms截取视频流内容
                clearPhoto();//清除画布上的内容

                function takePicture(){
                    context.drawImage(video, sx, sy, w, h, 0, 0, w, h);

                    let data2 = context.getImageData(0, 0, w, h);
                    let result = patten(data2);
                    console.log(result) ;
                    if (result > 0) {
                        console.log('识别成功！') ;
                        clearInterval(self.capTimer);
                        self.$emit('matchSuccess', result);
                    }
                }

                function clearPhoto() {
                    context.fillStyle = "#AAA";
                    context.fillRect(0, 0, canvas.width, canvas.height);
                }
            },
            close() {
                if(this.capTimer) {
                    clearInterval(this.capTimer);
                }
                this.$emit('close');
            }
        },
        mounted() {
            this.takePictureAndMatch();
        }
    }
</script>

<style scoped lang="scss">
    .scan-box{
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 3;
    }
    .return-btn{
        position: absolute;
        top: 10px;
        left: 10px;
        height: 8vw;
        line-height: 8vw;
        padding-left: 6vw;
        background: #db5d36;
        border: 1px solid #ffcf06;
        color: #fff;
        font-weight: bold;
        border-radius: 2px;
        padding-right: 1.5vw;
        z-index: 2;
    }
    .return-btn::before{
        content: '';
        position: absolute;
        top: 0;
        left: 1px;
        margin-top: 1.5vw;
        width: 5vw;
        height: 5vw;
        display: block;
        background: url(../assets/images/arrow.svg) no-repeat center / 100% 100%;
        transform: rotate(90deg);
    }
    p{
        position: relative;
        top: 15%;
        text-align: center;
        font-size: 18px;
        color: #ffcf06;
        z-index: 2;
    }
    .shade{
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60vw;
        height: 60vw;
        border-radius: 50%;
        border: 50vh solid rgba(0, 0, 0, 0.6);
        z-index: 1;
        .turn-line{
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            padding: 3% 2%;
            border-top: 2px solid #ffcf06;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: turn-slow 1s linear infinite;
        }
        @keyframes turn-slow {
            0%{
                transform: translate(-50%, -50%) rotate(0);
            }
            100%{
                transform: translate(-50%, -50%) rotate(360deg);
            }
        }
    }
</style>