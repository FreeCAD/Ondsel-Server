// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'assert'
import { app } from '../../src/app.js'
import { dropTestDb, seedBaseline } from '../helpers/db.js'
import { createAndFetchUser, getPersonalOrgFor } from '../helpers/factories.js'
import { crc32 } from '../../src/refNameFunctions.js'

// users.remove expects an id of the form `<userId>z<crc32(email)>` as a
// "you really mean it" confirmation gate.
function deleteId(user) {
  return `${user._id.toString()}z${crc32(user.email).toString()}`
}

describe('user delete + reference cleanup', () => {
  beforeEach(async () => {
    await dropTestDb()
    await seedBaseline()
  })

  it('removes a user without throwing', async () => {
    const user = await createAndFetchUser()

    await app.service('users').remove(deleteId(user), { user })
    // Tracer: we made it here without an exception.
  })

  it('redacts the user document instead of hard-deleting it', async () => {
    const user = await createAndFetchUser()
    await app.service('users').remove(deleteId(user), { user })

    const db = await app.get('mongodbClient')
    const after = await db.collection('users').findOne({ _id: user._id })

    assert.ok(after, 'user document still exists (redact, not hard delete)')
    assert.strictEqual(after.email, '<REDACTED>')
    assert.strictEqual(after.username, '<REDACTED>')
    assert.strictEqual(after.tier, 'Deleted')
  })

  it('marks the personal organization as removed', async () => {
    const user = await createAndFetchUser()
    const personalOrg = await getPersonalOrgFor(user)

    await app.service('users').remove(deleteId(user), { user })

    const db = await app.get('mongodbClient')
    const orgAfter = await db
      .collection('organizations')
      .findOne({ _id: personalOrg._id })

    // The remove flow ends with `orgService.remove(personalOrg._id)`, which
    // for organizations is a soft-delete that sets `deleted: true`. Either
    // a missing doc OR a doc with deleted=true is acceptable evidence the
    // org was removed.
    const removed = !orgAfter || orgAfter.deleted === true
    assert.ok(removed, 'personal org was removed (hard or soft)')
  })

  it('clears the personal workspace and root directory', async () => {
    const user = await createAndFetchUser()
    const personalOrg = await getPersonalOrgFor(user)
    const [workspace] = await app.service('workspaces').find({
      query: { organizationId: personalOrg._id },
      paginate: false,
    })
    const rootDirId = workspace.rootDirectory._id

    await app.service('users').remove(deleteId(user), { user })

    const db = await app.get('mongodbClient')
    const wsAfter = await db
      .collection('workspaces')
      .findOne({ _id: workspace._id })
    const dirAfter = await db
      .collection('directories')
      .findOne({ _id: rootDirId })

    assert.strictEqual(wsAfter, null, 'workspace hard-deleted')
    assert.strictEqual(dirAfter, null, 'root directory hard-deleted')
  })
})
