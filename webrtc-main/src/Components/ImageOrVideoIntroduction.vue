<template>
    <div class="shade">
        <div class="content-box">
            <div class="close-btn" @click="close"></div>
            <div class="line"></div>
            <div class="img-video-box">
                <img v-if="isImage" :src="imageUrl" />
                <iframe v-else frameborder="0" :src="videoUrl" allowFullScreen="true"></iframe>
            </div>
        </div>
    </div>
</template>

<script>
    import productData from '../utils/data';

    export default {
        name: "ImageOrVideoIntroduction",
        props: {
            productId: {
                required: true,
                type: Number
            },
            isImage: {
                required: true,
                type: Boolean
            }
        },
        data() {
            let productId = this.productId === -1 ? 0 : this.productId;
            return {
                imageUrl: productData[productId].imageUrl,
                videoUrl: productData[productId].videoUrl
            }
        },
        methods: {
            close() {
                this.$emit('close');
            }
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
            .img-video-box{
                width: 100%;
                max-height: 80vh;
                border-radius: 5px;
                box-shadow: 0 0 10px 2px #ffcf06;
                overflow: scroll;
                font-size: 0;
            }
            img, iframe{
                width: 100%;
            }
        }
    }
</style>