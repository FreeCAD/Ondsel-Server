// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'
import {iff, isProvider, preventChanges, softDelete} from 'feathers-hooks-common'
import { BadRequest } from '@feathersjs/errors';
import axios from 'axios';
import swagger from 'feathers-swagger';
import _ from 'lodash';

import { hooks as schemaHooks } from '@feathersjs/schema'
import { canUserCreateModel, canUserUpdateModel, canUserExportModel } from '../hooks/permissions.js';
import {
  authenticateJwtWhenPrivate,
  handlePublicOnlyQuery,
} from '../../hooks/handle-public-info-query.js';
import {
  modelDataValidator,
  modelPatchValidator,
  modelQueryValidator,
  modelResolver,
  modelExternalResolver,
  modelDataResolver,
  modelPatchResolver,
  modelQueryResolver,
  modelSchema,
  modelDataSchema,
  modelPatchSchema,
  modelQuerySchema, modelPublicFields,
} from './models.schema.js'
import { ModelService, getOptions } from './models.class.js'
import { modelPath, modelMethods } from './models.shared.js'
import {getConstraint} from "../users/users.subdocs.schema.js";
import {copyModelBeforePatch, distributeModelSummaries, distributeModelThumbnails} from "./models.distrib.js";
import {
  canUserAccessModelGetMethod,
  userBelongingModels,
  canUserAccessModelPatchMethod,
  generateStlDownloadLink,
  workerSourceFileName,
} from './helpers.js';
import {
  ProtectionTypeMap,
  VersionFollowTypeMap as versionFollowTypeMap
} from "../shared-models/shared-models.subdocs.schema.js";
import {generateDefaultTitle} from "../shared-models/helpers.js";

export * from './models.class.js'
export * from './models.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const model = (app) => {
  // Register our service on the Feathers application
  app.use(modelPath, new ModelService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: modelMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: swagger.createSwaggerServiceOptions({
      schemas: { modelSchema, modelDataSchema, modelPatchSchema , modelQuerySchema, },
      docs: {
        description: 'A Model service',
        idType: 'string',
        securities: ['all'],
      }
    })
  })

  app.service(modelPath).publish((data, context) => {
    const workspaceId = _.get(data, 'file.workspace._id', undefined);
    if (workspaceId) {
      return app.channel(`workspace/${workspaceId.toString()}`)
    }
    // workspace not exists for shared-model object, so use userId
    return app.channel(context.result.userId.toString())
  })

  // Initialize hooks
  app.service(modelPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(modelExternalResolver),
        handlePublicOnlyQuery(modelPublicFields),
        schemaHooks.resolveResult(modelResolver)
      ],
      find: [authenticate('jwt')],
      get: [
        authenticateJwtWhenPrivate(),
      ],
      create: [authenticate('jwt')],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
    },
    before: {
      all: [
        softDelete({
          deletedQuery: async context => {
            if ( context.method === 'remove') {
              const sharedModelService = context.app.service('shared-models');
              const sharedModels = await sharedModelService.find({ query: { cloneModelId: context.id, '$paginate': false }})
              for (const sharedModel of sharedModels) {
                await sharedModelService.remove(sharedModel._id);
              }
              const model = await context.service.get(context.id);
              if (model.fileId) {
                await context.app.service('file').remove(model.fileId, {$forceRemove: true, ...context.params});
              }
            }
            return { deleted: { $ne: true } };
          }
        }),
        schemaHooks.validateQuery(modelQueryValidator),
        schemaHooks.resolveQuery(modelQueryResolver)
      ],
      find: [
        iff(
          isProvider('external'),
          userBelongingModels
        )
      ],
      get: [
        iff(
          isProvider('external'),
          canUserAccessModelGetMethod
        )
      ],
      create: [
        iff(
          isProvider('external'),
          canUserCreateModel,
        ),
        verifyToCreateSystemGeneratedShareLink,
        createFileVersionControlObject,
        schemaHooks.validateData(modelDataValidator),
        schemaHooks.resolveData(modelDataResolver)
      ],
      patch: [
        copyModelBeforePatch,
        iff(
          isProvider('external'),
          canUserAccessModelPatchMethod
        ),
        preventChanges(false, 'isSharedModel', 'custFileName', 'createSystemGeneratedShareLink', 'haveWriteAccess'),
        iff(
          context => context.data.shouldCommitNewVersion,
          commitNewVersion
        ),
        iff(
          context => context.data.shouldCheckoutToVersion,
          checkoutToVersion,
        ),
        iff(
          context => context.data.shouldStartObjGeneration,
          startObjGeneration,
        ),
        iff(
          context => context.data.isThumbnailGenerated,
          addThumbnailUrlUpdateAt,
        ),
        iff(
          context => (
            context.data.shouldStartFCStdExport ||
            context.data.shouldStartSTEPExport ||
            context.data.shouldStartSTLExport ||
            context.data.shouldStartOBJExport
          ),
          startExport
        ),
        preventChanges(
          false,
          'uniqueFileName', 'file', 'objUrl', 'thumbnailUrl'  // Not allowed computed items
        ),
        schemaHooks.validateData(modelPatchValidator),
        schemaHooks.resolveData(modelPatchResolver),
      ],
      remove: []
    },
    after: {
      all: [],
      create: [
        iff(
          context => context.data.shouldStartObjGeneration,
          startObjGeneration,
        ),
        iff(
          context => !context.params.skipSystemGeneratedSharedModel,
          createSharedModelObject,
        ),
        iff(
          context => context.result.fileId,
          async (context) => {
            await context.app.service('file').patch( // Later, this could be moved to the "distributeModelSummaries"
              context.result.fileId,
              {
                modelId: context.result._id.toString(),
                isSystemGenerated: context.result.isSharedModel,
              });
            await distributeModelSummaries(context);
          },
        )
      ],
      patch: [
        iff(
          context => context.data.isExportSTLGenerated && context.result.isSharedModel,
          generateStlDownloadLink
        ),
        iff(
          context => context.data.isObjGenerated || context.data.isThumbnailGenerated,
          feedSystemGeneratedSharedModel,
        ),
        distributeModelSummaries,
        distributeModelThumbnails,
      ]
    },
    error: {
      all: []
    }
  })
}

