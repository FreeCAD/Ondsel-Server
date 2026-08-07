// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'
import { authenticate as expressAuthenticate } from '@feathersjs/express'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { disallow } from 'feathers-hooks-common'
import swagger from 'feathers-swagger'
import {
  siteConfigPatchResolver,
  siteConfigPatchValidator,
  siteConfigQueryResolver,
  siteConfigQueryValidator,
  siteConfigResolver,
  siteConfigExternalResolver,
  siteConfigSchema,
  siteConfigPatchSchema,
  siteConfigQuerySchema
} from './site-config.schema.js'
import { filterSiteConfigForPublic } from './helpers.js'
import { SiteConfigService, getOptions } from './site-config.class.js'
import { siteConfigPath, siteConfigMethods } from './site-config.shared.js'
import { siteConfigId } from './site-config.schema.js'
import { verifySiteAdministrativePower, isSiteAdministrator } from '../hooks/administration.js'
import { setCustomizedFlags } from './set-customized-flags.hook.js'
import { uploadBrandingLogo } from './upload-branding.hook.js'
import { uploadDefaultModel, uploadDefaultModelThumbnail } from './upload-default-model.hook.js'
import { parseJsonFields } from './parse-json-fields.hook.js'
import multer from 'multer'
import { fetchOpenIdConfiguration } from '../../authentication/oidc-discovery.js'

