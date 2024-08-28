      
const THREE = require('three');
const { createCanvas } = require('node-canvas-webgl/lib');
const fs = require('fs');
const path = require('path');
const STORE = require('./config/store')
const PARAMETERS = require('./config/PARAMETERS')
const renderOptions = require('./config/renderOptions')

const AutoDrivingCar = require('./adc')
const Coordinates = require('./coordinates')
const RoadStructure = require('./roadStructure')

const width = 960, height = 600;
let initViewFactor = 19;

const render = class render {
  constructor(message, number) {
    this.world = message
    this.width = width
    this.height = height
    this.scene = new THREE.Scene();
    
    const canvas = createCanvas(width, height);
  
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, canvas: canvas });
    renderer.setSize(width, height);
    
    // const geometry = new THREE.BoxGeometry(5, 5, 5); // 调整长方体的尺寸
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.scene.add(cube);
  
    this.coordinates = new Coordinates();
    this.maybeInitializeOffest(
      this.world.autoDrivingCar.positionX,
      this.world.autoDrivingCar.positionY,
      true
    );
    
    // 设置车
    this.setAutoDrivingCar()

    this.adjustCamera(this.adc.mesh);
    
    this.roadStructure = new RoadStructure();
    this.roadStructure.update(this.world, this.coordinates, this.scene, this.camera);

  
    renderer.render(this.scene, this.camera);
  
    const base64 = canvas.toDataURL('image/png', 1.0);
    const base64Image = base64.split(';base64,').pop();
    const bufferData = Buffer.from(base64Image, 'base64');
    
    try {
      const outputDir = './output';
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir);
      }

      const filename = `frame-${number.toString().padStart(5, '0')}.png`;
      const filePath = path.join(outputDir, filename);

      fs.writeFileSync(filePath, bufferData, 'binary');
      console.log(`Image saved`);
    } catch (err) {
      throw err;
    }
  }

  maybeInitializeOffest(x, y, forced_update = false) {
    if (!this.coordinates.isInitialized() || forced_update) {
      this.coordinates.initialize(x, y);
    }
  }

  setAutoDrivingCar() {
    this.adc = new AutoDrivingCar(this.scene);
    const adcPose = this.world.autoDrivingCar;
    this.adc.update(this.coordinates, adcPose);
  }

  adjustCamera(target) {

    this.camera = new THREE.OrthographicCamera(
      this.width / (-1 * initViewFactor),
      this.width / initViewFactor,
      this.height / initViewFactor,
      this.height / (-1 * initViewFactor),
      1,
      4000,
    );
    this.camera.name = 'camera';

    // this.scene.add(this.camera);
    let heading = this.world.autoDrivingCar.heading;
    if (STORE.options.showBevRight) {
      heading += (Math.PI / 2);
    }

    this.camera.up.set(Math.cos(heading), Math.sin(heading), 0);
    this.viewAngle = PARAMETERS.camera.viewAngle;
    this.viewDistance = (
      PARAMETERS.camera.laneWidth
            * PARAMETERS.camera.laneWidthToViewDistanceRatio);

    let deltaX = (this.viewDistance * 1.5 / this.camera.zoom * Math.cos(target.rotation.y)
            * Math.cos(this.viewAngle));
    let deltaY = (this.viewDistance * 1.5 / this.camera.zoom * Math.sin(target.rotation.y)
                * Math.cos(this.viewAngle));

    if (STORE.options.showFollowCar) {
      this.camera.position.x = target.position.x + deltaX;
      this.camera.position.y = target.position.y + deltaY;
      this.camera.lookAt({
        x: target.position.x + deltaX,
        y: target.position.y + deltaY,
        z: 50,
      });
      this.followCarFlag = true;
    }

    const carPosition = this.adc.mesh.position;
    this.camera.position.set(carPosition.x, carPosition.y, 50);
   
    const lookAtPosition = new THREE.Vector3(carPosition.x, carPosition.y, 0);
    this.camera.lookAt(lookAtPosition);


    this.camera.updateProjectionMatrix();
  }

  enableOrbitControls(enableRotate) {
    // update camera
    const carPosition = this.adc.mesh.position;
    this.camera.position.set(carPosition.x, carPosition.y, 50);
    // if (this.coordinates.systemName === 'FLU') {
    //   this.camera.up.set(1, 0, 0);
    // } else {
    //   this.camera.up.set(0, 0, 1);
    // }
    const lookAtPosition = new THREE.Vector3(carPosition.x, carPosition.y, 0);
    this.camera.lookAt(lookAtPosition);

    // update control reset values to match current camera's
    this.controls.target0 = lookAtPosition.clone();
    this.controls.position0 = this.camera.position.clone();
    this.controls.zoom0 = this.camera.zoom;

    // set distance control
    this.controls.minDistance = 4;
    this.controls.maxDistance = 4000;

    // set vertical angle control
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.controls.enabled = true;
    this.controls.enableRotate = enableRotate;
    this.controls.reset();
  }
  
}

module.exports = render
