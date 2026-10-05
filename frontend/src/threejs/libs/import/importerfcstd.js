// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';
import occtimportjs from 'occt-import-js';
import { Model } from '../model/model.js';
import {ModelObject3D, ModelObjectType} from '../model/object.js';
import { GetFileExtension } from '../utils/fileutils.js';
import { ArrayBufferToUtf8String } from '../utils/bufferutils.js';
import { Property, PropertyGroup, PropertyType } from '../model/property.js';
import { readShapeAppearance, readColorList, intToRgba } from './utils.js';

import * as fflate from 'fflate';
import { OBJ_COLOR } from '@/threejs/libs/constants';

const DocumentInitResult =
  {
      Success : 0,
      NoDocumentXml : 1
  };


class FreeCadObject
{
    constructor (name, type)
    {
        this.name = name;
        this.type = type;
        this.shapeName = null;
        this.isVisible = false;
        this.color = null;
        this.faceColors = null;
        this.fileName = null;
        this.fileContent = null;
        this.inLinkCount = 0;
        this.properties = null;
        this.childs = [];
        this.parent = null;
    }

    IsConvertible ()
    {
        if (this.type === 'Assembly::AssemblyObject') {
          return false;
        }
        if (this.fileName === null || this.fileContent === null) {
            return false;
        }
        if (!this.isVisible) {
            return false;
        }

        if (this.inLinkCount > 0) {
          return !!(this.parent && this.parent.IsAssemblyObject());
        }
        return true;
    }

    GetColor() {
      if (this.color) {
        return this.color;
      }

      return new THREE.Color(OBJ_COLOR);

    }

    IsAssemblyObject() {
      return this.type === 'Assembly::AssemblyObject';
    }
}

class FreeCadDocument
{
    constructor ()
    {
        this.files = null;
        this.properties = null;
        this.objectNames = [];
        this.objectData = new Map ();
        this.documentXml = null;
        this.appearances = new Map ();
    }

    Init (fileContent)
    {
        let fileContentBuffer = new Uint8Array (fileContent);
        this.files = fflate.unzipSync (fileContentBuffer);
        if (!this.LoadDocumentXml ()) {
            return DocumentInitResult.NoDocumentXml;
        }

        this.LoadGuiDocumentXml ();
        return DocumentInitResult.Success;

    }

    GetObjectListToConvert ()
    {
        let objectList = [];
        for (let objectName of this.objectNames) {
            let object = this.objectData.get (objectName);
            if (!object.IsConvertible ()) {
                continue;
            }
            objectList.push (object);
        }
        return objectList;
    }

    IsSupportedType (type, name)
    {
        if (name === 'PropertyBag') {
            return true;
        }
        if (type === 'Assembly::AssemblyObject') {
          return true;
        }
        if (type === 'Image::ImagePlane') {
          return true;
        }
        if (!type.startsWith ('Part::') && !type.startsWith ('PartDesign::')) {
            return false;
        }
        if (type.indexOf ('Part2D') !== -1) {
            return false;
        }
        return true;
    }

    HasFile (fileName)
    {
        return (fileName in this.files);
    }

    LinkedFiles() {
      if (this.documentXml === null) {
        return false;
      }

      let linkedFiles = {};
      let linkedObjectsName = [];

      let objectsElements = this.documentXml.getElementsByTagName('Objects');
      for (let objectsElement of objectsElements) {
        let objectElements = objectsElement.getElementsByTagName('Object');
        for (let objectElement of objectElements) {
          let name = objectElement.getAttribute('name');
          let type = objectElement.getAttribute('type');
          if (type === 'App::Link') {
            linkedObjectsName.push(name)
          }
        }
      }

      let objectDataElements = this.documentXml.getElementsByTagName('ObjectData');
      for (let objectsElement of objectDataElements) {
        let objectElements = objectsElement.getElementsByTagName('Object');
        for (let objectElement of objectElements) {
          let objectName = objectElement.getAttribute('name');
          if (!linkedObjectsName.includes(objectName)) {
            continue;
          }
          let properties = objectElement.getElementsByTagName('Property');
          for (let propertyElement of properties) {
            let name = propertyElement.getAttribute('name');
            if (name === 'LinkedObject') {
              let xLinkElement = propertyElement.getElementsByTagName('XLink')[0];
              let fileName = xLinkElement.getAttribute('file');
              linkedFiles[objectName] = fileName;
            }
          }
        }
      }

      // Remove keys where external files not linked. It can be a link inside a file. Mainly added below check for
      // Assembly file.
      for (const key in linkedFiles) {
        if (linkedFiles[key] === '') {
          delete linkedFiles[key];
        }
      }

      return linkedFiles;
    }

