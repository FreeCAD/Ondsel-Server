// SPDX-FileCopyrightText: 2024 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ObjectId } from 'mongodb';
import { siteConfigId } from '../services/site-config/site-config.schema.js';

export async function createDefaultSiteConfigCommand(app) {
  // Check if site config already exists
  console.log(">>> checking for site config");
  const db = await app.get('mongodbClient');
  const collection = db.collection('site-config');

  const existingConfig = await collection.findOne({ _id: new ObjectId(siteConfigId) });

  if (existingConfig) {
    console.log(">>> site config already exists, skipping migration");
    return;
  }

  console.log(">>> creating default site config");
  const defaultSiteConfig = {
    _id: new ObjectId(siteConfigId),
    logoUrl: '/logo.svg',
    faviconUrl: '/favicon.ico',
    siteTitle: 'Lens',
    socialLinks: {
      forum: { url: 'https://forum.freecad.org', label: 'Forum' },
      discord: { url: 'https://discord.gg/w2cTKGzccC', label: 'Discord' },
      youtube: { url: '', label: 'YouTube' }
    },
    copyrightText: '2025 FreeCAD',
    footer: {
      enabled: false,
      showCopyright: true,
      showTermsOfService: true,
      showPrivacyPolicy: true
    },
    homepageContent: {
      title: 'Welcome to Lens',
      markdownContent: 'Welcome to Lens, your collaborative CAD platform. Upload, view, and share 3D models with version control, export capabilities, and real-time collaboration tools.',
      rssFeedEnabled: true,
      rssFeedUrl: `${app.get('backendUrl').replace(/\/$/, '')}/freecad-blog-rss`,
      rssFeedName: 'Latest FreeCAD Blog',
      banner: {
        enabled: false,
        title: 'Maintenance Notice',
        content: '# Service will be under maintenance from 10:00 to 12:00 UTC on 2099-12-31',
        color: '#283593'
      }
    },
    defaultModel: {
      fileName: 'sample.FCStd',
      filePath: 'sample.FCStd',
      objPath: 'sample_generated.FCSTD',
      thumbnailPath: 'public/sample_thumbnail.PNG',
      attributes: {
        "Fillet1": {
          "type": "length",
          "value": 20,
          "unit": "mm"
        },
        "Fillet2": {
          "type": "length",
          "value": 5,
          "unit": "mm"
        },
        "NumberOfCircles": {
          "type": "number",
          "value": 2,
          "unit": ""
        },
        "RadialDistance": {
          "type": "length",
          "value": 1000,
          "unit": "mm"
        },
        "TangentialDistance": {
          "type": "length",
          "value": 1000,
          "unit": "mm"
        },
        "Thickness": {
          "type": "length",
          "value": 80,
          "unit": "mm"
        }
      }
    },
    desktopApp: {
      name: 'FreeCAD',
      version: '',
      enabledOpenInDesktopApp: false,
      protocol: 'freecad:',
    },
    oauth: {
      providers: {
        google: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          redirectUri: '',
        },
        github: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          redirectUri: '',
        },
        oidc: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          issuer: '',
          authorizeUrl: '',
          tokenUrl: '',
          userinfoUrl: '',
          signInWithName: '',
        },
      }
    },
    customized: {
      logoUrl: false,
      faviconUrl: false,
      siteTitle: false,
      socialLinks: false,
      copyrightText: false,
      footer: false,
      homepageContent: false,
      defaultModel: false,
      desktopApp: false,
      oauth: false,
    }
  };

  // Insert the default site config
  await collection.insertOne(defaultSiteConfig);

  console.log(">>> site config created");
}
