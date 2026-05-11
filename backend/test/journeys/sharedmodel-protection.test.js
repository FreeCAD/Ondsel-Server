// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'assert'
import { app } from '../../src/app.js'
import { dropTestDb, seedBaseline } from '../helpers/db.js'
import {
  createAndFetchUser,
  createFileAndModel,
  upgradeTier,
} from '../helpers/factories.js'

async function createSharedModel(user, model, overrides = {}) {
  const data = {
    cloneModelId: model._id.toString(),
    dummyModelId: model._id.toString(),
    title: 'Test Share',
    description: 'integration test share',
    versionFollowing: 'Locked',
    protection: 'Listed',
    canViewModel: true,
    canViewModelAttributes: false,
    canUpdateModel: false,
    canExportFCStd: false,
    canExportSTEP: false,
    canExportSTL: false,
    canExportOBJ: false,
    canDownloadDefaultModel: false,
    ...overrides,
  }
  return app.service('shared-models').create(data, { user })
}

describe('SharedModel protection journey', () => {
  beforeEach(async () => {
    await dropTestDb()
    await seedBaseline()
  })

  it('creates a SharedModel pointing to the source Model', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const { model } = await createFileAndModel(user)
    const share = await createSharedModel(user, model)

    assert.ok(share._id, 'shared model has an _id')
    assert.strictEqual(
      share.cloneModelId.toString(),
      model._id.toString(),
      'cloneModelId points to source model'
    )
  })

  it("defaults protection to 'Listed' when not specified", async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const { model } = await createFileAndModel(user)
    const share = await createSharedModel(user, model)

    assert.strictEqual(share.protection, 'Listed')
  })

  it('stores Unlisted protection when requested', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const { model } = await createFileAndModel(user)
    const share = await createSharedModel(user, model, { protection: 'Unlisted' })

    assert.strictEqual(share.protection, 'Unlisted')
  })

  it('stores Pin protection with a 6-character pin', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const { model } = await createFileAndModel(user)
    const share = await createSharedModel(user, model, {
      protection: 'Pin',
      pin: '123456',
    })

    assert.strictEqual(share.protection, 'Pin')
    assert.strictEqual(share.pin, '123456')
  })

  it('stores Direct protection with the listed users', async () => {
    let creator = await createAndFetchUser()
    creator = await upgradeTier(creator, 'Peer')
    const recipient = await createAndFetchUser()
    const { model } = await createFileAndModel(creator)

    const share = await createSharedModel(creator, model, {
      protection: 'Direct',
      directSharedTo: [
        {
          _id: recipient._id,
          username: recipient.username,
          name: recipient.name,
          tier: recipient.tier,
        },
      ],
    })

    assert.strictEqual(share.protection, 'Direct')
    assert.ok(Array.isArray(share.directSharedTo), 'directSharedTo is an array')
    assert.strictEqual(share.directSharedTo.length, 1)
    assert.strictEqual(
      share.directSharedTo[0]._id.toString(),
      recipient._id.toString()
    )
  })

  it('allows anonymous get for a Listed shared model', async () => {
    let user = await createAndFetchUser()
    user = await upgradeTier(user, 'Peer')
    const { model } = await createFileAndModel(user)
    const share = await createSharedModel(user, model, { protection: 'Listed' })

    const fetched = await app.service('shared-models').get(share._id, {
      provider: 'rest',
    })
    assert.strictEqual(
      fetched._id.toString(),
      share._id.toString(),
      'anonymous caller can read a Listed share'
    )
  })

  it('rejects anonymous get for a Direct shared model', async () => {
    let creator = await createAndFetchUser()
    creator = await upgradeTier(creator, 'Peer')
    const recipient = await createAndFetchUser()
    const { model } = await createFileAndModel(creator)
    const share = await createSharedModel(creator, model, {
      protection: 'Direct',
      directSharedTo: [
        {
          _id: recipient._id,
          username: recipient.username,
          name: recipient.name,
          tier: recipient.tier,
        },
      ],
    })

    // FRAGILE-BUT-CORRECT: anonymous fetch is denied, but the mechanism is an
    // accidental TypeError inside the access-control hook
    // (canUserAccessSharedModelGetMethod accesses context.params.user._id
    // without a null-guard). A future "fix" of that crash without adding an
    // explicit access-denial branch could open the gate. See ARCHITECTURE_REVIEW
    // recommendation #2 (centralize access control).
    await assert.rejects(
      () =>
        app
          .service('shared-models')
          .get(share._id, { provider: 'rest' }),
      'anonymous Direct fetch should be rejected'
    )
  })
})