    LoadDocumentXml ()
    {
        const excludedObjects = ['App::Plane', 'App::Origin', 'App::Line'];
        let documentXml = this.GetXMLContent ('Document.xml');
        if (documentXml === null) {
            return false;
        }
        this.documentXml = documentXml;

        this.properties = new PropertyGroup ('Properties');
        let documentElements = documentXml.getElementsByTagName ('Document');
        for (let documentElement of documentElements) {
            for (let childNode of documentElement.childNodes) {
                if (childNode.tagName === 'Properties') {
                    this.GetPropertiesFromElement (childNode, this.properties);
                }
            }
        }

        let objectsElements = documentXml.getElementsByTagName ('Objects');
        for (let objectsElement of objectsElements) {
            let objectElements = objectsElement.getElementsByTagName ('Object');
            for (let objectElement of objectElements) {
                let name = objectElement.getAttribute ('name');
                let type = objectElement.getAttribute ('type');
                // Check for BREP file with new naming first, then fallback to old naming for backward compatibility
                let fileName = `lens_${name}.brp`
                if (!this.HasFile(fileName)) {
                  fileName = `ondsel_${name}.brp` // backward compatibility for old files
                }
                // Hack for ObjectList view to avoid showing Origin and Plane object. For new files we already fixed on
                // FC_Worker side, this is for already generated files.
                if (excludedObjects.includes(type)) {
                  continue
                }
                if (!(this.IsSupportedType (type, name) || this.HasFile(fileName))) {
                    continue;
                }
                let object = new FreeCadObject (name, type);
                this.objectNames.push (name);
                this.objectData.set (name, object);
            }
        }

        let objectDataElements = documentXml.getElementsByTagName ('ObjectData');
        for (let objectDataElement of objectDataElements) {
            let objectElements = objectDataElement.getElementsByTagName ('Object');
            for (let objectElement of objectElements) {
                let name = objectElement.getAttribute ('name');
                if (!this.objectData.has (name)) {
                    continue;
                }

                let object = this.objectData.get (name);
                object.properties = new PropertyGroup ('Properties');
                for (let childNode of objectElement.childNodes) {
                    if (childNode.tagName === 'Properties') {
                        this.GetPropertiesFromElement (childNode, object.properties);
                    }
                }

                let propertyElements = objectElement.getElementsByTagName ('Property');
                let hasShapePrp = false;
                for (let propertyElement of propertyElements) {
                    let propertyName = propertyElement.getAttribute ('name');
                    let propertyType = propertyElement.getAttribute ('type');
                    if (propertyName === 'Label') {
                        object.shapeName = this.GetFirstChildValue (propertyElement, 'String', 'value');
                    } else if (propertyName === 'Visibility') {
                        let isVisibleString = this.GetFirstChildValue (propertyElement, 'Bool', 'value');
                        object.isVisible = (isVisibleString === 'true');
                    } else if (propertyName === 'Visible') {
                      let isVisibleString = this.GetFirstChildValue(propertyElement, 'Bool', 'value');
                      object.isVisible = (isVisibleString === 'true');
                    } else if (propertyName === 'Group' && propertyType === 'App::PropertyLinkList' && object.type === 'Assembly::AssemblyObject') {
                      for (let linkElement of propertyElement.getElementsByTagName ('Link')) {
                        let linkElementName = linkElement.getAttribute('value');
                        if (this.objectNames.includes(linkElementName)) {
                          const childObject = this.objectData.get(linkElementName);
                          object.childs.push(childObject);
                          childObject.parent = object;
                        }
                      }

                    } else if (propertyName === 'Shape') {
                        let fileName = this.GetFirstChildValue (propertyElement, 'Part', 'file');
                        if (!this.HasFile (fileName)) {
                            continue;
                        }
                        let extension = GetFileExtension (fileName);
                        if (extension !== 'brp' && extension !== 'brep') {
                            continue;
                        }
                        object.fileName = fileName;
                        object.fileContent = this.files[fileName];
                        hasShapePrp = true;
                    } else if (propertyName === 'ImageFile') {
                      let fileName = this.GetFirstChildValue (propertyElement, 'FileIncluded', 'file');
                      if (!this.HasFile (fileName)) {
                        continue;
                      }
                      object.fileName = fileName;
                      object.fileContent = this.files[fileName];
                    }
                }

                if (!hasShapePrp) {
                  // Check for BREP file with new naming first, then fallback to old naming for backward compatibility
                  let fileName = `lens_${name}.brp`
                  if (!this.HasFile (fileName)) {
                    fileName = `ondsel_${name}.brp` // backward compatibility for old files
                  }
                  if (!this.HasFile (fileName)) {
                      continue;
                  }
                  let extension = GetFileExtension (fileName);
                  if (extension !== 'brp' && extension !== 'brep') {
                      continue;
                  }
                  object.fileName = fileName;
                  object.fileContent = this.files[fileName];
                }

                let linkElements = objectElement.getElementsByTagName ('Link');
                for (let linkElement of linkElements) {
                    let linkedName = linkElement.getAttribute ('value');
                    if (this.objectData.has (linkedName)) {
                        let linkedObject = this.objectData.get (linkedName);
                        linkedObject.inLinkCount += 1;
                    }
                }
            }
        }

        return true;
    }

