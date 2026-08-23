// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve, virtual } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'
import { userSummarySchema } from '../users/users.subdocs.schema.js'
import { isSiteAdministrator, adminOnlyField } from '../hooks/administration.js'
import { filterOAuthDataForPublic, filterOAuthDataForAdmin, filterMaskedOAuthSecretsFromPatch } from './helpers.js'

// Fixed ID for the single site config document
export const siteConfigId = '000000000000000000000000';

// Homepage content sub-schema
const homepageContentSchema = Type.Object({
  title: Type.String(),
  markdownContent: Type.String(),
  rssFeedEnabled: Type.Boolean(),
  rssFeedUrl: Type.String(),
  rssFeedName: Type.String(),
  banner: Type.Object({
    enabled: Type.Boolean(),
    title: Type.String(),
    content: Type.String(),
    color: Type.String()
  })
})

// Default model sub-schema
const defaultModelSchema = Type.Object({
  filePath: Type.String(),
  objPath: Type.String(),
  thumbnailPath: Type.String({ default: null }),
  attributes: Type.Object({})
})

// Social links sub-schema
const socialLinkSchema = Type.Object({
  url: Type.String(),
  label: Type.String()
})

const socialLinksSchema = Type.Object({
  forum: Type.Optional(socialLinkSchema),
  discord: Type.Optional(socialLinkSchema),
  youtube: Type.Optional(socialLinkSchema)
})

// Footer sub-schema
const footerSchema = Type.Object({
  enabled: Type.Boolean(),
  showCopyright: Type.Boolean(),
  showTermsOfService: Type.Boolean(),
  showPrivacyPolicy: Type.Boolean()
})

const desktopAppSchema = Type.Object({
  name: Type.String(),
  version: Type.String(),
  enabledOpenInDesktopApp: Type.Boolean(),
  protocol: Type.String(),
})

// OAuth provider config sub-schema
const oauthProviderConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
})

// OIDC provider config sub-schema
const oauthOidcProviderConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
  issuer: Type.String(),
  authorizeUrl: Type.String(),
  tokenUrl: Type.String(),
  userinfoUrl: Type.String(),
  signInWithName: Type.String({ maxLength: 20 }),
})

// OAuth config sub-schema
const oauthConfigSchema = Type.Object({
  providers: Type.Object({
    google: oauthProviderConfigSchema,
    github: oauthProviderConfigSchema,
    oidc: oauthOidcProviderConfigSchema,
  })
})

// Main data model schema
export const siteConfigSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    logoUrl: Type.String(),
    faviconUrl: Type.String(),
    siteTitle: Type.String(),
    socialLinks: socialLinksSchema,
    copyrightText: Type.String({ minLength: 5, maxLength: 80 }),
    footer: footerSchema,
    homepageContent: homepageContentSchema,
    defaultModel: defaultModelSchema,
    desktopApp: desktopAppSchema,
    oauth: oauthConfigSchema,
    registrationOpen: Type.Optional(Type.Boolean({ default: true })),
    customized: Type.Object({
      logoUrl: Type.Boolean(),
      faviconUrl: Type.Boolean(),
      siteTitle: Type.Boolean(),
      socialLinks: Type.Boolean(),
      copyrightText: Type.Boolean(),
      footer: Type.Boolean(),
      homepageContent: Type.Boolean(),
      defaultModel: Type.Boolean(),
      desktopApp: Type.Boolean(),
      oauth: Type.Boolean(),
      registrationOpen: Type.Optional(Type.Boolean()),
    }),
    updatedAt: Type.Number(),
    updatedBy: Type.Optional(userSummarySchema)
  },
  { $id: 'SiteConfig', additionalProperties: false }
)
export const siteConfigValidator = getValidator(siteConfigSchema, dataValidator)
export const siteConfigResolver = resolve({
  defaultModelObjUrl: virtual(async(message, context) => {
    if (message.defaultModel.objPath) {
      let r = await context.app.service('upload').get(message.defaultModel.objPath);
      if (r.url.includes('?')) {
        return r.url + '&updatedAt=' + message.updatedAt
      }
      return r.url + '?updatedAt=' + message.updatedAt
    }
    return '';
  }),
})

export const siteConfigExternalResolver = resolve({
  oauth: async (value, data, context) => {
    if (!context.params.user) return filterOAuthDataForPublic(value)
    const [isAdmin] = await isSiteAdministrator(context.params, context.app)
    return isAdmin ? filterOAuthDataForAdmin(value) : filterOAuthDataForPublic(value)
  },
  defaultModel: adminOnlyField,
  defaultModelObjUrl: adminOnlyField,
  customized: adminOnlyField,
  updatedAt: adminOnlyField,
  updatedBy: adminOnlyField
})

// Schema for updating existing entries
export const siteConfigPatchSchema = Type.Partial(siteConfigSchema, {
  $id: 'SiteConfigPatch'
})
export const siteConfigPatchValidator = getValidator(siteConfigPatchSchema, dataValidator)
export const siteConfigPatchResolver = resolve({
  updatedAt: async () => Date.now(),
  updatedBy: async (_value, _message, context) => {
    if (context.params.user) {
      return {
        _id: context.params.user._id,
        name: context.params.user.name,
        refName: context.params.user.refName
      }
    }
    return _value
  },
  oauth: async (value, _message, context) => {
    if (value) {
      try {
        const existingConfig = await context.app.service('site-config').get(context.id)
        return filterMaskedOAuthSecretsFromPatch(value, existingConfig?.oauth)
      } catch (error) {
        return filterMaskedOAuthSecretsFromPatch(value, null)
      }
    }
    return value
  }
})

// Schema for allowed query properties
export const siteConfigQueryProperties = Type.Pick(siteConfigSchema, ['_id'])
export const siteConfigQuerySchema = Type.Intersect(
  [
    querySyntax(siteConfigQueryProperties),
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const siteConfigQueryValidator = getValidator(siteConfigQuerySchema, queryValidator)
export const siteConfigQueryResolver = resolve({})
