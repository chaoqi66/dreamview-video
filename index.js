const fs = require('fs').promises;
const path = require('path');
const render = require('./render');
const { sortBinFilesAsync, readBinaryFile } = require('./util/binary');
const protobuf = require('protobufjs/light');
const protoJson = require('./proto_bundle/cache_sim_world_proto_bundle.json')
const simWorldRoot = protobuf.Root.fromJSON(protoJson);
const SimWorldMessage = simWorldRoot.lookupType('apollo.cachedreamview.SimulationWorldToSend');
const ffmpeg = require('fluent-ffmpeg');

const folderPath = '/home/sti/code/dreamview-video/binary'; // Replace with actual folder path
(async () => {
    try {
        const sortedFilePaths = await sortBinFilesAsync(folderPath);
        sortedFilePaths.slice(0, 100).forEach(async filePath => {
            const parts1 = filePath.split('.');
            const parts2 = parts1[0].split('_');
            const number = parts2[parts2.length - 1];

            const binContent = await readBinaryFile(filePath)
            const message = SimWorldMessage.toObject(
                SimWorldMessage.decode(new Uint8Array(binContent)),
                { enums: String },
            );
            new render(message.simulationWorldToSend[0]['simulationWorld'], number)
        });

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
                debugger
                console.error('Error:', err);
            })
            .run();


    } catch (err) {
        console.error(err);
    }
})();