const startObjGeneration = async (context) => {
  await canUserUpdateModel(context);

  const modelId = context.id ? context.id : context.result._id; // context.id for PATCH, context.result._id for CREATE
  const { data, params } = context;
  let fileName = null

  if (data.uniqueFileName) {
    fileName = data.uniqueFileName;
  } else if (context.data.fileId) {
    const file = await context.app.service('file').get(context.data.fileId);
    fileName = file.currentVersion.uniqueFileName;
  } else if (modelId && !context.data.uniqueFileName) {
    const result = await context.service.get(modelId);
    fileName = result.uniqueFileName;
  } else {
    throw new BadRequest('Not able to find filename')
  }

  if (fileName.toUpperCase().endsWith('.KICAD_PCB') && !context.app.get('kicadEnabled')) {
    throw new BadRequest('KiCad support is disabled on this site', { type: 'KicadDisabled' });
  }

  // When input file is STEP, then don't need runner, viewer can render STEP file directly.
  if (fileName.toUpperCase().split('.').pop() === 'STP' || fileName.toUpperCase().split('.').pop() === 'STEP') {
    const uploadService = context.app.service('upload');
    const generatedFileForViewer = `${modelId.toString()}_generated.STEP`;
    const isExists = await uploadService.checkFileExists(
      context.app.get('awsClientModelBucket'),
      generatedFileForViewer
    )
    if (!isExists) {
      await uploadService.copy(fileName, generatedFileForViewer);
    }
    context.data.generatedFileExtensionForViewer = 'STEP';
    context.data.shouldStartObjGeneration = false;
    context.data.isObjGenerationInProgress = false;
    context.data.isObjGenerated = true;
    context.data.latestLogErrorIdForObjGenerationCommand = null;
    if (context.result) {
      // Update status in DB too, when shouldStartObjGeneration is true in POST endpoint
      await context.service.patch(
        context.result._id.toString(),
        _.pick(
          context.data,
          [
            'generatedFileExtensionForViewer',
            'shouldStartObjGeneration',
            'isObjGenerationInProgress',
            'isObjGenerated',
            'latestLogErrorIdForObjGenerationCommand',
          ]
        )
      );
    }
    return context
  }

  axios({
    method: 'post',
    url: context.app.get('fcWorkerUrl'),
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      id: modelId || context.result._id.toString(),
      fileName: fileName,
      command: 'CONFIGURE_MODEL',
      accessToken: params.authentication?.accessToken || params.accessToken,
      attributes: data.attributes || {},
      isSharedModel: context.params.query.isSharedModel,
    }
  });

  if (context.result) {
    // Update status in DB too, when shouldStartObjGeneration is true in POST endpoint
    await context.service.patch(context.result._id.toString(), { shouldStartObjGeneration: false, isObjGenerationInProgress: true });
  }

  context.data.shouldStartObjGeneration = false;
  // context.data.isThumbnailGenerated = false;
  context.data.isObjGenerationInProgress = true;
  context.data.isObjGenerated = false;
  context.data.latestLogErrorIdForObjGenerationCommand = null;
  return context
};

