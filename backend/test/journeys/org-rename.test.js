// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'assert'
import { app } from '../../src/app.js'
import { dropTestDb, seedBaseline } from '../helpers/db.js'
import {
  createAndFetchUser,
  getPersonalOrgFor,
  upgradeTier,
} from '../helpers/factories.js'

describe('organization rename + summary fan-out', () => {
  beforeEach(async () => {
    await dropTestDb()
    await seedBaseline()
  })

  it('patches the org name on the canonical record', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const org = await getPersonalOrgFor(user)

    const renamed = await app
      .service('organizations')
      .patch(org._id, { name: 'Renamed Org' }, { user })

    assert.strictEqual(renamed.name, 'Renamed Org')
  })

  // FIXME (inherited bug): user.personalOrganization is set once at signup and
  // is NEVER updated when the org is renamed. organizations.distrib.js does not
  // touch this back-reference. This test documents current behavior; the
  // it.skip below documents the desired behavior.
  it('LEAVES user.personalOrganization STALE after rename (documented bug)', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const org = await getPersonalOrgFor(user)
    const originalName = org.name

    await app
      .service('organizations')
      .patch(org._id, { name: 'Renamed' }, { user })

    const after = await app.service('users').get(user._id)
    assert.strictEqual(
      after.personalOrganization.name,
      originalName,
      'BUG: user.personalOrganization.name still shows the original'
    )
  })

  it.skip('SHOULD propagate the rename to user.personalOrganization', async () => {
    // When the distrib bug above is fixed, flip this to active and delete the
    // characterization test it replaces.
  })

  it('propagates the rename to user.organizations[] membership entries', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const org = await getPersonalOrgFor(user)

    await app
      .service('organizations')
      .patch(org._id, { name: 'Renamed2' }, { user })

    const after = await app.service('users').get(user._id)
    const entry = after.organizations.find(
      (o) => o._id.toString() === org._id.toString()
    )
    assert.ok(entry, 'membership entry still exists')
    assert.strictEqual(entry.name, 'Renamed2', 'membership entry name updated')
  })

  it('propagates the rename to workspaces.organization summary', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const org = await getPersonalOrgFor(user)

    await app
      .service('organizations')
      .patch(org._id, { name: 'WS-Reflective' }, { user })

    const [workspace] = await app.service('workspaces').find({
      query: { organizationId: org._id },
      paginate: false,
    })
    assert.strictEqual(
      workspace.organization.name,
      'WS-Reflective',
      'workspace.organization.name reflects the rename'
    )
  })
})