    ReadAppearance (viewProviderElement)
    {
        let faceColors = [];
        let propertyElements = viewProviderElement.getElementsByTagName ('Property');
        for (let propertyElement of propertyElements) {
            let propertyName = propertyElement.getAttribute ('name');
            if (propertyName === 'ShapeAppearance') {
                let file = this.GetFirstChildValue (propertyElement, 'MaterialList', 'file');
                if (!file || !this.HasFile (file)) {
                    continue;
                }
                faceColors = readShapeAppearance (this.files[file]).map (material => ({
                    color : new THREE.Color (...intToRgba (material.diffuseColor)),
                    transparency : material.transparency
                }));
            } else if (propertyName === 'DiffuseColor' && faceColors.length === 0) {
                let file = this.GetFirstChildValue (propertyElement, 'ColorList', 'file');
                if (!file || !this.HasFile (file)) {
                    continue;
                }
                faceColors = readColorList (this.files[file]).map (packed => ({
                    color : new THREE.Color (...intToRgba (packed)),
                    transparency : 0
                }));
            }
        }
        return faceColors;
    }

    LoadGuiDocumentXml ()
    {
        let documentXml = this.GetXMLContent ('GuiDocument.xml');
        if (documentXml === null) {
            return false;
        }

        let viewProviderElements = documentXml.getElementsByTagName ('ViewProvider');
        for (let viewProviderElement of viewProviderElements) {
            let name = viewProviderElement.getAttribute ('name');
            if (name === null) {
                continue;
            }
            let faceColors = this.ReadAppearance (viewProviderElement);
            if (faceColors.length > 0) {
                this.appearances.set (name, faceColors);
            }
        }

        for (let viewProviderElement of viewProviderElements) {
            let name = viewProviderElement.getAttribute ('name');
            if (!this.objectData.has (name)) {
                continue;
            }

            let object = this.objectData.get (name);
            let propertyElements = viewProviderElement.getElementsByTagName ('Property');
            for (let propertyElement of propertyElements) {
                let propertyName = propertyElement.getAttribute ('name');
                if (propertyName === 'Visibility') {
                    let isVisibleString = this.GetFirstChildValue (propertyElement, 'Bool', 'value');
                    object.isVisible = (isVisibleString === 'true');
                } else if (propertyName === 'ShapeColor') {
                    /*
                    <Property name="ShapeColor" type="App::PropertyColor" status="1">
                        <PropertyColor value="1073807104"/>
                    </Property>
                     */
                    let colorString = this.GetFirstChildValue (propertyElement, 'PropertyColor', 'value');
                    let colorInt = parseInt (colorString, 10);
                    object.color = new THREE.Color(...intToRgba(colorInt))
                } else if (propertyName === 'ShapeAppearance') {
                    /*
                    <Property name="ShapeAppearance" type="App::PropertyMaterialList" status="9">
                        <MaterialList file="ShapeAppearance" version="3"/>
                    </Property>
                     */
                    const faceColors = this.appearances.get (name);
                    if (faceColors) {
                        object.color = faceColors[0].color;
                    }
                } else if (propertyName === 'ShapeMaterial') {
                    /*
                    <Property name="ShapeMaterial" type="App::PropertyMaterial" status="1">
                        <PropertyMaterial ambientColor="858993408" diffuseColor="1073807104" specularColor="0" emissiveColor="0" shininess="0.2000000029802322" transparency="0.0000000000000000"/>
                    </Property>
                     */
                    let colorString = this.GetFirstChildValue (propertyElement, 'PropertyMaterial', 'diffuseColor');
                    const colorInt = parseInt (colorString, 10);
                    object.color = new THREE.Color(...intToRgba(colorInt));
                }
            }
        }

        for (let [name, object] of this.objectData) {
            let appearance = this.appearances.get (name);
            if (appearance === undefined) {
                continue;
            }
            object.faceColors = appearance.length > 1 ? appearance : null;
            if (object.color === null) {
                object.color = appearance[0].color;
            }
        }

        return true;
    }

