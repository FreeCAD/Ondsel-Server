// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import { loadFonts } from './webfontloader'
import vuetify from './vuetify'
import router from '../router'
import store from '../store'
import { FeathersVuex } from './feathers-client'
import {matomoOptions} from "@/plugins/matomo";
import VueMatomo from "vue-matomo";

export function registerPlugins (app) {
  loadFonts()
  app
    .use(vuetify)
    .use(router)
    .use(store)
    .use(FeathersVuex)
    .use(VueMatomo, matomoOptions)
}
