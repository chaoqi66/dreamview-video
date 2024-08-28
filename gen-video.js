const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const outputFilename = 'output.mp4'; // 输出视频文件名

// 使用 fluent-ffmpeg 开始构建视频
ffmpeg()
    .input(path.join(__dirname, 'output', 'frame-%05d.png'))
    .inputFPS(10)
    .size('?x720')
    .output(path.join("./", outputFilename)) // 输出文件路径
    .on('end', () => {
        console.log('Video conversion finished');
    })
    .on('error', err => {
        console.error('Error:', err);
    })
    .run();


