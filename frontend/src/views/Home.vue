<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-navigation-drawer rail location="right" permanent>
    <!-- <v-btn icon flat @click="dialog = true">
      <v-icon icon="mdi-file"></v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Open a file</v-tooltip>
    </v-btn> -->
    <v-btn icon flat @click="modelInfoDrawerClicked">
      <v-icon>mdi-information-outline</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Get Info</v-tooltip>
    </v-btn>
    <v-btn icon flat @click="fitModelToScreen">
      <v-icon>mdi-crop-free</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Fit all or selection</v-tooltip>
    </v-btn>
    <v-btn icon flat @click="openAttributeViewer">
      <v-icon>mdi-view-list</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >See model attributes</v-tooltip>
    </v-btn>
    <v-btn icon flat :disabled="model && !model.haveWriteAccess" @click="sharedModelDrawerClicked">
      <v-icon>mdi-share-variant</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Manage share links</v-tooltip>
    </v-btn>
    <v-btn icon flat :disabled="!user" @click="openExportModelDialog">
      <v-icon>mdi-file-export</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Export model</v-tooltip>
    </v-btn>
    <v-btn icon flat :disabled="!user" @click="uploadThumbnail(true)">
      <v-icon>mdi-camera</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Click new thumbnail</v-tooltip>
    </v-btn>
    <span>
      <v-btn icon flat :disabled="(model && !model.haveWriteAccess) || !organization?.constraint?.canRunScripts" @click="runScriptDrawerClicked">
        <v-icon>mdi-code-tags</v-icon>
      </v-btn>
      <v-tooltip activator="parent" location="start">
        {{ !organization?.constraint?.canRunScripts ? 'Upgrade your plan to run scripts' : 'Run script' }}
      </v-tooltip>
    </span>
    <!-- <v-btn v-if="model && siteConfig?.desktopApp?.enabledOpenInDesktopApp" icon flat @click="openModelInDesktopAppDialog">
      <v-icon>mdi-open-in-app</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Open model in {{ siteConfig?.desktopApp?.name }} desktop app</v-tooltip>
    </v-btn> -->
  </v-navigation-drawer>
  <ModelViewer ref="modelViewer" @model:loaded="modelLoaded" @object:clicked="objectClicked"/>
  <ObjectsListView ref="objectListView" :model="model" @select-given-object="objectSelected" />
  <div class="text-center">
    <v-dialog
      v-model="dialog"
      width="auto"
      persistent
    >
      <div ref="dropzone">
        <v-card class="mx-auto" min-width="600">
          <v-card-item>
            <v-alert
              variant="outlined"
              type="info"
              border="top"
              class="text-left"
              v-if="showErrorMsg"
            >
              <span class="text-body-1 font-weight-bold">{{ errorDetail.code }} - {{ errorDetail.label }}</span><br>
              <span v-html="errorDetail.desc" /><br>
              <span>
                <v-btn
                  class="ma-0 pa-0 text-capitalize"
                  color="link"
                  variant="plain"
                  append-icon="mdi-open-in-new"
                  style="text-decoration: none;"
                  :to="{ name: 'WorkerErrorCodes' }"
                >
                  Click to see for more detail
                </v-btn>
              </span>
            </v-alert>
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-if="error === 'NotFound'"
            >
              <span>Oops! The model you're looking for could not be found.</span>
            </v-alert>
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-else-if="error === 'InvalidFileType'"
            >
              <span>Only *.FCStd, *.STEP/STP, *.OBJ and *.kicad_pcb files accepted.</span>
            </v-alert>
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-else-if="error === 'UpgradeTier'"
            >
              <span>Please upgrade your tier.</span>
            </v-alert>
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-else-if="error === 'ConflictingFilename'"
            >
              <span>This filename conflicts with a file you have already uploaded.</span>
            </v-alert>
          </v-card-item>
          <v-card-item v-if="model">
            <v-card
              class="mx-auto"
              variant="outlined"
            >
              <v-card-item>
                <v-container>
                  <v-row>
                    <v-icon icon="mdi-file" size="x-large"></v-icon>
                      <div class="text-subtitle-2">
                        {{ model.customerFileName }}
                        <v-btn
                          v-if="model.errorMsg"
                          class="mx-2"
                          append-icon="mdi-cached"
                          size="small"
                          color="secondary"
                          @click="recomputeModel"
                        >
                          Recompute
                        </v-btn>
                      </div>
                  </v-row>
                  <v-row>
                    <v-progress-linear model-value="100" v-if="isModelLoaded || model.latestLogErrorIdForObjGenerationCommand || error || model.errorMsg"></v-progress-linear>
                    <v-progress-linear indeterminate v-else></v-progress-linear>
                  </v-row>
                  <v-row>
                    <div class="text-caption" v-if="uploadInProgress">File uploading...</div>
                    <div class="text-caption" v-else-if="model.isObjGenerationInProgress && !model.latestLogErrorIdForObjGenerationCommand">Creating Mesh...</div>
                    <div class="text-caption" v-else-if="model.isObjGenerated && !isModelLoaded">Mesh generated, loading...</div>
                    <div class="text-caption" v-else-if="isModelLoaded || model.latestLogErrorIdForObjGenerationCommand">Loaded</div>
                  </v-row>
                </v-container>
              </v-card-item>
            </v-card>
          </v-card-item>
          <div>
            <v-card-item>
              <div class="text-center">
                <div class="text-h6 mt-6">
                  <v-icon icon="mdi-cloud-upload"></v-icon> Drag file to upload or <v-btn id="dropzone-click-target">BROWSE</v-btn>
                </div>
                <div class="text-caption mt-2 mb-6">Allowed extensions: FCSTD, STEP, STP, OBJ</div>
                <div class="d-flex justify-center">
                  <div>
                    <v-checkbox
                      v-model="generatePublicLink"
                      :disabled="user && !user.constraint.canDisableAutomaticGenerationOfPublicLink"
                      label="Generate public link automatically"
                      density="compact"
                      hide-details>
                    </v-checkbox>
                  </div>
                </div>
              </div>
            </v-card-item>
          </div>
          <v-card-actions class="justify-center">
            <v-btn v-if="model && !error && !showErrorMsg" icon flat @click="dialog = false">
              <v-icon icon="mdi-close-circle-outline" size="x-large"></v-icon>
            </v-btn>
            <v-btn v-else icon flat :to="{ name: 'LensHome' }">
              <v-icon icon="mdi-arrow-left" size="x-large"></v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>
    <AttributeViewer
      v-if="model && organization"
      :is-active="isAttributeViewerActive"
      :attributes="model.attributes || {}"
      :is-obj-generated="model.isObjGenerated"
      :is-model-loaded="isModelLoaded"
      :can-have-write-access-to-workspace="canHaveWriteAccess"
      :organization-constraints="organization.constraint"
      :can-update-model="model.haveWriteAccess"
      ref="attributeViewer"
      @update-model="updateModel"
    />
    <ExportModelDialog
      v-if="model && organization"
      :is-active="isExportModelDialogActive"
      :model="model"
      :organization-constraints="organization.constraint"
      ref="exportModelDialog"
    />
    <v-navigation-drawer
      v-model="isDrawerOpen"
      location="right"
      :width="drawerActiveWindow === 'runScript' ? runScriptDrawerWidth : 1100"
      temporary
    >
      <div
        v-if="drawerActiveWindow === 'runScript'"
        class="drawer-resize-handle"
        @mousedown="startDrawerResize"
      ></div>
      <MangeSharedModels v-if="drawerActiveWindow === 'sharedModel'" :model="model"/>
      <ModelInfo ref="modelInfoDrawer" v-else-if="drawerActiveWindow === 'modelInfo'" :model="model"/>
      <RunScriptPanel v-else-if="drawerActiveWindow === 'runScript'" :model="model" :viewer="viewer"/>
    </v-navigation-drawer>
  </div>
  <launch-desktop-app-dialog
    ref="launchDesktopAppDialog"
    :launching-in-progress="checkingDesktopAppIsInstalled"
    @launch-desktop-app="openModelInDesktopApp(getDesktopAppUrl(model))"
  />
