<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Upgrading FreeCAD Version (FC-Worker)

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Upgrade the base image `amrit3701/freecad-cli`](#upgrade-the-base-image-amrit3701freecad-cli)
  - [Build steps](#build-steps)
  - [Notes on GUI/workbenches](#notes-on-guiworkbenches)
  - [Smoke test the image](#smoke-test-the-image)
- [Update FC-Worker to use the new base image](#update-fc-worker-to-use-the-new-base-image)
- [Test the new FC-Worker version end-to-end](#test-the-new-fc-worker-version-end-to-end)
  - [Model upload and viewer checks](#model-upload-and-viewer-checks)
  - [Exports](#exports)
  - [Assemblies](#assemblies)
  - [KiCad boards](#kicad-boards)
- [Where to check logs](#where-to-check-logs)
- [Troubleshooting](#troubleshooting)

## Overview
Upgrading FreeCAD for FC-Worker is a two-step process: 1) build and publish a new `amrit3701/freecad-cli` base image with the target FreeCAD version, then 2) update FC-Worker Dockerfiles to reference that new image and verify functionality.

## Prerequisites
- Access to the base image repository: [amrit3701/docker-freecad-cli](https://github.com/amrit3701/docker-freecad-cli)
- Ability to build and push container images to your registry
- A development environment capable of running the Lens stack (see `docker-compose.yml` in the repository root)
- Familiarity with building C++ projects on Debian/Ubuntu and reading build logs

## Upgrade the base image `amrit3701/freecad-cli`
The latest base image Dockerfile lives in: [amrit3701/docker-freecad-cli](https://github.com/amrit3701/docker-freecad-cli/blob/master/1.0.2/amd64/Dockerfile.ubuntu)

### Build steps
1. Update the `FREECAD_VERSION` arg in the base image Dockerfile to the new version.
2. Attempt the build and iteratively add missing packages to the `apt-get` install list until compilation succeeds. Refer to the upstream list of packages as guidance: [FreeCAD Wiki: Compile on Linux → Debian and Ubuntu](https://wiki.freecad.org/Compile_on_Linux#Debian_and_Ubuntu).
3. If compilation fails due to workbenches tightly coupled with the GUI (e.g., TechDraw), exclude them via `-DBUILD_{WORKBENCH}=OFF` (for example, `-DBUILD_TECHDRAW=OFF`) in the CMake command. Keep the CAM module (`BUILD_CAM=ON`), because KiCad conversion needs `Path.Area`.
4. Publish the built image with an appropriate tag to `amrit3701/freecad-cli` or to your own container registry, and use that image in the following steps.

### Notes on GUI/workbenches
- We do not include the full set of GUI-related packages because we build for headless CLI usage only with the `-DBUILD_GUI=OFF` flag in the CMake command.
- Exclude only the problematic workbenches necessary to achieve a successful headless build.

### Smoke test the image
After a successful build:
- Start a container from the new image and run:
```bash
python3
```
- Inside the `python3` REPL, try importing key workbenches (e.g., `Part`, `Arch`, `Draft`) to ensure they load without errors. Also check that `import Path; Path.Area` works, because KiCad conversion needs it.

## Update FC-Worker to use the new base image
Once your new `freecad-cli` image is published, update FC-Worker Dockerfiles to reference it. Typical files include:
- `FC-Worker/Dockerfile`
- `FC-Worker/Dockerfile.api`
- `FC-Worker/Dockerfile.api.dev`
- `FC-Worker/Dockerfile.celery`
- `FC-Worker/Dockerfile.celery.dev`

Update the image tag to the newly published version in all relevant Dockerfiles and rebuild the services.

## Test the new FC-Worker version end-to-end
Perform the following checks after pointing FC-Worker to the new base image.

### Model upload and viewer checks
- Upload a new model file and verify the viewer renders correctly.
- Validate model attribute updates behave as expected.

### Exports
- Test export of models to different file formats from the model viewer page and verify the downloaded file is exported correctly by opening it in FreeCAD.

### Assemblies
- Use the sample assembly under `docs/test-models/assembly.zip`:
  - Extract the ZIP, upload each file to a workspace.
  - Open `assembly.FCStd` file from the workspace and confirm it loads correctly.
  - Toggle visibility of components in the assembly from the left sidebar in the model viewer to ensure expected behavior.
  - Use the "redirect to component" icon on components from the left sidebar in the model viewer and verify navigation to the correct component details page.

### KiCad boards
- Upload a `.kicad_pcb` file to a workspace.
  - Confirm the board and its components render in the 3D viewer.
  - Confirm the KiCanvas switch (chip icon) appears in the right toolbar and shows the board.

## Where to check logs
- Backend service logs (Node): run the stack via `docker-compose` and inspect container logs for `backend` and related services.
- FC-Worker logs (Python): check the `fc-worker`/Celery worker containers for runtime and export pipeline logs.

## Troubleshooting
- Build failures during base image compilation:
  - Revisit missing dependencies and compare with the FreeCAD Wiki list.
  - Temporarily exclude problematic workbenches with `-DBUILD_{WORKBENCH}=OFF` (e.g., `-DBUILD_TECHDRAW=OFF`).
- Runtime import errors in the `freecad-cli` container (`python3` REPL):
  - Ensure the new image was built with the required modules; recheck excluded workbenches.
- Viewer issues after upgrade:
  - Clear browser cache and rebuild frontend assets.
  - Confirm the FC-Worker image tag updates are present in all Dockerfiles and that services were rebuilt and restarted.