export * from './site-config.class.js'
export * from './site-config.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const siteConfig = (app) => {
  // Register our service on the Feathers application with multipart support for branding logos and default model
  const fieldsMulter = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'logoFile', maxCount: 1 },
    { name: 'faviconFile', maxCount: 1 },
    { name: 'defaultModelFile', maxCount: 1 },
    { name: 'defaultModelThumbnailFile', maxCount: 1 },
  ])

  app.use(siteConfigPath,
    // Parse multipart form with fields multer and validate each file
    (req, res, next) => {
      fieldsMulter(req, res, (err) => {
        if (err) {
          return next(err)
        }

        const files = req.files || {}

        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']

        // Validate logo file if present
        if (files.logoFile && files.logoFile[0]) {
          const logoFile = files.logoFile[0]
          if (!allowedTypes.includes(logoFile.mimetype)) {
            return next(new Error('Only PNG, JPG, SVG, and ICO files are allowed for logo'))
          }
          req.feathers.logoFile = logoFile
        }

        // Validate favicon file if present
        if (files.faviconFile && files.faviconFile[0]) {
          const faviconFile = files.faviconFile[0]
          if (!allowedTypes.includes(faviconFile.mimetype)) {
            return next(new Error('Only PNG, JPG, SVG, and ICO files are allowed for favicon'))
          }
          req.feathers.faviconFile = faviconFile
        }

        // Validate default model file if present
        if (files.defaultModelFile && files.defaultModelFile[0]) {
          const defaultModelFile = files.defaultModelFile[0]
          const extension = defaultModelFile.originalname.split('.').pop().toLowerCase()
          if (extension !== 'fcstd') {
            return next(new Error('Only .FCStd files are allowed for default model'))
          }
          req.feathers.defaultModelFile = defaultModelFile
        }

        // Validate default model thumbnail file if present
        if (files.defaultModelThumbnailFile && files.defaultModelThumbnailFile[0]) {
          const defaultModelThumbnailFile = files.defaultModelThumbnailFile[0]
          if (defaultModelThumbnailFile.mimetype !== 'image/png') {
            return next(new Error('Only PNG files are allowed for default model thumbnail'))
          }
          req.feathers.defaultModelThumbnailFile = defaultModelThumbnailFile
        }

        // Remove file field names from req.body to prevent validation errors if they are sent as empty values e.g. from Swagger UI
        if (req.body) {
          for (const field of ['logoFile', 'faviconFile', 'defaultModelFile', 'defaultModelThumbnailFile']) {
            if (field in req.body) {
              delete req.body[field]
            }
          }
        }

        next()
      })
    },
    new SiteConfigService(getOptions(app)),
    {
      // A list of all methods this service exposes externally
      methods: siteConfigMethods,
      // You can add additional custom events to be sent to clients here
      events: [],
      docs: swagger.createSwaggerServiceOptions({
        schemas: { siteConfigSchema, siteConfigPatchSchema, siteConfigQuerySchema },
        docs: {
          description: 'Site configuration service for platform branding, homepage content, OAuth settings, and default model configuration',
          idType: 'string',
          securities: ['all'],
          operations: {
            get: {
              "description": "Get site configuration. <ul><li><strong>Public access</strong> (default ID 000000000000000000000000, no authentication): Returns filtered data with sensitive fields hidden (OAuth secrets, admin-only fields excluded).</li><li><strong>Authenticated site administrator</strong>: Returns full configuration including all sensitive and admin-only fields.</li><li><strong>Other IDs</strong>: Requires authentication and site administrator privileges.</li></ul>",
              "parameters": [
                {
                  "description": "Site config ID (use 000000000000000000000000 for default config)",
                  "in": "path",
                  "name": "_id",
                  "schema": {
                    "type": "string"
                  },
                  "required": true,
                },
              ],
            },
            patch: {
              "description": "Update site configuration. Supports multipart/form-data for file uploads (logoFile, faviconFile, defaultModelFile, defaultModelThumbnailFile) or JSON for other fields. Requires authentication and site administrator privileges. Updates are broadcast to all users via real-time events.",
              "parameters": [
                {
                  "description": "Site config ID (use 000000000000000000000000 for default config)",
                  "in": "path",
                  "name": "_id",
                  "schema": {
                    "type": "string"
                  },
                  "required": true,
                },
              ],
              "requestBody": {
                "description": "Site configuration updates. <ul><li><strong>multipart/form-data</strong>: Use for file uploads (logoFile, faviconFile, defaultModelFile, defaultModelThumbnailFile). Other fields like siteTitle, copyrightText, etc. can also be included as form fields in the same request.</li><li><strong>application/json</strong>: Use for field updates without files.</li></ul>",
                "content": {
                  "application/json": {
                    "schema": {
                      "$ref": "#/components/schemas/SiteConfigPatch"
                    }
                  },
                  "multipart/form-data": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "logoFile": {
                          "type": "string",
                          "format": "binary",
                          "description": "Logo file (PNG, JPG, SVG, ICO)"
                        },
                        "faviconFile": {
                          "type": "string",
                          "format": "binary",
                          "description": "Favicon file (PNG, JPG, SVG, ICO)"
                        },
                        "defaultModelFile": {
                          "type": "string",
                          "format": "binary",
                          "description": "Default model file (.FCStd)"
                        },
                        "defaultModelThumbnailFile": {
                          "type": "string",
                          "format": "binary",
                          "description": "Default model thumbnail file (PNG)"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
    })

  // Add publish configuration for real-time updates
  app.service(siteConfigPath).publish('patched', (data, context) => {
    // Broadcast site config updates to all users (public and authenticated)
    const filteredData = filterSiteConfigForPublic(data)
    return [
      app.channel('anonymous').send(filteredData),
      app.channel('authenticated').send(filteredData)
    ];
  });

  // Initialize hooks
  app.service(siteConfigPath).hooks({
    around: {
      all: [
        // Authenticate before external resolver needs user
        async (context, next) => {
          if (context.method === 'get') {
            // For non-default configs, require authentication
            if (context.id !== siteConfigId) {
              await authenticate('jwt')(context)
            } else if (context.params.authentication) {
              // For default config, authenticate if token provided (for admin access)
              await authenticate('jwt')(context)
            }
          }
          return next()
        },
        schemaHooks.resolveExternal(siteConfigExternalResolver),
        schemaHooks.resolveResult(siteConfigResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(siteConfigQueryValidator),
        schemaHooks.resolveQuery(siteConfigQueryResolver)
      ],
      get: [
        // Verify admin power for non-default configs
        // (Authentication already handled in around.all hook)
        async (context) => {
          if (context.id !== siteConfigId) {
            return verifySiteAdministrativePower(context);
          }
          return context;
        }
      ],
      patch: [
        authenticate('jwt'),
        verifySiteAdministrativePower,
        parseJsonFields,
        uploadBrandingLogo,
        uploadDefaultModel,
        uploadDefaultModelThumbnail,
        setCustomizedFlags,
        schemaHooks.validateData(siteConfigPatchValidator),
        schemaHooks.resolveData(siteConfigPatchResolver)
      ],
      // Disallow methods we don't support
      find: [disallow()],
      create: [disallow()],
      update: [disallow()],
      remove: [disallow()]
    },
    after: {
      all: [],
      patch: [
        async (context) => {
          if (context.result?.oauth) {
            const updateOAuthConfig = context.app.get('updateOAuthConfig')
            if (updateOAuthConfig) {
              try {
                const fullConfig = await context.app.service('site-config').get(siteConfigId)
                await updateOAuthConfig(fullConfig)
              } catch (error) {
                console.error('Error updating OAuth configuration:', error)
              }
            }
          }
          return context
        }
      ]
    },
    error: {
      all: []
    }
  })

  // Proxy FreeCAD blog feed endpoint
  app.get('/freecad-blog-rss', async (req, res) => {
    try {
      const response = await fetch('https://blog.freecad.org/feed/');
      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error ${response.status}` });
      }

      const text = await response.text();

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(text);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch FreeCAD feed', details: error.message });
    }
  });

  // Resolve OIDC endpoint URLs from an issuer (OAuth settings screen)
  app.post(
    '/oidc-discovery',
    (req, res, next) => {
      expressAuthenticate('jwt')(req, res, (err) => {
        if (err) {
          return res.status(401).json({ error: 'Not authenticated' })
        }
        next()
      })
    },
    async (req, res) => {
      try {
        const user = req.feathers?.user
        if (!user) {
          return res.status(401).json({ error: 'Not authenticated' })
        }
        const [isAdmin, reason] = await isSiteAdministrator(
          { user, provider: 'rest' },
          app
        )
        if (!isAdmin) {
          return res.status(403).json({ error: reason || 'Forbidden' })
        }
        const issuer = typeof req.body?.issuer === 'string' ? req.body.issuer.trim() : ''
        if (!issuer) {
          return res.status(400).json({ error: 'issuer is required' })
        }
        const doc = await fetchOpenIdConfiguration(issuer)
        return res.json({
          authorizeUrl: doc.authorization_endpoint,
          tokenUrl: doc.token_endpoint,
          userinfoUrl: doc.userinfo_endpoint
        })
      } catch (e) {
        return res.status(400).json({ error: e.message || 'OIDC discovery failed' })
      }
    }
  );
}
