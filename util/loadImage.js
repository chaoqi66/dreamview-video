const { loadImage } = require('node-canvas-webgl/lib');
const path = require('path');

// 定义图片路径
const imagePaths = {
    iconMainStop: '../assets/images/decision/main-stop.png',
    iconObjectStop: '../assets/images/decision/object-stop.png',
    iconObjectFollow: '../assets/images/decision/object-follow.png',
    iconObjectYield: '../assets/images/decision/object-yield.png',
    iconObjectOvertake: '../assets/images/decision/object-overtake.png',
    fenceMainStop: '../assets/images/decision/fence-main-stop.png',
    fenceObjectStop: '../assets/images/decision/fence-object-stop.png',
    fenceObjectFollow: '../assets/images/decision/fence-object-follow.png',
    fenceObjectYield: '../assets/images/decision/fence-object-yield.png',
    fenceObjectOvertake: '../assets/images/decision/fence-object-overtake.png',
    reasonHeadVehicle: '../assets/images/decision/head-vehicle.png',
    reasonDestination: '../assets/images/decision/destination.png',
    reasonPedestrian: '../assets/images/decision/pedestrian.png',
    reasonObstacle: '../assets/images/decision/obstacle.png',
    reasonSignal: '../assets/images/decision/signal.png',
    reasonStopSign: '../assets/images/decision/stop-sign.png',
    reasonYieldSign: '../assets/images/decision/yield-sign.png',
    reasonClearZone: '../assets/images/decision/clear-zone.png',
    reasonCrosswalk: '../assets/images/decision/crosswalk.png',
    reasonEmergency: '../assets/images/decision/emergency.png',
    reasonNotReady: '../assets/images/decision/not-ready.png',
    reasonPullover: '../assets/images/decision/pullover.png',
    iconChangeLaneRight: '../assets/images/decision/change-lane-right.png',
    iconChangeLaneLeft: '../assets/images/decision/change-lane-left.png',
    arrowleftGreen: '../assets/images/arrow/arrowleft-green.png',
    arrowleftOrange: '../assets/images/arrow/arrowleft-orange.png',
    arrowleftRed: '../assets/images/arrow/arrowleft-red.png',
    arrowrightGreen: '../assets/images/arrow/arrowright-green.png',
    arrowrightOrange: '../assets/images/arrow/arrowright-orange.png',
    arrowrightRed: '../assets/images/arrow/arrowright-red.png',
    turnAroundGreen: '../assets/images/arrow/turn-around-green.png',
    turnAroundOrange: '../assets/images/arrow/turn-around-orange.png',
    turnAroundRed: '../assets/images/arrow/turn-around-red.png',
    straightTurnLeftGreen: '../assets/images/arrow/straight-turn-left-green.png',
    straightTurnLeftOrange: '../assets/images/arrow/straight-turn-left-orange.png',
    straightTurnLeftRed: '../assets/images/arrow/straight-turn-left-red.png',
    arrowUpGreen: '../assets/images/arrow/arrow_up-green.png',
    arrowUpOrange: '../assets/images/arrow/arrow_up-orange.png',
    arrowUpRed: '../assets/images/arrow/arrow_up-red.png',
    straightTurnRightGreen: '../assets/images/arrow/straight-turn-right-green.png',
    straightTurnRightOrange: '../assets/images/arrow/straight-turn-right-orange.png',
    straightTurnRightRed: '../assets/images/arrow/straight-turn-right-red.png'
};

// 构造图片加载的 Promise 数组
module.exports = Object.keys(imagePaths).map(key => {
    const imagePath = path.join(__dirname, imagePaths[key]);
    return new Promise((resolve, reject) => {
        // const image = fs.readFileSync(img);
        loadImage(imagePath)
            .then((image) => {
                resolve({ [key]: image }); // 返回一个包含键名和图片数据的对象
            })
    });
});
// 执行所有图片加载的 Promise
// Promise.all(loadPromises)
//     .then(imageObjects => {
//         console.log(imageObjects)
//         const images = imageObjects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
//         console.log('所有图片加载完成');
//         console.log('加载的图片数据对象:', images);
//     })
//     .catch(err => {
//         console.log('图片加载出错:', err);
//     })
