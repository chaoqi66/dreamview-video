const THREE = require('three');
const fs = require('fs');
THREE.TextureLoader.prototype.crossOrigin = '';

const loadTexture = function (textureFile, onLoadCallback, onErrorCallback) {
  textureLoader.load(textureFile, onLoadCallback, undefined, onErrorCallback);
}


module.exports = {
  loadTexture,
}