<template>
    <van-dropdown-menu
            class="other-function-box"
            :class="{open: isOpen}"
            :close-on-click-outside="false"
            :overlay="false"
    >
        <van-dropdown-item
                title-class="title-class"
                :options="option"
                v-model="value"
                @open="menuOpen"
                @close="menuClose"
                @change="menuChange"
        />
    </van-dropdown-menu>
</template>

<script>
    import switchPicUrl from '../assets/images/switch.svg';
    import scanPicUrl from '../assets/images/scan.svg';
    import imagePicUrl from '../assets/images/image.svg';
    import videoPicUrl from '../assets/images/video.svg';
    import robotPicUrl from '../assets/images/robot.svg';

    export default {
        name: "OtherFunction",
        data(){
            return {
                isOpen: false,
                value: -1,
                option: [
                    { icon: switchPicUrl, value: 0 },
                    { icon: scanPicUrl, value: 1 },
                    { icon: imagePicUrl, value: 2 },
                    { icon: videoPicUrl, value: 3 },
                    { icon: robotPicUrl, value: 4 },
                ],
            }
        },
        methods: {
            menuOpen() {
                this.isOpen = true;
            },
            menuClose() {
                this.isOpen = false;
            },
            menuChange() {
                switch(this.value){
                    case 0:
                        this.$emit('changeCamera');
                        break;
                    case 1:
                        this.$emit('showScan');
                        break;
                    case 2:
                        this.$emit('showIntroduction', 'image');
                        break;
                    case 3:
                        this.$emit('showIntroduction', 'video');
                        break;
                    case 4:
                        this.$emit('showRobot');
                }
                this.value = -1;
            }
        }
    }
</script>

<style scoped>
    .other-function-box{
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 2;
    }
    /deep/ .title-class{
        display: block;
        text-align: center;
        width: 10vw;
        height: 10vw;
        border-radius: 50%;
        background: transparent url('../assets/images/ellipsis.svg') no-repeat center center / 70% 70% ;
        transition: all 0.2s;
    }
    .open /deep/ .title-class{
        background-image: url('../assets/images/arrow.svg');
        transform: rotate(180deg);
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
    /deep/ .van-cell__value--alone{
        display: none;
    }
    .van-hairline--top-bottom::after,
    .van-hairline-unset--top-bottom::after{
        border: none;
    }
</style>