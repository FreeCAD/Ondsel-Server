// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import '@/styles/main.scss'

// Composables
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components'
import * as labsComponents from 'vuetify/labs/components'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import { getThemePreference, resolveActiveTheme } from '@/themePreference'

const customLightTheme = {
  dark: false,
  colors: {
    primary: '#0D47A1',
    secondary: '#607D8B',
    decoration: '#EFEBE9',
    link: '#263238',
    error: '#B71C1C',
    cancel: '#9E9E9E',
    success: '#00C853',
    background: '#FAFAFA',
    // 'placeholder' = subtle background for empty thumbnails, etc.
    // 'muted' = de-emphasized text (icons over placeholders).
    // 'surface-soft' = slightly-tinted card section (e.g., v-card-title bg).
    placeholder: '#F4F4F4',
    muted: '#8D8D8D',
    'surface-soft': '#FAFAFA',
  },
};

const customDarkTheme = {
  dark: true,
  colors: {
    primary: '#5C9CE6',
    secondary: '#B0BEC5',
    decoration: '#2A2A2A',
    link: '#82B1FF',
    error: '#EF5350',
    cancel: '#BDBDBD',
    success: '#69F0AE',
    background: '#121212',
    surface: '#1E1E1E',
    placeholder: '#2C2C2C',
    muted: '#9E9E9E',
    'surface-soft': '#262626',
  },
};


// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: resolveActiveTheme(getThemePreference()),
    themes: {
      light: customLightTheme,
      dark: customDarkTheme,
    }
  },
  components: {
    ...components, ...labsComponents
  },
  icons: {
    defaultSet: 'mdi',
    aliases: {
      ...aliases,
      // mdi-dock-left with the left pane left empty
      dockLeftOutline: 'svg:M20 4H4A2 2 0 0 0 2 6V18A2 2 0 0 0 4 20H20A2 2 0 0 0 22 18V6A2 2 0 0 0 20 4M20 18H9V6H20ZM7 18H4V6H7Z',
    },
    sets: { mdi },
  },
})
