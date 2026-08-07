<!--
SPDX-FileCopyrightText: 2026 The FreeCAD project association AISBL

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-footer v-if="showFooter" app class="px-4 py-2">
    <div class="d-flex flex-wrap align-center justify-center ga-4 w-100 text-body-2">
      <span v-if="footer.showCopyright" class="d-flex align-center text-muted">
        <v-icon size="16" class="mr-1">mdi-copyright</v-icon>
        <span>{{ siteConfig.copyrightText }}</span>
      </span>
      <router-link
        v-if="footer.showTermsOfService"
        class="text-link"
        :to="{ name: 'LegalDoc', params: { doc_name: 'terms-of-service' } }"
      >
        Terms of Service
      </router-link>
      <router-link
        v-if="footer.showPrivacyPolicy"
        class="text-link"
        :to="{ name: 'LegalDoc', params: { doc_name: 'privacy-policy' } }"
      >
        Privacy Policy
      </router-link>
    </div>
  </v-footer>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'AppFooter',
  computed: {
    ...mapGetters('app', ['siteConfig']),
    footer() {
      return this.siteConfig?.footer || {};
    },
    showFooter() {
      return !!this.footer.enabled && (
        this.footer.showCopyright ||
        this.footer.showTermsOfService ||
        this.footer.showPrivacyPolicy
      );
    },
  },
}
</script>

<style scoped>
</style>
