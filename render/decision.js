const THREE = require('three')
const STORE = require('./config/store')
const _ = require("loadsh")
const path = require('path')

const iconMainStop = path.join(__dirname, '../assets/images/decision/main-stop.png');
const iconObjectStop = path.join(__dirname, '../assets/images/decision/object-stop.png');
const iconObjectFollow = path.join(__dirname, '../assets/images/decision/object-follow.png');
const iconObjectYield = path.join(__dirname, '../assets/images/decision/object-yield.png');
const iconObjectOvertake = path.join(__dirname, '../assets/images/decision/object-overtake.png');

const fenceMainStop = path.join(__dirname, '../assets/images/decision/fence-main-stop.png');
const fenceObjectStop = path.join(__dirname, '../assets/images/decision/fence-object-stop.png');
const fenceObjectFollow = path.join(__dirname, '../assets/images/decision/fence-object-follow.png');
const fenceObjectYield = path.join(__dirname, '../assets/images/decision/fence-object-yield.png');
const fenceObjectOvertake = path.join(__dirname, '../assets/images/decision/fence-object-overtake.png');

const reasonHeadVehicle = path.join(__dirname, '../assets/images/decision/head-vehicle.png');
const reasonDestination = path.join(__dirname, '../assets/images/decision/destination.png');
const reasonPedestrian = path.join(__dirname, '../assets/images/decision/pedestrian.png');
const reasonObstacle = path.join(__dirname, '../assets/images/decision/obstacle.png');
const reasonSignal = path.join(__dirname, '../assets/images/decision/signal.png');
const reasonStopSign = path.join(__dirname, '../assets/images/decision/stop-sign.png');
const reasonYieldSign = path.join(__dirname, '../assets/images/decision/yield-sign.png');
const reasonClearZone = path.join(__dirname, '../assets/images/decision/clear-zone.png');
const reasonCrosswalk = path.join(__dirname, '../assets/images/decision/crosswalk.png');
const reasonEmergency = path.join(__dirname, '../assets/images/decision/emergency.png');
const reasonNotReady = path.join(__dirname, '../assets/images/decision/not-ready.png');
const reasonPullover = path.join(__dirname, '../assets/images/decision/pullover.png');

const iconChangeLaneRight = path.join(__dirname, '../assets/images/decision/change-lane-right.png');
const iconChangeLaneLeft = path.join(__dirname, '../assets/images/decision/change-lane-left.png');

const { hideArrayObjects } = require('../util/misc');
const { drawImage, drawDashedLineFromPoints, drawShapeFromPoints } = require('../util/draw');


const MarkerColorMapping = {
  STOP: 0xFF3030,
  FOLLOW: 0x1AD061,
  YIELD: 0xFF30F7,
  OVERTAKE: 0x30A5FF,
};
const StopReasonMarkerMapping = {
  STOP_REASON_HEAD_VEHICLE: 'reasonHeadVehicle',
  STOP_REASON_DESTINATION: 'reasonDestination',
  STOP_REASON_PEDESTRIAN: 'reasonPedestrian',
  STOP_REASON_OBSTACLE: 'reasonObstacle',
  STOP_REASON_SIGNAL: 'reasonSignal',
  STOP_REASON_STOP_SIGN: 'reasonStopSign',
  STOP_REASON_YIELD_SIGN: 'reasonYieldSign',
  STOP_REASON_CLEAR_ZONE: 'reasonClearZone',
  STOP_REASON_CROSSWALK: 'reasonCrosswalk',
  STOP_REASON_EMERGENCY: 'reasonEmergency',
  STOP_REASON_NOT_READY: 'reasonNotReady',
  STOP_REASON_PULL_OVER: 'reasonPullover',
};

const ChangeLaneMarkerMapping = {
  LEFT: 'iconChangeLaneLeft',
  RIGHT: 'iconChangeLaneRight',
};

