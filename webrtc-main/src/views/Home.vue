<template>
    <div class="center">
        <div class="item-box">
            <label>登录名：</label>
            <input type="text" v-model="account">
        </div>
        <div class="item-box">
            <label>客服室：</label>
            <input type="text" v-model="roomid">
        </div>
        <button @click="join">呼叫客服</button>
    </div>
</template>

<script>
    export default {
        name: 'home',
        data() {
            return {
                roomid: '',
                account: ''
            }
        },
        methods: {
            join() {
                if (this.account && this.roomid) {
                    this.$router.push({name: 'room', params: {roomid: this.roomid, account: this.account}})
                }
            }
        }
    };
</script>

<style scoped>
    .center{
        width:80vw;
        left:10vw;
        position: relative;
        top: 50%;
        transform: translate(0, -50%);
        text-align: center;
    }
    .item-box{
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
    }
    label, input{
        height: 40px;
        line-height: 40px;
        margin: 10px 0;
    }
    input{
        box-sizing: border-box;
        border: 1px solid #5ac6ca;
        border-radius: 2px;
        padding: 0 10px;
        flex: 1;
    }
    button {
        background-color: #5ac6ca;
        border: 1px solid #5ac6ca;
        font-size: 16px;
        padding: 4px 16px;
        color: #fff;
        border-radius: 3px;
        cursor: pointer;
        margin: 5px;
    }
    button:active{
        background-color: #6ddcff;
    }
    button.active{
        border: 1px solid #5ac6ca;
        color: #5ac6ca;
        background-color: #fff;
    }
    button:disabled{
        background-color: #d5d5d5;
        color: #fff;
        border: 1px solid #d5d5d5;
    }
</style>
