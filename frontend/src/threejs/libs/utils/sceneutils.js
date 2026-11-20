// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';

export function getMeshesFromScene(scene, object3d) {
  const meshes = [];
  scene.traverse(function (object) {
    if (object instanceof THREE.Mesh) {
      if (object.parent.uuid === object3d.object3d.uuid) {
        meshes.push(object);
      }
    }
  });
  return meshes;
}