const startExport = async (context) => {
  await canUserExportModel(context);
  const { data, params } = context
  let fileName = null
  let attributes = {}
  if (!context.data.uniqueFileName || !context.data.attributes) {
    const result = await context.service.get(context.id);
    fileName = result.uniqueFileName;
    attributes = result.attributes;
  }

  const sourceFileName = workerSourceFileName(context.id || context.result._id, fileName || data.uniqueFileName);

  let command;
  if (data.shouldStartFCStdExport) {
    command = 'EXPORT_FCSTD';
    data['isExportFCStdGenerated'] = false;
    data['latestLogErrorIdForFcstdExportCommand'] = null;
  } else if (data.shouldStartSTEPExport) {
    command = 'EXPORT_STEP';
    data['isExportSTEPGenerated'] = false;
    data['latestLogErrorIdForStepExportCommand'] = null;
  } else if (data.shouldStartSTLExport) {
    command = 'EXPORT_STL';
    data['isExportSTLGenerated'] = false;
    data['latestLogErrorIdForStlExportCommand'] = null;
  } else {
    command = 'EXPORT_OBJ';
    data['isExportOBJGenerated'] = false;
    data['latestLogErrorIdForObjExportCommand'] = null;
  }

  axios({
    method: 'post',
    url: context.app.get('fcWorkerUrl'),
    headers: {
      'Content-Type': 'application/json'
    },
    data : {
      id: context.id || context.result._id.toString(),
      fileName: sourceFileName,
      command: command,
      accessToken: params.authentication?.accessToken || params.accessToken,
      attributes: data.attributes || attributes,
      isSharedModel: context.params.query.isSharedModel,
      sharedModelId: params.sharedModelId || null,
    }
  });
  context.data = _.omit(data, ['shouldStartFCStdExport', 'shouldStartSTEPExport', 'shouldStartSTLExport', 'shouldStartOBJExport']);
  return context;
}

const createFileVersionControlObject = async context => {
  const { data } = context
  const fileService = context.app.service('file');
  if (data.uniqueFileName) {
    const file = await fileService.create({
      custFileName: data.custFileName,
      shouldCommitNewVersion: true,
      version: {
        uniqueFileName: data.uniqueFileName,
        message: 'Initial commit',
        ...(data.fileUpdatedAt && {fileUpdatedAt: data.fileUpdatedAt})
      },
      isSystemGenerated: _.get(data, 'isSharedModel', false),
    }, { authentication: context.params.authentication,});
    data['fileId'] = file._id.toString();
    context.data = _.omit(data, 'uniqueFileName', 'custFileName');
  }
  return context;
}

const saveModelAttributesToCurrentFile =  async (context, model) => {
  await context.app.service('file').patch(
    model.fileId,
    {
      shouldUpdateVersionData: true,
      version: {
        _id: model.file.currentVersion._id.toString(),
        additionalData: _.merge({}, model.file.currentVersion.additionalData, {attributes: model.attributes}),
      }
    },
  )
}

const commitNewVersion = async (context) => {
  const { data } = context;
  if (!data.version) {
    throw new BadRequest('Should include version object');
  }
  const lookUpAttributes = ['shouldCommitNewVersion', 'version'];
  const model = await context.service.get(context.id);
  if (model.fileId) {

    await context.app.service('file').patch(
      model.fileId,
      _.pick(data, lookUpAttributes),
      { authentication: context.params.authentication },
    );

    // Save latest model.attributes to file data
    await saveModelAttributesToCurrentFile(context, model)
    context.params.$triggerObjGeneration = true;
  }

  context.data['attributes'] = {}
  context.data = _.omit(data, lookUpAttributes);
  return context;
}


const checkoutToVersion = async (context) => {
  const lookUpAttributes = ['shouldCheckoutToVersion', 'versionId']
  const model = await context.service.get(context.id);
  if (model.fileId) {
    const file = await context.app.service('file').patch(
      model.fileId,
      _.pick(context.data, lookUpAttributes),
      { authentication: context.params.authentication },
    )
    // Save latest model.attributes to file data
    await saveModelAttributesToCurrentFile(context, model)

    // assign current file version attributes to model attributes
    context.data['attributes'] = file.currentVersion.additionalData.attributes || {}
    context.params.$triggerObjGeneration = true;
  }

  context.data = _.omit(context.data, lookUpAttributes);
  return context;
}


