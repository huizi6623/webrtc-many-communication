import {FeatTrainer} from "./FeatTrainer";

let trainer = new FeatTrainer();
let pattern = [] ;
let imgCounts ;

function initPatten(imgsNode, length){
    let imgs = imgsNode ;
    imgCounts = length ;
    let timer = setInterval(function() {
        let complete = 1 ;
        for(let i = 0 ; i < imgCounts ; i ++){
            complete = complete && imgs[i].complete ;
        }
        if (complete && imgCounts != -1) {
            clearInterval(timer);
            getPattern();
        }
    }, 50);

    function getPattern() {
        let start = Date.now();
        let grayImg = [] ;

        for(let i = 0 ; i < imgCounts ; i ++){
            grayImg[i] = trainer.getGrayScaleMat(imgs[i]) ;
            pattern[i] = trainer.trainPattern(grayImg[i]) ;
        }
        let duration = Date.now() - start;
        console.log('提取目标特征点时间：' + duration);
    }
}

function patten(img) {
    let grayImage = trainer.getGrayScaleMat(img);
    let features = trainer.describeFeatures(grayImage);

    for(let i = 0 ; i < imgCounts ; i ++){
        if(pattern[i]){
            let matches = trainer.matchPattern(features.descriptors , pattern[i].descriptors) ;
            let result = trainer.findTransform(matches, features.keyPoints , pattern[i].keyPoints) ;
            if(result && result.goodMatch > 8){
                result = null ;
                return i+1 ;
            }
        }
    }
    return -1;
}

export {
    initPatten,
    patten
}
