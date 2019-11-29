/**
 * Created by wyw on 2018/10/14.
 */

// const fs = require('fs');
const Koa = require('koa'); // 封装了nodeJs的http模块，由express原班人马打造
const path = require('path');
const http = require('http');
const koaSend = require('koa-send');
const static = require('koa-static');  // 处理静态资源
const socket = require('koa-socket');
const child_process = require('child_process');
const users = {}; // 保存用户

const io = new socket({
    ioOptions: {
        pingTimeout: 10000,
        pingInterval: 5000,
    }
});

// 创建一个Koa对象表示web app本身:
const app = new Koa();

// socket注入应用
io.attach(app);
app.use(static(
    path.join( __dirname,  './public')
));

// 对于任何请求，app将调用该异步函数处理请求：
app.use(async (ctx, next) => {
    if (!/\./.test(ctx.request.url)) {
        await koaSend(
            ctx,
            'index.html',
            {
                root: path.join(__dirname, './'),
                maxage: 1000 * 60 * 60 * 24 * 7,
                gzip: true,
            } // eslint-disable-line
        );
    } else {
        await next();
    }
});

app._io.on( 'connection', sock => {
    let roomId = null;
    let account = null;

    sock.on('join', data=>{
        roomId = data.roomid;
        account = data.account;
        console.log(account + '进入了房间！');

        sock.join(data.roomid, () => {
            if (!users[data.roomid]) {
                users[data.roomid] = [];
            }
            let obj = {
                account: data.account,
                id: sock.id,
                socket: sock,
                time: 0
            };
            let arr = users[data.roomid].filter(v => v.account === data.account);
            if (!arr.length) {
                users[data.roomid].push(obj);
            }

            let params = [];
            users[data.roomid].forEach((item) => {
                params.push({account: item.account});
            });
            app._io.in(data.roomid).emit('joined', params); // 发给房间内所有人
            // sock.to(data.roomid).emit('joined',data.account);
        });
    });
    sock.on('disconnect', () => {
        let index = -1;
        let currentRoomUsers = users[roomId];
        if(!currentRoomUsers){
            return;
        }

        for(let i = 0; i < currentRoomUsers.length; i ++){
            if(currentRoomUsers[i].account == account){
                index = i;
                break;
            }
        }
        if (index !== -1) {
            users[roomId].splice(index, 1);
        }

        sock.leave(roomId);    // 退出房间
        app._io.in(roomId).emit('leave', {account: account, roomId: roomId});
        console.log(account + '退出了房间' + roomId);
    });
    sock.on('offer', data=>{
        //console.log('offer', data.account);
        sock.to(data.roomid).emit('offerFromOthers',data);  //发给房间内除自己的所有人
    });
    sock.on('answer', data=>{
        //console.log('answer', data);
        sock.to(data.roomid).emit('answerFromOthers',data);
    });
    sock.on('__ice_candidate', data=>{
        // console.log('__ice_candidate', data);
        sock.to(data.roomid).emit('iceCandidate',data);
    });
    sock.on('robotReqMsg', data => {
        console.log('111111')
        console.log(data, 'data');
        let sendData = {
            "reqType":0,
            "perception": {
                "inputText": {
                    "text": decodeURI(data)
                },
            },
            "userInfo": {
                "apiKey": "22e009b1199a47a0bd4fc4c76234e49d",
                "userId": "511155"
            }
        };
        sendData = JSON.stringify(sendData);

        const options = {
            hostname: 'openapi.tuling123.com',
            path:'/openapi/api/v2',
            // url: 'http://openapi.tuling123.com/openapi/api/v2',
            method: 'POST',
            json: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(sendData)
            }
        };
        let answer = '';
        let res = http.request(options, res => {
            console.log("response: " + res.statusCode);
            res.on('data',function(data){
                answer += data;
            }).on('end', function(){
                sock.emit('robotAnswer', answer);
                console.log(answer, 'answer')
            });
        }).on('error', function(e) {
            console.log("error: " + e.message);
        });
        res.write(sendData);
        res.end();
    });
    sock.on('speed', data => {
        console.log('设备处理速度',data,'ops/sec');
    });
    sock.on('time', data => {

        var speed = 243/ ((new Date()-new Date(data.time))/1000) / 1024;

        console.log(new Date()-new Date(data.time),'时延',speed,'带宽');

        if(users[data.roomid]){
            let currentUser = users[data.roomid].filter(v => v.account === data.account)[0];
            if(currentUser && currentUser.time !== data.time){
                currentUser.time = data.time;
                // console.log(currentUser);
                let otherUsers = users[data.roomid].filter(v => v.account !== data.account);
                if(otherUsers.length) {
                    otherUsers.forEach((item) => {
                        let peerName = [data.account, item.account].sort().join('-');
                        let updateTime = data.time + item.time;
                        let params = {
                            peerName,
                            updateTime
                        };
                        item.socket.emit('updateTime', params);
                        sock.emit('updateTime', params);
                    });
                }
            }
        }
    });
    sock.on('contralMsg', data => {

        // console.log(new Date()-new Date(data.time),'时延',speed,'带宽');

        if(users[data.roomid]){
            let currentUser = users[data.roomid].filter(v => v.account === data.account)[0];
            if(currentUser){
                // console.log(currentUser);
                let otherUsers = users[data.roomid].filter(v => v.account !== data.account);
                if(otherUsers.length) {
                    otherUsers.forEach((item) => {
                        item.socket.emit('contralMsgBack', data);
                    });
                }
            }
        }
    });
    sock.on('d2dTime', data => {
        console.log('d2d时延：' + data.time + ' ' + data.curTime + ' ' + data.startTime);
    });
});

// https.createServer(options, app.callback())
app.listen(3001, () => {
    console.log(`server running success at 3001`)
});