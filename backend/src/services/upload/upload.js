// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import dauria from 'dauria';
import { authenticate } from '@feathersjs/authentication';

import { getUploadService, multipartMiddleware } from './upload.class.js'
import { uploadPath, uploadMethods } from './upload.shared.js'
import { ProtectionTypeMap } from '../shared-models/shared-models.subdocs.schema.js'

export * from './upload.class.js'

// Anonymous visitors to a share link can download the shared model's original file (if the share allows it).
// Every other call must be authenticated. See GHSA-w8rq-5vjv-8w86.
export const isAnonymousSharedModelDownload = async (context) => {
  const { method, id, params, app } = context;
  const query = params.query || {};
  if (method !== 'get' || !query.modelId || query.fileContent) {
    return false;
  }

  let fileName, model, sharedModel;
  try {
    fileName = decodeURIComponent(id);
    model = await app.service('models').get(query.modelId);
    if (!model.isSharedModel || !model.sharedModelId) {
      return false;
    }
    sharedModel = await app.service('shared-models').get(model.sharedModelId);
  } catch (e) {
    // Whatever terrible thing happened, reject the attempt
    return false;
  }

  if (!sharedModel.isActive || !sharedModel.canViewModel || !sharedModel.canDownloadDefaultModel) {
    return false;
  }
  const protection = sharedModel.protection;
  const isProtectionSatisfied =
    protection === ProtectionTypeMap.listed ||
    protection === ProtectionTypeMap.unlisted ||
    (protection === ProtectionTypeMap.pin && typeof query.pin === 'string' && query.pin === sharedModel.pin);
  if (!isProtectionSatisfied) {
    return false;
  }

  return fileName === model.uniqueFileName;
}

// A configure function that registers the service and its hooks via `app.configure`
export const upload = (app) => {
  // Register our service on the Feathers application
  app.use(
    uploadPath,
    multipartMiddleware.single('file'),
    function(req, res, next) {
      req.feathers.file = req.file;
      next();
    },
    getUploadService(app),
    {
      // A list of all methods this service exposes externally
      methods: uploadMethods,
      // You can add additional custom events to be sent to clients here
      events: [],
      docs: {
        description: 'A service to upload a file',
        schemas: {
          Upload: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'file name'
              },
              size: {
                type: 'integer',
                description: 'Size of upload file'
              },
              contentType: {
                type: 'string',
                description: 'File content type'
              }

            },
          },
        },
        model: 'Upload',
        tag: 'Upload',
        idType: 'string',
        securities: ['all'],
        operations: {
          find: false,
          update: false,
          remove: false,
          patch: false,
          get: {
            "parameters": [
              {
                "description": "ID of Upload to return",
                "in": "path",
                "name": "id",
                "schema": {
                  "type": "string"
                },
                "required": true,
              },
              {
                "description": "Pass \"true\" to get file content string",
                "in": "query",
                "name": "fileContent",
                "schema": {
                  "type": "string"
                },
                "required": false,
              },
            ],
          },
          create: {
            description: 'Upload file',
            requestBody: {
              content: {
                'multipart/form-data': {
                  schema:
                  {
                    type: 'object',
                    properties: {
                      file: {
                          type: 'string',
                          format: 'binary',
                          description: 'File name should be unique (uuid4)'
                      }
                    },
                  },
                },
              },
            },
          },
        },
      }
    }
  )
  // Initialize hooks
  app.service(uploadPath).hooks({
    around: {
      all: [],
    },
    before: {
      all: [
        async (context) => {
          if (await isAnonymousSharedModelDownload(context)) {
            return context;
          }
          return authenticate('jwt')(context);
        },
      ],
      find: [],
      get: [],
      create: [
        function(context) {
          if (!context.data.uri && context.params.file){
            const file = context.params.file;
            const uri = dauria.getBase64DataURI(file.buffer, file.mimetype);
            if (context.data.id) {
              context.data = {
                uri: uri,
                id: context.data.id
              }
            } else {
              context.data = {uri: uri, id: context.params.file.originalname};
            }
          }
        },
      ],
      patch: [],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}