    GetPropertiesFromElement (propertiesElement, propertyGroup)
    {
        let propertyElements = propertiesElement.getElementsByTagName ('Property');
        for (let propertyElement of propertyElements) {
            let propertyName = propertyElement.getAttribute ('name');
            let propertyType = propertyElement.getAttribute ('type');

            let property = null;
            if (propertyType === 'App::PropertyBool') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'String', 'bool');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Boolean, propertyName, propertyValue === 'true');
                }
            } else if (propertyType === 'App::PropertyAngle') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'Float', 'value');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Angle, propertyName, parseInt (propertyValue));
                }
            } else if (propertyType === 'App::PropertyInteger') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'Integer', 'value');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Integer, propertyName, parseInt (propertyValue));
                }
            } else if (propertyType === 'App::PropertyString') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'String', 'value');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Text, propertyName, propertyValue);
                }
            } else if (propertyType === 'App::PropertyUUID') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'Uuid', 'value');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Text, propertyName, propertyValue);
                }
            } else if (propertyType === 'App::PropertyFloat' || propertyType === 'App::PropertyLength' || propertyType === 'App::PropertyDistance' || propertyType === 'App::PropertyArea' || propertyType === 'App::PropertyVolume') {
                let propertyValue = this.GetFirstChildValue (propertyElement, 'Float', 'value');
                if (propertyValue !== null && propertyValue.length > 0) {
                    property = new Property (PropertyType.Number, propertyName, parseFloat (propertyValue));
                }
            } else if (propertyType === 'App::PropertyPlacement') {
              const propertyValueAngle = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'A');
              const propertyValueXAxis = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Ox');
              const propertyValueYAxis = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Oy');
              const propertyValueZAxis = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Oz');
              const propertyValuePx = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Px');
              const propertyValuePy = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Py');
              const propertyValuePz = this.GetFirstChildValue (propertyElement, 'PropertyPlacement', 'Pz');
              property = new Property (PropertyType.Placement, propertyName, [
                propertyValueXAxis, propertyValueYAxis, propertyValueZAxis, propertyValueAngle, [propertyValuePx, propertyValuePy, propertyValuePz]]);
            }
            if (property !== null) {
                propertyGroup.AddProperty (property);
            }
        }
    }

    GetXMLContent (xmlFileName)
    {
        if (!this.HasFile (xmlFileName)) {
            return null;
        }

        let xmlParser = new DOMParser ();
        let xmlString = ArrayBufferToUtf8String (this.files[xmlFileName]);
        return xmlParser.parseFromString (xmlString, 'text/xml');
    }

    GetFirstChildValue (element, childTagName, childAttribute)
    {
        let childObjects = element.getElementsByTagName (childTagName);
        if (childObjects.length === 0) {
            return null;
        }
        return childObjects[0].getAttribute (childAttribute);
    }

    GetPropertyBagObject() {
        for (let [key, value] of this.objectData) {
            if (key === 'PropertyBag') return value
        }
        return null;
    }
}

export class ImporterFcstd
{
    constructor ()
    {
        this.model = new Model ();
        this.worker = null;
        this.document = null;
        this.objects = [];
    }

    SetError(error) {
        console.log(error);
    }

