<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
    export default {
        data() {
            return {
                name: '111'
            }
        },
        mounted() {
            this.$bus.$on('busClick', _ => {
                console.log('app', this);
            });
        }
    }
</script>

<style lang="scss">
  @import "../static/css/base";
</style>