</template>

<script>
import Dropzone from "dropzone";
import { v4 as uuidv4 } from 'uuid';
import {mapGetters, mapState} from 'vuex';
import { models } from '@feathersjs/vuex';

import ModelViewer from '@/components/ModelViewer';
import AttributeViewer from '@/components/AttributeViewer';
import ExportModelDialog from '@/components/ExportModelDialog';
import MangeSharedModels from '@/components/MangeSharedModels';
import ModelInfo from '@/components/ModelInfo.vue';
import ObjectsListView from '@/components/ObjectsListView.vue';
import openDesktopAppMixin from '@/mixins/openDesktopAppMixin';
import LaunchDesktopAppDialog from '@/components/LaunchDesktopAppDialog.vue';
import RunScriptPanel from '@/components/RunScriptPanel.vue';

const { Model, SharedModel, Workspace, Organization } = models.api;

export default {
  name: 'HomeView',
  components: {
    AttributeViewer,
    MangeSharedModels,
    ModelViewer,
    ExportModelDialog,
    ModelInfo,
    ObjectsListView,
    LaunchDesktopAppDialog,
    RunScriptPanel,
  },
  mixins: [openDesktopAppMixin],
  data: () => ({
    dialog: true,
    model: null,
    uploadInProgress: false,
    isModelLoaded: false,
    isAttributeViewerActive: false,
    isShareModelDialogActive: false,
    isExportModelDialogActive: false,
    isReloadingOBJ: false,
    error: '',
    manageSharedModelsDrawer: false,
    isDrawerOpen: false,
    drawerActiveWindow: null,
    runScriptDrawerWidth: 650,
    generatePublicLinkValue: null,
    viewer: null,
  }),
  mounted() {
    new Dropzone(this.$refs.dropzone, this.dropzoneOptions);
  },
  async created() {
    const modelId = this.$route.params.id;
    if (modelId) {
      try {
        this.model = await Model.get(modelId, {query: {'isSharedModel': false}});
        let query = {};
        if (!this.user || this.model && !this.model.haveWriteAccess) {
          query = { publicInfo: 'true' };
        }
        await Workspace.get(this.model.file.workspace._id, { query: query });
        await Organization.get(this.workspace.organizationId, { query: query });
      } catch (error) {
        this.error = 'NotFound';
      }
      if (this.model && !this.model.errorMsg && !this.model.objUrl && !this.model.isThumbnailGenerated) {
        await this.model.patch({
          data: {
            shouldStartObjGeneration: true,
            uniqueFileName: this.model.uniqueFileName,
          }
        })
      }
    }
  },
  computed: {
    ...mapState('auth', ['accessToken', 'user']),
    ...mapGetters('auth', ['isAuthenticated']),
    ...mapGetters('app', ['siteConfig']),
    canHaveWriteAccess: vm => vm.workspace ? vm.workspace.haveWriteAccess : false,
    workspace: vm => vm.model && vm.model.file && Workspace.getFromStore(vm.model.file.workspace._id),
    organization: vm => vm.workspace && Organization.getFromStore(vm.workspace.organizationId),
    dropzoneOptions() {
      const h = import.meta.env.VITE_APP_API_URL;
      const vm = this;

      return {
        includeStyling: false,
        url: `${h}upload`,
        paramName: 'file',
        parallelUploads: 1,
        headers: {
          Authorization: vm.accessToken,
        },
        previewTemplate: vm.template(),
        acceptedFiles: '.OBJ,.FCSTD,.STEP,.STP,.kicad_pcb',
        clickable: '#dropzone-click-target',
        renameFile: file => `${uuidv4()}.${file.name.split('.').pop()}`,
        init() {
          this.on("addedfile", file => {
            vm.uploadInProgress = true;
            vm.model = new Model({
              uniqueFileName: file.upload.filename,
              custFileName: file.name,
              createSystemGeneratedShareLink: vm.generatePublicLink,
            })
            file.model = vm.model;
          });
          this.on('success', async file => {
            try {
              await file.model.save();
              vm.$router.replace(`/model/${vm.model._id}`);
              await vm.model.patch({
                id: vm.model._id,
                data: {
                  shouldStartObjGeneration: true,
                  uniqueFileName: vm.uniqueFileName,
                }
              })
              await Workspace.get(vm.model.file.workspace._id);
              await Organization.get(vm.workspace.organizationId);
              vm.uploadInProgress = false;
            } catch (e) {
              vm.error = 'UpgradeTier';
              if (e.name === 'BadRequest') {
                if (e.message.startsWith('filename')) {
                  vm.error = 'ConflictingFilename';
                }
              }
            }
          });
          // eslint-disable-next-line no-unused-vars
          this.on('error', (file, message) => {
            if (!file.accepted) {
              vm.error = 'InvalidFileType';
            }
          })
        }
      }
    },
    generatePublicLink: {
      get() {
        if (this.generatePublicLinkValue == null) {
          if (this.user) {
            return this.user.constraint.defaultValueOfPublicLinkGeneration;
          }
        }
        return this.generatePublicLinkValue;
      },
      set(val) {
        if (this.user && this.user.constraint.canDisableAutomaticGenerationOfPublicLink){
          this.generatePublicLinkValue = val;
        }
      }
    },
    showErrorMsg: vm => vm.model && vm.model.errorMsg,
    errorDetail: vm => {
      if (vm.showErrorMsg) {
        if (vm.model.errorMsg.code === 101) {
          return {
            code: vm.model.errorMsg.code,
            label: 'Missing linked models',
            desc: `Not able to find <span class="font-weight-medium font-italic">${vm.model.errorMsg.detail.filesNotAvailable.join(', ')}</span>`,
          }
        } else if (vm.model.errorMsg.code === 102) {
          return {
            code: vm.model.errorMsg.code,
            label: 'Tier upgrade required',
            desc: 'The rendering of linked documents requires a <span class="font-weight-medium font-italic">Peer</span> tier subscription.',
          }
        } else if (vm.model.errorMsg.code === 999) {
          return {
            code: vm.model.errorMsg.code,
            label: 'Internal server error',
            desc: 'Not able to process model, please contact the support team',
          }
        } else {
          return {
            code: -1,
            label: 'Undefined Error code',
            desc: '',
          }
        }
      }
    },
  },
  methods: {
    fitModelToScreen() {
      this.$refs.modelViewer.fitModelToScreen();
    },
    openAttributeViewer() {
      this.$refs.attributeViewer.$data.dialog = true;
    },
    openExportModelDialog() {
      this.$refs.exportModelDialog.$data.dialog = true;
    },
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
    async updateModel() {
      this.isReloadingOBJ = true;
      this.model.isObjGenerated = false;
      this.isModelLoaded = false;
      this.model.shouldStartObjGeneration = true;
      this.model = await this.model.save();
    },
    uploadThumbnail(force=false) {

      if (!force && (!this.isAuthenticated || this.model.isThumbnailGenerated)) {
        return
      }

      try {
        this.$nextTick(async () => {
          const canvas = document.getElementsByTagName('canvas')[0];
          const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

          const fd = new FormData();
          fd.append('file', image, `${this.model._id}_thumbnail.PNG`);
          const uploadUrl = `${import.meta.env.VITE_APP_API_URL}upload`;

          await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: this.accessToken,
            },
            body: fd,
          });
          await this.model.patch({data: {isThumbnailGenerated: true}});
        });
      } catch (e) {
        console.error(e);
      }
    },
    async sharedModelDrawerClicked() {
      if (this.drawerActiveWindow === 'sharedModel') {
        this.isDrawerOpen = !this.isDrawerOpen;
      } else {
        this.isDrawerOpen = true;
      }
      this.drawerActiveWindow = 'sharedModel';
      await SharedModel.find({
        query: {
          cloneModelId: this.model._id,
          $paginate: false
        },
      })
    },
    async modelInfoDrawerClicked() {
      if (this.drawerActiveWindow === 'modelInfo') {
        this.isDrawerOpen = !this.isDrawerOpen;
      } else {
        this.drawerActiveWindow = 'modelInfo'; // this will cause a fresh mount which invokes a data reload
        this.isDrawerOpen = true;
      }
    },
    runScriptDrawerClicked() {
      if (this.drawerActiveWindow === 'runScript') {
        this.isDrawerOpen = !this.isDrawerOpen;
      } else {
        this.drawerActiveWindow = 'runScript';
        this.isDrawerOpen = true;
      }
    },
    startDrawerResize(e) {
      const startX = e.clientX;
      const startWidth = this.runScriptDrawerWidth;
      document.body.style.userSelect = 'none';
      const onMove = (ev) => {
        const delta = startX - ev.clientX;
        this.runScriptDrawerWidth = Math.min(1200, Math.max(320, startWidth + delta));
      };
      const onUp = () => {
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    modelLoaded(viewer) {
      if (this.isReloadingOBJ) {
        this.$refs.attributeViewer.$data.dialog = false;
        this.isReloadingOBJ = false;
      } else {
        this.dialog = false;
      }
      this.isModelLoaded = true;
      this.viewer = viewer;
      setTimeout(() => this.uploadThumbnail(), 500);
      this.$refs.objectListView.$data.viewer = this.viewer;
    },
    objectClicked(object3d) {
      this.$refs.objectListView.selectListItem(object3d);
    },
    objectSelected(object3d) {
      this.viewer.selectGivenObject(object3d);
    },
    recomputeModel() {
      if (this.model) {
        this.model.patch({
          data: {
            latestLogErrorIdForObjGenerationCommand: null,
            errorMsg: null,
            shouldStartObjGeneration: true,
            uniqueFileName: this.model.uniqueFileName,
          }
        })
      }
    },
    getDesktopAppUrl(model) {
      return `${this.siteConfig.desktopApp.protocol}file/${model.file._id}/version/${model.file.currentVersionId}`;
    },
    openModelInDesktopAppDialog() {
      this.$refs.launchDesktopAppDialog.openDialog();
    }
  },
  watch: {
    'model.isObjGenerated'(v) {
      if (v && !this.model.isObjGenerationInProgress) {
        if (this.isReloadingOBJ) {
          this.$refs.modelViewer.reloadOBJ(this.model.objUrl);
        } else {
          this.$refs.modelViewer.init(this.model.objUrl);
        }
      }
    },
  }
}
</script>

<style scoped>
.drawer-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 10;
  user-select: none;
}
.drawer-resize-handle::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  transition: background 0.15s;
}
.drawer-resize-handle:hover::after {
  background: rgba(var(--v-theme-primary), 0.4);
}
</style>