const createSharedModelObject = async (context) => {

  if (context.result.isSharedModel) {
    return context;
  }

  const sharedModelService = context.app.service('shared-models');
  const fileService = context.app.service('file');

  const originalFile = await fileService.get(context.result.fileId);

  const file = await fileService.create({
    custFileName: originalFile.custFileName,
    shouldCommitNewVersion: true,
    version: {
      uniqueFileName: originalFile.currentVersion.uniqueFileName,
      message: originalFile.currentVersion.message, // this is exposed ONLY on the initial commit when isSystemGenerated
    },
    isSystemGenerated: true,
  }, {
    authentication: context.params.authentication,
  })

  const newModel = await context.service.create({
    fileId: file._id.toString(),
    shouldStartObjGeneration: false,
    isObjGenerationInProgress: false,
    isObjGenerated: context.result.isObjGenerated,
    errorMsg: context.result.errorMsg,
    attributes: context.result.attributes || {},
    isSharedModel: true,
    isSharedModelAnonymousType: true,
    ...(context.result.generatedFileExtensionForViewer && { generatedFileExtensionForViewer: context.result.generatedFileExtensionForViewer})
  }, {
    authentication: context.params.authentication,
  });

  const prepSharedModel = {
    versionFollowing: versionFollowTypeMap.locked,
    fileDetail: {
      fileId: file.id,
      versionId: file.versions[0]._id,
    }
  };
  const sharedModel = await sharedModelService.create({
    cloneModelId: context.result._id.toString(),
    dummyModelId: newModel._id.toString(),
    title: generateDefaultTitle(prepSharedModel, file),
    description: 'System Generated',
    isSystemGenerated: true,
    versionFollowing: versionFollowTypeMap.locked,
    protection: ProtectionTypeMap.listed,
    canViewModel: true,
    canViewModelAttributes: true,
    canUpdateModel: false,
    canRunScripts: false,
    canExportFCStd: false,
    canExportSTEP: false,
    canExportSTL: false,
    canExportOBJ: false,
    canDownloadDefaultModel: true,
  }, {
    authentication: context.params.authentication,
  })

  return context;
}


const feedSystemGeneratedSharedModel = async (context) => {

  if (context.result.isSharedModel) {
    return context;
  }
  const uploadService = context.app.service('upload');
  const result = await context.app.service('shared-models').find({
    query: { isSystemGenerated: true, cloneModelId: context.id }
  })
  if (result.data.length) {
    const systemGeneratedSharedModel = result.data[0];
    const patchData = {};
    if (context.data.isObjGenerated && !systemGeneratedSharedModel.model.isObjGenerated) {
      let extension = 'OBJ';
      if (context.result.generatedFileExtensionForViewer) {
        extension = context.result.generatedFileExtensionForViewer;
        patchData['generatedFileExtensionForViewer'] = context.result.generatedFileExtensionForViewer;
      } else {
        const isFcstdExists = await uploadService.checkFileExists(
          context.app.get('awsClientModelBucket'),
          `${context.id.toString()}_generated.FCSTD`
        )
        if (isFcstdExists) {
          extension = 'FCSTD';
        } else {
          const isBrepExists = await uploadService.checkFileExists(
            context.app.get('awsClientModelBucket'),
            `${context.id.toString()}_generated.BREP`
          )
          if (isBrepExists) {
            extension = 'BREP';
          }
        }
      }
      uploadService.copy(`${context.id.toString()}_generated.${extension}`, `${systemGeneratedSharedModel.model._id.toString()}_generated.${extension}`);
      patchData['isObjGenerated'] = true;
      patchData['attributes'] = context.result.attributes;

    }
    if (context.data.isThumbnailGenerated && !systemGeneratedSharedModel.model.isThumbnailGenerated) {
      uploadService.copy(`public/${context.id.toString()}_thumbnail.PNG`, `public/${systemGeneratedSharedModel.model._id.toString()}_thumbnail.PNG`);
      patchData['isThumbnailGenerated'] = true;
    }
    if (Object.keys(patchData).length) {
      context.app.service('shared-models').patch(
        systemGeneratedSharedModel._id,
        {
          model: patchData,
          ...(patchData.isThumbnailGenerated && { isThumbnailGenerated: patchData.isThumbnailGenerated })
        },
        { authentication: context.params.authentication }
      )
    }
  }
  return context;
}


const verifyToCreateSystemGeneratedShareLink = context => {
  const { data } = context;
  let tierConfig;
  if (context.$organization) {
    tierConfig = context.$organization.constraint;
  } else {
    tierConfig = getConstraint(context.params.user);
  }
  let createShareLink = tierConfig.defaultValueOfPublicLinkGeneration;
  if ('createSystemGeneratedShareLink' in data && tierConfig.canDisableAutomaticGenerationOfPublicLink) {
    createShareLink = data.createSystemGeneratedShareLink;
  }
  context.params.skipSystemGeneratedSharedModel = !createShareLink
  context.data = _.omit(data, 'createSystemGeneratedShareLink');
  return context;
}


const addThumbnailUrlUpdateAt = context => {
  context.data.thumbnailUrlUpdatedAt = Date.now();
}