    CanImportExtension (extension)
    {
        return extension.toUpperCase() === 'FCSTD';
    }

    GetUpDirection ()
    {
        // return Direction.Z;
    }

    ClearContent ()
    {
        if (this.worker !== null) {
            this.worker.terminate ();
            this.worker = null;
        }
        this.document = null;
    }

    ResetContent ()
    {
        this.model = new Model ();
        this.objects = [];
        this.worker = null;
        this.document = new FreeCadDocument ();
    }

    LoadFile(fileUrl, callback) {
        this.file = fileUrl;
        this.ResetContent();
        fetch(fileUrl).then(async response => {
            let buffer = await response.arrayBuffer ();
            let fileBuffer = new Uint8Array (buffer);
            this.ImportContent(fileBuffer, callback);
        });
    }

    ImportContent (fileContent, onFinish)
    {
        let result = this.document.Init (fileContent);
        if (result === DocumentInitResult.NoDocumentXml) {
            this.SetError ('No Document.xml found.');
            onFinish ();
            return;
        }

        if (this.document.properties !== null && this.document.properties.PropertyCount () > 0) {
            this.model.AddPropertyGroup (this.document.properties);
        }

        this.model.propertyBagObject = this.document.GetPropertyBagObject();
        this.ConvertObjects (this.document, onFinish);
    }

