const { createCanvas, loadImage } = require('node-canvas-webgl/lib');
const fs = require('fs').promises;

// 创建Canvas
const canvas = createCanvas(400, 300);
const ctx = canvas.getContext('2d');

// 定义一个异步函数来处理图像操作
async function main() {
  try {
    debugger
    // 加载图像并等待加载完成
    const image = await loadImage('/home/sti/code/dreamview-video/assets/images/decision/fence-main-stop.png');

    // 将图像绘制到Canvas上
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 在Canvas上进行其他操作
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 100, 100);

    // 获取Canvas中的图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 在这里可以对图像数据进行处理，例如修改像素值

    // 将Canvas转换为Buffer
    const buffer = canvas.toBuffer('image/jpeg');

    // 将Buffer保存为文件
    await fs.writeFile('output.jpg', buffer);
    
    console.log('图像处理完成并保存为output.jpg');
  } catch (err) {
    console.error('出现错误：', err);
  }
}

// 调用主函数来执行处理操作
main();
