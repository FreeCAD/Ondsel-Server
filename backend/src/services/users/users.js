// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'
import swagger from 'feathers-swagger';
import {iff, preventChanges} from 'feathers-hooks-common'
import { BadRequest } from '@feathersjs/errors'
import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  userDataValidator,
  userPatchValidator,
  userQueryValidator,
  userResolver,
  userExternalResolver,
  userDataResolver,
  userPatchResolver,
  userQueryResolver,
  userSchema,
  userDataSchema,
  userQuerySchema,
  uniqueUserValidator, uniqueUserPatchValidator, userPublicFields
} from './users.schema.js'
import { UserService, getOptions } from './users.class.js'
import { userPath, userMethods } from './users.shared.js'
import { siteConfigId } from '../site-config/site-config.schema.js'
import {addVerification, removeVerification} from "feathers-authentication-management";
import {notifier} from "../auth-management/notifier.js";
import {oauthSignupWelcome} from "../auth-management/auth-management.schema.js";
import {isAdminUser, isEndUser} from "../../hooks/is-user.js";
import {buildOrganizationSummary} from "../organizations/organizations.distrib.js";
import {OrganizationTypeMap} from "../organizations/organizations.subdocs.schema.js";
import {
  authenticateJwtWhenPrivate,
  handlePublicOnlyQuery,
  resolvePrivateResults
} from "../../hooks/handle-public-info-query.js";
import {copyUserBeforePatch, distributeUserSummariesHook} from "./users.distrib.js";
import {buildNewCurationForUser, specialUserOrgCurationHandler} from "./users.curation.js";
import {changeEmailNotification} from "./commands/changeEmailNotification.js";
import {verifySiteAdministrativePower, isSiteAdministrator } from "../hooks/administration.js";
import {removeUser} from "./commands/removeUser.js";
import { handleQueryArgs } from "./helpers.js";
import { AccountEventTypeMap } from "../account-event/account-event.schema.js";
import { SubscriptionTypeMap, SubscriptionTermTypeMap } from "./users.subdocs.schema.js";
import { verifyOAuthCompletionSignature } from "../../authentication/oauth-helper.js";

export * from './users.class.js'
export * from './users.schema.js'


const checkRegistrationOpen = async (context) => {
  // Internal calls (migrations, admin creating users) bypass this check
  if (context.params.provider === undefined) return context; // internal call
  const siteConfigService = context.app.service('site-config');
  const siteConfig = await siteConfigService.get(siteConfigId);
  if (siteConfig.registrationOpen === false) {
    // Allow site administrators to create users even when registration is closed
    if (context.params.user) {
      const [isAdmin] = await isSiteAdministrator(context.params, context.app);
      if (isAdmin) return context;
    }
    throw new BadRequest('Registration is currently closed.');
  }
  return context;
};


