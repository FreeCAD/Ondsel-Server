<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-dialog
    v-if="dialog"
    v-model="dialog"
    width="auto"
  >
    <v-card max-width="40em" min-width="22em">
      <template v-slot:title>
        <div class="text-center">Change Name</div>
      </template>
      <v-progress-linear
        :active="pendingChangeName"
        indeterminate
        absolute
        bottom
      ></v-progress-linear>
      <v-form ref="changeNameDialogForm" @submit.prevent="doNameChange">
        <v-card-text>
          <v-text-field
            v-model.trim="newUserName"
            label="Name"
            hint="Enter your name"
            :rules="[rules.isRequired]"
            :disabled="pendingChangeName"
          ></v-text-field>
        </v-card-text>
      </v-form>
      <v-snackbar
        :timeout="2000"
        v-model="showSnacker"
      >
        {{ snackerMsg }}
      </v-snackbar>
      <v-card-actions class="justify-center">
        <v-btn color="cancel" variant="elevated" @click="dialog = false">Cancel</v-btn>
        <v-btn @click="doNameChange()" color="primary" variant="elevated" :disabled="pendingChangeName">Change</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>

import {models} from "@feathersjs/vuex";

const { User } = models.api;

export default {
  name: 'UserChangeNameDialog',
  props: {
    user: {}
  },
  created() {
    this.newUserName = this.user.name;
  },
  data: () => ({
    pendingChangeName: false,
    dialog: false,
    rules: {
      isRequired: v => !!v || 'This field is required',
    },
    snackerMsg: '',
    showSnacker: false,
    newUserName: '',
  }),
  computed: {
  },
  methods: {
    async doNameChange() {
      this.newUserName = this.newUserName.trim();
      const { valid } = await this.$refs.changeNameDialogForm.validate();
      if (!valid) {
        return;
      }
      this.pendingChangeName = true;
      await User.patch(
        this.user._id,
        {
          name: this.newUserName,
        }
      ).then(() => {
        this.dialog = false;
      }).catch((e) => {
        const msg = e.message;
        console.log(msg);
      });
      this.pendingChangeName = false;
    }
  },
}
</script>

<style scoped>
</style>
