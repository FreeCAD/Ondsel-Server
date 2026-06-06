// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'assert'
import { app } from '../../src/app.js'
import { dropTestDb, seedBaseline } from '../helpers/db.js'
import {
  createTestUser,
  createAndFetchUser,
  getPersonalOrgFor,
} from '../helpers/factories.js'

describe('signup journey', () => {
  beforeEach(async () => {
    await dropTestDb()
    await seedBaseline()
  })

  it('creates a user with an _id and the requested email', async () => {
    const user = await createTestUser({ email: 'tracer@local.test' })

    assert.ok(user._id, 'user has an _id')
    assert.strictEqual(user.email, 'tracer@local.test')
  })

  it('auto-creates a Personal organization owned by the new user', async () => {
    const user = await createAndFetchUser()
    const personalOrg = await getPersonalOrgFor(user)

    assert.ok(personalOrg, 'personal org exists')
    assert.strictEqual(personalOrg.type, 'Personal')
    assert.strictEqual(
      personalOrg.owner._id.toString(),
      user._id.toString(),
      'owner is the new user'
    )
  })

  it("sets user.personalOrganization to point at the auto-created org", async () => {
    const user = await createAndFetchUser()
    const personalOrg = await getPersonalOrgFor(user)

    assert.ok(user.personalOrganization, 'user.personalOrganization is set')
    assert.strictEqual(
      user.personalOrganization._id.toString(),
      personalOrg._id.toString()
    )
    assert.strictEqual(user.personalOrganization.type, 'Personal')
  })

  it('includes the personal org in user.organizations[]', async () => {
    const user = await createAndFetchUser()

    assert.ok(Array.isArray(user.organizations))
    const personalMembership = user.organizations.find(
      (o) => o._id.toString() === user.personalOrganization._id.toString()
    )
    assert.ok(personalMembership, 'personal org appears in user.organizations[]')
  })

  it('seeds at least one workspace inside the personal org', async () => {
    const user = await createAndFetchUser()
    const workspaces = await app.service('workspaces').find({
      query: { organizationId: user.personalOrganization._id },
      paginate: false,
    })

    assert.ok(workspaces.length >= 1, 'at least one workspace seeded')
  })

  it('gives the seeded workspace a root directory', async () => {
    const user = await createAndFetchUser()
    const [workspace] = await app.service('workspaces').find({
      query: { organizationId: user.personalOrganization._id },
      paginate: false,
    })

    assert.ok(workspace.rootDirectory, 'workspace.rootDirectory exists')
    const rootDir = await app
      .service('directories')
      .get(workspace.rootDirectory._id)
    assert.ok(rootDir, 'directory record is reachable via the directories service')
  })

  it("sets the new user's tier to 'Unverified'", async () => {
    const user = await createAndFetchUser()
    assert.strictEqual(user.tier, 'Unverified')
  })

  it('initializes the userAccounting ledger', async () => {
    const user = await createAndFetchUser()

    assert.ok(user.userAccounting, 'userAccounting object exists')
    assert.ok(user.userAccounting.ledgerBalances, 'ledgerBalances exists')
    assert.ok(
      Array.isArray(user.userAccounting.journal),
      'journal is an array'
    )
  })

  it('rejects a second user with the same email', async () => {
    await createTestUser({ email: 'dupe@local.test', username: 'first_user' })

    await assert.rejects(
      () =>
        createTestUser({ email: 'dupe@local.test', username: 'second_user' }),
      /already.*use|exist|dupli|email/i,
      'expected duplicate-email rejection'
    )
  })

  it('rejects a second user with the same username (case-insensitive)', async () => {
    await createTestUser({ email: 'a@local.test', username: 'CaseUser' })

    await assert.rejects(
      () => createTestUser({ email: 'b@local.test', username: 'caseuser' }),
      /already.*use|exist|dupli|username/i,
      'expected case-insensitive duplicate-username rejection'
    )
  })
})
