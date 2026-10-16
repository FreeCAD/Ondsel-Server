// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import feathers from '@feathersjs/feathers'
import { app } from '../../../src/app.js'

const { getServiceOptions } = feathers

describe('email service', () => {
  it('registered the service', () => {
    const service = app.service('email')

    assert.ok(service, 'Registered the service')
  })

  it('exposes no methods to external transports', () => {
    const service = app.service('email')

    assert.deepStrictEqual(getServiceOptions(service).methods, [])
  })

  for (const provider of ['rest', 'socketio']) {
    it(`rejects create calls from ${provider}`, async () => {
      await assert.rejects(
        () => app.service('email').create(
          { to: 'target@example.com', subject: 'Test Rejection', text: 'This is a test. You should not get this!!' },
          { provider }
        ),
        { name: 'MethodNotAllowed' }
      )
    })
  }
})
