<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-dialog
    v-model="dialog"
    width="auto"
  >
    <v-card width="600" max-height="800">
      <template v-slot:title>
        <div class="text-center">Export Model</div>
      </template>
      <v-progress-linear
        :active="isExportInProgress"
        indeterminate
        absolute
        bottom
      ></v-progress-linear>
      <v-card-text>
        <v-alert
          variant="outlined"
          type="warning"
          border="top"
          class="text-left"
          v-if="user && !constraints.canExportModel"
        >
          Please upgrade your plan in order to export model into all formats. In <b>Solo</b> tier, you are only allowed to download the original model file.
        </v-alert>
        <v-alert
          variant="outlined"
          type="warning"
          border="top"
          class="text-left"
          v-if="!isAuthenticated"
        >
          <span v-if="sharedModel && sharedModel.canDownloadDefaultModel">You can only export original model without Login.</span>
          <span v-else>Need to Login to export model.</span>
        </v-alert>
        <br>
        <v-select
          ref="inputFormatField"
          v-model="format"
          :items="formats"
          :disabled="isExportInProgress"
          required
          density="comfortable"
          label="Select file format"
        ></v-select>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          color="cancel"
          variant="elevated"
          @click="dialog = false; isExportInProgress = false"
        >Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="runExportCmd"
          :disabled="!format || isExportInProgress || (!isAuthenticated && !(format === exportDefaultModelLabel())) || (user && !constraints.canExportModel && !(format === exportDefaultModelLabel()))"
        >Download</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from 'axios';
import { models } from '@feathersjs/vuex';
import { mapState, mapGetters } from 'vuex';

const { Model, SharedModel } = models.api;

const uploadEndpoint = `${import.meta.env.VITE_APP_API_URL}upload`

export default {
  name: 'ExportModelDialog',
  emits: ['exportModel'],
  props: {
    isActive: Boolean,
    model: Object,
    sharedModel: Object,
    sharedModelSubModel: Object,  // refs: sharedModel.model
    sharedModelPin: String,  // the PIN entered for a PIN-protected share, needed for anonymous download
    organizationConstraints: {
      type: Object,
      default: null
    }
  },
  data: () => ({
    dialog: false,
    valid: false,
    format: null,
    isExportInProgress: false,
  }),
  computed: {
    ...mapState('auth', ['accessToken', 'user']),
    ...mapGetters('auth', ['isAuthenticated']),
    constraints: vm => vm.organizationConstraints || vm.user.constraint,
    mainModel: (vm) => {
      if (vm.sharedModel) {
        return vm.sharedModelSubModel;
      }
      return vm.model;
    },
    formats: (vm) => {
      if (vm.model) {
        if (vm.model.haveWriteAccess) {
          return [vm.exportDefaultModelLabel(), 'FCStd', 'STEP', 'STL', 'OBJ'];
        }
        return [vm.exportDefaultModelLabel()];
      }
      const outputFormats = []
      if (vm.sharedModel) {
        if (vm.sharedModel.canDownloadDefaultModel) {
          outputFormats.push(vm.exportDefaultModelLabel());
        }
        if (vm.sharedModel.canExportFCStd) {
          outputFormats.push('FCStd');
        }
        if (vm.sharedModel.canExportSTEP) {
          outputFormats.push('STEP');
        }
        if (vm.sharedModel.canExportSTL) {
          outputFormats.push('STL');
        }
        if (vm.sharedModel.canExportOBJ) {
          outputFormats.push('OBJ');
        }
      }
      return outputFormats;
    },

  },
  methods: {
    exportDefaultModelLabel() {
      const model = this.model || this.sharedModel.model;
      return `Original file (${model.file.custFileName})`;
    },
    async runExportCmd() {
      if (!this.format) {
        return
      }
      this.isExportInProgress = true;
      if (this.format === this.exportDefaultModelLabel()) {
        await this.downloadFile(this.model || this.sharedModel.model);
        return;
      }
      const data = {
        shouldStartFCStdExport: this.format === 'FCStd',
        shouldStartSTEPExport: this.format === 'STEP',
        shouldStartSTLExport: this.format === 'STL',
        shouldStartOBJExport: this.format === 'OBJ',
      };
      if (this.model) {
        await this.model.patch({data: data});
      }
      if (this.sharedModel) {
        await this.sharedModel.patch({'data': {'model': data}})

        if (!this.accessToken) {
          let callCounts = 0;
          const intervalId = setInterval(
            async () => {
              const sharedModel = await SharedModel.get(this.sharedModel._id);
              if (this.format === 'FCStd' && sharedModel.model.isExportFCStdGenerated) {
                clearInterval(intervalId);
              } else if (this.format === 'STEP' && sharedModel.model.isExportSTEPGenerated) {
                clearInterval(intervalId);
              } else if (this.format === 'STL' && sharedModel.model.isExportSTLGenerated) {
                clearInterval(intervalId);
              } else if (this.format === 'OBJ' && sharedModel.model.isExportOBJGenerated) {
                clearInterval(intervalId);
              }
              callCounts += 1;
              if (callCounts >= 2) {
                clearInterval(intervalId);
              }
            }, 3000
          )
        }
      }
    },
    async downloadFile(model) {

      let fileEndpoint;
      let fileName;
      const custFileName = model.custFileName || model.file.custFileName;
      if (this.format === this.exportDefaultModelLabel()) {
        fileEndpoint = `${uploadEndpoint}/${model.uniqueFileName}`;
        fileName = custFileName;
      } else {
        fileEndpoint = `${uploadEndpoint}/${model._id}_export.${this.format}`;
        fileName = `${custFileName.replace(/\.[^/.]+$/, '')}-export.${this.format}`;
      }

      await axios(
        {
          method: 'GET',
          url: fileEndpoint,
          params: this.sharedModel ? {
            modelId: model._id.toString(),
            ...(this.sharedModelPin && { pin: this.sharedModelPin }),
          } : {},
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      ).then(async (res) => {
        await axios(
          {
            url: res.data.url,
            method: 'GET',
            responseType: 'blob',
          }).then((res) => {
          const file = window.URL.createObjectURL(new Blob([res.data]));
          const docUrl = document.createElement('a');
          docUrl.href = file;
          docUrl.setAttribute('download', fileName);
          document.body.appendChild(docUrl);
          docUrl.click();
          this.isExportInProgress = false;
          this.dialog = false;
        });
      });
    },
  },
  watch: {

    async 'mainModel.isExportSTLGenerated'(v) {
      if (v) {
        await this.downloadFile(this.mainModel);
      }
    },

    async 'mainModel.isExportFCStdGenerated'(v) {
      if (v) {
        await this.downloadFile(this.mainModel);
      }
    },

    async 'mainModel.isExportSTEPGenerated'(v) {
      if (v) {
        await this.downloadFile(this.mainModel);
      }
    },

    async 'mainModel.isExportOBJGenerated'(v) {
      if (v) {
        await this.downloadFile(this.mainModel);
      }
    },
  }
}
</script>

<style scoped>

</style>
