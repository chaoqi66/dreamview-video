const THREE = require('three')
const STORE = require('./config/store')
const _ = require("loadsh")
const Text3D = require('./text3d');

const {
  drawSegmentsFromPoints,
  drawDashedLineFromPoints,
  disposeMesh,
} = require('../util/draw');

const colorMapping = {
  YELLOW: 0XDAA520,
  WHITE: 0xCCCCCC,
  CORAL: 0xFF7F50,
  RED: 0xFF6666,
  GREEN: 0x006400,
  BLUE: 0x30A5FF,
  PURE_WHITE: 0xFFFFFF,
  DEFAULT: 0xC0C0C0,
};

const testArray = [
  {x: 804558.9231849302, y: 2500479.2053446104},
  {x: 804558.9250264375, y: 2500479.2054077573},
  {x: 804559.0220988902, y: 2500479.2086700005},
  {x: 804560.2718294761, y: 2500479.2885994078},
  {x: 804561.5144325332, y: 2500479.4440115043},
  {x: 804562.7453531844, y: 2500479.6743366155},
  {x: 804563.9600793761, y: 2500479.9787304658},
  {x: 804565.0282328805, y: 2500480.3125024545},
  {x: 804566.0767710495, y: 2500480.7035566447},
  {x: 804567.102624503, y: 2500481.1507483074},
  {x: 804568.1027902656, y: 2500481.652768381},
  {x: 804569.0323672437, y: 2500482.1826910307},
  {x: 804569.1660877353, y: 2500482.2651524735},
  {x: 804569.5696375442, y: 2500482.534024181},
  {x: 804569.9583534792, y: 2500482.823928244},
  {x: 804570.3311405256, y: 2500483.1340480014},
  {x: 804570.6869485411, y: 2500483.4635098395},
  {x: 804571.0247752093, y: 2500483.8113856646},
  {x: 804571.3436688712, y: 2500484.1766955075},
  {x: 804571.6427312014, y: 2500484.558410288},
  {x: 804571.9211197356, y: 2500484.9554547123},
  {x: 804572.1780502533, y: 2500485.366710303},
  {x: 804572.412798981, y: 2500485.7910185503},
  {x: 804572.6247046266, y: 2500486.227184173},
  {x: 804572.81317025, y: 2500486.673978491},
  {x: 804572.9776649443, y: 2500487.1301428825},
  {x: 804573.1177253239, y: 2500487.5943923257},
  {x: 804573.2329568384, y: 2500488.065419028},
  {x: 804573.3230348804, y: 2500488.541896103},
  {x: 804573.3847712686, y: 2500488.9955926817},
  {x: 804573.4236998218, y: 2500489.451812515},
  {x: 804573.4397227701, y: 2500489.9094097535},
  {x: 804573.4327998684, y: 2500490.367235092},
  {x: 804573.3669188409, y: 2500492.005969993}
];

// 左蓝右红中间黄
const laneTypeColorMapping = {
  'centerPointSet': colorMapping.YELLOW,
  'leftBoundaryPointSet': colorMapping.BLUE,
  'rightBoundaryPointSet': colorMapping.RED
};
const laneTypeList = Object.keys(laneTypeColorMapping);

