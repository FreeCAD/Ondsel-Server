<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-alert
    v-if="groups.length && !dismissed"
    type="warning"
    variant="tonal"
    density="compact"
    closable
    class="model-warnings"
    @click:close="dismissed = true"
  >
    <div v-if="groups.length === 1" class="text-body-2 cursor-help">
      {{ heading }}: {{ groups[0].sentence }}.
      <v-tooltip activator="parent" location="bottom">
        <div v-for="entry in groups[0].entries" :key="entry.path">{{ entry.refs.join(', ') }}: {{ entry.path }}</div>
      </v-tooltip>
    </div>
    <template v-else>
      <div class="text-body-2">{{ heading }}:</div>
      <div v-for="group in groups" :key="group.key" class="text-body-2 cursor-help">
        {{ group.count }} {{ group.line }}
        <v-tooltip activator="parent" location="bottom">
          <div v-for="entry in group.entries" :key="entry.path">{{ entry.refs.join(', ') }}: {{ entry.path }}</div>
        </v-tooltip>
      </div>
    </template>
    <v-btn
      v-if="canRecompute"
      class="mt-2"
      append-icon="mdi-cached"
      size="small"
      variant="tonal"
      :loading="recomputing"
      @click="$emit('recompute')"
    >
      Recompute
    </v-btn>
  </v-alert>
</template>

<script>
export default {
  name: 'ModelWarnings',
  emits: ['recompute'],
  props: {
    warnings: {
      type: Object,
      required: false,
    },
    canRecompute: {
      type: Boolean,
      default: false,
    },
    recomputing: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    dismissed: false,
  }),
  computed: {
    missingModels: vm => vm.warnings?.missingModels || [],
    missingCount: vm => vm.missingModels.reduce((count, entry) => count + entry.refs.length, 0),
    heading: vm => `${vm.missingCount} ${vm.missingCount === 1 ? 'component has' : 'components have'} no 3D model`,
    groups() {
      const groups = {};
      for (const entry of this.missingModels) {
        const key = `${entry.reason}:${entry.library || ''}`;
        if (!groups[key]) {
          groups[key] = { key, reason: entry.reason, library: entry.library, entries: [], count: 0 };
        }
        groups[key].entries.push(entry);
        groups[key].count += entry.refs.length;
      }
      return Object.values(groups).map(group => ({ ...group, ...this.describe(group) }));
    },
  },
  watch: {
    warnings() {
      this.dismissed = false;
    },
  },
  methods: {
    describe(group) {
      // sentence: completes "<n> components have no 3D model: ..."; line: follows a count
      switch (group.reason) {
        case 'LIBRARY_NOT_CONFIGURED':
          return {
            sentence: `their models are in library ${group.library}, which is not configured`,
            line: `in library ${group.library}, which is not configured`,
          };
        case 'PROJECT_FILE_NOT_UPLOADED':
          return {
            sentence: 'their models are in the project folder, which was not uploaded',
            line: 'in the project folder, which was not uploaded',
          };
        case 'NO_STEP_MODEL':
          return {
            sentence: 'only a WRL model is available, which cannot be loaded',
            line: 'with only a WRL model, which cannot be loaded',
          };
        default:
          return group.library
            ? { sentence: `their model files are missing from library ${group.library}`, line: `missing from library ${group.library}` }
            : { sentence: 'their model files were not found', line: 'with model files that were not found' };
      }
    },
  },
};
</script>

<style scoped>
.model-warnings {
  position: absolute;
  top: 16px;
  right: 80px;
  max-width: 35%;
  z-index: 1;
}
.cursor-help {
  cursor: help;
}
</style>
