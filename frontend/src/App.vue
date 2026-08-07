<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-app>
    <MainNavigationBar v-if="!$route.meta.isWindowLoadedInIframe"/>
    <v-main class="my-4 mx-2">
      <v-sheet class="fill-height" color="surface" border rounded="lg">
        <router-view/>
      </v-sheet>
    </v-main>
    <AppFooter v-if="!$route.meta.isWindowLoadedInIframe"/>
  </v-app>
</template>

<script>
import MainNavigationBar from '@/layouts/default/MainNavigationBar.vue';
import AppFooter from '@/layouts/default/AppFooter.vue';
import { mapActions, mapGetters, mapState } from 'vuex';
import { getThemePreference, resolveActiveTheme, watchSystemTheme } from '@/themePreference';

export default {
  name: 'App',
  components: { MainNavigationBar, AppFooter },
  computed: {
    ...mapGetters('app', ['siteConfig']),
    ...mapState('auth', ['user']),
  },
  data: () => ({
    _themeUnsubscribe: null,
  }),
  async created() {
    await this.loadSiteConfig();
  },
  mounted() {
    // When the user's preference is "system", track OS theme changes live.
    this._themeUnsubscribe = watchSystemTheme((systemTheme) => {
      if (getThemePreference() === 'system') {
        this.$vuetify.theme.global.name = systemTheme;
      }
    });
    // Reconcile in case Vuetify's initial pick drifted from the current
    // localStorage value (e.g., another tab updated it).
    this.$vuetify.theme.global.name = resolveActiveTheme(getThemePreference());
  },
  beforeUnmount() {
    this._themeUnsubscribe?.();
  },
  watch: {
    'siteConfig': {
      handler(newVal) {
        if (newVal && newVal.siteTitle) {
          this.updateTitle(newVal.siteTitle);
        }
        if (newVal && newVal.faviconUrl) {
          this.updateFavicon(newVal.faviconUrl);
        }
      },
      immediate: true
    },
    'user': {
      handler(newUser) {
        if (newUser) {
          this.loadSiteConfig();
        }
      }
    }
  },
  methods: {
    ...mapActions('app', ['loadSiteConfig']),
    updateTitle(title) {
      if (title) {
        document.title = title;
      }
    },
    updateFavicon(faviconUrl) {
      if (!faviconUrl) return;
      
      // Remove all existing favicon links
      document.querySelectorAll('link[rel*="icon"]').forEach(link => link.remove());

      // Determine type based on URL extension
      const urlLower = faviconUrl.toLowerCase();
      const isSVG = urlLower.includes('.svg');
      const type = isSVG ? 'image/svg+xml' : 'image/x-icon';

      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = type;
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }
}

</script>
