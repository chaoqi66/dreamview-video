const THREE = require('three')
const STORE = require('./config/store')
const _ = require("loadsh")

const {
  drawSegmentsFromPoints,
  disposeMesh,
  drawArrow
} = require('../util/draw');

const { copyProperty, hideArrayObjects } = require('../util/misc');

const LINE_THICKNESS = 3;
const minorThickness = 4.5;
const DEFAULT_HEIGHT = 1.5;
const DEFAULT_COLOR = 0xFF00FC;
const ARROW_LENGTH = 6;
const gapColorList = [
  0xFF0000,
  0xFFFF00,
  0xFF00FF,
  0xFFA500,
  0x0000FF,
  0xFFFFFF,
];

module.exports = class PlanningMultiPolicy {
  constructor() {
    this.forwardPaths = [];
    this.arrows = []; // for indication of direction of moving obstacles
    this.arrowIdx = 0;
  }

  disposeMeshes(scene) {
    this.forwardPaths.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.forwardPaths = [];
  }

  update(world, coordinates, scene) {
    this.disposeMeshes(scene);
    hideArrayObjects(this.arrows, this.arrowIdx);
    this.arrowIdx = 0;

    const planningData = world.planningData;

    if (!STORE.options.showPlanningMultiPolicy) {
      return;
    }

    if (_.isEmpty(planningData.multiPolicyDebug)) {
      return;
    }

    const multiPolicyDebug = planningData.multiPolicyDebug;
    const scenes = multiPolicyDebug.scenes || [];
    if (_.isEmpty(scenes)) {
      return;
    }

    const gapObsIdMap = {};
    const gapFrontObsIdMap = {};
    const gapRearObsIdMap = {};
    if (scenes.length > 0) {
      scenes.forEach((item, index) => {
        const color = gapColorList[index] || DEFAULT_COLOR;
        const egoForwardPath = item.egoForwardPath;
        if (!_.isEmpty(egoForwardPath)) {
          const traj = egoForwardPath.pathPoint;
          const positions = coordinates.applyOffsetToArray(traj);
          const mesh = drawSegmentsFromPoints(
            positions, color, minorThickness, 6,
          );
          this.forwardPaths.push(mesh);
          scene.add(mesh);
        }
        const gapFrontObsId = item.gapFrontObsId || '';
        const gapRearObsId = item.gapRearObsId || '';
        if (gapFrontObsId) {
          gapFrontObsIdMap[gapFrontObsId] = color;
        }
        if (gapRearObsId) {
          gapRearObsIdMap[gapRearObsId] = color;
        }
      });
    }

    let objects = [];
    const objectFusionPredicted = world.objectPredicted && world.objectPredicted.objectFusion;
    if (STORE.options['showPredictionObject'] && Array.isArray(objectFusionPredicted) && objectFusionPredicted.length > 0) {
      objectFusionPredicted.forEach(item => {
        item.isPrediction = true;
      });
      objects = objects.concat(objectFusionPredicted);
    }

    for (let i = 0; i < objects.length; i++) {
      const obstacle = objects[i];

      const position = coordinates.applyOffset(
        new THREE.Vector3(obstacle.positionX,
          obstacle.positionY,
          (obstacle.height || DEFAULT_HEIGHT) / 2),
      );

      if (gapFrontObsIdMap[obstacle.id]) {
        const color = gapFrontObsIdMap[obstacle.id];
        const arrowMesh = this.updateArrow(position, obstacle.heading , color, scene);
        this.arrowIdx++;
        const scale = -1 * ARROW_LENGTH;
        arrowMesh.scale.set(scale, scale, scale);
        arrowMesh.visible = true;
      }

      if (gapRearObsIdMap[obstacle.id]) {
        const color = gapRearObsIdMap[obstacle.id];
        const arrowMesh = this.updateArrow(position, obstacle.heading , color, scene);
        this.arrowIdx++;
        const scale = ARROW_LENGTH;
        arrowMesh.scale.set(scale, scale, scale);
        arrowMesh.visible = true;
      }
    }

    // const forwardPath = multiPolicyDebug.forwardPath || [];
    // if (forwardPath.length > 0) {
    //   console.log('forwardPath = ', forwardPath);
    //   forwardPath.forEach((path) => {
    //     const traj = path.pathPoint;
    //     const positions = coordinates.applyOffsetToArray(traj);
    //     const mesh = drawSegmentsFromPoints(
    //       positions, forwardPathColor, minorThickness, 6,
    //     );
    //     this.forwardPaths.push(mesh);
    //     scene.add(mesh);
    //   });
    // }
  }

  updateArrow(position, heading, color, scene) {
    const arrowMesh = this.getArrow(this.arrowIdx, scene);
    copyProperty(arrowMesh.position, position);
    arrowMesh.material.color.setHex(color);
    arrowMesh.rotation.set(0, 0, -(Math.PI / 2 - heading));
    return arrowMesh;
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
}