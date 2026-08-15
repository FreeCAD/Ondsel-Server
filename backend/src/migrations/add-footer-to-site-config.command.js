// SPDX-FileCopyrightText: 2026 The FreeCAD project association AISBL
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ObjectId } from 'mongodb'
import { siteConfigId } from '../services/site-config/site-config.schema.js'

const defaultFooter = {
  enabled: false,
  showCopyright: true,
  showTermsOfService: true,
  showPrivacyPolicy: true,
}

export async function addFooterToSiteConfigCommand(app) {
  console.log('>>> checking for site config (add footer)')
  const db = await app.get('mongodbClient')
  const collection = db.collection('site-config')

  const existingConfig = await collection.findOne({ _id: new ObjectId(siteConfigId) })

  if (!existingConfig) {
    console.log('>>> site config does not exist, skipping migration')
    return
  }

  if (existingConfig.footer) {
    console.log('>>> site config already has footer, skipping migration')
    return
  }

  console.log('>>> adding footer to site config')

  await collection.updateOne(
    { _id: new ObjectId(siteConfigId) },
    {
      $set: {
        footer: { ...defaultFooter },
        'customized.footer': false,
      },
    }
  )

  console.log('>>> footer added to site config')
}
