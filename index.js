const fs = require('fs').promises;
const path = require('path');
const render = require('./render');
const { sortBinFilesAsync, readBinaryFile } = require('./util/binary');
const protobuf = require('protobufjs/light');
const protoJson = require('./proto_bundle/cache_sim_world_proto_bundle.json')
const simWorldRoot = protobuf.Root.fromJSON(protoJson);
const SimWorldMessage = simWorldRoot.lookupType('apollo.cachedreamview.SimulationWorldToSend');
const ffmpeg = require('fluent-ffmpeg');
const loadImgPromises = require('./util/loadImage')

async function main(images) {
    try {
        const clipPath = process.argv[2]

        const binaryFolder = path.join(clipPath, 'simulation_world_binary')

        const sortedFilePaths = await sortBinFilesAsync(binaryFolder);
        sortedFilePaths.slice(0, 300).forEach(async filePath => {
            const fileNameWithExtension = path.basename(filePath);
            const { name } = path.parse(fileNameWithExtension);
            const parts = name.split('_');
            const number = parts[parts.length - 1];
            const binContent = await readBinaryFile(filePath)
            const message = SimWorldMessage.toObject(
                SimWorldMessage.decode(new Uint8Array(binContent)),
                { enums: String },
            );
            new render(message.simulationWorldToSend[0]['simulationWorld'], number, clipPath, images)
        });

        const outputFilename = 'dv_default.mp4'; // 输出视频文件名

        // 使用 fluent-ffmpeg 开始构建视频
        ffmpeg()
            .input(path.join(clipPath, 'dreamview_video_frame', 'frame-%05d.png'))
            .inputFPS(10)
            .output(path.join(clipPath, outputFilename)) // 输出文件路径
            .on('end', () => {
                console.log('Video conversion finished');
            })
            .on('error', err => {
                console.error('Error:', err);
            })
            .run();


    } catch (err) {
        console.error(err);
    }
}

Promise.all(loadImgPromises)
    .then(imageObjects => {
        const images = imageObjects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
        console.log('所有图片加载完成');
        main(images)
    })
    .catch(err => {
        console.log('图片加载出错:', err);
    })