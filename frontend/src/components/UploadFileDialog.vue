<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-dialog
    v-model="dialog"
    width="auto"
    persistent
  >
    <div ref="dropzone">
      <v-card class="mx-auto" min-width="600">
        <v-card-item v-if="files.length">
          <v-card
            v-for="file in files"
            :key="file.file.__id"
            class="mx-auto mb-2"
            variant="outlined"
          >
            <v-card-item>
              <v-container>
                <v-row>
                  <v-icon icon="mdi-file" size="x-large"></v-icon>
                  <div class="text-subtitle-2">
                    {{ file.file.custFileName }}
                  </div>
                </v-row>
                <v-row>
                  <v-progress-linear indeterminate v-if="file.status.uploadInProgress"></v-progress-linear>
                  <v-progress-linear model-value="100" v-else></v-progress-linear>
                </v-row>
                <v-row>
                  <div class="text-caption" v-if="file.status.uploadInProgress">File uploading...</div>
                  <div class="text-caption" v-else-if="file.status.fileObjError">Internal Server Error</div>
                  <div class="text-caption" v-else>File successfully uploaded</div>
                </v-row>
              </v-container>
            </v-card-item>
          </v-card>
        </v-card-item>
        <div>
          <v-card-item>
            <div class="text-center">
              <div class="text-h6 mt-6">
                <v-icon icon="mdi-cloud-upload"></v-icon> Drag file to upload or <v-btn color="primary" variant="elevated" id="dropzone-click-target">BROWSE</v-btn>
              </div>
              <div class="text-caption mt-2 mb-6">Allowed extensions: .*</div>
              <div class="text-h7 mt-6">
                <strong class="text-red">{{ errorMsg }}</strong>
              </div>
            </div>
          </v-card-item>
        </div>
        <v-card-actions class="justify-center">
          <v-btn
            color="decoration"
            variant="flat"
            @click="errorMsg = ''; dialog = false"
          >
            <v-icon icon="mdi-close-circle-outline" size="x-large"></v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-dialog>
</template>

<script>
import {v4 as uuidv4} from "uuid";
import {mapState} from "vuex";
import Dropzone from "dropzone";
import { models } from '@feathersjs/vuex';

const { File, Model } = models.api;

export default {
  name: "UploadFileDialog",
  props: {
    directory: Object,
  },
  data: () => ({
    dialog: false,
    dropzone: null,
    files: [],
    errorMsg: '',
  }),
  mounted() {
  },
  methods: {
    template() {
      return `<div class="dz-preview dz-file-preview" style="display: none;">
                <div class="dz-details">
                  <div class="dz-filename"><span data-dz-name></span></div>
                  <div class="dz-size" data-dz-size></div>
                  <img data-dz-thumbnail />
                </div>
                <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
                <div class="dz-success-mark"><span>✔</span></div>
                <div class="dz-error-mark"><span>✘</span></div>
                <div class="dz-error-message"><span data-dz-errormessage></span></div>
              </div>
        `;
    },
    openFileUploadDialog() {
      this.files = [];
      this.dialog = true;
      // Use Vue.nextTick to ensure that the DOM has been updated
      this.$nextTick(() => {
        // If a Dropzone instance already exists, destroy it
        if (this.dropzone) {
          this.dropzone.destroy();
          this.dropzone = null; // Set to null to ensure a new instance is created
        }
        // Initialize Dropzone on the dropzone container
        this.dropzone = new Dropzone(this.$refs.dropzone, this.dropzoneOptions);
      });
    },
    is3dModelFileType(filename) {
      // Get the file extension from the filename
      const fileExtension = filename.split('.').pop().toLowerCase();
      // Check if the file extension matches any extension in the list
      return this.valid3dModelExtensions.some(ext => ext.toLowerCase() === fileExtension);
    }
  },
  computed: {
    ...mapState('auth', ['accessToken', 'user']),
    valid3dModelExtensions: () => ['fcstd', 'obj', 'step', 'stp', 'kicad_pcb'],
    dropzoneOptions() {
      const h = import.meta.env.VITE_APP_API_URL;
      const vm = this;

      return {
        includeStyling: false,
        url: `${h}upload`,
        paramName: 'file',
        parallelUploads: 5,
        headers: {
          Authorization: vm.accessToken,
        },
        previewTemplate: vm.template(),
        clickable: '#dropzone-click-target',
        renameFile: file => `${uuidv4()}.${file.name.split('.').pop()}`,
        init() {
          this.on("addedfile", async file => {
            const fileObj = new File({
              directory: {
                _id: vm.directory._id,
                name: vm.directory.name,
              },
              workspace: vm.directory.workspace,
              shouldCommitNewVersion: true,
              custFileName: file.name,
              version: {
                uniqueFileName: file.upload.filename,
                message: 'Initial commit',
              }
            });
            file.fileObj = fileObj;
            vm.files.push({
              file: fileObj,
              status: {
                uploadInProgress: true,
              }
            });
          });
          this.on('success', async file => {
            const index = vm.files.findIndex(f => f.file.__id === file.fileObj.__id);
            try {
              await file.fileObj.save();
              if (vm.is3dModelFileType(file.name)) {
                await Model.create({
                  fileId: file.fileObj._id,
                  createSystemGeneratedShareLink: false,
                  shouldStartObjGeneration: true,
                });
              }
              if (index > -1) {
                vm.files[index].status = {
                  uploadInProgress: false,
                };
              }
              vm.dialog = false;
            } catch (e) {
              if (e.name === 'BadRequest') {
                vm.errorMsg = e.message;
              }
              if (index > -1) {
                vm.files[index].status = {
                  uploadInProgress: false,
                  error: e
                };
              }
            }
          });
          // eslint-disable-next-line no-unused-vars
          this.on('error', (file, message) => {
            let error = message;
            if (!file.accepted) {
              error = 'InvalidFileType';
            }
            const index = vm.files.findIndex(f => f.file.__id === file.fileObj.__id);
            if (index > -1) {
              vm.files[index].status = {
                uploadInProgress: false,
                error: error
              };
            }
          })
        }
      }
    },
  },
}
</script>

<style scoped>

</style>
