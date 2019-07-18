/**
 * Created by lidan on 2017/10/31.
 */
var trainer = new FeatTrainer();
// var pattern1, pattern2, pattern3;
var pattern = [] ;
var cvs = document.createElement('canvas');
var video = document.getElementById('video');
var ctx = cvs.getContext('2d');
var imgCounts = -1;
var imgs = new Array() ;

// var img1 = document.getElementById("img1");
// var img2 = document.getElementById("img2");
// var img3 = document.getElementById("img3");
// var img4 = document.getElementById("img4");
// var img5 = document.getElementById("img5");

var timer = setInterval(function() {
    var complete = 1 ;
    for(var i = 0 ; i < imgCounts ; i ++){
        complete = complete && imgs[i].complete ;
    }
    if (complete && imgCounts != -1) {
        clearInterval(timer);
        getPattern();
    }
}, 50);

function getPattern() {
    var start = Date.now();
    var grayImg = [] ;
    // var grayImg1 = trainer.getGrayScaleMat(img1);
    // var grayImg2 = trainer.getGrayScaleMat(img2);
    // var grayImg3 = trainer.getGrayScaleMat(img3);
    // var grayImg4 = trainer.getGrayScaleMat(img4);
    // var grayImg5 = trainer.getGrayScaleMat(img5);

    // pattern1 = trainer.trainPattern(grayImg1);
    // pattern2 = trainer.trainPattern(grayImg2);
    // pattern3 = trainer.trainPattern(grayImg3);
    // pattern4 = trainer.trainPattern(grayImg4);
    // pattern5 = trainer.trainPattern(grayImg5);

    for(var i = 0 ; i < imgCounts ; i ++){
        grayImg[i] = trainer.getGrayScaleMat(imgs[i]) ;
        pattern[i] = trainer.trainPattern(grayImg[i]) ;
    }
    var duration = Date.now() - start;
}
function patten(img) {
    var grayImage = trainer.getGrayScaleMat(img);
    var features = trainer.describeFeatures(grayImage);

    for(var i = 0 ; i < imgCounts ; i ++){
        if(pattern[i]){
            var matches = trainer.matchPattern(features.descriptors , pattern[i].descriptors) ;
            var result = trainer.findTransform(matches, features.keyPoints , pattern[i].keyPoints) ;
            if(result && result.goodMatch > 8){
                result = null ;
                return i+1 ;
            }
        }
    }
    return 1;

    // if(pattern1){
    //     var matches1 = trainer.matchPattern(features.descriptors, pattern1.descriptors);
    //     var result1 = trainer.findTransform(matches1, features.keyPoints, pattern1.keyPoints);
    //     if(result1 && result1.goodMatch > 8) {
    //         result1 = null;
    //         return 1;
    //     }
    // }
}

