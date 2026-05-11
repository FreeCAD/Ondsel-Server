// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'assert'
import { app } from '../../src/app.js'
import { dropTestDb, seedBaseline } from '../helpers/db.js'
import { createAndFetchUser } from '../helpers/factories.js'

async function createFile(user, { custFileName, uniqueFileName, message } = {}) {
  const data = {
    custFileName: custFileName ?? 'tracer.fcstd',
    shouldCommitNewVersion: true,
    version: {
      uniqueFileName: uniqueFileName ?? `${Date.now()}.fcstd`,
      ...(message ? { message } : {}),
    },
  }
  return app
    .service('file')
    .create(data, { user, $triggerLambda: false })
}

describe('file upload journey', () => {
  beforeEach(async () => {
    await dropTestDb()
    await seedBaseline()
  })

  it('creates a file with an _id and the requested custFileName', async () => {
    const user = await createAndFetchUser()
    const file = await createFile(user, { custFileName: 'tracer.fcstd' })

    assert.ok(file._id, 'file has an _id')
    assert.strictEqual(file.custFileName, 'tracer.fcstd')
  })

  it('sets currentVersionId pointing to an entry in versions[]', async () => {
    const user = await createAndFetchUser()
    const created = await createFile(user, { uniqueFileName: 'v1.fcstd' })
    const file = await app.service('file').get(created._id)

    assert.ok(file.currentVersionId, 'currentVersionId is set')
    assert.ok(Array.isArray(file.versions), 'versions is an array')
    assert.ok(file.versions.length >= 1, 'has at least one version')

    const current = file.versions.find(
      (v) => v._id.toString() === file.currentVersionId.toString()
    )
    assert.ok(current, 'currentVersionId points to an existing version')
    assert.strictEqual(current.uniqueFileName, 'v1.fcstd')
  })

  it('attaches the file to the user’s default workspace and root directory', async () => {
    const user = await createAndFetchUser()
    const created = await createFile(user, { custFileName: 'attached.fcstd' })
    const file = await app.service('file').get(created._id)

    assert.ok(file.workspace, 'file.workspace summary is set')
    assert.strictEqual(
      file.workspace._id.toString(),
      user.defaultWorkspaceId.toString(),
      'workspace matches user.defaultWorkspaceId'
    )
    assert.ok(file.directory, 'file.directory summary is set')

    const directory = await app.service('directories').get(file.directory._id)
    const containedFile = directory.files.find(
      (f) => f._id.toString() === file._id.toString()
    )
    assert.ok(containedFile, 'file appears in directory.files[]')
  })

  it('records the creator in relatedUserDetails', async () => {
    const user = await createAndFetchUser()
    const created = await createFile(user, { custFileName: 'with-user.fcstd' })
    const file = await app.service('file').get(created._id)

    assert.ok(
      Array.isArray(file.relatedUserDetails),
      'relatedUserDetails is an array'
    )
    const creator = file.relatedUserDetails.find(
      (u) => u._id.toString() === user._id.toString()
    )
    assert.ok(creator, 'creator appears in relatedUserDetails')
  })

  it('advances currentVersionId when a new version is committed via patch', async () => {
    const user = await createAndFetchUser()
    const created = await createFile(user, {
      custFileName: 'multiversion.fcstd',
      uniqueFileName: 'v1.fcstd',
    })
    const fileBefore = await app.service('file').get(created._id)
    const v1Id = fileBefore.currentVersionId.toString()

    await app.service('file').patch(
      created._id,
      {
        shouldCommitNewVersion: true,
        version: {
          uniqueFileName: 'v2.fcstd',
          message: 'second version',
        },
      },
      { user, $triggerLambda: false }
    )
    const fileAfter = await app.service('file').get(created._id)

    assert.notStrictEqual(
      fileAfter.currentVersionId.toString(),
      v1Id,
      'currentVersionId advanced'
    )
    assert.strictEqual(
      fileAfter.versions.length,
      2,
      'versions array has both versions'
    )
    const newCurrent = fileAfter.versions.find((v) =>
      v._id.equals(fileAfter.currentVersionId)
    )
    assert.strictEqual(newCurrent.uniqueFileName, 'v2.fcstd')
  })
})
