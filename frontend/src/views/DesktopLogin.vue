<!--
SPDX-FileCopyrightText: 2026 William Dunn <william.dunn@quasarke.net>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-container
    fluid
    class="d-flex align-center justify-center"
    style="min-height: 80vh"
  >
    <v-card class="mx-auto pa-4 text-center" width="520" flat>
      <v-icon size="64" color="primary" class="mb-4">mdi-desktop-classic</v-icon>
      <v-card-title class="text-h5 justify-center mb-2">
        Sign in to FreeCAD
      </v-card-title>

      <v-card-text v-if="callbackError" class="text-body-1 text-error">
        {{ callbackError }}
      </v-card-text>

      <template v-else>
        <v-card-text class="text-body-1 text-medium-emphasis">
          You are signed in as <strong>{{ user && user.username }}</strong
          >. Hand this session to the Ondsel Lens addon to finish signing in to
          FreeCAD.
        </v-card-text>

        <v-card-actions class="justify-center mt-2">
          <v-btn color="primary" variant="elevated" @click="handOff">
            Open in FreeCAD
          </v-btn>
        </v-card-actions>

        <v-card-text v-if="handedOff" class="text-body-2 text-medium-emphasis">
          Sent to FreeCAD. You can close this tab.
        </v-card-text>
      </template>
    </v-card>
  </v-container>
</template>

<script>
import { mapState } from "vuex";

// The addon opens this page with a loopback callback it is already listening on,
// plus a state value to tie the answer to the request it made.
const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]", "::1"];

export default {
  name: "DesktopLogin",
  data: () => ({
    handedOff: false,
    callbackError: "",
  }),
  computed: {
    ...mapState("auth", ["accessToken", "user"]),
    // Only ever hand a token to a loopback address. Anything else would turn
    // this page into a way to exfiltrate a session to an arbitrary origin.
    safeCallback() {
      const raw = this.$route.query.callback;
      if (!raw) {
        return null;
      }
      let parsed;
      try {
        parsed = new URL(raw);
      } catch (error) {
        return null;
      }
      if (parsed.protocol !== "http:") {
        return null;
      }
      if (!LOOPBACK_HOSTS.includes(parsed.hostname)) {
        return null;
      }
      return parsed;
    },
  },
  created() {
    if (!this.$route.query.callback) {
      this.callbackError =
        "Open this page from FreeCAD, using Sign in with browser in the Ondsel Lens panel.";
    } else if (!this.safeCallback) {
      this.callbackError =
        "The address FreeCAD asked us to reply to is not a local address, so no token was sent.";
    }
  },
  methods: {
    handOff() {
      const callback = this.safeCallback;
      if (!callback || !this.accessToken) {
        return;
      }
      callback.searchParams.set("token", this.accessToken);
      const state = this.$route.query.state;
      if (state) {
        callback.searchParams.set("state", state);
      }
      this.handedOff = true;
      // A top-level navigation, so this is not a mixed-content fetch and needs
      // no private-network preflight.
      window.location.href = callback.toString();
    },
  },
};
</script>
