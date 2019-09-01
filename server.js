/**
 * Created by wyw on 2018/10/14.
 */

const Koa = require('koa');
const path = require('path');
const koaSend = require('koa-send');
const static = require('koa-static');
const socket = require('koa-socket');
const users = {}; // 保存用户
const sockS = {}; // 保存客户端对应的socket

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
    // console.log(sock.id, 'sockkkkk');
    sock.on('join', data=>{
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
    // function strlen(str){
    //     var len = 0;
    //     for (var i=0; i<str.length; i++) {
            //取出单个字符
            // var c = str.charCodeAt(i);
          //  单字节加1 ，0~9，a~z
            // if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f)) {
            //     len++;
            // }else {
            //     len+=2;
            // }
        // }
        // return len;
  //  }

    sock.on('time', data => {



       // size=strlen(data.img);
       //  console.log(size);
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
    })
});
app._io.on('disconnect', (sock) => {
    for (let k in users) {
        users[k] = users[k].filter(v => v.id !== sock.id);
    }
    console.log(`disconnect id => ${users}`);
});

// 在端口3001监听:
let port = 3001;
app.listen(port, _ => {
    console.log('app started at port ...' + port);
});
