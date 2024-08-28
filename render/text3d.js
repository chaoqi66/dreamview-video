const THREE = require('three')
const _ = require("loadsh")
const fontJson = require('../assets/fonts/Franklin_Gothic_Medium_Regular')
const font = new THREE.Font(fontJson)

// let fontsLoaded = false;
// const loader = new THREE.FontLoader();
// // const fontPath = 'fonts/gentilis_regular.typeface.json';
// // const fontPath = 'fonts/optimer_regular.typeface.json';
// const fontPath = '../assets/fonts/Franklin_Gothic_Medium_Regular.json';
// loader.load(fontPath, (font) => { 
//   fonts.gentilis_bold = font; fontsLoaded = true;
// },
// (xhr) => { console.log(`${fontPath + (xhr.loaded / xhr.total * 100)}% loaded`);
// },
// (xhr) => { console.log(`An error happened when loading ${fontPath}`);
// });

const TEXT_ALIGN = {
  CENTER: 'center',
  LEFT: 'left',
};

const LETTER_OFFSET = 0.05;

module.exports = class Text3D {
  constructor() {
    // The meshes for each ASCII char, created and reused when needed.
    // e.g. {65: [mesh('a'), mesh('a')], 66: [mesh('b')]}
    // These meshes will not be deleted even when not in use,
    // as the construction is expensive.
    this.charMeshes = {};
    // Mapping from each ASCII char to the index of the mesh used
    // e.g. {65: 1, 66: 0}
    this.charPointers = {};
    // Mapping from each ASCII char to the char mesh width
    this.charWidths = {};
  }

  reset() {
    this.charPointers = {};
  }

  drawText(text, scene, camera, color = 0xFFEA00, size = 1.4, textAlign = TEXT_ALIGN.CENTER) {
    const textMesh = this.composeText(text, color, textAlign, size);
    if (textMesh === null) {
      return;
    }

    // const camera = scene.getObjectByName('camera');
    if (camera !== undefined && camera.quaternion !== undefined) {
      textMesh.quaternion.copy(camera.quaternion);
    }
    textMesh.children.forEach((c) => c.visible = true);
    textMesh.visible = true;

    return textMesh;
  }

  composeText(text, color, textAlign, size) {
   
    // 32 is the ASCII code for white space.
    const charIndices = _.map(text, (l) => l.charCodeAt(0) - 32);
    const textMesh = new THREE.Object3D();
    let offsetSum = 0;

    for (let j = 0; j < charIndices.length; j++) {
      const idx = charIndices[j];
      let pIdx = this.charPointers[idx];
      if (pIdx === undefined) {
        pIdx = 0;
        this.charPointers[idx] = pIdx;
      }
      if (this.charMeshes[idx] === undefined) {
        this.charMeshes[idx] = [];
      }
      let mesh = this.charMeshes[idx][pIdx];
      if (mesh === undefined) {
        if (this.charMeshes[idx].length > 0) {
          mesh = this.charMeshes[idx][0].clone();
        } else {
          const { charMesh, charWidth } = this.drawChar3D(text[j], color, size);
          mesh = charMesh;
          this.charWidths[idx] = isFinite(charWidth) ? charWidth : 0.2;
        }
        this.charMeshes[idx].push(mesh);
      }

      mesh.position.set(offsetSum, 0, 0);
      offsetSum = offsetSum + this.charWidths[idx] + LETTER_OFFSET;
      this.charPointers[idx]++;
      textMesh.add(mesh);
    }

    if (textAlign === 'center') {
      const offset = offsetSum / 2;
      textMesh.children.forEach((child) => {
        child.position.setX(child.position.x - offset);
      });
    }

    return textMesh;
  }

  drawChar3D(char, color, size = 1.4, fontname = "", height = 0) {
    const charGeo = new THREE.TextGeometry(char, {
      font,
      size,
      height,
    });
    const charMaterial = new THREE.MeshBasicMaterial({ color });
    const charMesh = new THREE.Mesh(charGeo, charMaterial);

    charGeo.computeBoundingBox();
    const { max, min } = charGeo.boundingBox;

    return { charMesh, charWidth: max.x - min.x };
  }
}
