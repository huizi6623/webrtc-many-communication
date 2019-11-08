import Vue from 'vue';
import Router from 'vue-router';
import _import from './_import';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'home',
            component: _import('Home'),
        },
        {
            path: '/room/:roomid/:account',
            name: 'room',
            component: _import('webrtc/room1')
        },
    ],
});
