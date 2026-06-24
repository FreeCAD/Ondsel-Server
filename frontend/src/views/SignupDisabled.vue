<!--
SPDX-FileCopyrightText: 2026 Frédéric Druppel <contact@fredcorp.cc>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-container
    fluid
    class="d-flex align-center justify-center"
    style="min-height: 80vh"
  >
    <v-card class="mx-auto pa-4 text-center" width="480" flat>
      <v-icon size="64" color="warning" class="mb-4"
        >mdi-account-lock-outline</v-icon
      >
      <v-card-title class="text-h5 justify-center mb-2"
        >Registration is disabled</v-card-title
      >
      <v-card-text class="text-body-1 text-medium-emphasis">
        New account creation is currently disabled on this instance. Please
        contact the administrator if you need access.
      </v-card-text>
      <v-card-actions class="justify-center mt-2">
        <v-btn variant="tonal" :to="{ name: 'LensHome' }"> Go to Home </v-btn>
        <v-btn color="primary" variant="elevated" :to="{ name: 'Login' }">
          Login
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "SignUpDisabled",
};
</script>
