// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { fitCameraToSelection, getSelectedObject } from '@/threejs/cameraUtils'
import { Importer } from '@/threejs/libs/import/importer';
import { OBJ_COLOR, OBJ_HIGHLIGHTED_COLOR, EDGE_COLOR } from '@/threejs/libs/constants';
import { getObject3dFromScene } from '@/threejs/libs/utils/sceneutils';
import {ModelObjectType} from "@/threejs/libs/model/object";


const ViewerConfig = {
  showEdges: false,
  showAxisHelper: true,
}

export class Viewer {

  constructor(url, width, height, viewport, window, onLoadCallback, onModelClickCallback=null) {
    this.url = url;
    this.width = width;
    this.height = height;
    this.viewport = viewport;
    this.window = window;
    this.obj = null;
    this.lineSegments = null;
    this.axisHelper = null
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    this.camera = null;
    this.objLoader = new OBJLoader();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.selectedObjs = []
    this.onLoadCallback = onLoadCallback;
    this.onModelClickCallback = onModelClickCallback;
    this.importer = new Importer();
    this.model = null;

    this.initViewer();
  }

  initViewer() {
    const VIEW_ANGLE = 45;
    const ASPECT = this.width / this.height;
    const NEAR = 0.1;
    const FAR = 20000;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setClearColor(0xFFFF00, 0); // the default
    this.renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    this.renderer.setSize(this.width, this.height);

    this.camera = new THREE.PerspectiveCamera(
      VIEW_ANGLE, // Field of view
      ASPECT, // Aspect ratio
      NEAR, // Near plane
      FAR, // Far plane
    );

    // Position the camera along the negative Y-axis
    this.camera.position.set(1, -1, 1);
    // Set the camera's "up" vector to the Z-axis
    this.camera.up.set(0, 0, 1);

    this.scene.add(this.camera);

    this.createLights();

    this.initControls();

    this.loadOBJ();

    // this.viewport.addEventListener('touchend', this.onPointerMove);
    this.viewport.addEventListener('mousedown', this.onPointerClicked.bind(this));
    // this.window.addEventListener('touchend', this.onPointerMove);
    // this.window.addEventListener('mouseup', this.onPointerMove.bind(this));

    this.animate()
  }

  animate() {
    requestAnimationFrame( this.animate.bind(this));

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  createLights() {
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.2);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    this.camera.add(pointLight);
  }

  loadOBJ() {
    this.objLoader = new OBJLoader();

    if (this.obj) {
      this.scene.remove(this.obj);
    }
    if (this.lineSegments) {
      this.scene.remove(this.lineSegments);
    }
    this.importer.LoadFile(this.url, this.onFileConverted.bind(this));
  }

  onFileConverted(model) {
    this.model = model;
    this.obj = model.GetCompoundObject();
    this.scene.add(this.obj)
    this.lineSegments = new THREE.Group()
    for (let obj of this.obj.children) {
      for (let child of obj.children) {
        if (child instanceof THREE.Mesh) {
          if (child.geometry !== undefined) {
            const edges = new THREE.EdgesGeometry(child.geometry);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: EDGE_COLOR, linewidth: 1}),
            );
            this.lineSegments.add(line);
          }
        }
      }
    }
    if (ViewerConfig.showEdges) {
      this.scene.add(this.lineSegments);
    }
    if (!this.axisHelper) {
      this.addAxesHelper();
      fitCameraToSelection(this.camera, this.controls, this.obj);
    }

    this.onLoadCallback();
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  addAxesHelper() {
    const box = new THREE.Box3();
    box.setFromObject(this.obj);
    const size = new THREE.Vector3();
    box.getSize(size)
    const maxSize = Math.max(size.x * 2, size.y * 2, size.z * 2);

    this.axisHelper = new THREE.AxesHelper( maxSize );
    if (ViewerConfig.showAxisHelper) {
      this.scene.add(this.axisHelper);
    }
  }

  fitCameraToObjects() {
    if (this.selectedObjs.length > 0) {
      fitCameraToSelection(this.camera, this.controls, this.selectedObjs.filter(o => o.IsShapeType()).map(o => o.object3d));
    } else {
      fitCameraToSelection(this.camera, this.controls, this.obj);
    }
  }

  onPointerClicked(event) {
    this.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    this.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    const selectedObj = getSelectedObject(this.raycaster, this.camera, this.pointer, this.obj);
    if (selectedObj) {
      const modelObject3d = this.model.findObjectByMeshUuid(selectedObj.parent?.uuid);
      if (modelObject3d) {
        this.selectGivenObject(modelObject3d, true);
      }
    }
  }

  selectGivenObject(modelObject3d, triggerObjectClickEvent=false) {
    if (!this.selectedObjs.includes(modelObject3d)) {
      if (modelObject3d.IsShapeType() || modelObject3d.type === ModelObjectType.Image) {
        const meshObj = getObject3dFromScene(this.scene, modelObject3d);
        if (Array.isArray(meshObj.material)) {
          // per-face materials: swap the whole array for one highlight material
          meshObj.userData.faceMaterials = meshObj.material;
          meshObj.material = new THREE.MeshPhongMaterial({color: OBJ_HIGHLIGHTED_COLOR});
        } else {
          meshObj.material.color.set(OBJ_HIGHLIGHTED_COLOR);
        }
      }
      this.selectedObjs.push(modelObject3d);
    } else {
      const color = modelObject3d ? modelObject3d.GetColor() : OBJ_COLOR;
      if (modelObject3d.IsShapeType() || modelObject3d.type === ModelObjectType.Image) {
        const meshObj = getObject3dFromScene(this.scene, modelObject3d);
        if (meshObj.userData.faceMaterials) {
          meshObj.material.dispose();
          meshObj.material = meshObj.userData.faceMaterials;
          delete meshObj.userData.faceMaterials;
        } else {
          meshObj.material.color.set(color);
        }
      }
      const index = this.selectedObjs.indexOf(modelObject3d);
      if (index > -1) {
        this.selectedObjs.splice(index, 1);
      }
    }
    if (triggerObjectClickEvent && this.onModelClickCallback) {
      this.onModelClickCallback(modelObject3d);
    }
  }

}
