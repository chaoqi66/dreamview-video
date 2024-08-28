const THREE = require('three')
const STORE = require('./config/store')
const Text3D = require('./text3d');
const {
  drawCircle, drawEllipse, drawSegmentsFromPoints, disposeMesh, drawThickBandFromPoints
} = require('../util/draw');
const { roundNumber } = require('../util/misc');
const _ = require("loadsh")
const DEFAULT_COLOR = 0xFFFFFF;
const ObstacleColorMapping = {
  PEDESTRIAN: 0xFFEA00,
  BICYCLE: 0x00DCEB,
  VEHICLE: 0x00FF3C,
  VIRTUAL: 0x800000,
  CIPV: 0xFF9966,
};
const majorThickness = 2;

const EPSILON = 1e-3;

const roadStructurePointColor = {
  default: 0x9d9b9b,
  highProbability: 0xff80ff,
  navigation: 0xff8000,
};

module.exports = class Prediction {
  constructor() {
    this.predLines = []; // Prediction lines to indicate direction
    this.predCircles = []; // Prediction circles to indicate speed
    this.predGaussian = []; // Prediction ellipse to visualize gaussian
    this.pathintentions = [];
    this.vehicleFlowLines = [];
    this.efficientLaneList = [];
    this.efficientLanePath = [];
    this.textList = [];
    this.textRender = new Text3D();
  }

  disposeMeshes(scene) {
    // Clear out the prediction lines/circles from last frame.
    this.predLines.forEach((p) => {
      scene.remove(p);
      disposeMesh(p);
    });
    this.predLines = [];

    this.predCircles.forEach((c) => {
      scene.remove(c);
      disposeMesh(c);
    });
    this.predCircles = [];

    this.predGaussian.forEach((g) => {
      scene.remove(g);
      disposeMesh(g);
    });
    this.predGaussian = [];

    this.pathintentions.forEach((g) => {
      scene.remove(g);
      disposeMesh(g);
    });
    this.pathintentions = [];

    this.vehicleFlowLines.forEach((g) => {
      scene.remove(g);
      disposeMesh(g);
    });
    this.vehicleFlowLines = [];

    this.efficientLaneList.forEach((g) => {
      scene.remove(g);
      disposeMesh(g);
    });
    this.efficientLaneList = [];

    this.efficientLanePath.forEach((g) => {
      scene.remove(g);
      g.geometry.dispose();
      g.material.dispose();
    });
    this.efficientLanePath = [];

    this.textList.forEach((t) => {
      t.children.forEach((c) => c.visible = false);
      scene.remove(t);
    });
    this.textList = [];

    this.textRender.reset();
  }

  update(world, coordinates, scene, camera) {
    this.disposeMeshes(scene);

    if (world.efficientLaneChange && world.efficientLaneChange.efficientLaneSequence) {
      if (STORE.options.showEfficientLane) {
        this.handleEfficientLane(world.efficientLaneChange.efficientLaneSequence, coordinates, scene, camera);
      } else if (STORE.options.showEfficientNavi) {
        this.defalutEfficientLane(world.efficientLaneChange.efficientLaneSequence, coordinates, scene, camera);
      }
    }

    if (world.efficientLaneChange && world.efficientLaneChange.rawCurbTags && STORE.options.showCurbTag) {
      this.handleRawCurbTags(world.efficientLaneChange, coordinates, scene, camera);
    }

    let objects = [];
    const objectFusion = world.objectPredicted && world.objectPredicted.objectFusion;
    if (STORE.options['showPredictionObject'] && Array.isArray(objectFusion) && objectFusion.length > 0) {
      objects = objects.concat(objectFusion);
    }
    if (_.isEmpty(objects)) {
      return;
    }
    // if (_.isEmpty(world.object)) {
    //   return;
    // }

    objects.forEach((obj) => {
      const predictionLineColor = ObstacleColorMapping[obj.type] || DEFAULT_COLOR;
      const predictions = obj.prediction;
      if (_.isEmpty(predictions)) {
        return;
      }
      this.handlePathintention(obj.pathIntention, coordinates, scene);

      if (obj.vehicleFlowLines && obj.vehicleFlowLines.vehicleFlowLine) {
        this.handleVehicleFlowLines(obj.vehicleFlowLines.vehicleFlowLine, coordinates, scene);
      }

      if (!STORE.options.showPredictionMajor && !STORE.options.showPredictionMinor) {
        return;
      }

      if (!STORE.options[`showObstacles${_.upperFirst(_.camelCase(obj.type))}`]) {
        return;
      }

      // Take the prediction line with highest probability as major, others as minor.
      _.sortBy(predictions, (o) => o.probability);

      // if the biggest prob is 0, then draw all trajectory as major
      if (predictions[predictions.length - 1].probability === 0) {
        // console.log("No prob 0")
        const sameThickness = 2;
        predictions.forEach((prediction) => {
          const traj = prediction.predictedTrajectory;
          const positions = coordinates.applyOffsetToArray(traj);
          const mesh = drawSegmentsFromPoints(
            positions, predictionLineColor, sameThickness, 1,
          );
          this.predLines.push(mesh);
          scene.add(mesh);

          // Draw circles and gaussian
          let sample_draw_points_count = 9;
          for (let j = 0; j < positions.length; j += 1) {
            if(sample_draw_points_count === 9) {
              sample_draw_points_count = 0;
              const circleMesh = this.getPredCircle();
              circleMesh.position.set(positions[j].x, positions[j].y, 0.24);
              circleMesh.material.color.setHex(predictionLineColor);
              scene.add(circleMesh);
            }
            else{
              sample_draw_points_count += 1;
            }

            this.drawGaussian(
              traj[j].gaussianInfo, predictionLineColor, positions[j], scene,
            );
          }
        });
      }
      else{
        const predictionMajor = predictions[predictions.length - 1];
        const predictionMinor = predictions.slice(0, predictions.length - 1);

        if (STORE.options.showPredictionMajor) {
          const predictedTraj = coordinates.applyOffsetToArray(
            predictionMajor.predictedTrajectory,
          );
          const mesh = drawSegmentsFromPoints(predictedTraj,
            predictionLineColor, majorThickness, 6);
          this.predLines.push(mesh);
          scene.add(mesh);

          // Draw circles and gaussian
          let sample_draw_points_count = 9;
          for (let j = 0; j < predictedTraj.length; j += 1) {
            if(sample_draw_points_count === 9) {
              sample_draw_points_count = 0;
              const circleMesh = this.getPredCircle();
              circleMesh.position.set(predictedTraj[j].x, predictedTraj[j].y, 0.24);
              circleMesh.material.color.setHex(predictionLineColor);
              scene.add(circleMesh);
            }
            else{
              sample_draw_points_count += 1;
            }

            this.drawGaussian(
              predictionMajor.predictedTrajectory[j].gaussianInfo,
              predictionLineColor,
              predictedTraj[j],
              scene,
            );
          }
        }

        let minorThickness = 2;
        if (STORE.options.showPredictionMinor) {
          predictionMinor.forEach((prediction) => {
            const traj = prediction.predictedTrajectory;
            const positions = coordinates.applyOffsetToArray(traj);
            const mesh = drawSegmentsFromPoints(
              positions, predictionLineColor, minorThickness, 6,
            );
            this.predLines.push(mesh);
            scene.add(mesh);

            let sample_draw_points_count = 9;
            for (let j = 0; j < traj.length; j += 1) {
              if(sample_draw_points_count === 9) {
                sample_draw_points_count = 0;
                const circleMesh = this.getPredCircle();
                circleMesh.position.set(positions[j].x, positions[j].y, 0.24);
                circleMesh.material.color.setHex(predictionLineColor);
                scene.add(circleMesh);
              }
              else{
                sample_draw_points_count += 1;
              }

              this.drawGaussian(
                traj[j].gaussianInfo, predictionLineColor, positions[j], scene,
              );
            }

            // keep thickness the same trajectories with low probabilities
            if (minorThickness > 0.9) {
              minorThickness -= 0.7;
            }
          });
        }
      }
    });
  }

  handleRawCurbTags(efficientLaneChange, coordinates, scene, camera) {
    const rawCurbTags = efficientLaneChange.rawCurbTags;
    const { selectEfficientLaneSequence } = STORE.meters;
    if (selectEfficientLaneSequence && selectEfficientLaneSequence.curbDecisionPair) {
      const curbDecisionPair = selectEfficientLaneSequence.curbDecisionPair;
      const modelOutputCurbTagCount = efficientLaneChange.modelOutputCurbTagCount;
      rawCurbTags.forEach((tag, index) => {
        if (index < modelOutputCurbTagCount) {
          tag.interactLat = curbDecisionPair[index].interactLat;
          tag.interactLon = curbDecisionPair[index].interactLon;
        } else {
          tag.interactLat = null;
          tag.interactLon = null;
        }
      });
    }
    if (_.isEmpty(rawCurbTags)) {return;}
    rawCurbTags.forEach(item => {
      let text = '';
      if (item.interactLon) {
        if (item.interactLon.yield > item.interactLon.ignoreLon) {
          text += 'Y';
        }
      }
      if (item.interactLat) {
        if (item.interactLat.bypassRight > item.interactLat.ignoreLat && item.interactLat.bypassRight > item.interactLat.bypassLeft) {
          text += 'R';
        }
        if (item.interactLat.bypassLeft > item.interactLat.ignoreLat && item.interactLat.bypassLeft > item.interactLat.bypassRight) {
          text += 'L';
        }
      }
      if (text) {
        const position = coordinates.applyOffset(new THREE.Vector3(item.curbStartX,
          item.curbStartY, 2));
        this.drawTexts(
          text,
          position,
          scene,
          camera,
          0.9,
          0xffff00);
      }

      item.points = [{x: item.curbStartX, y: item.curbStartY}, {x: item.curbEndX, y: item.curbEndY}];
      const positions = coordinates.applyOffsetToArray(item.points);
      const mesh = drawSegmentsFromPoints(
        positions, 0xff0000, 2.5, 3
      );
      this.efficientLaneList.push(mesh);
      scene.add(mesh);
    });
  }

  getInterpolatedPoint(coords, index) {
    const startPointIndex = Math.floor(index * 1.5);
    const endPointIndex = Math.ceil(index * 1.5);

    if (endPointIndex >= coords.length) {
      return coords[coords.length - 1];
    }

    const startPoint = coords[startPointIndex];
    const endPoint = coords[endPointIndex];

    const interpolatedPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };

    return new THREE.Vector3(interpolatedPoint.x,
      interpolatedPoint.y + 0.5, 3);
  }

  handleEfficientLane(efficientLaneSequence, coordinates, scene, camera) {
    if (_.isEmpty(efficientLaneSequence)) {return;}
    const list = efficientLaneSequence;
    let maxIndex = 1;
    if (list.length >= 2) {
      let maxValue = list[1].probability;
      for (let i = 1; i < list.length; i++) {
        if (list[i].probability > maxValue) {
          maxValue = list[i].probability;
          maxIndex = i;
        }
      }
    }
    const startLaneIdsList = [];
    const endLaneIdsList = [];
    list.forEach((item, index) => {
      if (!_.isEmpty(item.roadStructurePoint)) {
        let color = roadStructurePointColor.default;
        let roadStructurePointWidth = 0.6;
        if (index === maxIndex) {
          color = roadStructurePointColor.highProbability;
          roadStructurePointWidth = 2.4;
        }
        if (index === 0 && list.length > 1) {
          color = roadStructurePointColor.navigation;
          roadStructurePointWidth = 2.4;
        }
        if (index === 0 && list.length === 1) {
          color = roadStructurePointColor.highProbability;
          roadStructurePointWidth = 2.4;
        }
        const positions = coordinates.applyOffsetToArray(item.roadStructurePoint);
        const efficientLanePath = drawThickBandFromPoints(positions, roadStructurePointWidth, color, 0.3, 4);
        this.efficientLanePath.push(efficientLanePath);
        scene.add(efficientLanePath);
        let endPosition = coordinates.applyOffset(
          new THREE.Vector3(item.roadStructurePoint[Math.floor(item.roadStructurePoint.length - 1)].x,
            item.roadStructurePoint[Math.floor(item.roadStructurePoint.length - 1)].y + 0.5, 3),
        );
        let startPosition = coordinates.applyOffset(
          new THREE.Vector3(item.roadStructurePoint[0].x,
            item.roadStructurePoint[0].y + 0.5, 3),
        );
        let roadStructurePointText = '';
        let alterProbabilities = item.alterProbabilities || [];
        if (item.probability > 0.1 || alterProbabilities.some(p => p > 0.1)) {
          roadStructurePointText = `${index}:  ${roundNumber(item.probability, 2)}`;
          let repeatStartNum = 0;
          let repeatEndNum = 0;
          if (item.laneIds && item.laneIds.length > 0) {
            repeatStartNum += startLaneIdsList.filter(id => id === item.laneIds[0]).length || 0;
            repeatEndNum += endLaneIdsList.filter(id => id === item.laneIds[item.laneIds - 1]).length || 0;
            startLaneIdsList.push(item.laneIds[0]);
            endLaneIdsList.push(item.laneIds[item.laneIds - 1]);
          }
          startPosition = coordinates.applyOffset(
            this.getInterpolatedPoint(item.roadStructurePoint, repeatStartNum)
          );
          const endPoints = _.clone(item.roadStructurePoint).reverse();
          endPosition = coordinates.applyOffset(this.getInterpolatedPoint(endPoints, repeatEndNum));
          let text = '';
          if (alterProbabilities && alterProbabilities.length) {
            alterProbabilities = alterProbabilities.map(p => roundNumber(p, 2));
            text = `(${alterProbabilities.join(',')})`;
          } else {
            if (item.cruiseProbability !== undefined && item.exitProbability !== undefined) {
              text = `(${roundNumber(item.cruiseProbability, 2)}, ${roundNumber(item.exitProbability, 2)}, ${roundNumber(item.rawModelProbability, 2)})`;
            }
            if (item.type === 'IN_JUNCTION' || item.type === 'CRUISE') {
              roadStructurePointText = `${index}:  ${roundNumber(item.probability, 2)} (${roundNumber(item.rawModelProbability, 2)})`;
            }
          }
          roadStructurePointText = `${index}:  ${roundNumber(item.probability, 2)} ${text}`;
        }
        roadStructurePointText && this.drawTexts(
          roadStructurePointText,
          endPosition,
          scene,
          camera,
          0.8,
          0xffff00);
        roadStructurePointText && this.drawTexts(
          roadStructurePointText,
          startPosition,
          scene,
          camera,
          0.8,
          0xffff00);
      }

      if (!_.isEmpty(item.egoPathPoint) && (item.probability > 0.1 || item.selected)) {
        const positions = coordinates.applyOffsetToArray(item.egoPathPoint);
        const mesh = drawSegmentsFromPoints(
          positions, 0xbf0000, 8, 6, true, false, 0.1
        );
        this.efficientLaneList.push(mesh);
        scene.add(mesh);

        const initPosition = coordinates.applyOffset(
          new THREE.Vector3(item.egoPathPoint[Math.floor(item.egoPathPoint.length - 1)].x,
            item.egoPathPoint[Math.floor(item.egoPathPoint.length - 1)].y + 0.5, 3),
        );
        const text = `${index}`;
        this.drawTexts(
          text,
          initPosition,
          scene,
          camera,
          1.1,
          0xffff00);
      }
    });
  }


  defalutEfficientLane(efficientLaneSequence, coordinates, scene, camera) {
    if (_.isEmpty(efficientLaneSequence)) {return;}
    const list = efficientLaneSequence;
    let maxIndex = 1;
    if (list.length >= 2) {
      let maxValue = list[1].probability;
      for (let i = 1; i < list.length; i++) {
        if (list[i].probability > maxValue) {
          maxValue = list[i].probability;
          maxIndex = i;
        }
      }
    }
    list.forEach((item, index) => {
      if (!_.isEmpty(item.roadStructurePoint)) {
        let color = roadStructurePointColor.default;
        let roadStructurePointWidth = 0.6;
        if (index === maxIndex) {
          color = roadStructurePointColor.highProbability;
          roadStructurePointWidth = 2.4;
        }
        if (index === 0 && list.length > 1) {
          color = roadStructurePointColor.navigation;
          roadStructurePointWidth = 2.4;
        }
        if (index === 0 && list.length === 1) {
          color = roadStructurePointColor.highProbability;
          roadStructurePointWidth = 2.4;
        }

        if (color === roadStructurePointColor.highProbability) {
          const positions = coordinates.applyOffsetToArray(item.roadStructurePoint);
          const efficientLanePath = drawThickBandFromPoints(positions, roadStructurePointWidth, color, 0.3, 4);
          this.efficientLanePath.push(efficientLanePath);
          scene.add(efficientLanePath);
          const endPosition = coordinates.applyOffset(
            new THREE.Vector3(item.roadStructurePoint[Math.floor(item.roadStructurePoint.length - 1)].x,
              item.roadStructurePoint[Math.floor(item.roadStructurePoint.length - 1)].y + 0.5, 3),
          );
          const startPosition = coordinates.applyOffset(
            new THREE.Vector3(item.roadStructurePoint[0].x,
              item.roadStructurePoint[0].y + 0.5, 3),
          );

          const roadStructurePointText = `${index}:  ${roundNumber(item.probability, 2)}`;
          roadStructurePointText && this.drawTexts(
            roadStructurePointText,
            endPosition,
            scene,
            camera,
            0.8,
            0xffff00);
          roadStructurePointText && this.drawTexts(
            roadStructurePointText,
            startPosition,
            scene,
            camera,
            0.8,
            0xffff00);
        }
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
        this.textList.push(text);
        scene.add(text);
      }
    }
  }

  handlePathintention(pathIntention, coordinates, scene) {
    if (!STORE.options.showPredictionPath) {
      return;
    }
    if (_.isEmpty(pathIntention)) {return;}
    pathIntention.forEach(item => {
      if (_.isEmpty(item.pathPoint)) {
        return;
      }

      const positions = coordinates.applyOffsetToArray(item.pathPoint);
      const mesh = drawSegmentsFromPoints(
        positions, 0x808080, 2, 6,
      );
      this.pathintentions.push(mesh);
      scene.add(mesh);
    });
  }

  handleVehicleFlowLines(vehicleFlowLines, coordinates, scene) {
    if (!STORE.options.showVehicleFlowLines) {
      return;
    }
    if (_.isEmpty(vehicleFlowLines)) {return;}
    vehicleFlowLines.forEach(item => {
      if (_.isEmpty(item.flowPoint)) {
        return;
      }

      const positions = coordinates.applyOffsetToArray(item.flowPoint);
      const mesh = drawSegmentsFromPoints(
        positions, 0xFF0000, 2, 6,
      );
      this.vehicleFlowLines.push(mesh);
      scene.add(mesh);
    });
  }

  getPredCircle() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: false,
      opacity: 0.5,
    });
    const circleMesh = drawCircle(0.2, material);
    this.predCircles.push(circleMesh);
    return circleMesh;
  }

  drawGaussian(gaussian, color, position, scene) {
    if (!STORE.options.showGaussianInfo) {
      return;
    }

    if (gaussian && gaussian.ellipseA > EPSILON && gaussian.ellipseB > EPSILON) {
      const material = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.35,
      });
      const ellipseMesh = drawEllipse(
        gaussian.ellipseA, gaussian.ellipseB, material,
      );

      ellipseMesh.position.set(position.x, position.y, 0.25);
      ellipseMesh.rotation.set(0, 0, gaussian.thetaA);
      this.predGaussian.push(ellipseMesh);
      scene.add(ellipseMesh);
    }
  }
}