<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-dialog
    v-model="dialog"
    width="auto"
    class="text-center"
  >
    <v-card width="600" max-height="800">
      <template v-slot:title>
        Model Attributes
      </template>
      <v-progress-linear
        :active="!isObjGenerated || !isModelLoaded"
        indeterminate
        absolute
        bottom
      ></v-progress-linear>
      <v-card-text>
        <v-container
          id="scroll-target"
          style="max-height: 600px"
          class="overflow-y-auto"
        >
        <div v-if="!Object.keys(attributes).length">No attributes exist.</div>
        <v-alert
          v-if="!canHaveWriteAccessToWorkspace"
          variant="outlined"
          type="warning"
          border="top"
          class="text-left"
        >
          Ask organization admin to give write access.
        </v-alert>
        <v-alert
          v-if="user && !constraints.canUpdateModelParameters"
          variant="outlined"
          type="warning"
          border="top"
          class="text-left"
        >
          Please upgrade your plan in order to update model parameters.
        </v-alert>
        <v-alert
          v-if="canUpdate && !isAuthenticated"
          variant="outlined"
          type="warning"
          border="top"
          class="text-left"
        >
          Please log in to customize the model.
        </v-alert>
        <br>

          <template v-for="(item, key) in attributes">
          <v-text-field
            v-model.trim="item.value"
            :label="key"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            v-if="item.type === 'string'"
            :readonly="!canUpdate"
          ></v-text-field>
          <v-text-field
            v-model="item.value"
            :label="key"
            type="number"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'angle'"
          ></v-text-field>
          <v-text-field
            v-model="item.value"
            :label="key"
            type="number"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'number'"
          ></v-text-field>
          <v-text-field
            v-model="item.value"
            :label="key"
            type="number"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'float'"
          ></v-text-field>
          <v-text-field
            v-model="item.value"
            :label="key"
            type="number"
            min="0"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'length'"
          ></v-text-field>
          <v-text-field
            v-model="item.value"
            :label="key"
            type="number"
            min="0"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'percent'"
          ></v-text-field>
          <v-select
            v-model="item.value"
            :label="key"
            :items="['true', 'false']"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'bool'"
          ></v-select>
          <v-select
            v-model="item.value"
            :label="key"
            :items="item.items"
            :suffix="item.unit"
            :disabled="!isObjGenerated"
            :readonly="!canUpdate"
            v-if="item.type === 'select'"
          ></v-select>
        </template>
        </v-container>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          color="cancel"
          variant="elevated"
          @click="dialog = false" :disabled="!isObjGenerated"
        >Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          v-if="canUpdate && Object.keys(attributes).length"
          :disabled="(user && !constraints.canUpdateModelParameters) || !isObjGenerated || !isAuthenticated"
          @click="$emit('updateModel')"
        >Update</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapGetters, mapState } from 'vuex';

export default {
  name: 'AttributeViewer',
  emits: ['updateModel'],
  props: {
    isActive: Boolean,
    attributes: Object,
    isObjGenerated: Boolean,
    isModelLoaded: Boolean,
    canViewModelAttributes: {
      type: Boolean,
      default: true,
    },
    canUpdateModel: {
      type: Boolean,
      default: true,
    },
    canHaveWriteAccessToWorkspace: {
      type: Boolean,
      default: true,
    },
    organizationConstraints: {
      type: Object,
      default: null
    }
  },
  data: (vm) => ({
    dialog: false,
    valid: false,
    items: Array.from({ length: 1000 }, (k, v) => v + 1),
  }),
  computed: {
    ...mapGetters('auth', ['isAuthenticated']),
    ...(mapState('auth', ['user'])),
    canUpdate: vm => vm.canHaveWriteAccessToWorkspace && vm.canUpdateModel,
    constraints: vm => vm.organizationConstraints || vm.user.constraint,
  },
}
</script>

<style scoped>

</style>