module.exports = class RoadStructure {
  constructor() {
    this.zOffsetFactor = 10;

    this.textRender = new Text3D();

    this.roadLines = [];

    this.roadCurbs = [];

    this.intersectionList = [];

    this.ids = [];

    this.curbSet = [];

    this.vectorizedLanelineSet = [];

    this.stopLineList = [];
  }

  disposeMeshes(scene) {
    this.roadLines.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.roadLines = [];

    this.roadCurbs.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.roadCurbs = [];

    this.intersectionList.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.intersectionList = [];

    this.vectorizedLanelineSet.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.vectorizedLanelineSet = [];

    this.stopLineList.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.stopLineList = [];

    this.ids.forEach((t) => {
      t.children.forEach((c) => c.visible = false);
      scene.remove(t);
    });
    this.ids = [];
    // this.textRender.reset();
  }

  update(world, coordinates, scene, camera) {
    this.disposeMeshes(scene);

    if (!STORE.options.showRoadStructure) {
      return;
    }

    const roadStructure = world.roadStructure;
    if (_.isEmpty(roadStructure)) {
      return;
    }

    this.addLane(roadStructure.laneSet, coordinates, scene, camera);
    this.addCurbs(roadStructure.curbs, coordinates, scene);
    roadStructure.intersectionSet && this.addIntersection(roadStructure.intersectionSet, coordinates, scene);
    if (STORE.options.showRoadStructureCurb) {
      roadStructure.curbSet && this.addCurbSet(roadStructure.curbSet, coordinates, scene);
    }
    roadStructure.crosswalkSet && this.addCrosswalkSet(roadStructure.crosswalkSet, coordinates, scene);
    if (STORE.options.showVectorizedLane && roadStructure.vectorizedLanelineSet) {
      this.addVectorizedLanelineSet(roadStructure.vectorizedLanelineSet, coordinates, scene);
    }
  }

  addVectorizedLanelineSet(vectorizedLanelineSet, coordinates, scene) {
    if (_.isEmpty(vectorizedLanelineSet)) {
      return;
    }

    vectorizedLanelineSet.forEach(item => {
      if (!item.vectorizedLaneline) {
        return;
      }
      const points = coordinates.applyOffsetToArray(item.vectorizedLaneline);
      const mesh = drawSegmentsFromPoints(
        points, colorMapping.DEFAULT, 0.2, this.zOffsetFactor, false,
      );
      scene.add(mesh);
      this.vectorizedLanelineSet.push(mesh);
    });
  }

  addCrosswalkSet(crosswalkSet, coordinates, scene) {
    if (_.isEmpty(crosswalkSet)) {
      return;
    }

    crosswalkSet.forEach(item => {
      if (item.boundary && item.boundary.points) {
        const points = coordinates.applyOffsetToArray(item.boundary.points);
        const mesh = drawSegmentsFromPoints(
          points, 0x00FF00, 0.2, this.zOffsetFactor, false,
        );
        scene.add(mesh);
        this.roadCurbs.push(mesh);
      }
    });
  }

  addCurbSet(curbSet, coordinates, scene) {
    if (_.isEmpty(curbSet)) {
      return;
    }

    curbSet.forEach(item => {
      if (item.vectorizedCurb) {
        const points = coordinates.applyOffsetToArray(item.vectorizedCurb);
        const mesh = drawSegmentsFromPoints(
          points, 0xffaaff, 2.5, this.zOffsetFactor, false,
        );
        scene.add(mesh);
        this.roadCurbs.push(mesh);
      }
    });
  }

  addIntersection(intersection, coordinates, scene) {
    if (_.isEmpty(intersection)) {
      return;
    }

    intersection.forEach(item => {
      if (item.boundary) {
        const points = coordinates.applyOffsetToArray(item.boundary.points);
        const mesh = drawSegmentsFromPoints(points, colorMapping.BLUE, 0.4, 0, false);
        scene.add(mesh);
        this.intersectionList.push(mesh);
      }
    });
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

  addLane(laneSet, coordinates, scene, camera) {
    if (_.isEmpty(laneSet)) {
      return;
    }

    laneSet.forEach((lane) => {
      laneTypeList.forEach((laneType) => {
        const pointSet = lane[laneType] || [];

        if (!_.isEmpty(pointSet)) {
          if (laneType === 'centerPointSet') {
            const points = coordinates.applyOffsetToArray(pointSet);
            const boundary = this.addLaneMesh(points, laneTypeColorMapping[laneType]);
            scene.add(boundary);
            this.roadLines.push(boundary);
            const initPosition = coordinates.applyOffset(
              new THREE.Vector3(pointSet[Math.floor(pointSet.length / 2)].x,
                pointSet[Math.floor(pointSet.length / 2)].y + 0.5, 3),
            );
            if (lane.laneCategory === 'REALITY') {
              this.drawTexts(
                `${lane.laneId}`,
                initPosition,
                scene,
                camera,
                1,
                0xffff00);
            }
          } else {
            // console.log('laneType = ', laneType);
            // console.log('pointSet = ', pointSet);
            pointSet.forEach((point) => {
              let pointPoints = [];
              if (point.points) {
                pointPoints = point.points.filter(item => item.x && item.y);
              }
              if (!_.isEmpty(point) && !_.isEmpty(pointPoints)) {
                const points = coordinates.applyOffsetToArray(pointPoints);
                if (Array.isArray(point.lineType)) {
                  let startIndex = 0;
                  point.lineType.forEach((item, index) => {
                    startIndex = index * 5;
                    const boundary = this.addLaneMesh(points.slice(startIndex, startIndex + 6), laneTypeColorMapping[laneType], item);
                    scene.add(boundary);
                    this.roadLines.push(boundary);
                  });
                } else {
                  const boundary = this.addLaneMesh(points, laneTypeColorMapping[laneType], point.lineType);
                  scene.add(boundary);
                  this.roadLines.push(boundary);
                }
              }
            });
          }
        }
      });
      const stoplinePosition = lane.stoplinePosition || [];
      if(!_.isEmpty(stoplinePosition)) {
        stoplinePosition.forEach(stopLine => {
          const points = coordinates.applyOffset(stopLine);
          const geometry = new THREE.BoxGeometry(1, 1, 0);
          const material = new THREE.MeshBasicMaterial({ color: 0xf40eb7 });
          const cube = new THREE.Mesh(geometry, material);
          cube.position.set(points.x, points.y, 0);
          scene.add(cube);
          this.stopLineList.push(cube);
        });
      }
    });
  }

  addLaneMesh(points, color, lineType) {
    switch (lineType) {
      case 'SOLID':
        return drawSegmentsFromPoints(
          points, color, 0.4, this.zOffsetFactor, false,
        );
      case 'DOTTED':
        return drawDashedLineFromPoints(
          points, color, 1.0, 0.5, 0.25, this.zOffsetFactor, 0.4, false,
        );
      default:
        return drawSegmentsFromPoints(
          points, color, 0.4, this.zOffsetFactor, false,
        );
    }
  }

  addCurbs(curbs, coordinates, scene) {
    if (_.isEmpty(curbs)) {
      return;
    }

    const rows = curbs.rows || [];
    if (_.isEmpty(rows)) {
      return;
    }

    rows.forEach((row) => {
      const values = row.values || [];
      if (!_.isEmpty(values)) {
        const points = coordinates.applyOffsetToArray(values);
        const boundary = this.addCurbsMesh(points);
        scene.add(boundary);
        this.roadCurbs.push(boundary);
      }
    });
  }

  addCurbsMesh(points) {
    return drawSegmentsFromPoints(
      points, colorMapping.CORAL, 0.2, this.zOffsetFactor, false,
    );
  }
}