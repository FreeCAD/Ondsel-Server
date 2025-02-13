<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <Main>
    <template #title>
      LENS Home Page
    </template>
    <template #content>
      <v-card color="indigo-darken-3">
        <v-card-title>Shutdown Notice</v-card-title>
        <v-card-text>
          <h1>Service is Shutting Down as of November 22nd, 2024</h1>
          <h2>Please download any of your files that you want to keep!</h2>
        </v-card-text>
      </v-card>
      <v-sheet class="d-flex flex-wrap flex-row">
        <v-sheet
          name="left_side"
        >
          <v-container>
            <h2>
              <v-img
                src="https://ondsel.com/img/logo.png"
                width="10em"
              ></v-img>
              LENS
            </h2>
          </v-container>
          <v-card class="ma-4">
            <v-card-title>{{ title }}</v-card-title>
            <v-card-text>
              <markdown-viewer :markdown-html="markdownHtml"></markdown-viewer>
            </v-card-text>
          </v-card>
          <v-card class="ma-4">
            <v-card-text>
              <promotions-viewer :promoted="promotedFiltered"></promotions-viewer>
            </v-card-text>
          </v-card>
          <v-card v-if="promotedUsers && promotedUsers.length" flat>
            <v-card-title>Users to Watch</v-card-title>
            <promoted-users-table :promoted-users="promotedUsers"></promoted-users-table>
          </v-card>
        </v-sheet>

        <v-sheet
          name="right_side"
          width="24em"
          border
        >
          <vue-rss-feed feed-url="https://ondsel.com/blog/rss" name="Latest Ondsel Blog" limit="7"></vue-rss-feed>
        </v-sheet>
      </v-sheet>
    </template>
  </Main>
</template>

<script>

import {models} from "@feathersjs/vuex";
import {marked} from "marked";
import PromotionsViewer from "@/components/PromotionsViewer.vue";
import MarkdownViewer from "@/components/MarkdownViewer.vue";
import PromotedUsersTable from "@/components/PromotedUsersTable.vue";
import VueRssFeed from "@/components/VueRssFeed.vue";
import Main from '@/layouts/default/Main.vue';

const { Organization } = models.api;

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'LensHome',
  components: {PromotedUsersTable, MarkdownViewer, PromotionsViewer, VueRssFeed, Main},
  data: () => ({
    lensSiteCuration: null,
    markdownHtml: 'missing data',
    title: 'missing title',
  }),
  async created() {
    const response = await Organization.find({
      query: {
        type: 'Ondsel',
        publicInfo: 'true',
      }
    });
    if (response.data.length > 0) {
      this.lensSiteCuration = response.data[0].curation;
      this.markdownHtml =  marked.parse(this.lensSiteCuration.longDescriptionMd || 'no markdown');
      this.title = this.lensSiteCuration.description || 'no title';
    }
  },
  computed: {
    promoted: vm => vm.lensSiteCuration && vm.lensSiteCuration.promoted || [],
    promotedFiltered: vm => vm.lensSiteCuration && vm.lensSiteCuration.promoted.filter(p => p.curation.collection !== 'users') || [],
    promotedUsers: vm => vm.lensSiteCuration && vm.lensSiteCuration.promoted.filter(p => p.curation.collection === 'users'),
  },
  methods: {
  }
}
</script>
<style scoped>
::v-deep(.v-skeleton-loader__image) {
  height: 190px;
}
</style>
