// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import path from 'path'
import { app } from '../../../src/app.js'
import { resolveInsideDirectory } from '../../../src/services/upload/upload.class.js'

describe('upload service', () => {
  it('registered the service', () => {
    const service = app.service('upload')

    assert.ok(service, 'Registered the service')
  })

  describe('resolveInsideDirectory', () => {
    const root = path.resolve('uploads')

    it('resolves names inside the directory', () => {
      assert.strictEqual(resolveInsideDirectory('uploads', 'abc.FCStd'), path.join(root, 'abc.FCStd'))
      assert.strictEqual(
        resolveInsideDirectory('uploads', 'public/branding/logo.png'),
        path.join(root, 'public', 'branding', 'logo.png')
      )
    })

    it('rejects names that escape the directory', () => {
      for (const fileName of [
        '../.env',
        '../../etc/passwd',
        'public/../../package.json',
        '..',
        '.',
        path.resolve('package.json'),
        '',
        'abc\0.FCStd',
        undefined,
      ]) {
        assert.strictEqual(resolveInsideDirectory('uploads', fileName), null, `accepted ${JSON.stringify(fileName)}`)
      }
    })
  })

  describe('path traversal in get', () => {
    for (const id of ['../package.json', '..%2Fpackage.json', path.resolve('package.json')]) {
      it(`rejects ${JSON.stringify(id)}`, async () => {
        await assert.rejects(
          () => app.service('upload').get(id, { query: { fileContent: 'true' } }),
          { name: 'BadRequest' }
        )
      })
    }

    it('does not decode a double-encoded traversal into a parent path', async () => {
      const result = await app.service('upload').get('..%252Fpackage.json', { query: { fileContent: 'true' } })

      assert.deepStrictEqual(result, { url: '' })
    })
  })
})