    ConvertObjects (document, onFinish)
    {
        let objects = document.GetObjectListToConvert ();
        if (objects.length === 0) {
          this.SetError ('No importable object found.');
          onFinish (this.model);
          return;
        }

        // Load and add PNG image as a plane in the scene
        const textureLoader = new THREE.TextureLoader();
        for (const [objectName, object] of document.objectData) {
          if (object.type !== 'Image::ImagePlane') {
            continue;
          }
          // Convert the Uint8Array to a Blob and create an object URL
          const blob = new Blob([object.fileContent], { type: 'image/png' });
          const imageUrl = URL.createObjectURL(blob);
          textureLoader.load(imageUrl, (texture) => {
            const object3d = new ModelObject3D();
            this.AssignDataToModelObject(object, object3d);

            object3d.SetType(ModelObjectType.Image);

            if (object.properties !== null) {
              const xSize = object.properties.GetPropertyByName('XSize')?.value || 0;
              const ySize = object.properties.GetPropertyByName('YSize')?.value || 0;
              const planeGeometry = new THREE.PlaneGeometry(xSize, ySize);
              const planeMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                color: object.GetColor()
              });
              const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
              const placementPrp = object.properties.GetPropertyByName('Placement');
              if (placementPrp) {
                const axis = new THREE.Vector3(placementPrp.value[0], placementPrp.value[1], placementPrp.value[2]);
                axis.normalize();
                planeMesh.rotateOnAxis(axis, placementPrp.value[3])
                planeMesh.position.set(...placementPrp.value[4]);
              }
              let mainObject = new THREE.Object3D();
              mainObject.add(planeMesh);
              object3d.SetObject3d(mainObject);
              this.model.AddObject(object3d);
            }
          })
        }

        occtimportjs().then(occt => {
            for (let obj of objects) {
                const result = occt.ReadBrepFile(obj.fileContent, null);
                if (result !== null) {
                    this.OnFileConverted(obj, result, null);
                }
            }

            // Assembly object creation
            for (let [objectName, object] of document.objectData) {
              if (object.IsAssemblyObject()) {
                const object3d = new ModelObject3D();
                this.AssignDataToModelObject(object, object3d);

                object3d.SetType(ModelObjectType.Assembly);
                const group = new THREE.Group();

                for (let o of object.childs) {
                  const modelObject = this.model.GetObjectByName(o.shapeName);
                  if (modelObject) {
                    group.add(modelObject.object3d);
                    modelObject.SetParent(object3d);
                    object3d.AddChildren(modelObject);
                  }
                }

                if (object.properties !== null) {
                  const placementPrp = object.properties.GetPropertyByName('Placement');
                  if (placementPrp) {
                    const axis = new THREE.Vector3(placementPrp.value[0], placementPrp.value[1], placementPrp.value[2]);
                    axis.normalize();
                    group.rotateOnAxis(axis, placementPrp.value[3])
                  }
                }
                object3d.SetObject3d(group);
                this.model.AddObject(object3d);
              }

            }

            onFinish(this.model);
        })

        // this.worker = new Worker('/occt-import-js/dist/occt-import-js-worker.js');
        //
        // let convertedObjectCount = 0;
        // let colorToMaterial = null;
        // let onFileConverted = (resultContent) => {
        //     if (resultContent !== null) {
        //         let currentObject = objects[convertedObjectCount];
        //         this.OnFileConverted (currentObject, resultContent, colorToMaterial);
        //     }
        //     convertedObjectCount += 1;
        //     if (convertedObjectCount === objects.length) {
        //         this.worker.terminate();
        //         onFinish (this.model);
        //     } else {
        //         let currentObject = objects[convertedObjectCount];
        //         this.worker.postMessage ({
        //             format : 'brep',
        //             buffer : currentObject.fileContent
        //         });
        //     }
        // };
        //
        // this.worker.addEventListener ('message', (ev) => {
        //     onFileConverted (ev.data);
        // });
        //
        // this.worker.addEventListener ('error', (ev) => {
        //     this.worker.terminate()
        //     onFileConverted (null);
        // });
        //
        // let currentObject = objects[convertedObjectCount];
        // this.worker.postMessage ({
        //     format : 'brep',
        //     buffer : currentObject.fileContent
        // });
    }

    OnFileConverted (object, resultContent, colorToMaterial)
    {
        if (!resultContent.success || resultContent.meshes.length === 0) {
            return;
        }

        let object3d = new ModelObject3D ();

        this.AssignDataToModelObject(object, object3d);

        object3d.SetType(ModelObjectType.Shape);

        let mainObject = new THREE.Object3D();
        for (let resultMesh of resultContent.meshes) {
            let geometry = new THREE.BufferGeometry();

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3));
            if (resultMesh.attributes.normal) {
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3));
            }
            const index = Uint32Array.from(resultMesh.index.array);
            geometry.setIndex(new THREE.BufferAttribute(index, 1));

            const mesh = this.BuildMesh (geometry, resultMesh, object);
            mainObject.add(mesh);
        }
        object3d.SetObject3d(mainObject);

        this.model.AddObject(object3d);

    }

    BuildMesh (geometry, resultMesh, object)
    {
        const faceColors = object.faceColors;
        const faces = resultMesh.brep_faces;
        if (!faceColors || !faces || faces.length !== faceColors.length) {
            return new THREE.Mesh (geometry, new THREE.MeshPhongMaterial ({ color: object.GetColor () }));
        }

        const materials = [];
        const materialIndexByKey = new Map ();
        let groupStart = 0;
        let groupCount = 0;
        let groupIndex = -1;
        for (let i = 0; i < faces.length; i++) {
            const entry = faceColors[i];
            const key = entry.color.getHex () + ':' + entry.transparency;
            let materialIndex = materialIndexByKey.get (key);
            if (materialIndex === undefined) {
                materialIndex = materials.length;
                const material = new THREE.MeshPhongMaterial ({ color: entry.color });
                if (entry.transparency > 0) {
                    material.transparent = true;
                    material.opacity = 1 - entry.transparency;
                }
                materials.push (material);
                materialIndexByKey.set (key, materialIndex);
            }
            const start = faces[i].first * 3;
            const count = (faces[i].last - faces[i].first + 1) * 3;
            if (materialIndex === groupIndex && start === groupStart + groupCount) {
                groupCount += count;
                continue;
            }
            if (groupIndex !== -1) {
                geometry.addGroup (groupStart, groupCount, groupIndex);
            }
            groupStart = start;
            groupCount = count;
            groupIndex = materialIndex;
        }
        if (groupIndex !== -1) {
            geometry.addGroup (groupStart, groupCount, groupIndex);
        }
        return new THREE.Mesh (geometry, materials);
    }

    AssignDataToModelObject(freecadObj, object3d) {
      if (freecadObj.shapeName !== null) {
        object3d.SetName (freecadObj.shapeName);
      }
      if (freecadObj.name !== null) {
        object3d.SetRealName (freecadObj.name);
      }
      if (freecadObj.properties !== null && freecadObj.properties.PropertyCount () > 0) {
        object3d.AddPropertyGroup (freecadObj.properties);
      }
      if (freecadObj.color !== null) {
        object3d.SetColor(freecadObj.color);
      }
    }
}