// A configure function that registers the service and its hooks via `app.configure`
export const user = (app) => {
  // Register our service on the Feathers application
  app.use(userPath, new UserService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: userMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: swagger.createSwaggerServiceOptions({
      schemas: { userDataSchema, userQuerySchema, userSchema },
      docs: {
        description: 'A User model service',
        idType: 'string',
        securities: ['all'],
        operations: {
          get: {
            "parameters": [
              {
                "description": "ObjectID or username of User to return",
                "in": "path",
                "name": "_id",
                "schema": {
                  "type": "string"
                },
                "required": true,
              },
              {
                "description": "If provided and set to \"true\", then only return public data",
                "in": "query",
                "name": "publicInfo",
                "schema": {
                  "type": "string"
                },
                "required": false,
              },
            ],
          },
          find: {
            "description": "Retrieves a list of users.<ul><li>If publicInfo = true, then multiple users may be located but the information is limited to public info.</li><li>If logged in as a site administrator or an internal query, then everything is returned.</li><li>Otherwise, you must be logged in and will only see your own entry.</li></ul>",
            "parameters": [
              {
                "description": "Number of results to return",
                "in": "query",
                "name": "$limit",
                "schema": {
                  "type": "integer"
                },
                "required": false,
              },
              {
                "description": "Number of results to skip",
                "in": "query",
                "name": "$skip",
                "schema": {
                  "type": "integer"
                },
                "required": false,
              },
              {
                "description": "Query parameters",
                "in": "query",
                "name": "filter",
                "style": "form",
                "explode": true,
                "schema": {
                  "$ref": "#/components/schemas/UserQuery"
                },
                "required": false,
              },
              {
                "description": "If provided and set to \"true\", then only return public data",
                "in": "query",
                "name": "publicInfo",
                "schema": {
                  "type": "string"
                },
                "required": false,
              },
            ],
          },
        },
      }
    })
  })
  app.service(userPath).publish((data, context) => {
    return app.channel(context.result._id.toString())
  })
  // Initialize hooks
  app.service(userPath).hooks({
    around: {
      all: [
        // Preserve oauthAccessToken through schema resolvers
        // Schema resolvers filter out fields not in the schema, so we temporarily store it in params
        // and restore it after all resolvers have run (must be placed first in array to run last when unwinding)
        async (context, next) => {
          await next()
          if (context.params._oauthAccessToken) {
            context.result.oauthAccessToken = context.params._oauthAccessToken
            delete context.params._oauthAccessToken
          }
          return context
        },
        schemaHooks.resolveExternal(userExternalResolver),
        handleQueryArgs(),
        handlePublicOnlyQuery(userPublicFields),
        resolvePrivateResults(userResolver)
      ],
      find: [authenticateJwtWhenPrivate()],
      get: [authenticateJwtWhenPrivate()],
      create: [],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [
        schemaHooks.validateQuery(userQueryValidator),
        schemaHooks.resolveQuery(userQueryResolver)
      ],
      find: [],
      get: [
        detectUsernameInId
      ],
      create: [
        checkRegistrationOpen,
        validateOAuthCompletionData,
        schemaHooks.validateData(userDataValidator),
        schemaHooks.resolveData(userDataResolver),
        uniqueUserValidator,
        iff(
          context => !context.data.oauthProviders,
          addVerification("auth-management")
        ),
      ],
      patch: [
        copyUserBeforePatch,
        iff(
          isEndUser,
          preventChanges(
            false,
            'tier',
            'nextTier',
            'subscriptionDetail.state',
            'organizations',
            "isVerified",
            "resetExpires",
            "resetShortToken",
            "resetToken",
            "verifyChanges",
            "verifyExpires",
            "verifyShortToken",
            "verifyToken",
          ),
          iff(
            context => context.data.shouldChangeEmailNotification,
            changeEmailNotification
          ),
          specialUserOrgCurationHandler,
          schemaHooks.validateData(userPatchValidator),
          uniqueUserPatchValidator,
        ),
        schemaHooks.resolveData(userPatchResolver),
      ],
      remove: [
        verifySiteAdministrativePower,
        removeUser,
      ]
    },
    after: {
      all: [],
      create: [
        generateOAuthUserToken,
        // Store oauthAccessToken in params to preserve it through schema resolvers
        // Schema resolvers will strip it from result, so we restore it in around.all hook
        async (context) => {
          if (context.result.oauthAccessToken) {
            context.params._oauthAccessToken = context.result.oauthAccessToken
          }
          return context
        },
        iff(
          context => !context.result.oauthProviders,
          sendVerify()
        ),
        removeVerification(),
        createDefaultOrganization,
        createNotificationsDoc,
        createSampleModels,
        // Upgrade OAuth users to Solo tier (email is already verified via OAuth provider)
        iff(
          context => !!context.result.oauthProviders,
          upgradeOAuthUserToSoloTier
        ),
        // Send welcome email to OAuth users (similar to email verification success email)
        iff(
          context => !!context.result.oauthProviders,
          sendOAuthWelcomeEmail
        ),
      ],
      patch: [
        distributeUserSummariesHook
      ],
    },
    error: {
      all: []
    }
  })
}

/**
 * Validate OAuth completion data for OAuth user creation
 * Verifies HMAC signature and stores data temporarily for JWT token generation after creation
 * 
 * Security: This runs before schema validation, so we must validate:
 * - Input types and formats
 * - Base64 encoding validity
 * - Data size limits
 * - HMAC signature (prevents tampering)
 * - Expiration (prevents replay attacks)
 */
