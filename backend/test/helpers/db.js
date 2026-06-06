// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { app } from '../../src/app.js'
import { createDefaultSiteConfigCommand } from '../../src/migrations/create-default-site-config.command.js'

export async function dropTestDb() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('dropTestDb refused: NODE_ENV is not "test"')
  }
  const db = await app.get('mongodbClient')
  if (!db.databaseName.endsWith('-test')) {
    throw new Error(
      `dropTestDb refused: database name "${db.databaseName}" does not end with "-test"`
    )
  }
  const collections = await db.listCollections().toArray()
  for (const c of collections) {
    await db.collection(c.name).deleteMany({})
  }
}

export async function seedBaseline() {
  await createDefaultSiteConfigCommand(app)
}
