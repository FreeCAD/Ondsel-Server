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
      <p class="ma-4">
        If you don't know the username, use the <a href="/xavier-9584355633/search">Xavier Search Page</a>.
      </p>
      <v-card width="26em" class="pa-2 ma-2 mx-auto">
        <v-card-text>
          <v-text-field
            v-model="username"
            label="Username"
            autofocus
            :error-messages="lookupError"
            @keyup.enter="validateUser()"
          >
            <template v-slot:append-inner>
              <v-btn
                size="small"
                variant="tonal"
                :loading="isLookupPending"
                :disabled="!username.trim()"
                @click.stop="validateUser()"
              >Validate</v-btn>
            </template>
          </v-text-field>
          <v-alert
            v-if="foundUser"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div><strong>{{ foundUser.username }}</strong> ({{ foundUser.name }})</div>
            <div>Current tier: {{ foundUser.tier }}</div>
            <div v-if="foundUser.nextTier">Pending change to: {{ foundUser.nextTier }}</div>
          </v-alert>
          <v-select
            v-model="tier"
            :items="tiers"
            label="New Tier"
            :disabled="!foundUser"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="isPending || !foundUser || !tier || tier === foundUser.tier"
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
import {refNameHasher} from "@/refNameFunctions";
import {SubscriptionTypeMap} from "@/store/services/users";

const { User } = models.api;

export default {
  name: 'XavierSetUserTier',
  data: () => ({
    username: '',
    tier: null,
    tiers: Object.values(SubscriptionTypeMap).filter(t => t !== SubscriptionTypeMap.deleted),
    results: '',
    foundUser: null,
    lookupError: '',
    isLookupPending: false,
    isPending: false,
  }),
  async created() {
    if (!(await this.isSiteAdministrator())) {
      this.$router.push({name: 'LensHome', params: {}});
    }
  },
  watch: {
    // Any edit to the username invalidates a previous lookup, so the tier can
    // never be applied to a user other than the one that was confirmed.
    username() {
      this.foundUser = null;
      this.lookupError = '';
    },
  },
  methods: {
    ...mapActions('app', ['isSiteAdministrator']),
    async validateUser() {
      const username = this.username.trim();
      if (!username) {
        return;
      }
      this.isLookupPending = true;
      this.foundUser = null;
      this.lookupError = '';
      try {
        // usernameHash is the normalized key the backend uses for uniqueness
        // (lower cased, underscores removed), so this matches regardless of
        // how the admin capitalized the name.
        const response = await User.find({
          query: { usernameHash: refNameHasher(username) },
        });
        const users = response.data || response;
        if (users.length === 1) {
          this.foundUser = users[0];
        } else if (users.length === 0) {
          this.lookupError = 'No user found with that username';
        } else {
          this.lookupError = `Ambiguous: ${users.length} users matched`;
        }
      } catch (e) {
        this.lookupError = 'Lookup failed: ' + e.toString();
      }
      this.isLookupPending = false;
    },
    async doSetTier() {
      this.isPending = true;
      const previousTier = this.foundUser.tier;
      try {
        const result = await User.patch(this.foundUser._id, { tier: this.tier, nextTier: null });
        this.results = `${result.username}: tier changed from ${previousTier} to ${result.tier}`;
        this.foundUser = result;
        this.tier = null;
      } catch (e) {
        this.results = 'ERROR: ' + e.toString();
      }
      this.isPending = false;
    }
  },
}
</script>