const validateOAuthCompletionData = async (context) => {
  if (!context.data.oauthProviders || !context.data.oauthCompletionSignature || !context.data.oauthCompletionExpires || !context.data.oauthCompletionData) {
    return context
  }

  const { oauthCompletionSignature, oauthCompletionExpires, oauthCompletionData } = context.data

  // Type and format validation
  if (typeof oauthCompletionSignature !== 'string' || oauthCompletionSignature.length === 0) {
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }
  if (typeof oauthCompletionExpires !== 'number' || oauthCompletionExpires <= 0) {
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }
  if (typeof oauthCompletionData !== 'string' || oauthCompletionData.length === 0) {
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }

  // Size limit check (prevent DoS via large payloads)
  const MAX_BASE64_SIZE = 10 * 1024 // 10KB
  if (oauthCompletionData.length > MAX_BASE64_SIZE) {
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }

  // Verify signature and expiration before parsing
  const secret = context.app.get('authentication').secret
  const verificationResult = verifyOAuthCompletionSignature(oauthCompletionData, oauthCompletionExpires, oauthCompletionSignature, secret)
  if (!verificationResult.valid) {
    throw new BadRequest(verificationResult.error)
  }

  // Validate decoded data structure
  let decodedData
  try {
    const decodedBuffer = Buffer.from(oauthCompletionData, 'base64')
    const decodedString = decodedBuffer.toString('utf-8')
    decodedData = JSON.parse(decodedString)
    
    if (!decodedData || typeof decodedData !== 'object') {
      throw new BadRequest('Invalid signup link. Please try signing in again.')
    }
    if (typeof decodedData.email !== 'string' || !decodedData.email.includes('@')) {
      throw new BadRequest('Invalid signup link. Please try signing in again.')
    }
    if (typeof decodedData.providerId !== 'string' || decodedData.providerId.length === 0) {
      throw new BadRequest('Invalid signup link. Please try signing in again.')
    }
    if (typeof decodedData.provider !== 'string' || decodedData.provider.length === 0) {
      throw new BadRequest('Invalid signup link. Please try signing in again.')
    }
  } catch (error) {
    if (error instanceof BadRequest) {
      throw error
    }
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }

  // Ensure email and providerId match signed OAuth data (prevents tampering)
  if (context.data.email && context.data.email !== decodedData.email) {
    throw new BadRequest('Invalid signup link. Please try signing in again.')
  }
  if (context.data.oauthProviders && context.data.oauthProviders[decodedData.provider]) {
    const providedProviderId = context.data.oauthProviders[decodedData.provider].id
    if (providedProviderId && providedProviderId !== decodedData.providerId) {
      throw new BadRequest('Invalid signup link. Please try signing in again.')
    }
  }

  // Store signature data temporarily in params for after-create hook to generate JWT
  context.params.oauthCompletionData = {
    signature: oauthCompletionSignature,
    expires: oauthCompletionExpires,
    data: oauthCompletionData
  }

  // Override with signed OAuth data (source of truth)
  context.data.email = decodedData.email
  if (!context.data.oauthProviders) {
    context.data.oauthProviders = {}
  }
  context.data.oauthProviders[decodedData.provider] = {
    id: decodedData.providerId
  }

  // Remove verification fields from data (they shouldn't be stored in user document)
  delete context.data.oauthCompletionSignature
  delete context.data.oauthCompletionExpires
  delete context.data.oauthCompletionData

  return context
}

/**
 * Generate JWT token for OAuth user after creation
 */
const generateOAuthUserToken = async (context) => {
  if (!context.params.oauthCompletionData || !context.result.oauthProviders) {
    return context
  }

  try {
    const authenticationService = context.app.service('authentication')
    const userId = context.result._id.toString()
    // FeathersJS JWT strategy requires 'sub' (subject) field for user ID
    const payload = { sub: userId }
    const accessToken = await authenticationService.createAccessToken(payload)
    context.result.oauthAccessToken = accessToken
  } catch (error) {
    console.error('Failed to generate OAuth user token:', error)
    // Don't throw - user creation succeeded, frontend has fallback to redirect to login
  }

  return context
}

/**
 * Upgrade OAuth user from unverified to solo tier
 * OAuth users are auto-verified (email verified by OAuth provider)
 * Uses the same account-event flow as manual signup users after email verification
 */
const upgradeOAuthUserToSoloTier = async (context) => {
  try {
    const accountEventService = context.app.service('account-event')
    await accountEventService.create({
      event: AccountEventTypeMap.startSoloSubscriptionFromUnverified,
      userId: context.result._id.toString(),
      detail: {
        subscription: SubscriptionTypeMap.solo,
        term: SubscriptionTermTypeMap.monthly,
        currentSubscription: SubscriptionTypeMap.unverified
      },
      note: 'OAuth user auto-verified and upgraded to Solo tier'
    }, { user: context.result })
  } catch (error) {
    // Log detailed error for admin visibility - user creation succeeded, tier upgrade can be retried manually
    console.error('Failed to upgrade OAuth user to Solo tier:', {
      userId: context.result._id.toString(),
      email: context.result.email,
      error: error.message,
      stack: error.stack
    })
    // Don't throw - user creation succeeded, tier upgrade failure is non-blocking
  }

  return context
}

