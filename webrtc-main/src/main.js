import Vue from 'vue';
import App from './App.vue';
import router from './router/router';
import store from './store/store';
import socket from './utils/socket';
import ElementUI from 'element-ui';
import BenchMark from 'benchmark';
import 'element-ui/lib/theme-chalk/index.css';
Vue.use(ElementUI);

let suite = new BenchMark.Suite;

function test1(){
    let num = 1, i =1;

    for(i =1; i <= 100; i++){
        num=num*i;
    }
}

// 添加测试
suite.add('Device#test', function() {
    test1();
})
.on('cycle', function(event) {
    socket.emit('speed', event.target.hz)
})
.run({ 'async': true });

socket.on('connect', ()=>{
    console.log('连接成功');
});
socket.on('disconnect', ()=>{
    console.log('连接断开了');
});
Vue.config.productionTip = false;
// Vue.prototype.$bus = bus;
Vue.prototype.$bus=new Vue();
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
