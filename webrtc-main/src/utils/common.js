const getBrowser = () =>{
    let userAgent = navigator.userAgent; //取得浏览器的userAgent字符串
    let isOpera = userAgent.indexOf("Opera") > -1;
    if (isOpera) {
        return "Opera"
    }
    //判断是否是微信浏览器
    let Wechat = userAgent.indexOf("MicroMessenger") > -1;
    if (Wechat) {
        return "Wechat"
    }
    //微博浏览器
    let Weibo = userAgent.indexOf("Weibo") > -1;
    if (Weibo) {
        return "Weibo"
    }
    //QQ浏览器
    let QQ = userAgent.indexOf("QQ") > -1;
    if (QQ) {
        return "QQ"
    }
    //UC浏览器
    let UC = userAgent.indexOf("UC") > -1;
    if (UC) {
        return "UC"
    }
    //Edge浏览器
    let Edge = userAgent.indexOf("Edge") > -1;
    if (Edge) {
        return "Edge"
    }
    //火狐浏览器
    if (userAgent.indexOf("Firefox") > -1) {
        return "Firefox";
    }
    //谷歌浏览器
    if (userAgent.indexOf("Chrome") > -1) {
        return "Chrome";
    }
    //safari浏览器
    if (userAgent.indexOf("Safari") > -1) {
        return "Safari";
    }
    //IE浏览器
    if (userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera) {
        return "IE";
    }
    //其他浏览器
    return "other";
};

export default {
    getBrowser
}