module.exports = class Decision {
  constructor(images) {
    // for STOP/FOLLOW/YIELD/OVERTAKE decisions
    this.images = images
    this.markers = {
      STOP: [],
      FOLLOW: [],
      YIELD: [],
      OVERTAKE: [],
    };
    this.nudges = []; // for NUDGE decision

    this.mainDecision = {
      STOP: this.getMainStopDecision(),
      CHANGE_LANE: this.getMainChangeLaneDecision(),
    };
    this.mainDecisionAddedToScene = false;
  }

  update(world, coordinates, scene) {
    // Nudge meshes need to be recreated every time.
    this.nudges.forEach((n) => {
      scene.remove(n);
      n.geometry.dispose();
      n.material.dispose();
    });
    this.nudges = [];

    this.updateMainDecision(world, coordinates, scene);
    this.updateObstacleDecision(world, coordinates, scene);
  }

  updateMainDecision(world, coordinates, scene) {
    const worldMainDecision = world.mainDecision ? world.mainDecision : world.mainStop;
    for (const type in this.mainDecision) {
      this.mainDecision[type].visible = false;
    }

    if (STORE.options.showDecisionMain && !_.isEmpty(worldMainDecision)) {
      if (!this.mainDecisionAddedToScene) {
        for (const type in this.mainDecision) {
          scene.add(this.mainDecision[type]);
        }
        this.mainDecisionAddedToScene = true;
      }

      // un-set markers
      for (const reason in StopReasonMarkerMapping) {
        this.mainDecision.STOP[reason].visible = false;
      }
      for (const type in ChangeLaneMarkerMapping) {
        this.mainDecision.CHANGE_LANE[type].visible = false;
      }

      // set reasons
      const defaultPosition = coordinates.applyOffset({
        x: worldMainDecision.positionX,
        y: worldMainDecision.positionY,
        z: 0.2,
      });
      const defaultHeading = worldMainDecision.heading;
      for (const decision of worldMainDecision.decision) {
        let position = defaultPosition;
        let heading = defaultHeading;
        if (_.isNumber(decision.positionX) && _.isNumber(decision.positionY)) {
          position = coordinates.applyOffset({
            x: decision.positionX,
            y: decision.positionY,
            z: 0.2,
          });
        }
        if (_.isNumber(decision.heading)) {
          heading = decision.heading;
        }

        const mainStopReason = _.attempt(() => decision.stopReason);
        if (!_.isError(mainStopReason) && mainStopReason) {
          this.mainDecision.STOP.position.set(position.x, position.y, position.z);
          this.mainDecision.STOP.rotation.set(Math.PI / 2, heading - Math.PI / 2, 0);
          this.mainDecision.STOP[mainStopReason].visible = true;
          this.mainDecision.STOP.visible = true;
        }

        const changeLaneType = _.attempt(() => decision.changeLaneType);
        if (!_.isError(changeLaneType) && changeLaneType) {
          this.mainDecision.CHANGE_LANE.position.set(
            position.x, position.y, position.z,
          );
          this.mainDecision.CHANGE_LANE.rotation.set(
            Math.PI / 2, heading - Math.PI / 2, 0,
          );
          this.mainDecision.CHANGE_LANE[changeLaneType].visible = true;
          this.mainDecision.CHANGE_LANE.visible = true;
        }
      }
    }
  }

  updateObstacleDecision(world, coordinates, scene) {
    // const objects = world.object;
    let objects = [];
    const objectFusion = world.objectNew && world.objectNew.objectFusion;
    if (Array.isArray(objectFusion) && objectFusion.length > 0) {
      objects = objects.concat(objectFusion);
    }
    if (!STORE.options.showDecisionObstacle || _.isEmpty(objects)) {
      let decision = null;
      for (decision in MarkerColorMapping) {
        hideArrayObjects(this.markers[decision]);
      }
      return;
    }

    const markerIdx = {
      STOP: 0, FOLLOW: 0, YIELD: 0, OVERTAKE: 0,
    };
    for (let i = 0; i < objects.length; i++) {
      const decisions = objects[i].decision;
      if (_.isEmpty(decisions)) {
        continue;
      }
      for (let j = 0; j < decisions.length; ++j) {
        const decision = decisions[j];
        const decisionType = _.attempt(() => decision.type);
        if (_.isError(decisionType)) {
          continue;
        }

        if (decisionType === 'STOP' || decisionType === 'FOLLOW'
                    || decisionType === 'YIELD' || decisionType === 'OVERTAKE') {
          // Show the specific marker.
          let marker = null;
          if (markerIdx[decisionType] >= this.markers[decisionType].length) {
            marker = this.getObstacleDecision(decisionType);
            this.markers[decisionType].push(marker);
            scene.add(marker);
          } else {
            marker = this.markers[decisionType][markerIdx[decisionType]];
          }

          const pos = coordinates.applyOffset(new THREE.Vector3(
            decision.positionX, decision.positionY, 0,
          ));
          if (pos === null) {
            continue;
          }
          const rotationX = STORE.options.cameraAngle !== 'Orthographic' ? Math.PI / 2 : (Math.PI / 2);
          marker.position.set(pos.x, pos.y, 0.2);
          marker.rotation.set(rotationX, decision.heading - Math.PI / 2, 0);
          marker.visible = true;
          markerIdx[decisionType]++;

          if (decisionType === 'YIELD' || decisionType === 'OVERTAKE') {
            // Draw a dotted line to connect the marker and the obstacle.
            const connect = marker.connect;
            connect.geometry.vertices[0].set(
              objects[i].positionX - decision.positionX,
              objects[i].positionY - decision.positionY, 0,
            );
            connect.geometry.verticesNeedUpdate = true;
            connect.geometry.computeLineDistances();
            connect.geometry.lineDistancesNeedUpdate = true;
            connect.rotation.set(Math.PI / (-2), 0,
              Math.PI / 2 - decision.heading);
          }
        } else if (decisionType === 'NUDGE') {
          const nudge = drawShapeFromPoints(
            coordinates.applyOffsetToArray(decision.polygonPoint),
            new THREE.MeshBasicMaterial({ color: 0xff7f00, transparent: true, opacity: 0.3 }), false, 2,
          );
          this.nudges.push(nudge);
          scene.add(nudge);
        }
      }
    }
    let decision = null;
    for (decision in MarkerColorMapping) {
      hideArrayObjects(this.markers[decision], markerIdx[decision]);
    }
  }

  getMainStopDecision() {
    const marker = this.getFence('MAIN_STOP');

    for (const reason in StopReasonMarkerMapping) {
      const reasonMarker = drawImage(this.images[StopReasonMarkerMapping[reason]], 1, 1, 4.2, 3.6, 0);
      marker.add(reasonMarker);
      marker[reason] = reasonMarker;
    }

    marker.visible = false;
    return marker;
  }

  getMainChangeLaneDecision() {
    const marker = this.getFence('MAIN_CHANGE_LANE');

    for (const type in ChangeLaneMarkerMapping) {
      const typeMarker = drawImage(this.images[ChangeLaneMarkerMapping[type]], 1, 1, 1.0, 2.8, 0);
      marker.add(typeMarker);
      marker[type] = typeMarker;
    }

    marker.visible = false;
    return marker;
  }

  getObstacleDecision(type) {
    const marker = this.getFence(type);

    if (type === 'YIELD' || type === 'OVERTAKE') {
      const color = MarkerColorMapping[type];
      const connect = drawDashedLineFromPoints(
        [new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 0, 0)],
        color, 2, 2, 1, 30,
      );
      marker.add(connect);
      marker.connect = connect;
    }

    marker.visible = false;
    return marker;
  }

  getFence(type) {
    let fence = null;
    let icon = null;
    const marker = new THREE.Object3D();
    switch (type) {
      case 'STOP':
        fence = drawImage(this.images.fenceObjectStop, 11.625, 3, 0, 1.5, 0);
        marker.add(fence);
        icon = drawImage(this.images.iconObjectStop, 1, 1, 3, 3.6, 0);
        marker.add(icon);
        break;
      case 'FOLLOW':
        fence = drawImage(this.images.fenceObjectFollow, 11.625, 3, 0, 1.5, 0);
        marker.add(fence);
        icon = drawImage(this.images.iconObjectFollow, 1, 1, 3, 3.6, 0);
        marker.add(icon);
        break;
      case 'YIELD':
        fence = drawImage(this.images.fenceObjectYield, 11.625, 3, 0, 1.5, 0);
        marker.add(fence);
        icon = drawImage(this.images.iconObjectYield, 1, 1, 3, 3.6, 0);
        marker.add(icon);
        break;
      case 'OVERTAKE':
        fence = drawImage(this.images.fenceObjectOvertake, 11.625, 3, 0, 1.5, 0);
        marker.add(fence);
        icon = drawImage(this.images.iconObjectOvertake, 1, 1, 3, 3.6, 0);
        marker.add(icon);
        break;
      case 'MAIN_STOP':
        fence = drawImage(this.images.fenceMainStop, 11.625, 3, 0, 1.5, 0);
        marker.add(fence);
        icon = drawImage(this.images.iconMainStop, 1, 1, 3, 3.6, 0);
        marker.add(icon);
        break;
      case 'MAIN_CHANGE_LANE':
        break;
    }
    return marker;
  }
}
