<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# KiCad Support

Upload a `.kicad_pcb` file to a workspace and Lens makes a Model from it, like it does for an FCStd file. You can then view the board in 3D, look at it in a KiCad-style viewer, share it, and export it.

---

## What you get

Lens converts the `.kicad_pcb` file into a FreeCAD model with one solid for the board and one object per component. Each component object is labelled with its reference and model name, for example `C1_CP_Axial_L18.0mm_D6.5mm_P25.00mm_Horizontal`. The board itself is labelled `board`. Component colours come from the component 3D models.

Everything that works for other models works for the converted board: the 3D viewer, thumbnails, version history, share links, exports, and Run Script.

---

## Supported files

| File | Result |
|------|--------|
| `.kicad_pcb` | Model with the 3D viewer, the KiCanvas viewer, and FCStd, STEP, STL, and OBJ exports |
| Other KiCad files (schematics, project files, libraries) | Stored as plain files |

---

## Viewing a board

### 3D viewer

The model page opens the converted board in the 3D viewer. Select an object in the object list to inspect a component.

### KiCanvas

KiCanvas shows the board as KiCad draws it, with layers, footprints, nets, and properties panels.

1. Open the model page.
2. Click the chip icon in the right toolbar to switch to KiCanvas.
3. Click the cube icon to switch back to the 3D viewer.

Upload the project's `.kicad_sch` and `.kicad_pro` files into the same folder as the board and KiCanvas also shows the schematics, with a page switcher for hierarchical sheets.

### Share links

On a share link, the KiCanvas switch appears when the link has **Can view model** enabled. KiCanvas reads the original `.kicad_pcb` file, so viewers of the link can read the board's layout and nets.

---

## Exports and scripts

Exports and Run Script use the converted FreeCAD model, so you can export the board as FCStd, STEP, STL or OBJ and run FreeCAD scripts against it like any other model.

---

## Component models

Lens places a component's 3D model when it finds the model in one of these places:

- the official KiCad 3D model library
- the board file itself, for models embedded in it
- the board's folder in Lens, for models kept in the KiCad project folder

### Models in the project folder

Models referenced as `${KIPRJMOD}/...`, or by a plain relative path, are loaded from the board's folder in Lens. Upload them with the same folder names and file names as in the project. For example, a board referencing `${KIPRJMOD}/3d_lib/J1.step` expects a `3d_lib` folder with `J1.step` next to the board.

- Like linked FreeCAD assemblies, this needs the Peer tier or above.
- If you upload the models after the board, press **Recompute** on the missing-model notice. The page reloads when the new model is ready.
- Components placed from these models show an open icon in the object list, which leads to the model file in Lens.

### Missing models

A component is left out when its model is not found:

- it is a project model that was not uploaded
- it comes from a library other than the official KiCad library
- it only has a WRL file and no STEP file

The board still converts. The model page shows a notice with the number of affected components, and hovering it lists the designators and model path of each.

---

## For administrators and developers

Deployment settings and implementation details are covered in the other documents listed in the [README](../README.md#documentation).
