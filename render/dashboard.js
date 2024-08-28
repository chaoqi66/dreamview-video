const THREE = require('three')
const Text3D = require('./text3d');
let { formatTime, fromSecStr } = require('../util/misc')

const textOffset = {
  acceleration: {
    right: 8,
    top: 6,
    isNumber: true
  },
  accunit: {
    right: 8,
    top: 9,
    value: 'm/s2',
    isNumber: false,
    size: 1.6
  },
  speed: {
    right: 22,
    top: 6,
    conversionFromMeterPerSecond: 3.6,
    isNumber: true
  },
  speedunit: {
    right: 22,
    top: 9,
    value: 'km/h',
    isNumber: false,
    size: 1.6
  },
  steeringAngleRad: {
    right: 8,
    top: 15,
    conversionFromMeterPerSecond: 57.29577951308232,
    isNumber: true
  },
  steeringAngleRadUnit: {
    right: 5,
    top: 13,
    value: 'o',
    isNumber: false,
    size: 1.6
  },
  expectationSpeed: {
    right: 22,
    top: 15,
    conversionFromMeterPerSecond: 3.6
  },
  expectationSpeedUnit: {
    right: 22,
    top: 18,
    value: 'km/h',
    isNumber: false,
    size: 1.6
  }
}

const laneLightImgsMap = {
  FORWARD: {
    GREEN: 'arrowUpGreen',
    ORANGE: 'arrowUpOrange',
    RED: 'arrowUpRed'
  },
  TURN_LEFT: {
    GREEN: 'arrowleftGreen',
    ORANGE: 'arrowleftOrange',
    RED: 'arrowleftRed'
  },
  TURN_RIGHT: {
    GREEN: 'arrowrightGreen',
    ORANGE: 'arrowrightOrange',
    RED: 'arrowrightRed'
  },
  UTURN_LEFT: {
    GREEN: 'turnAroundGreen',
    ORANGE: 'turnAroundOrange',
    RED: 'turnAroundRed'
  },
  FORWARD_LEFT: {
    GREEN: 'straightTurnLeftGreen',
    ORANGE: 'straightTurnLeftOrange',
    RED: 'straightTurnLeftRed'
  },
  FORWARD_RIGHT: {
    GREEN: 'straightTurnRightGreen',
    ORANGE: 'straightTurnRightOrange',
    RED: 'straightTurnRightRed'
  }
}
module.exports = class Dashboard {
  constructor(world, scene, camera, images) {
    this.scene = scene;
    this.textRender = new Text3D();
    this.images = images

    // 计算文字的新位置
    Object.keys(textOffset).map(type => {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      const textPosition = new THREE.Vector3()
        .add(right.multiplyScalar(camera.right - textOffset[type].right))
        .add(up.multiplyScalar(camera.top - textOffset[type].top))
        .setZ(0);

      let content = world.autoDrivingCar[type]
     
      if (type === 'expectationSpeed') {
        content = world.expectationSpeed
      }
      if (textOffset[type].value) content = textOffset[type].value
      if (textOffset[type].conversionFromMeterPerSecond) content = content * textOffset[type].conversionFromMeterPerSecond
      if (textOffset[type].isNumber) {
        content = (content * 1).toFixed(2)
      }
      if (type === 'expectationSpeed' || type === 'steeringAngleRad') {
        content = (content * 1).toFixed(0)
      }
      this.textRender.addTextMesh(
          content + '',
          textPosition,
          scene,
          camera,
          textOffset[type].size ? textOffset[type].size: 3 
      )
    })

    this.drawTime(camera, world, scene)
    this.drawTernSingle(world, scene, camera)
    this.trafficLightSign(world, scene, camera)

    if (world.autoDrivingCar.chassisDrivingMode !== undefined) {
      const newDrivingMode = this.toNewDrivingMode(world.autoDrivingCar.chassisDrivingMode);
      const isNewAutoMode = this.isNewAutoMode(world.autoDrivingCar.chassisDrivingMode);
      let color = isNewAutoMode ? 0x006aff : 0xb43131

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      const textPosition = new THREE.Vector3()
        .add(right.multiplyScalar(camera.right - 35))
        .add(up.multiplyScalar(camera.top - 13))
        .setZ(0);

      this.textRender.addTextMesh(
          newDrivingMode,
          textPosition,
          scene,
          camera,
          2.5,
          color
      )
    }

  }

  drawTime(camera, world, scene) {
    let timestampSec = world.autoDrivingCar.timestampSec
    let right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    let up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const textPosition = new THREE.Vector3()
      .add(right.multiplyScalar(camera.left + 20))
      .add(up.multiplyScalar(camera.top - 6))
      .setZ(0)
    this.textRender.addTextMesh(
        timestampSec + '',
        textPosition,
        scene,
        camera,
        2.2
    )

    const datetime = timestampSec ? formatTime(fromSecStr(timestampSec + '' || ''), null, 'YYYY-MM-DD HH:mm:ss.SSS') : '';
    right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const timeTextPosition = new THREE.Vector3()
      .add(right.multiplyScalar(camera.left + 25.5))
      .add(up.multiplyScalar(camera.top - 10))
      .setZ(0)
    this.textRender.addTextMesh(
        datetime + '',
        timeTextPosition,
        scene,
        camera,
        2.2
    )
  }

  drawTernSingle(world, scene, camera) {
    let rightTurnSignal = world.autoDrivingCar?.rightTurnSignal;
    let leftTurnSignal = world.autoDrivingCar?.leftTurnSignal;
    const leftImage = leftTurnSignal ? this.images['arrowleftOrange'] : this.images['arrowleftGreen']
    const rightImage = rightTurnSignal ? this.images['arrowrightOrange'] : this.images['arrowrightGreen']

    let right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    let up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const rightPosition = new THREE.Vector3()
      .add(right.multiplyScalar(camera.right - 8))
      .add(up.multiplyScalar(camera.top - 21))
      .setZ(0)
    
    let rightMarker = this.drawImage(rightImage, 4, 4, rightPosition.x, rightPosition.y, 0, world, camera);
    scene.add(rightMarker)

    right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const leftPosition = new THREE.Vector3()
      .add(right.multiplyScalar(camera.right - 22))
      .add(up.multiplyScalar(camera.top - 21))
      .setZ(0)
    let leftMarker = this.drawImage(leftImage, 4, 4, leftPosition.x, leftPosition.y, 0, world, camera);
    scene.add(leftMarker)
  }

  trafficLightSign(world, scene, camera) {
    let laneLightSet =  world?.roadStructure?.laneLightSet || [];
    let autoCarLaneLight = laneLightSet && laneLightSet.filter(item => {
      if (item.isVirtual) {
        return false;
      }
      if (item.belongToCurrentLane && Array.isArray(item.belongToCurrentLane)) {
        return item.belongToCurrentLane.includes(true);
      }
      return false;
    });
    // autoCarLaneLight.push({
    //   naviType: 'TURN_RIGHT',
    //   color: 'ORANGE'
    // })
    // autoCarLaneLight.push({
    //   naviType: 'UTURN_LEFT',
    //   color: 'RED'
    // })
    autoCarLaneLight.reverse()
    autoCarLaneLight.map((item, index) => {
      let iamgesMap = laneLightImgsMap[item.naviType]
      if (iamgesMap) {
        let imgType = iamgesMap[this.getTlColor(item)]
        if (imgType) {

          let image = this.images[imgType]
          let right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
          let up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
          const position = new THREE.Vector3()
            .add(right.multiplyScalar(camera.right - 35 - 8 * index))
            .add(up.multiplyScalar(camera.top - 5))
            .setZ(0)
          let imaMarker = this.drawImage(image, 4.5, 4.5, position.x, position.y, 0, world, camera);
          scene.add(imaMarker)

          
          if (item.countdown > -1) {
            right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
            up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
            const textPosition = new THREE.Vector3()
              .add(right.multiplyScalar(camera.right - 35 + 3.5 - 8 * index))
              .add(up.multiplyScalar(camera.top - 5 - 0.5))
              .setZ(0)

            this.textRender.addTextMesh(
              item.countdown + '',
              textPosition,
              scene,
              camera,
              1.8
            )
          }

        }
      }
    })
    
  }

  drawImage(img, width, height, x = 0, y = 0, z = 0, world, camera) {
    const texture = new THREE.Texture()
    texture.format = 1023;
    texture.image = img;
    texture.needsUpdate = true;
    texture.rotation = Math.PI / 4; // 旋转45度   texture.rotation = Math.PI / 4; // 旋转45度
    const material = new THREE.MeshBasicMaterial(
      {
        map: texture,
        transparent: true,
      },
    );
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1), material);
    mesh.position.set(x, y, z);
    if (camera !== undefined && camera.quaternion !== undefined) {
      mesh.quaternion.copy(camera.quaternion);
    }
    return mesh;
  }

  getTlColor(laneLight) {
    if (laneLight && laneLight.color) {
      let color = '';
      switch (laneLight.color) {
        case 'GREEN_FLASH': {
          color = 'GREEN';
          break;
        }
        case 'YELLOW_FLASH': {
          color = 'ORANGE';
          break;
        }
        case 'RED_FLASH': {
          color = 'RED';
          break;
        }
        default:
          color = laneLight.color;
      }
      return color;
    } else {
      return '';
    }
  }
  toNewDrivingMode(drivingMode) {
    switch (drivingMode) {
      case 'COMPLETE_AUTO_DRIVE':
        return 'AUTO';
      case 'COMPLETE_MANUAL':
        return 'MANUAL';
      case 'AUTO_STEER_ONLY':
        return 'STEER';
      case 'AUTO_SPEED_ONLY':
        return 'SPEED';
      default:
        return 'UNKNOWN';
    }
  }

  isNewAutoMode(drivingMode) {
    return drivingMode === 'COMPLETE_AUTO_DRIVE'
             || drivingMode === 'AUTO_STEER_ONLY'
             || drivingMode === 'AUTO_SPEED_ONLY';
  }

}
