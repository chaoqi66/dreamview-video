const THREE = require('three')
const STORE = require('./config/store')
const _ = require("loadsh")
const Text3D = require('./text3d');

const {
  drawSegmentsFromPoints, drawDashedLineFromPoints,
  drawBox, drawSolidBox, drawDashedBox, drawArrow, drawImage, drawSolidPolygonFace,
  drawShapeFromPoints
} = require('../util/draw');
const {
  copyProperty, hideArrayObjects,convertToUpperCaseWithUnderscore
} = require('../util/misc');
// import iconObjectYield from 'assets/images/decision/object-yield.png';

const DEFAULT_HEIGHT = 1.5;
const DEFAULT_COLOR = 0xFFFFFF;
const ObstacleTopicColorMapping = {
  // 激光神经网络结果
  '/bev_object': 0xCAFF70,

  // 视觉神经网络结果
  '/pv_fm_narrow_object': 0x68838B,
  '/pv_fm_wide_object': 0x8B008B,
  '/pv_lb_pinhole_object': 0x104E8B,
  '/pv_rb_pinhole_object': 0x104E8B,
  '/pv_fm_fisheye_object': 0xA52A2A,
  '/pv_lm_fisheye_object': 0xFFA07A,
  '/pv_rm_fisheye_object': 0xFFA07A,
  '/pv_bm_fisheye_object': 0xFF4500,

  // 激光后处理
  '/bev_post_object': 0x008B00,

  // 视觉后处理
  '/pv_post_fm_narrow_object': 0xBFEFFF,
  '/pv_post_fm_wide_object': 0xFF00FF,
  '/pv_post_lb_pinhole_object': 0x1E90FF,
  '/pv_post_rb_pinhole_object': 0x1E90FF,

  // 通用障碍物
  '/occupancy_object': 0xFFDEAD
};
const ObstacleColorMapping = {
  PEDESTRIAN: 0xFFEA00,
  BICYCLE: 0x00DCEB,
  VEHICLE: 0x00FF3C,
  VIRTUAL: 0x800000,
  CIPV: 0xFF9966,
};
let InteractLatColorMapping = {
  IGNORE_LAT: 0xDCDCDC,
  BYPASS_LEFT: 0x3636a9,
  BYPASS_RIGHT: 0x1E90FF,
};
let InteractLonColorMapping = {
  IGNORE_LON: 0xD3D3D3,
  FOLLOW: 0x058905,
  OVERTAKE: 0xe5e550,
  YIELD: 0xbd4d4d
};
const LINE_THICKNESS = 1.5;
const FACE_TYPE = Object.freeze({
  SOLID_LINE: 'extrusionSolidFaces',
  SOLID_LINE_PNC: 'extrusionSolidFacesPnc',
  DASHED_LINE: 'extrusionDashedFaces',
  SOLID_FACE: 'v2xSolidFaces',
});
const CUBE_TYPE = Object.freeze({
  SOLID_LINE: 'solidCubes',
  DASHED_LINE: 'dashedCubes',
  SOLID_FACE: 'v2xCubes',
});
// exist_confidence 0高，1中，2低
const EXIST_CCONFIDENCE_COLOR = {
  0: 0xffffff,
  1: 0xffff00,
  2: 0x00ff00,
};
const EXIST_CCONFIDENCE_TEXT = {
  0: 'H',
  1: 'M',
  2: 'L',
};

