const THREE = require('three')
const STORE = require('./config/store')
const _ = require("loadsh")
const path = require('path')
const fs = require('fs');

const definedObLoader = require('./loaders/OBJLoader.js');
const definedMTLLoader = require('./loaders/MTLLoader.js');
definedObLoader(THREE)
definedMTLLoader(THREE)

const mtlLoader = new THREE.MTLLoader();

module.exports = class AutoDrivingCar {
  constructor(scene) {
    this.mesh = null;
    this.scene = scene;

    const carMtlPath = path.join(__dirname, '../assets/models/car.mtl');
    const carObjPath = path.join(__dirname, '../assets/models/car.obj');
    const materialCon = fs.readFileSync(carMtlPath, 'utf-8');
    const materials =mtlLoader.parse(materialCon)
    materials.preload();
    const objLoader = new THREE.OBJLoader();
    if (materials) {
      objLoader.setMaterials(materials);
    }

    const objCon = fs.readFileSync(carObjPath, 'utf-8');
    const object = objLoader.parse(objCon)
    object.scale.set(1, 1, 1);
    
    this.mesh = object;
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.rotation.y = 0;
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    // this.mesh = this.getGeometryBox();
    // this.mesh.visible = false;
    // this.mesh.rotation.x = Math.PI / 2;
    // this.scene.add(this.mesh);
  }
  getGeometryBox() {
    const vehicleParam = STORE.hmi.vehicleParam;
    const backEdgeToCenter = vehicleParam.backEdgeToCenter;
    const frontEdgeToCenter = vehicleParam.frontEdgeToCenter;
    const leftEdgeToCenter = vehicleParam.leftEdgeToCenter;
    const rightEdgeToCenter = vehicleParam.rightEdgeToCenter;
    const height = vehicleParam.height;
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -backEdgeToCenter, 0, leftEdgeToCenter,
      -backEdgeToCenter, 0, -rightEdgeToCenter,
      frontEdgeToCenter, 0, -rightEdgeToCenter,
      frontEdgeToCenter, 0, leftEdgeToCenter,
      frontEdgeToCenter, height, leftEdgeToCenter,
      frontEdgeToCenter, height, -rightEdgeToCenter,
      frontEdgeToCenter, 0, -rightEdgeToCenter,
      -backEdgeToCenter, 0, -rightEdgeToCenter,
      -backEdgeToCenter, height, -rightEdgeToCenter,
      frontEdgeToCenter, height, -rightEdgeToCenter,
      frontEdgeToCenter, height, leftEdgeToCenter,
      frontEdgeToCenter, 0, leftEdgeToCenter,
      -backEdgeToCenter, 0, leftEdgeToCenter,
      -backEdgeToCenter, height, leftEdgeToCenter,
      frontEdgeToCenter, height, leftEdgeToCenter,
      frontEdgeToCenter, height, -rightEdgeToCenter,
      -backEdgeToCenter, height, -rightEdgeToCenter,
      -backEdgeToCenter, height, leftEdgeToCenter,
    ]);
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff //线条颜色
    });
    const line = new THREE.Line(geometry, material);
    return line;
  }

  update(coordinates, pose) {
    if (!this.mesh || !pose || !_.isNumber(pose.positionX) || !_.isNumber(pose.positionY)) {
      return;
    }

    this.mesh.visible = true;
    const position = coordinates.applyOffset({ x: pose.positionX, y: pose.positionY });
    if (position === null) {
      return;
    }
    this.mesh.position.set(position.x, position.y, 0);
    this.mesh.rotation.y = pose.heading
    console.log(this.mesh.rotation.y)
  }


  resizeCarScale(x, y, z) {
    if (!this.mesh) {
      return;
    }
    this.mesh.scale.set(x, y, z);
  }

}