/**
 * Send welcome email to OAuth users after account creation
 * Uses OAuth welcome email template
 */
const sendOAuthWelcomeEmail = async (context) => {
  const notifierInst = notifier(context.app)

  const users = Array.isArray(context.result)
    ? context.result
    : [context.result]

  await Promise.all(
    users
      .filter(user => user.oauthProviders)
      .map(async user => notifierInst(oauthSignupWelcome, user))
  )

  return context
}

const createSampleModels = async (context) => {
  const { app } = context;
  const modelService = app.service('models');
  const fileService = app.service('file');
  const uploadService = app.service('upload');
  const siteConfigService = app.service('site-config');

  try {
    let siteConfig = await siteConfigService.get(siteConfigId);

    const sampleModelFileName = siteConfig.defaultModel.fileName;
    const sampleModelObj = siteConfig.defaultModel.objPath;
    const sampleModelThumbnail = siteConfig.defaultModel.thumbnailPath;
    const attributes = siteConfig.defaultModel.attributes

    const file = await fileService.create({
      custFileName: sampleModelFileName,
      shouldCommitNewVersion: true,
      version: {
        uniqueFileName: sampleModelObj,
      }
    }, { user: context.result, $triggerLambda: false })

    const model  = await modelService.create({
      fileId: file._id.toString(),
      attributes: attributes,
      isObjGenerated: true,
      isThumbnailGenerated: true,
    }, { user: { _id: context.result._id }, skipSystemGeneratedSharedModel: true })

    if (sampleModelThumbnail) {
      const thumbnailFilename = sampleModelThumbnail.split('/').pop();
      await uploadService.copy(sampleModelThumbnail, sampleModelThumbnail.replace(thumbnailFilename, `${model._id.toString()}_thumbnail.PNG`));
    }
    await uploadService.copy(sampleModelObj, `${model._id.toString()}_generated.FCSTD`);

    // Patch to update the model thumbnail url, because the thumbnail file didn't exist when the model was created
    await modelService.patch(model._id, {
      isThumbnailGenerated: !!sampleModelThumbnail,
    })
  } catch (e) {
    console.error(e);
  }

  return context
}

const sendVerify = () => {
  return async (context) => {
    // Temporary disable email verification for creating default admin user
    if (process.env.DISABLE_SEND_VERIFICATION_EMAIL) {
      return context;
    }

    const notifierInst = notifier(context.app);

    const users = Array.isArray(context.result)
      ? context.result
      : [context.result];

    await Promise.all(
      users.map(async user => notifierInst("resendVerifySignup", user))
    )
  };
}

const createDefaultOrganization = async context => {
  const organizationService = context.app.service('organizations');
  const workspaceService = context.app.service('workspaces');
  const organization = await organizationService.create(
    {
      name: 'Personal',
      refName: context.result._id.toString(),
      type: OrganizationTypeMap.personal,
      curation: buildNewCurationForUser(context.result),
    },
    { user: context.result }
  );
  const workspace = await workspaceService.create(
    { name: 'Default', description: 'Your workspace', organizationId: organization._id, refName: 'default' },
    { user: context.result }
  )
  await context.service.patch(
    context.result._id,
    {
      // Note: the earlier organization CREATE automatically populated the `organizations` field of User.
      // for details, visit assignOrganizationIdToUser in file:
      //     backend/src/services/organizations/helpers.js
      defaultWorkspaceId: workspace._id,
      personalOrganization: buildOrganizationSummary(organization),
      currentOrganizationId: organization._id,
    }
  );
  return context;
}

const createNotificationsDoc = async context => {
  const ntfService = context.app.service('notifications');
  const ntfDoc = await ntfService.create(
    {
      userId: context.result._id,
      notificationsReceived: [],
    }
  );
  await context.service.patch(
    context.result._id,
    {
      notificationsId: ntfDoc._id,
    }
  );
  return context;
}


const detectUsernameInId = async context => {
  const id = context.id.toString();
  if (id.length < 24) { // a 24 character id is an OID not a username, so only look at username if shorter
    if (context.params?.user?.username !== context.id) {
      if (!(await isAdminUser(context))) {
        context.publicDataOnly = true;
      }
    }
    let userList = {};
    if (context.publicDataOnly) {
      userList = await context.service.find({
        query: {
          publicInfo: "true",
          username: id,
          $select: userPublicFields,
        }
      });
    } else {
      userList = await context.service.find(
        {query: { username: id } }
      );
    }
    if (userList?.total === 1) {
      context.result = userList.data[0];
    }
  }
  return context;
}