module.exports = class PerceptionObstaclesNew {
  constructor() {
    this.textRender = new Text3D();
    this.arrows = []; // for indication of direction of moving obstacles
    this.ids = []; // for obstacle id labels
    this.solidCubes = []; // for obstacles with only length/width/height
    this.dashedCubes = []; // for obstacles with only length/width/height
    this.extrusionSolidFaces = []; // for obstacles with polygon points
    this.extrusionSolidFacesPnc = [];
    this.extrusionDashedFaces = []; // for obstacles with polygon points
    this.laneMarkers = []; // for lane markers
    this.icons = [];
    this.trafficCones = []; // for traffic cone meshes
    this.v2xCubes = [];
    this.v2xSolidFaces = [];

    this.arrowIdx = 0;
    this.cubeIdx = 0;
    this.extrusionFaceIdx = 0;
    this.extrusionPncFaceIdx = 0;
    this.iconIdx = 0;
    this.trafficConeIdx = 0;
    this.v2xCubeIdx = 0;
    this.v2xSolidFaceIdx = 0;

    this.interactLonBottomList = [];
    this.bboxDoorList = [];
    this.textList = [];
  }

  update(world, coordinates, scene, camera, size, isBirdView) {
    if (STORE.options.showInteractColor) {
      InteractLatColorMapping = {
        IGNORE_LAT: 0xDCDCDC,
        BYPASS_LEFT: 0x0000FF,
        BYPASS_RIGHT: 0x1E90FF,
      };
      InteractLonColorMapping = {
        IGNORE_LON: 0xD3D3D3,
        FOLLOW: 0x00FF7F,
        OVERTAKE: 0xFFFF00,
        YIELD: 0xFF0000,
      };
    }
    if (camera !== undefined) {
      this.resetObjects(scene, _.isEmpty(world.objectNew));
      this.resetObjects(scene, _.isEmpty(world.objectPredicted));
      this.updateObjects(world, coordinates, scene, camera, size, isBirdView);
      this.updateSensorMeasurements(world, coordinates, scene);
      this.hideUnusedObjects();
    }
  }

  updateObjects(world, coordinates, scene, camera, size, isBirdView) {
    let objects = [];
    const objectFusionPredicted = world.objectPredicted && world.objectPredicted.objectFusion;
    const objectFusionNew = world.objectNew && world.objectNew.objectFusion;
    const objectFusionPnc = world.objectPredictionPnc?.objectFusion;
    const planningObstacles = world?.planningData?.obstacle || [];
    if (STORE.options['showPredictionObject'] && Array.isArray(objectFusionPredicted) && objectFusionPredicted.length > 0) {
      objectFusionPredicted.forEach(item => {
        item.isPrediction = true;
      });
      objects = objects.concat(objectFusionPredicted);
    }
    if (STORE.options['showPerceptionObject'] && Array.isArray(objectFusionNew) && objectFusionNew.length > 0) {
      objects = objects.concat(objectFusionNew);

      const objectInner = world.objectNew && world.objectNew.objectInner;
      if (Array.isArray(objectInner) && objectInner.length > 0) {
        objectInner.forEach(item => {
          item.isObjectInner = true;
        });
        objects = objects.concat(objectInner);
      }
      // console.log('objectInner = ', objectInner);
    }
    if (STORE.options['showPncObject'] && Array.isArray(objectFusionPnc) && objectFusionPnc.length > 0) {
      objectFusionPnc.forEach(item => {
        item.isPncObject = true;
      });
      objects = objects.concat(objectFusionPnc);
    }

    if (_.isEmpty(objects)) {
      return;
    }
    // console.log('obstaclesNew objects = ', objects);

    const adc = coordinates.applyOffset({
      x: world.autoDrivingCar.positionX,
      y: world.autoDrivingCar.positionY,
    });
    adc.heading = world.autoDrivingCar.heading;

    for (let i = 0; i < objects.length; i++) {
      const obstacle = objects[i];
      if (!STORE.options[`showObstacles${_.upperFirst(_.camelCase(obstacle.type))}`]
          || !_.isNumber(obstacle.positionX) || !_.isNumber(obstacle.positionY)) {
        continue;
      }

      if (!STORE.options.showObstaclesV2xInfo && obstacle.source === 'V2X') {
        continue;
      }

      if (!STORE.options[`showObstacles${_.upperFirst(_.camelCase(obstacle.topic))}`]) {
        continue;
      }

      const planningObstacle = planningObstacles.find(pObs => pObs.id.indexOf(obstacle.id) === 0);
      if (planningObstacle) {
        obstacle.isDeadCar = planningObstacle.isDeadCar;
      }

      // console.log('obstacle = ', obstacle);

      const position = coordinates.applyOffset(
        new THREE.Vector3(obstacle.positionX,
          obstacle.positionY,
          (obstacle.height || DEFAULT_HEIGHT) / 2),
      );
      let color = ObstacleColorMapping[obstacle.type] || DEFAULT_COLOR;
      if (obstacle.isObjectInner) {
        color = ObstacleTopicColorMapping[obstacle.topic] || DEFAULT_COLOR;
      }
      // const color = ObstacleTopicColorMapping[obstacle.topic] || DEFAULT_COLOR;
      const isV2X = (obstacle.source === 'V2X');

      // console.log('obstacle.predictionDecision = ', obstacle.predictionDecision);
      if (obstacle.isPrediction && obstacle.predictionDecision && obstacle.predictionDecision.length > 0) {
        let predictionDecision = obstacle.predictionDecision[0];
        const decisionRetPair = STORE.meters.selectEfficientLaneSequence?.decisionRetPair;
        if (decisionRetPair) {
          const decision = decisionRetPair.find(dec => String(dec.obsId) === String(obstacle.id));
          if (decision) {
            predictionDecision = decision;
          }
        }
        const interactLon = predictionDecision.interactLon;
        const interactLat = predictionDecision.interactLat;
        if (STORE.options.showPredictionDecision && interactLat instanceof Object) {
          const maxKey = this.findMaxKey(interactLat);
          if (maxKey) {
            color = InteractLatColorMapping[convertToUpperCaseWithUnderscore(maxKey)] || DEFAULT_COLOR;
            obstacle.isPredictionDecision = true;
          }
        }

        if (STORE.options['showPredictionObject'] && STORE.options.showPredictionDecision && interactLon instanceof Object) {
          const maxKeyLon = this.findMaxKey(interactLon);
          if (maxKeyLon) {
            const interactLonBottomColor = InteractLonColorMapping[convertToUpperCaseWithUnderscore(maxKeyLon)] || DEFAULT_COLOR;
            const interactLonBottom = drawShapeFromPoints(
              coordinates.applyOffsetToArray(obstacle.bboxPoint ?? obstacle.polygonPoint),
              new THREE.MeshBasicMaterial({ color: interactLonBottomColor, transparent: true, opacity: 0.6 }), false, 2,
            );
            scene.add(interactLonBottom);
            this.interactLonBottomList.push(interactLonBottom);
          }
        }
      }

      if (STORE.options.showObstaclesVelocity && obstacle.type
        && obstacle.type !== 'UNKNOWN_UNMOVABLE' && obstacle.speed > 0.5) {
        const arrowMesh = this.updateArrow(position,
          obstacle.speedHeading, color, scene);
        this.arrowIdx++;
        let scale = 1 + Math.log2(obstacle.speed);
        if (STORE.options.showPerceptionObject) {
          scale = obstacle.speed;
        }
        arrowMesh.scale.set(scale, scale, scale);
        arrowMesh.visible = true;
      }

      if (STORE.options.showObstaclesHeading) {
        if (obstacle.objectType !== 'TYPE_STATIC_UNKNOWN' || (obstacle.objectType === 'TYPE_STATIC_UNKNOWN' && STORE.options.showPerceptionTypeStaticUnkonwn)) {
          this.drawObstacleHeading(position, obstacle.heading, scene);
          this.arrowIdx++;
        }
      }

      this.updateTexts(adc, obstacle, position, scene, camera, size, isBirdView, isV2X);

      // get the confidence and validate its range
      let confidence = obstacle.confidence;
      confidence = Math.max(0.0, confidence);
      confidence = Math.min(1.0, confidence);
      // confidence is useless
      confidence = 1.0;
      const polygon = obstacle.polygonPoint;
      const bbox = obstacle.bboxPoint;
      let polygonAndBbox = [];
      if (!obstacle.isPredictionDecision) {
        obstacle.existConfidenceColor = EXIST_CCONFIDENCE_COLOR[obstacle.existConfidence] || color;
      }
      if (bbox) {
        obstacle.bboxType = true;
      }
      if (!obstacle.bboxType && obstacle.isPredictionDecision) {
        this.addTextMesh('i', camera, EXIST_CCONFIDENCE_COLOR[obstacle.existConfidence], position, size, scene);
      }

      if (!STORE.options['showPolygon'] && bbox) {
        polygonAndBbox = [bbox].filter(Boolean);
      } else {
        polygonAndBbox = [bbox, polygon].filter(Boolean);
      }

      if (obstacle.subType === 'ST_TRAFFICCONE') {
        this.updateTrafficCone(position, scene);
        this.trafficConeIdx++;
      } else if (polygonAndBbox && polygonAndBbox.length > 0) {
        if (isV2X) {
          polygonAndBbox.forEach(item => {
            this.updatePolygon(item, obstacle.height, color, coordinates, confidence,
              scene, true, obstacle);
            this.v2xSolidFaceIdx += item.length;
          });
        } else {
          polygonAndBbox.forEach(item => {
            this.updatePolygon(item, obstacle.height, color, coordinates, confidence,
              scene, false, obstacle);
            if (obstacle.isPncObject) {
              this.extrusionPncFaceIdx += item.length;
            } else {
              this.extrusionFaceIdx += item.length;
            }
          });
        }
      } else if (obstacle.length && obstacle.width && obstacle.height) {
        if (isV2X) {
          this.updateV2xCube(obstacle.length, obstacle.width, obstacle.height, position,
            obstacle.heading, color, scene);
          this.v2xCubeIdx++;
        } else {
          this.updateCube(obstacle.length, obstacle.width, obstacle.height, position,
            obstacle.heading, color, confidence, scene);
          this.cubeIdx++;
        }
      }


      // draw a yield sign to indicate ADC is yielding to this obstacle
      // if (obstacle.yieldedObstacle) {
      //   const iconPosition = {
      //     x: position.x,
      //     y: position.y,
      //     z: position.z + obstacle.height + 0.5,
      //   };
      //   this.updateIcon(iconPosition, world.autoDrivingCar.heading, scene);
      //   this.iconIdx++;
      // }
    }
  }

  addTextMesh(text, camera, color, position, size, scene) {
    const textMesh = new THREE.Object3D();
    const { charMesh, charWidth }  = this.textRender.drawChar3D(text, color, size);
    textMesh.position.set(position.x, position.y, position.z);
    textMesh.add(charMesh);
    textMesh.children.forEach((child) => {
      child.position.setX(child.position.x - charWidth / 2);
    });
    if (camera !== undefined && camera.quaternion !== undefined) {
      textMesh.quaternion.copy(camera.quaternion);
    }
    scene.add(textMesh);
    this.textList.push(textMesh);
  }

  findMaxKey(obj) {
    let maxKey = null;
    let maxValue = -Infinity;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] > maxValue) {
          maxValue = obj[key];
          maxKey = key;
        }
      }
    }

    return maxKey;
  }

  updateSensorMeasurements(world, coordinates, scene) {
    if (!STORE.options.showObstaclesLidarSensor && !STORE.options.showObstaclesRadarSensor
      && !STORE.options.showObstaclesCameraSensor) {
      return;
    }

    const sensorMeasures = world.sensorMeasurements;
    for (const key in sensorMeasures) {
      const sensorType = this.deduceSensorType(key.toLowerCase());
      if (!sensorType || !STORE.options[`showObstacles${sensorType}`]) {
        continue;
      }

      for (const measurement of sensorMeasures[key].sensorMeasurement) {
        if (!_.isNumber(measurement.positionX) || !_.isNumber(measurement.positionY)) {
          continue;
        }

        const position = coordinates.applyOffset(
          new THREE.Vector3(measurement.positionX,
            measurement.positionY,
            (measurement.height || DEFAULT_HEIGHT) / 2),
        );
        const color = ObstacleColorMapping[measurement.type] || DEFAULT_COLOR;

        if (STORE.options.showObstaclesHeading) {
          this.drawObstacleHeading(position, measurement.heading, scene);
          this.arrowIdx++;
        }

        if (measurement.subType === 'ST_TRAFFICCONE') {
          this.updateTrafficCone(position, scene);
          this.trafficConeIdx++;
        } else if (measurement.length && measurement.width && measurement.height) {
          this.updateCube(measurement.length, measurement.width,
            measurement.height, position,
            measurement.heading, color, 0.5, scene);
          this.cubeIdx++;
        }
      }
    }
  }

  resetObjects(scene, empty) {
    // Id meshes need to be recreated every time.
    // Each text mesh needs to be removed from the scene,
    // and its char meshes need to be hidden for reuse purpose.
    if (!_.isEmpty(this.ids)) {
      this.ids.forEach((t) => {
        t.children.forEach((c) => c.visible = false);
        scene.remove(t);
      });
      this.ids = [];
    }

    this.interactLonBottomList.forEach((n) => {
      scene.remove(n);
      n.geometry.dispose();
      n.material.dispose();
    });
    this.interactLonBottomList = [];

    this.bboxDoorList.forEach((n) => {
      scene.remove(n);
      n.geometry.dispose();
      n.material.dispose();
    });
    this.bboxDoorList = [];

    this.textList.forEach((n) => {
      scene.remove(n);
    });
    this.textList = [];

    this.textRender.reset();
    this.arrowIdx = 0;
    this.cubeIdx = 0;
    this.extrusionFaceIdx = 0;
    this.extrusionPncFaceIdx = 0;
    this.iconIdx = 0;
    this.trafficConeIdx = 0;
    this.v2xCubeIdx = 0;
    this.v2xSolidFaceIdx = 0;
    if (empty) {
      this.hideUnusedObjects();
    }
  }

  hideUnusedObjects() {
    hideArrayObjects(this.arrows, this.arrowIdx);
    hideArrayObjects(this.solidCubes, this.cubeIdx);
    hideArrayObjects(this.dashedCubes, this.cubeIdx);
    hideArrayObjects(this.extrusionSolidFaces, this.extrusionFaceIdx);
    hideArrayObjects(this.extrusionSolidFacesPnc, this.extrusionPncFaceIdx);
    hideArrayObjects(this.extrusionDashedFaces, this.extrusionFaceIdx);
    hideArrayObjects(this.icons, this.iconIdx);
    hideArrayObjects(this.trafficCones, this.trafficConeIdx);
    hideArrayObjects(this.v2xCubes, this.v2xCubeIdx);
    hideArrayObjects(this.v2xSolidFaces, this.v2xSolidFaceIdx);
  }

  deduceSensorType(key) {
    if (key.search('radar') !== -1) {
      return 'RadarSensor';
    }
    if (key.search('lidar') !== -1 || key.search('velodyne') !== -1) {
      return 'LidarSensor';
    }
    if (key.search('camera') !== -1) {
      return 'CameraSensor';
    }
    console.warn('Cannot deduce sensor type:', key);
    return null;
  }

  updateArrow(position, heading, color, scene) {
    const arrowMesh = this.getArrow(this.arrowIdx, scene);
    copyProperty(arrowMesh.position, position);
    arrowMesh.material.color.setHex(color);
    arrowMesh.rotation.set(0, 0, -(Math.PI / 2 - heading));
    return arrowMesh;
  }

  updateTexts(adc, obstacle, obstaclePosition, scene, camera, size, isBirdView, isV2X) {
    if (obstacle.objectType === 'TYPE_STATIC_UNKNOWN' && !STORE.options.showPerceptionTypeStaticUnkonwn) {
      return;
    }

    const enterObstacleId = STORE.meters.enterObstacleId;

    const initPosition = {
      x: obstaclePosition.x,
      y: obstaclePosition.y,
      z: obstacle.height || 3,
    };

    const lineSpacing = 0.5;
    const deltaX = isBirdView ? 0.0 : lineSpacing * Math.cos(adc.heading);
    const deltaY = isBirdView ? 0.7 : lineSpacing * Math.sin(adc.heading);
    const deltaZ = isBirdView ? 0.0 : lineSpacing;
    let lineCount = 0;
    if (STORE.options.showObstaclesId) {
      const speed = obstacle.speed.toFixed(1);
      const existConfidenceText = EXIST_CCONFIDENCE_TEXT[obstacle.existConfidence] ? `/${EXIST_CCONFIDENCE_TEXT[obstacle.existConfidence]}` : '';
      if (!enterObstacleId || obstacle.id === enterObstacleId) {
        let text = `${obstacle.id}${existConfidenceText}`;
        if (camera !== undefined && camera instanceof THREE.OrthographicCamera) {
          text = `${obstacle.id}${existConfidenceText}/${speed}`;
        }
        if (obstacle.isDeadCar) {
          this.addTextMesh(text, camera, 0xffffff, {x: initPosition.x, y: initPosition.y, z: initPosition.z}, size, scene);
        } else {
          this.drawTexts(text,
            initPosition,
            scene,
            camera,
            obstacle.isPncObject ? 0.8 : size,
            obstacle.isPncObject ? 0xFFA500 : 0xffff00);
        }
        lineCount++;
      }
    }
    if (STORE.options.showObstaclesInfo) {
      if (camera !== undefined && camera instanceof THREE.PerspectiveCamera) {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        const speed = obstacle.speed.toFixed(1);
        if (!enterObstacleId || obstacle.id === enterObstacleId) {
          this.drawTexts(`${speed}`, textPosition, scene, camera, size, obstacle.isPncObject ? 0xFFA500 : 0xffff00);
          lineCount++;
        }
      }
      // if (camera !== undefined && camera instanceof THREE.OrthographicCamera) {
      //   textPosition = {
      //     x: initPosition.x - (lineCount * deltaX),
      //     y: initPosition.y - ((lineCount + 1.3) * deltaY),
      //     z: initPosition.z - ((lineCount + 1.5) * deltaZ),
      //   };
      // }
    }

    // if (STORE.options.showObstaclesInfo) {
    //   const distance = adc.distanceTo(obstaclePosition).toFixed(1);
    //   const obstacleId = obstacle.id;
    //   const speed = obstacle.speed.toFixed(1);
    //   // this.drawTexts(`(${distance}m, ${speed}m/s)`, initPosition, scene, camera);
    //   this.drawTexts(`${speed}`, initPosition, scene, camera, size, 0xffd500);
    //   lineCount++;
    // }
    // if (STORE.options.showObstaclesId && obstacle.topic === '/post_fusion_object') {
    //   const textPosition = {
    //     x: initPosition.x - (lineCount * deltaX),
    //     y: initPosition.y - ((lineCount + 1.3) * deltaY),
    //     z: initPosition.z - ((lineCount + 1.5) * deltaZ),
    //   };
    //   this.drawTexts(obstacle.id, textPosition, scene, camera, size, 0xffd500);
    //   lineCount++;
    // }
    if (obstacle.needToAvoid) {
      // console.log('obstacle.needToAvoid = ', obstacle.needToAvoid);
      // console.log('obstacle.id = ', obstacle.id);
      let textPosition = initPosition;
      let text = '          !!';
      if (camera !== undefined && camera instanceof THREE.OrthographicCamera) {
        textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - ((lineCount - 4) * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        text = '           !!';
      }
      this.drawTexts(text, textPosition, scene, camera, size, 0xff0000);
      lineCount++;
    }
    if (STORE.options.showPredictionPriority) {
      const priority = _.get(obstacle, 'obstaclePriority.priority');
      if (priority && priority !== 'NORMAL') {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        this.drawTexts(priority, textPosition, scene, camera, size);
        lineCount++;
      }
    }
    if (STORE.options.showPredictionInteractiveTag) {
      const interactiveTag = _.get(obstacle, 'interactiveTag.interactiveTag');
      if (interactiveTag && interactiveTag !== 'NONINTERACTION') {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        this.drawTexts(interactiveTag, textPosition, scene, camera, size);
        lineCount++;
      }
    }
    if (STORE.options.showObstacleStatus) {
      const obstacleStatus = _.get(obstacle, 'obstacleStatus');
      if (obstacleStatus) {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        this.drawTexts(obstacleStatus, textPosition, scene, camera, size);
        lineCount++;
      }
    }
    if (STORE.options.showGoalLaneInJunction) {
      const goalLaneInJunction = _.get(obstacle, 'goalLaneInJunction');
      if (goalLaneInJunction) {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        this.drawTexts(goalLaneInJunction, textPosition, scene, camera, size);
        lineCount++;
      }
    }
    if (isV2X) {
      _.get(obstacle,'v2xInfo.v2xType',[]).forEach((t) => {
        const textPosition = {
          x: initPosition.x - (lineCount * deltaX),
          y: initPosition.y - (lineCount * deltaY),
          z: initPosition.z - (lineCount * deltaZ),
        };
        this.drawTexts(t, textPosition, scene, camera, size, 0xFF0000);
        lineCount++;
      });
    }
  }

  updatePolygon(points, height, color, coordinates, confidence, scene, isForV2X = false, obstacle) {
    for (let i = 0; i < points.length; i++) {
      // Get the adjacent point.
      const next = (i === points.length - 1) ? 0 : i + 1;
      const v = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
      const vNext = new THREE.Vector3(points[next].x, points[next].y, points[next].z);

      // Compute position.
      const facePosition = coordinates.applyOffset(
        new THREE.Vector2((v.x + vNext.x) / 2.0, (v.y + vNext.y) / 2.0),
      );
      if (facePosition === null) {
        continue;
      }

      // Compute face scale.
      const edgeDistance = v.distanceTo(vNext);
      if (edgeDistance === 0) {
        console.warn('Cannot display obstacle with an edge length 0!');
        continue;
      }

      if (isForV2X) {
        const v2xFaceMesh = this.getFace(this.v2xSolidFaceIdx + i, scene, FACE_TYPE.SOLID_FACE);
        v2xFaceMesh.position.set(facePosition.x, facePosition.y, height);
        v2xFaceMesh.scale.set(edgeDistance, 1, height);
        v2xFaceMesh.material.color.setHex(color);
        v2xFaceMesh.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
        // Make the plane stand up
        v2xFaceMesh.rotateX(Math.PI / 2);
        v2xFaceMesh.visible = true;
      } else {
        let solidFaceMesh = null;
        if (obstacle.isPncObject) {
          solidFaceMesh = this.getFace(this.extrusionPncFaceIdx + i, scene, FACE_TYPE.SOLID_LINE_PNC);
        } else {
          solidFaceMesh = this.getFace(this.extrusionFaceIdx + i, scene, FACE_TYPE.SOLID_LINE);
        }
        const dashedFaceMesh = this.getFace(this.extrusionFaceIdx + i, scene, FACE_TYPE.DASHED_LINE);
        solidFaceMesh.position.set(facePosition.x, facePosition.y, 0);
        dashedFaceMesh.position.set(facePosition.x, facePosition.y, height * confidence);
        solidFaceMesh.scale.set(edgeDistance, 1, height * confidence);
        dashedFaceMesh.scale.set(edgeDistance, 1, height * (1 - confidence));
        solidFaceMesh.material.color.setHex(color);
        solidFaceMesh.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
        solidFaceMesh.visible = (confidence !== 0.0);
        dashedFaceMesh.material.color.setHex(color);
        dashedFaceMesh.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
        dashedFaceMesh.visible = (confidence !== 1.0);
        // Pnc Object通用障碍物不显示
        if (obstacle.isPncObject && obstacle.objectType === 'TYPE_STATIC_UNKNOWN') {
          solidFaceMesh.scale.set(0);
        }
        if (!obstacle.bboxType && obstacle.existConfidenceColor) {
          solidFaceMesh.material.color.setHex(obstacle.existConfidenceColor);
        }
      }

      // doorState  0 没开车门；1 开左侧车门；2 开右侧车门；3 开双向门
      if (obstacle.bboxType && obstacle.doorState) {
        if (i === 0 && [1, 3].includes(obstacle.doorState)) {
          // 左侧车门
          const carDoor = this.getCarDoor(obstacle, scene);
          carDoor.position.set(facePosition.x, facePosition.y, 0);
          carDoor.scale.set(edgeDistance * 0.5, 1, height * confidence);
          carDoor.material.color.setHex(color);
          carDoor.rotation.set(0, 0, 0);
          carDoor.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x) - Math.PI * 0.25);
        }
        if (i === 2 && [2, 3].includes(obstacle.doorState)) {
          // 右侧车门
          const carDoor = this.getCarDoor(obstacle, scene);
          carDoor.position.set(facePosition.x, facePosition.y, 0);
          carDoor.scale.set(edgeDistance * 0.5, 1, height * confidence);
          carDoor.material.color.setHex(color);
          carDoor.rotation.set(0, 0, 0);
          carDoor.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x) - Math.PI * 0.75);
        }
      }

      if (obstacle.bboxType) {
        if (i === 1) {
          if ([1, 3].includes(obstacle.signalLight)) {
            // 左转灯
            const position1 = coordinates.applyOffset(
              new THREE.Vector2(v.x, v.y),
            );
            const box1 = this.getGeometryBox(scene);
            box1.position.set(position1.x, position1.y, 0);
            box1.scale.set(1, 1, 1.5);
            box1.material.color.setHex(0xFFFF00);
            box1.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
          }
          if (obstacle.brakeLight === 1) {
            // 刹车灯
            const position2 = coordinates.applyOffset(
              new THREE.Vector2((2 * v.x + vNext.x) / 3, (2 * v.y + vNext.y) / 3),
            );
            const box2 = this.getGeometryBox(scene);
            box2.position.set(position2.x, position2.y, 0);
            box2.scale.set(1, 1, 1.5);
            box2.material.color.setHex(0xff0000);
            box2.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
          }
          if ([2, 3].includes(obstacle.signalLight)) {
            // 右转灯
            const position3 = coordinates.applyOffset(
              new THREE.Vector2((v.x + vNext.x * 2) / 3, (v.y + vNext.y * 2) / 3),
            );
            const box3 = this.getGeometryBox(scene);
            box3.position.set(position3.x, position3.y, 0);
            box3.scale.set(1, 1, 1.5);
            box3.material.color.setHex(0xFFFF00);
            box3.rotation.set(0, 0, Math.atan2(vNext.y - v.y, vNext.x - v.x));
          }
        }
      }
    }
  }

  getGeometryBox(scene) {
    const points = [
      new THREE.Vector3(0.6, 0.6, 0.6),
      new THREE.Vector3(0, 0.6, 0.6),
      new THREE.Vector3(0, 0, 0.6),
      new THREE.Vector3(0.6, 0, 0.6),
      new THREE.Vector3(0.6, 0, 0),
      new THREE.Vector3(0.6, 0.6, 0),
      new THREE.Vector3(0, 0.6, 0),
      new THREE.Vector3(0, 0, 0)
    ];

    const geometry = new THREE.Geometry();
    geometry.vertices = points;
    const faces = [
      new THREE.Face3(0,1,2),
      new THREE.Face3(0,2,3),
      new THREE.Face3(0,3,4),
      new THREE.Face3(0,4,5),
      new THREE.Face3(1,6,7),
      new THREE.Face3(1,7,2),
      new THREE.Face3(6,5,4),
      new THREE.Face3(6,4,7),
      new THREE.Face3(5,6,1),
      new THREE.Face3(5,1,0),
      new THREE.Face3(3,2,7),
      new THREE.Face3(3,7,4)
    ];
    geometry.faces = faces;
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    this.bboxDoorList.push(mesh);
    scene.add(mesh);
    return mesh;
  }

  getCarDoor(obstacle, scene) {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.8, 0, 0.5),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
    ];
    let carDoorFace = null;
    if (obstacle.isPncObject) {
      carDoorFace = drawDashedLineFromPoints(points, DEFAULT_COLOR, LINE_THICKNESS, 0.1, 0.15);
    } else {
      carDoorFace = drawSegmentsFromPoints(points, DEFAULT_COLOR, LINE_THICKNESS);
    }
    this.bboxDoorList.push(carDoorFace);
    scene.add(carDoorFace);
    return carDoorFace;
  }

  updateV2xCube(length, width, height, position, heading, color, scene) {
    const v2xCubeMesh = this.getCube(this.v2xCubeIdx, scene, CUBE_TYPE.SOLID_FACE);
    v2xCubeMesh.position.set(
      position.x, position.y, position.z);
    v2xCubeMesh.scale.set(length, width, height);
    v2xCubeMesh.material.color.setHex(color);
    // Change the outline color
    v2xCubeMesh.children[0].material.color.setHex(color);
    v2xCubeMesh.rotation.set(0, 0, heading);
    v2xCubeMesh.visible = true;
  }

  updateCube(length, width, height, position, heading, color, confidence, scene) {
    if (confidence > 0) {
      const solidCubeMesh = this.getCube(this.cubeIdx, scene, CUBE_TYPE.SOLID_LINE);
      solidCubeMesh.position.set(
        position.x, position.y, position.z + height * (confidence - 1) / 2);
      solidCubeMesh.scale.set(length, width, height * confidence);
      solidCubeMesh.material.color.setHex(color);
      solidCubeMesh.rotation.set(0, 0, heading);
      solidCubeMesh.visible = true;
    }

    if (confidence < 1) {
      const dashedCubeMesh = this.getCube(this.cubeIdx, scene, CUBE_TYPE.DASHED_LINE);
      dashedCubeMesh.position.set(
        position.x, position.y, position.z + height * confidence / 2);
      dashedCubeMesh.scale.set(length, width, height * (1 - confidence));
      dashedCubeMesh.material.color.setHex(color);
      dashedCubeMesh.rotation.set(0, 0, heading);
      dashedCubeMesh.visible = true;
    }
  }

  updateIcon(position, heading, scene) {
    const icon = this.getIcon(this.iconIdx, scene);
    copyProperty(icon.position, position);
    icon.rotation.set(Math.PI / 2, heading - Math.PI / 2, 0);
    icon.visible = true;
  }

  updateTrafficCone(position, scene) {
    const cone = this.getTrafficCone(this.trafficConeIdx, scene);
    cone.position.setX(position.x);
    cone.position.setY(position.y);
    cone.visible = true;
  }

  getArrow(index, scene) {
    if (index < this.arrows.length) {
      return this.arrows[index];
    }
    const arrowMesh = drawArrow(1.2, LINE_THICKNESS, 0.25, 0.25, DEFAULT_COLOR);
    arrowMesh.rotation.set(0, 0, -Math.PI / 2);
    arrowMesh.visible = false;
    this.arrows.push(arrowMesh);
    scene.add(arrowMesh);
    return arrowMesh;
  }

  getFace(index, scene, type) {
    const extrusionFaces = this[type];
    if (index < extrusionFaces.length) {
      return extrusionFaces[index];
    }

    const points = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0.5, 0, 0),
      new THREE.Vector3(0.5, 0, 1),
      new THREE.Vector3(-0.5, 0, 1),
    ];
    let extrusionFace = null;
    switch (type) {
      case FACE_TYPE.SOLID_FACE:
        extrusionFace = drawSolidPolygonFace();
        break;
      case FACE_TYPE.SOLID_LINE:
        extrusionFace = drawSegmentsFromPoints(points, DEFAULT_COLOR, LINE_THICKNESS);
        break;
      case FACE_TYPE.SOLID_LINE_PNC:
        extrusionFace = drawDashedLineFromPoints(points, DEFAULT_COLOR, LINE_THICKNESS, 0.1, 0.15);
        break;
      default:
        extrusionFace = drawDashedLineFromPoints(points, DEFAULT_COLOR, LINE_THICKNESS, 0.1, 0.1);
        break;
    }
    extrusionFace.visible = false;
    extrusionFaces.push(extrusionFace);
    scene.add(extrusionFace);
    return extrusionFace;
  }

  getCube(index, scene, type) {
    const cubes = this[type];
    if (index < cubes.length) {
      return cubes[index];
    }
    const cubeSize = new THREE.Vector3(1, 1, 1);
    let cubeMesh = null;
    switch (type) {
      case CUBE_TYPE.SOLID_FACE:
        cubeMesh = drawSolidBox(cubeSize, DEFAULT_COLOR, LINE_THICKNESS);
        break;
      case CUBE_TYPE.SOLID_LINE:
        cubeMesh = drawBox(cubeSize, DEFAULT_COLOR, LINE_THICKNESS);
        break;
      default:
        cubeMesh = drawDashedBox(cubeSize, DEFAULT_COLOR, LINE_THICKNESS, 0.1, 0.1);
        break;
    }
    cubeMesh.visible = false;
    cubes.push(cubeMesh);
    scene.add(cubeMesh);
    return cubeMesh;
  }

  getIcon(index, scene) {
    if (index < this.icons.length) {
      return this.icons[index];
    }
    const icon = drawImage(iconObjectYield, 1, 1, 3, 3.6, 0);
    icon.rotation.set(0, 0, -Math.PI / 2);
    icon.visible = false;
    this.icons.push(icon);
    scene.add(icon);
    return icon;
  }

  drawTexts(content, position, scene, camera, size = 1.4, color = 0xFFEA00) {
    if (camera !== undefined) {
      const text = this.textRender.drawText(content, scene, camera, color, size);
      if (text) {
        text.position.set(position.x, position.y, position.z);
        text.scale.set(size, size, 0);
        text.children.forEach((child) => {
          child.material.color.setHex(color);
        });
        this.ids.push(text);
        scene.add(text);
      }
    }
  }

  drawObstacleHeading(position, heading, scene) {
    const arrowMesh = this.updateArrow(position, heading, 0xFFFFFF, scene);
    arrowMesh.scale.set(1, 1, 1);
    arrowMesh.visible = true;
  }


  getTrafficCone(index, scene) {
    if (index < this.trafficCones.length) {
      return this.trafficCones[index];
    }

    const height = 0.914;
    const geometry = new THREE.CylinderGeometry(0.1, 0.25, height, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xE1601C,
      transparent: true,
      opacity: 0.65,
    });
    const cone = new THREE.Mesh(geometry, material);
    cone.rotation.set(Math.PI / 2, 0, 0);
    cone.position.set(0, 0, height / 2);
    this.trafficCones.push(cone);
    scene.add(cone);

    return cone;
  }
}
