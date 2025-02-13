// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import feathersClient, { makeServicePlugin, BaseModel } from '@/plugins/feathers-client'

class Agreements extends BaseModel {
  constructor(data, options) {
    super(data, options)
  }
  // Required for $FeathersVuex plugin to work after production transpile.
  static modelName = 'Agreements'
  // Define default properties here
  static instanceDefaults() {
    return {
      category: '',
      current: {
        agreementDocId: '',
        title: '',
        effective: 0, // a formal date
        deprecated: null, // null means not deprecated yet
        version: '',
        markdownContent: '',
        docPostedAt: '', // when this was uploaded to db
      },
    }
  }

}

const servicePath = 'agreements'
const servicePlugin = makeServicePlugin({
  'Model': Agreements,
  service: feathersClient.service(servicePath),
  servicePath
})

// Setup the client-side Feathers hooks.
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
