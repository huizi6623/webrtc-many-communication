<template>
    <van-dropdown-menu class="other-function-box" :close-on-click-outside="false" :overlay="false">
        <van-dropdown-item title-class="title-class" :options="option" />
    </van-dropdown-menu>
</template>

<script>
    import switchPicUrl from '../assets/switch.svg';
    import scanPicUrl from '../assets/scan.svg';
    import imagePicUrl from '../assets/image.svg';
    import videoPicUrl from '../assets/video.svg';
    import robotPicUrl from '../assets/robot.svg';

    export default {
        name: "OtherFunction",
        data(){
            return {
                option: [
                    { icon: switchPicUrl, value: 0 },
                    { icon: scanPicUrl, value: 1 },
                    { icon: imagePicUrl, value: 2 },
                    { icon: videoPicUrl, value: 3 },
                    { icon: robotPicUrl, value: 4 },
                ],
            }
        }
    }
</script>

<style scoped>
    .other-function-box{
        position: absolute;
        top: 10px;
        left: 10px;
    }
    /deep/ .title-class{
        display: block;
        text-align: center;
        width: 8vw;
        height: 10vw;
        line-height: 10vw;
        color: #fff;
        background: url('../assets/arrow.svg') top left ;
    }
    /deep/ .van-cell{
        width: 10vw;
        height: 10vw;
        border-radius: 50%;
        background-color: #fff;
        margin-bottom: 10px;
        padding: 0;
    }
    /deep/ .van-icon__image{
        width: auto;
        height: auto;
    }
    /deep/ .van-cell .van-icon{
        margin: 20% 0 0 20%;
        width: 60%;
        margin-right: 0;
    }
</style>