<!--
SPDX-FileCopyrightText: 2026 Frédéric Druppel <contact@fredcorp.cc>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title>Registration Configuration</v-card-title>
    <v-card-subtitle>
      <v-btn
        density="default"
        icon="mdi-home"
        color="success"
        @click="$router.push({ name: 'XavierMenu', params: {} })"
      ></v-btn>
      <b><i>Professor Xavier's School For The Hidden</i></b>
    </v-card-subtitle>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-card class="ma-2" elevation="1">
            <v-card-title>User Registration</v-card-title>
            <v-card-text>
              <p class="text-caption text-grey-darken-1 mb-4">
                When disabled, new users cannot sign up. Existing users can
                still log in. You can still create users manually via the API.
              </p>
              <v-progress-circular
                v-if="isLoading"
                indeterminate
                color="primary"
                class="ma-4"
              ></v-progress-circular>
              <v-switch
                v-else
                v-model="registrationOpen"
                :label="
                  registrationOpen
                    ? 'Registration is open'
                    : 'Registration is closed'
                "
                color="primary"
                :disabled="isSaving"
              ></v-switch>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="success"
        variant="elevated"
        :disabled="isSaving || isLoading"
        :loading="isSaving"
        @click="save"
      >
        Save
      </v-btn>
    </v-card-actions>

    <v-snackbar v-model="showSnackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-card>
</template>

<script>
import { mapActions } from "vuex";
import { models } from "@feathersjs/vuex";
import { SITE_CONFIG_ID } from "@/store/services/site-config";

export default {
  name: "XavierRegistrationConfig",
  data() {
    return {
      registrationOpen: true,
      isLoading: true,
      isSaving: false,
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "success",
    };
  },
  async created() {
    if (!(await this.isSiteAdministrator())) {
      this.$router.push({ name: "LensHome", params: {} });
      return;
    }
    await this.loadSiteConfig();
    const siteConfig = models.api.SiteConfig.getFromStore(SITE_CONFIG_ID);
    this.registrationOpen = siteConfig?.registrationOpen !== false;
    this.isLoading = false;
  },
  methods: {
    ...mapActions("app", ["isSiteAdministrator", "loadSiteConfig"]),
    async save() {
      this.isSaving = true;
      const desired = this.registrationOpen;
      try {
        await models.api.SiteConfig.patch(SITE_CONFIG_ID, {
          registrationOpen: desired,
        });
        this.registrationOpen = desired;
        this.showMessage(
          "Registration configuration saved successfully",
          "success"
        );
      } catch (error) {
        console.error("Failed to save registration config:", error);
        this.showMessage(
          error.message || "Failed to save registration configuration",
          "error"
        );
      } finally {
        this.isSaving = false;
      }
    },
    showMessage(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.showSnackbar = true;
    },
  },
};
</script>

<style scoped></style>
