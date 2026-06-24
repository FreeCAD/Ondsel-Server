<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title><v-sheet color="success">Professor Xavier's School For The Hidden</v-sheet></v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item
          color="link"
          class="text-decoration-underline"
          @click="$router.push({ name: 'XavierBrandingHub', params: {} })"
        >
          Branding Configuration
        </v-list-item>
        <v-list-item
          color="link"
          class="text-decoration-underline"
          @click="$router.push({ name: 'XavierOAuthConfig', params: {} })"
        >
          OAuth Configuration
        </v-list-item>
        <v-list-item
          color="link"
          class="text-decoration-underline"
          @click="$router.push({ name: 'XavierUpdateSoftwareReleases', params: {} })"
        >
          Update Software Releases
        </v-list-item>
        <v-list-item>
          View/Modify Key Documents:
          <v-list class="ms-4">
            <v-list-item
              color="link"
              class="text-decoration-underline"
              @click="$router.push({ name: 'XavierUpdateKeyDocuments', params: {name: 'privacy-policy'} })"
            >
              Privacy Policy Document
            </v-list-item>
            <v-list-item
              color="link"
              class="text-decoration-underline"
              @click="$router.push({ name: 'XavierUpdateKeyDocuments', params: {name: 'terms-of-service'} })"
            >
              Terms of Service/Use
            </v-list-item>
            <v-list-item
              color="link"
              class="text-decoration-underline"
              @click="$router.push({ name: 'XavierUpdateKeyDocuments', params: {name: 'signup-survey-prompt'} })"
            >
              Signup Survey Prompt
            </v-list-item>
          </v-list>
        </v-list-item>
        <v-list-item
          color="link"
          class="text-decoration-underline"
          @click="$router.push({ name: 'XavierManageUsers', params: {} })"
        >
          Manage Users
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-btn
        flat
        density="default"
        icon="mdi-magnify"
        @click="$refs.searchPopupDialogXavier.$data.dialog = true;"
      >
      </v-btn>
    </v-card-actions>
  </v-card>
  <search-popup-dialog ref="searchPopupDialogXavier" dest-page-name="XavierSearchResults"></search-popup-dialog>
</template>

<script>

import {mapActions, mapState} from "vuex";
import SearchPopupDialog from "@/components/SearchPopupDialog.vue";

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'XavierMenu',
  components: {SearchPopupDialog},
  data: () => ({
  }),
  async created() {
    if (!(await this.isSiteAdministrator())) {
      console.log("alert-33234");
      this.$router.push({name: 'LensHome', params: {}});
      return;
    }
  },
  computed: {
    ...mapState('auth', ['user']),
  },
  methods: {
    ...mapActions('app', ['isSiteAdministrator']),
  },
  watch: {
  }
}
</script>
<style scoped>
</style>
