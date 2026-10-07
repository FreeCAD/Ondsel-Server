// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';

export function readShapeAppearance(buffer) {
  const appearances = [];
  if (!buffer || buffer.length < 4) {
    return appearances;
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getUint32(0, true);
  const entrySize = 24; // Each entry is 24 bytes long, one entry per face
  let offset = 4;
  for (let i = 0; i < count && offset + entrySize <= buffer.length; i++) {
    appearances.push({
      ambientColor: view.getUint32(offset, true),
      diffuseColor: view.getUint32(offset + 4, true),
      specularColor: view.getUint32(offset + 8, true),
      emissiveColor: view.getUint32(offset + 12, true),
      shininess: view.getFloat32(offset + 16, true),
      transparency: view.getFloat32(offset + 20, true)
    });
    offset += entrySize;
  }
  return appearances;
}

export function readColorList(buffer) {
  const colors = [];
  if (!buffer || buffer.length < 4) {
    return colors;
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getUint32(0, true);
  let offset = 4;
  for (let i = 0; i < count && offset + 4 <= buffer.length; i++) {
    colors.push(view.getUint32(offset, true));
    offset += 4;
  }
  return colors;
}

export function intToRgba(colorInt) {
  const r = ((colorInt >> 24) & 0xFF) / 255;
  const g = ((colorInt >> 16) & 0xFF) / 255;
  const b = ((colorInt >> 8) & 0xFF) / 255;
  const a = (colorInt & 0xFF) / 255;
  return [r, g, b, a];
}

export function linearRgbToColor(rgb) {
  return new THREE.Color(rgb[0], rgb[1], rgb[2]).convertLinearToSRGB();
}

// faceColors: [{color, transparency}] per b-rep face, in the order of brepFaces
// (occt-import-js triangle ranges). Any mismatch gives one material in `color`.
export function buildMesh(geometry, brepFaces, faceColors, color) {
  if (!faceColors || !brepFaces || brepFaces.length !== faceColors.length) {
    return new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: color}));
  }

  const materials = [];
  const materialIndexByKey = new Map();
  let groupStart = 0;
  let groupCount = 0;
  let groupIndex = -1;
  for (let i = 0; i < brepFaces.length; i++) {
    const entry = faceColors[i];
    const key = entry.color.getHex() + ':' + entry.transparency;
    let materialIndex = materialIndexByKey.get(key);
    if (materialIndex === undefined) {
      materialIndex = materials.length;
      const material = new THREE.MeshPhongMaterial({color: entry.color});
      if (entry.transparency > 0) {
        material.transparent = true;
        material.opacity = 1 - entry.transparency;
      }
      materials.push(material);
      materialIndexByKey.set(key, materialIndex);
    }
    const start = brepFaces[i].first * 3;
    const count = (brepFaces[i].last - brepFaces[i].first + 1) * 3;
    if (materialIndex === groupIndex && start === groupStart + groupCount) {
      groupCount += count;
      continue;
    }
    if (groupIndex !== -1) {
      geometry.addGroup(groupStart, groupCount, groupIndex);
    }
    groupStart = start;
    groupCount = count;
    groupIndex = materialIndex;
  }
  if (groupIndex !== -1) {
    geometry.addGroup(groupStart, groupCount, groupIndex);
  }
  return new THREE.Mesh(geometry, materials);
}
