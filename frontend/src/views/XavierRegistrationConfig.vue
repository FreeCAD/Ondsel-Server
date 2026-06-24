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
                still log in. You can still create users manually below.
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

        <v-col cols="12">
          <v-card class="ma-2" elevation="1">
            <v-card-title>Create User Manually</v-card-title>
            <v-card-text>
              <p class="text-caption text-grey-darken-1 mb-4">
                Create a new user account directly, bypassing registration
                settings.
              </p>
              <v-form ref="createUserForm" v-model="createUserValid">
                <v-text-field
                  v-model="newUser.name"
                  label="Display Name"
                  :rules="[(v) => !!v || 'Name is required']"
                  :disabled="isCreatingUser"
                  type="text"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="newUser.username"
                  label="Username"
                  :rules="[
                    (v) => !!v || 'Username is required',
                    (v) =>
                      /^[a-zA-Z0-9_-]+$/.test(v) ||
                      'Only letters, numbers, dashes and underscores',
                  ]"
                  :disabled="isCreatingUser"
                  type="text"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="newUser.email"
                  label="Email"
                  :rules="[
                    (v) => !!v || 'Email is required',
                    (v) => /.+@.+\..+/.test(v) || 'Must be a valid email',
                  ]"
                  :disabled="isCreatingUser"
                  type="email"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="newUser.password"
                  label="Password"
                  :rules="[
                    (v) => !!v || 'Password is required',
                    (v) => v.length >= 8 || 'Minimum 8 characters',
                  ]"
                  :disabled="isCreatingUser"
                  type="password"
                  class="mb-2"
                ></v-text-field>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="elevated"
                :disabled="!createUserValid || isCreatingUser"
                :loading="isCreatingUser"
                @click="createUser"
              >
                Create User
              </v-btn>
            </v-card-actions>
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
      createUserValid: false,
      isCreatingUser: false,
      newUser: {
        name: "",
        username: "",
        email: "",
        password: "",
      },
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
    async createUser() {
      const { valid } = await this.$refs.createUserForm.validate();
      if (!valid) return;
      this.isCreatingUser = true;
      try {
        await models.api.User.create({
          name: this.newUser.name.trim(),
          username: this.newUser.username.trim(),
          email: this.newUser.email.trim(),
          password: this.newUser.password,
          usageType: 'both',  // add this
        });
        this.showMessage(
          `User ${this.newUser.email} created successfully`,
          "success"
        );
        this.newUser = { name: "", username: "", email: "", password: "" };
        this.$refs.createUserForm.reset();
      } catch (error) {
        console.error("Failed to create user:", error);
        this.showMessage(error.message || "Failed to create user", "error");
      } finally {
        this.isCreatingUser = false;
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
