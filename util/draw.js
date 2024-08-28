const THREE = require('three')
const _ = require("loadsh")
const ThreeLine2D = require('three-line-2d')
const ThreeLine2DBasicShader =  require('three-line-2d/shaders/basic');

const DELTA_Z_OFFSET = 0.04;

const BasicShader = ThreeLine2DBasicShader(THREE);
const Line = ThreeLine2D(THREE);

const addOffsetZ = function (mesh, value) {
  if (value) {
    const zOffset = value * DELTA_Z_OFFSET;
    mesh.position.z += zOffset;
  }
}

const drawSegmentsFromPoints = function (
  points, color = 0xff0000, linewidth = 1, zOffset = 0,
  matrixAutoUpdate = true, transparent = false, opacity = 1,
) {
  const path = new THREE.Path();
  const geometry = path.createGeometry(points);
  const material = new THREE.LineBasicMaterial({
    color,
    linewidth,
    transparent,
    opacity,
  });
  const pathLine = new THREE.Line(geometry, material);
  addOffsetZ(pathLine, zOffset);
  pathLine.matrixAutoUpdate = matrixAutoUpdate;
  if (matrixAutoUpdate === false) {
    pathLine.updateMatrix();
  }
  return pathLine;
}

const drawDashedLineFromPoints = function (
  points, color = 0xff0000, linewidth = 1, dashSize = 4, gapSize = 2,
  zOffset = 0, opacity = 1, matrixAutoUpdate = true,
) {
  const path = new THREE.Path();
  const geometry = path.createGeometry(points);
  geometry.computeLineDistances();
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize,
    linewidth,
    gapSize,
    transparent: true,
    opacity,
  });
  const mesh = new THREE.Line(geometry, material);
  addOffsetZ(mesh, zOffset);
  mesh.matrixAutoUpdate = matrixAutoUpdate;
  if (!matrixAutoUpdate) {
    mesh.updateMatrix();
  }
  return mesh;
}


const disposeMesh = function (mesh) {
  if (!mesh) {
    return;
  }

  mesh.geometry.dispose();
  mesh.material.dispose();
}

const drawThickBandFromPoints = function (
  points, thickness = 0.5, color = 0xffffff, opacity = 1, zOffset = 0,
) {
  const geometry = Line(points.map((p) => [p.x, p.y]));
  const material = new THREE.ShaderMaterial(BasicShader({
    side: THREE.DoubleSide,
    diffuse: color,
    thickness,
    opacity,
    transparent: true,
  }));
  const mesh = new THREE.Mesh(geometry, material);
  addOffsetZ(mesh, zOffset);
  return mesh;
}

const drawSolidBox = function (dimension, color, linewidth) {
  const geometry = new THREE.CubeGeometry(dimension.x, dimension.y, dimension.z);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
  });
  const box = new THREE.Mesh(geometry, material);
  addOutlineToObject(box, geometry, color, linewidth);
  return box;
}

const drawBox = function (dimension, color, linewidth) {
  const geometry = new THREE.CubeGeometry(dimension.x, dimension.y, dimension.z);
  const material = new THREE.MeshBasicMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);
  const box = new THREE.BoxHelper(cube);
  box.material.linewidth = linewidth;
  return box;
}

const drawDashedBox = function (dimension, color, linewidth, dashSize = 0.01, gapSize = 0.02) {
  let geometry = new THREE.CubeGeometry(dimension.x, dimension.y, dimension.z);
  geometry = new THREE.EdgesGeometry(geometry);
  geometry = new THREE.Geometry().fromBufferGeometry(geometry);
  geometry.computeLineDistances();
  const material = new THREE.LineDashedMaterial({
    color,
    linewidth,
    dashSize,
    gapSize,
  });
  const cube = new THREE.LineSegments(geometry, material);
  return cube;
}

const drawArrow = function (length, linewidth, conelength, conewidth, color, thickBand = false) {
  const end = new THREE.Vector3(0, length, 0);
  const begin = new THREE.Vector3(0, 0, 0);
  const left = new THREE.Vector3(conewidth / 2, length - conelength, 0);
  const right = new THREE.Vector3(-conewidth / 2, length - conelength, 0);

  const arrow = (thickBand)
    ? drawThickBandFromPoints([begin, end, left, right, end], 0.3, color)
    : drawSegmentsFromPoints([begin, end, left, end, right], color, linewidth, 1);
  return arrow;
}

const drawImage = function (img, width, height, x = 0, y = 0, z = 0) {
  const material = new THREE.MeshBasicMaterial(
    {
      map: textureLoader.load(img),
      transparent: true,
      depthWrite: false,
    },
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1), material);
  // mesh.material.side = THREE.DoubleSide;
  mesh.position.set(x, y, z);
  mesh.overdraw = true;

  return mesh;
}

const drawSolidPolygonFace = function (
  color = 0xff0000, zOffset = 0,
  matrixAutoUpdate = true, transparent = true, opacity = 0.8,
) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent,
    opacity,
  });
  const rect = new THREE.Mesh(geometry, material);
  addOffsetZ(rect, zOffset);
  rect.matrixAutoUpdate = matrixAutoUpdate;
  if (matrixAutoUpdate === false) {
    rect.updateMatrix();
  }
  return rect;
}

const getShapeGeometryFromPoints = function (points, bezierCurve = false) {
  const shape = new THREE.Shape();
  if (bezierCurve) {
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 2; i += 1) {
      shape.bezierCurveTo(points[i].x, points[i].y,
        points[i + 1].x, points[i + 1].y,
        points[i + 2].x, points[i + 2].y);
    }
    shape.bezierCurveTo(_.takeRight(points, 2).concat(
      [{ x: points[0].x, y: points[0].y }],
    ));
    shape.bezierCurveTo(_.takeRight(points, 1).concat(
      [{ x: points[0].x, y: points[0].y },
        { x: points[1].x, y: points[1].y }],
    ));
  } else {
    shape.fromPoints(points);
  }
  return new THREE.ShapeGeometry(shape);
}

const drawShapeFromPoints = function (points,
  material = new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  bezierCurve = false, order = 0, matrixAutoUpdate = true) {
  const geometry = getShapeGeometryFromPoints(points, bezierCurve);
  const mesh = new THREE.Mesh(geometry, material);
  addOffsetZ(mesh, order);
  mesh.matrixAutoUpdate = matrixAutoUpdate;
  if (!matrixAutoUpdate) {
    mesh.updateMatrix();
  }
  return mesh;
}

const drawCircle = function (radius, material, segments = 32) {
  const geometry = new THREE.CircleGeometry(radius, segments);
  const circleMesh = new THREE.Mesh(geometry, material);
  return circleMesh;
}

const drawEllipse = function (aRadius, bRadius, material) {
  const path = new THREE.Shape();
  path.absellipse(0, 0, aRadius, bRadius, 0, Math.PI * 2, false, 0);
  const geometry = new THREE.ShapeBufferGeometry(path);
  const ellipse = new THREE.Mesh(geometry, material);
  return ellipse;
}


module.exports = {
  drawThickBandFromPoints,
  drawSegmentsFromPoints,
  drawDashedLineFromPoints,
  disposeMesh,
  drawBox, 
  drawSolidBox, 
  drawDashedBox, 
  drawArrow, 
  drawImage,
  drawShapeFromPoints,
  drawSolidPolygonFace,
  drawEllipse,
  drawCircle
}