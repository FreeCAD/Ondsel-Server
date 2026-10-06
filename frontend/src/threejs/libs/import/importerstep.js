// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';
import occtimportjs from 'occt-import-js';
import { OBJ_COLOR } from '@/threejs/libs/constants';
import { Model } from '@/threejs/libs/model/model';
import {ModelObject3D, ModelObjectType} from '@/threejs/libs/model/object';

export class ImporterStep {

  constructor() {
    this.model = new Model ();
    this.file = null;
    this.worker = null;
    this.objects = [];
  }

  CanImportExtension(extension) {
    return extension.toUpperCase() === 'STEP' || extension.toUpperCase() === 'STP';
  }

  Reset() {
    this.model = new Model ();
    this.file = null;
    if (this.worker !== null) {
      this.worker.terminate();
    }
    this.worker = null;
    this.objects = [];
  }

  LoadFile(fileUrl, callback) {
    this.file = fileUrl;
    this.Reset();
    fetch(fileUrl).then(async response => {
      let buffer = await response.arrayBuffer ();
      let fileBuffer = new Uint8Array (buffer);
      this.ImportContent(fileBuffer, callback);
    });
  }

  ImportContent (fileContent, onFinish) {

    occtimportjs().then (occt => {
      const data = occt.ReadStepFile(fileContent, null);
      for (let resultMesh of data.meshes) {

        let object3d = new ModelObject3D ();
        if (resultMesh.name) {
          object3d.SetName(resultMesh.name);
          object3d.SetRealName(resultMesh.name);
        }
        if (resultMesh.color) {
          object3d.SetColor(new THREE.Color(resultMesh.color[0], resultMesh.color[1], resultMesh.color[2]));
        } else {
          object3d.SetColor(new THREE.Color(OBJ_COLOR));
        }

        let mainObject = new THREE.Object3D();
        let geometry = new THREE.BufferGeometry();

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3));
        if (resultMesh.attributes.normal) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3));
        }
        const index = Uint32Array.from(resultMesh.index.array);
        geometry.setIndex(new THREE.BufferAttribute(index, 1));
        let material = new THREE.MeshPhongMaterial({color: object3d.GetColor()})
        const mesh = new THREE.Mesh (geometry, material);
        mainObject.add(mesh);
        object3d.SetObject3d(mainObject);
        object3d.SetType(ModelObjectType.Shape);
        this.model.AddObject(object3d);
      }

      // Create Tree Structure

      for (let root of data.root.children) {
        this.AddNode(null, root);
      }
      onFinish(this.model);
    });

  }

  AddNode(parentObj, node) {
    // A leaf node with one mesh is that mesh object; anything else becomes a group
    let nodeObj;
    if (node.children.length === 0 && node.meshes.length === 1) {
      nodeObj = this.model.GetObjects()[node.meshes[0]];
    } else {
      nodeObj = new ModelObject3D();
      nodeObj.SetType(ModelObjectType.Group);
      nodeObj.SetName(node.name);
      nodeObj.SetRealName(node.name);
      nodeObj.SetObject3d(new THREE.Group());
      this.model.AddObject(nodeObj);
      for (let meshIndex of node.meshes) {
        this.AttachNode(nodeObj, this.model.GetObjects()[meshIndex]);
      }
      for (let child of node.children) {
        this.AddNode(nodeObj, child);
      }
    }
    if (parentObj) {
      this.AttachNode(parentObj, nodeObj);
    }
  }

  AttachNode(parentObj, childObj) {
    parentObj.AddChildren(childObj);
    parentObj.GetObject3d().add(childObj.GetObject3d());
    childObj.SetParent(parentObj);
  }
}
