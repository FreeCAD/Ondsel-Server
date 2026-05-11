// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { app } from '../../src/app.js'

let userCounter = 0

export async function createTestUser(overrides = {}) {
  userCounter += 1
  const suffix = `${Date.now()}_${userCounter}`
  const defaults = {
    email: `test_${suffix}@local.test`,
    username: `test_${suffix}`,
    name: `Test User ${suffix}`,
    password: 'test-password-1234',
    usageType: 'personal',
  }
  return app.service('users').create({ ...defaults, ...overrides })
}

// `users.create()` returns before all post-create hooks have populated the
// user document (notably `personalOrganization`, `organizations[]`).
// Re-fetching is the only way to see the fully-hydrated user.
export async function createAndFetchUser(overrides = {}) {
  const created = await createTestUser(overrides)
  return app.service('users').get(created._id)
}

export async function getPersonalOrgFor(user) {
  const orgs = await app.service('organizations').find({
    query: { 'owner._id': user._id },
    paginate: false,
  })
  return orgs[0]
}

// Upgrades a user's tier directly via Mongo (bypassing Stripe / billing logic).
// Useful in tests where you need Peer/Enterprise privileges (e.g. ability to
// disable auto-generated share links).
export async function upgradeTier(user, tier) {
  const db = await app.get('mongodbClient')
  await db.collection('users').updateOne({ _id: user._id }, { $set: { tier } })
  return app.service('users').get(user._id)
}

export async function createFileAndModel(user, { custFileName } = {}) {
  // The createSharedModelObject after-hook on models.create internally calls
  // file.create/model.create/shared-models.create passing only `authentication`
  // (not `user`) in params. That path is broken for direct service calls in
  // tests. Caller must use a tier (Peer+) that can disable the auto-share,
  // and we pass createSystemGeneratedShareLink:false to suppress it.
  const file = await app.service('file').create(
    {
      custFileName: custFileName ?? `j_${Date.now()}.fcstd`,
      shouldCommitNewVersion: true,
      version: { uniqueFileName: `v_${Date.now()}.fcstd` },
    },
    { user, $triggerLambda: false }
  )
  // The model create hook auto-generates a system shared link unless the
  // caller's tier allows disabling it AND the data flag says so. We pair them
  // so the test stays focused on the model itself.
  const model = await app.service('models').create(
    {
      fileId: file._id.toString(),
      isObjGenerated: true,
      isThumbnailGenerated: true,
      createSystemGeneratedShareLink: false,
    },
    { user }
  )
  return { file, model }
}
