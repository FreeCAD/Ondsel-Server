// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { hooks as schemaHooks } from '@feathersjs/schema'
import { disallow } from 'feathers-hooks-common'
import { emailPath } from './email.shared.js'
import { EmailService } from "./email.class.js";
import { emailDataResolver, emailDataValidator } from './email.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
// This service is internal-only: it is called via `app.service('email')` from the server
// (auth-management notifier, notifications delivery) and must never be reachable by clients.
export const email = (app) => {

  let transporter = {
    host: app.get('smtpHost'),
    port: app.get('smtpPort'),
    secure: true,
    auth: {
      user: app.get('smtpUser'),
      pass: app.get('smtpPass'),
    },
    // Internally we never need access to files and attachments, so disable it
    disableFileAccess: true,
    disableUrlAccess: true,
  }

  // Register our service on the Feathers application
  app.use(
    emailPath,
    new EmailService(transporter, { from: app.get('smtpUser') }),
    {
      // No methods are exposed externally
      methods: [],
      // You can add additional custom events to be sent to clients here
      events: [],
    }
  )

  // Initialize hooks
  app.service(emailPath).hooks({
    around: {
      all: [],
    },
    before: {
      all: [disallow('external')],
      find: [],
      get: [],
      // Internal callers are still limited to a plain notification message.
      create: [
        schemaHooks.validateData(emailDataValidator),
        schemaHooks.resolveData(emailDataResolver),
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
