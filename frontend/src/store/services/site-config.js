// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import feathersClient, { makeServicePlugin, BaseModel } from '@/plugins/feathers-client'
import store from '@/store'

// Fixed ID for the single site config document
export const SITE_CONFIG_ID = '000000000000000000000000'

export const SITE_CONFIG_DEFAULTS = {
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  siteTitle: 'Lens',
  socialLinks: {
    forum: { url: 'https://forum.freecad.org', label: 'Forum' },
    discord: { url: 'https://discord.gg/w2cTKGzccC', label: 'Discord' },
    youtube: { url: '', label: 'YouTube' }
  },
  copyrightText: '2025 FreeCAD',
  footer: {
    enabled: false,
    showCopyright: true,
    showTermsOfService: true,
    showPrivacyPolicy: true
  },
  homepageContent: {
    title: 'Welcome to Lens',
    markdownContent: 'Welcome to Lens, your collaborative CAD platform. Upload, view, and share 3D models with version control, export capabilities, and real-time collaboration tools.',
    rssFeedEnabled: true,
    rssFeedUrl: `${import.meta.env.VITE_APP_API_URL}/freecad-blog-rss`,
    rssFeedName: 'Latest FreeCAD Blog',
    banner: {
      enabled: false,
      title: 'Maintenance Notice',
      content: '# Service will be under maintenance from 10:00 to 12:00 UTC on 2099-12-31',
      color: '#283593'
    },
  },
  defaultModel: {
    filePath: 'sample.FCStd',
    objPath: 'sample_generated.FCSTD',
    thumbnailPath: 'public/sample_thumbnail.PNG',
    attributes: {
      "Fillet1": {
        "type": "length",
        "value": 20,
        "unit": "mm"
      },
      "Fillet2": {
        "type": "length",
        "value": 5,
        "unit": "mm"
      },
      "NumberOfCircles": {
        "type": "number",
        "value": 2,
        "unit": ""
      },
      "RadialDistance": {
        "type": "length",
        "value": 1000,
        "unit": "mm"
      },
      "TangentialDistance": {
        "type": "length",
        "value": 1000,
        "unit": "mm"
      },
      "Thickness": {
        "type": "length",
        "value": 80,
        "unit": "mm"
      }
    }
  },
  desktopApp: {
    name: 'FreeCAD',
    version: '',
    enabledOpenInDesktopApp: false,
    protocol: 'freecad:',
  },
  oauth: {
    providers: {
      google: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
      },
      github: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
      },
      oidc: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        issuer: '',
        authorizeUrl: '',
        tokenUrl: '',
        userinfoUrl: '',
        signInWithName: '',
      },
    }
  },
  customized: {
    logoUrl: false,
    faviconUrl: false,
    siteTitle: false,
    socialLinks: false,
    copyrightText: false,
    footer: false,
    homepageContent: false,
    defaultModel: false,
    desktopApp: false,
    oauth: false,
    registrationOpen: true,
  },
  registrationOpen: true,
}

class SiteConfig extends BaseModel {
  constructor(data, options) {
    super(data, options)
  }

  // Required for $FeathersVuex plugin to work after production transpile.
  static modelName = 'SiteConfig'

  static instanceDefaults() {
    return SITE_CONFIG_DEFAULTS
  }
}

const servicePath = 'site-config'
const servicePlugin = makeServicePlugin({
  Model: SiteConfig,
  service: feathersClient.service(servicePath),
  servicePath
})

// Sync function to update app state when site-config service updates
function syncToAppState(config) {
  if (config._id === SITE_CONFIG_ID) {
    store.commit('app/SET_SITE_CONFIG', config);
  }
}

feathersClient.service(servicePath).on('patched', syncToAppState)

// Set up the client-side Feathers hooks.
feathersClient.service(servicePath).hooks({
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
})

export default servicePlugin
