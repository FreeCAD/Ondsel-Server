<!--
SPDX-FileCopyrightText: 2026 Chris Hennes <chennes@freecad.org>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title>Set User Tier</v-card-title>
    <v-card-subtitle>
      <v-btn
        density="default"
        icon="mdi-home"
        color="success"
        @click="$router.push({ name: 'XavierMenu', params: {}})"
      ></v-btn> Professor Xavier's School For The Hidden
    </v-card-subtitle>
    <v-card-text>
      <p class="ma-4">
        Manually set a user's tier (does not set up a subscription)
      </p>
      <v-card width="26em" class="pa-2 ma-2 mx-auto">
        <v-card-text>
          <v-text-field
            v-model="username"
            label="Username"
            autofocus
          ></v-text-field>
          <v-select
            v-model="tier"
            :items="tiers"
            label="New Tier"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="isPending || !username || !tier"
            class="mx-auto"
            @click.stop="doSetTier()"
          >Set Tier</v-btn>
        </v-card-actions>
      </v-card>
    </v-card-text>
  </v-card>
  <v-card class="ma-2 mx-auto">
    <v-card-title>RESULTS:</v-card-title>
    <v-card-text>
      <pre>{{ results }}</pre>
    </v-card-text>
  </v-card>
</template>

<script>

import {mapActions} from "vuex";
import {models} from "@feathersjs/vuex";
import {SubscriptionTypeMap} from "@/store/services/users";

const { User } = models.api;

export default {
  name: 'XavierSetUserTier',
  data: () => ({
    username: '',
    tier: null,
    tiers: Object.values(SubscriptionTypeMap).filter(t => t !== SubscriptionTypeMap.deleted),
    results: 'pending...',
    isPending: false,
  }),
  async created() {
    if (!(await this.isSiteAdministrator())) {
      this.$router.push({name: 'LensHome', params: {}});
    }
  },
  methods: {
    ...mapActions('app', ['isSiteAdministrator']),
    async doSetTier() {
      this.isPending = true;
      try {
        const user = await User.get(this.username.trim());
        const result = await User.patch(user._id, { tier: this.tier, nextTier: null });
        this.results = `${result.username}: tier changed from ${user.tier} to ${result.tier}`;
      } catch (e) {
        this.results = 'ERROR: ' + e.toString();
      }
      this.isPending = false;
    }
  },
}
</script>
