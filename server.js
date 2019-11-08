/**
 * Created by wyw on 2018/10/14.
 */

const fs = require('fs');
const Koa = require('koa'); // 封装了nodeJs的http模块，由express原班人马打造
const path = require('path');
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
            // sockS[data.account] = sock;
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
        console.log(account, 'accc');
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
        console.log(index, 'indexxxxxx');
        if (index !== -1) {
            users[roomId].splice(index, 1);
        }
        console.log(users[roomId]);

        sock.leave(roomId);    // 退出房间
        app._io.in(roomId).emit('leave', {account: account, roomId: roomId});
        console.log(account + '退出了房间' + roomId);
    });
    sock.on('offer', data=>{
        // console.log('offer', data);
        sock.to(data.roomid).emit('offer',data);
    });
    sock.on('answer', data=>{
        // console.log('answer', data);
        sock.to(data.roomid).emit('answer',data);
    });
    sock.on('__ice_candidate', data=>{
        // console.log('__ice_candidate', data);
        sock.to(data.roomid).emit('__ice_candidate',data);
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
    sock.on('feature', data => {
        console.log('base64传输时间：' + (new Date().getTime() - data.startTime) + 'ms');
        let imageUrl;
        if(data.isOrigin){
            imageUrl = './public/' + data.feature;
            console.log(imageUrl);
            workerPython();
        }else {
            var imgData = data.feature;
            //过滤data:URL
            var base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
            var dataBuffer = new Buffer.from(base64Data, 'base64');
            imageUrl = './images/' + new Date().getTime() + '.png';
            fs.writeFile(imageUrl, dataBuffer, function(err) {
                if(err){
                    console.log(err);
                }else{
                    console.log("保存成功！");
                    workerPython();
                }
            });
        }

        function workerPython() {
            let workerProcess = child_process.spawn('python', ['feature.py', imageUrl]);
            let keyPoints = [];
            let descriptors = {};
            let flag = 0;
            descriptors.data = [];

            workerProcess.stdout.on('data', function (data) {
                let string = String(data);
                // console.log(string)
                string = string.split('\n');
                for(let i = 0; i < string.length; i ++){
                    string[i] = string[i].trim();
                    if(string[i] == 'keyPoints' || string[i] == 'cols' || string[i] == 'rows' || string[i] == 'descriptors'){
                        flag = string[i];
                        continue;
                    }
                    switch(flag){
                        case 'keyPoints':
                            let str = string[i].substring(1, string[i].length - 1);
                            str = str.split(',');
                            let obj = {};
                            obj.x = parseFloat(str[0]);
                            obj.y = parseFloat(str[1]);
                            keyPoints.push(obj);
                            break;
                        case 'cols':
                            descriptors.cols = parseInt(string[i]);
                            break;
                        case 'rows':
                            descriptors.rows = parseInt(string[i]);
                            break;
                        case 'descriptors':
                            let curStr = string[i].replace('[', '').replace(']', '').trim();
                            curStr = curStr.split(/\s+/);
                            curStr.forEach(cur => {
                                let n = parseInt(cur);
                                if(!isNaN(n)){
                                    descriptors.data.push(parseInt(cur));
                                }
                            });
                            break;
                    }
                }
            });

            workerProcess.stderr.on('data', function (data) {
                console.log('stderr: ' + data);
            });

            workerProcess.on('close', (code) => {
                sock.emit('openCvFeature', {feature: {keyPoints, descriptors}, isOrigin: data.isOrigin, startTime: new Date().getTime()})
            });
        }
    });
});
app._io.on('disconnect', (sock) => {
    for (let k in users) {
        users[k] = users[k].filter(v => v.id !== sock.id);
    }

    disconnected
    console.log(`disconnect id => ${users}`);
});

// https.createServer(options, app.callback())
    app.listen(3001, () => {
        console.log(`server running success at 3001`)
    });