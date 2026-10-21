<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-navigation-drawer rail location="right" permanent v-if="!isWindowLoadedInIframe">
    <!-- <v-btn icon flat @click="dialog = true">
      <v-icon icon="mdi-file"></v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >File info</v-tooltip>
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
    <v-btn icon flat @click="openAttributeViewer" v-if="sharedModel && (sharedModel.canViewModelAttributes || sharedModel.canUpdateModel)">
      <v-icon>mdi-view-list</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >See model attributes</v-tooltip>
    </v-btn>
    <v-btn icon flat @click="openExportModelDialog">
      <v-icon>mdi-file-export</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Export model</v-tooltip>
    </v-btn>
    <v-btn icon flat @click="openShareLinkDialog">
      <v-icon>mdi-share</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Share model</v-tooltip>
    </v-btn>
    <v-btn v-if="hasBasicRights" icon flat @click="openShareWithUserDialog">
      <v-icon>mdi-account-network</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Share With User</v-tooltip>
    </v-btn>
    <v-btn v-if="!hasBasicRights" icon color="decoration" flat>
      <v-icon>mdi-account-network</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Share With User (must be logged in and verified to use)</v-tooltip>
    </v-btn>
    <v-btn v-if="isAuthenticated" icon flat @click="openManageBookmarkDialog">
      <v-icon>mdi-bookmark</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Manage Bookmarks</v-tooltip>
    </v-btn>
    <v-btn v-if="hasBasicRights" icon flat @click="openEditPromotionDialog()">
      <v-icon>mdi-bullhorn</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Should {{selfPronoun}} promote this shared link</v-tooltip>
    </v-btn>
    <v-btn v-if="!hasBasicRights" icon flat color="decoration">
      <v-icon>mdi-bullhorn</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >promote this shared link (must be logged in and verified to user)</v-tooltip>
    </v-btn>
    <v-btn v-if="sharedModel && !sharedModel.showInPublicGallery" icon flat @click="openMessages">
      <v-icon v-if="sharedModel.messages.length">mdi-chat</v-icon>
      <v-icon v-else>mdi-chat-outline</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Open messages</v-tooltip>
    </v-btn>
    <v-btn v-if="sharedModel && sharedModel.canRunScripts && isAuthenticated && user?.constraint?.canRunScripts" icon flat @click="runScriptDrawerClicked">
      <v-icon>mdi-code-tags</v-icon>
      <v-tooltip activator="parent" location="start">Run script</v-tooltip>
    </v-btn>
    <v-btn v-else-if="sharedModel && sharedModel.canRunScripts && isAuthenticated && !user?.constraint?.canRunScripts" icon flat color="decoration">
      <v-icon>mdi-code-tags</v-icon>
      <v-tooltip activator="parent" location="start">Upgrade your plan to run scripts</v-tooltip>
    </v-btn>
    <v-btn v-else-if="sharedModel && sharedModel.canRunScripts && !isAuthenticated" icon flat color="decoration">
      <v-icon>mdi-code-tags</v-icon>
      <v-tooltip activator="parent" location="start">Run script (must be logged in)</v-tooltip>
    </v-btn>
    <v-btn v-else-if="sharedModel && !sharedModel.canRunScripts" icon flat color="decoration">
      <v-icon>mdi-code-tags</v-icon>
      <v-tooltip activator="parent" location="start">Share link does not allow running scripts</v-tooltip>
    </v-btn>
    <v-btn v-if="sharedModel && siteConfig?.desktopApp?.enabledOpenInDesktopApp" icon flat @click="openModelInDesktopAppDialog">
      <v-icon>mdi-open-in-app</v-icon>
      <v-tooltip
        activator="parent"
        location="start"
      >Open model in {{ siteConfig?.desktopApp?.name }} desktop app</v-tooltip>
    </v-btn>
  </v-navigation-drawer>
  <ModelViewer ref="modelViewer" :full-screen="isWindowLoadedInIframe" @model:loaded="modelLoaded" @object:clicked="objectClicked"/>
  <ObjectsListView v-if="!isWindowLoadedInIframe" ref="objectListView" @select-given-object="objectSelected" />
  <div class="text-center">
    <v-dialog
      v-model="dialog"
      class="w-75"
      max-width="600"
      persistent
    >
      <div>
        <v-card>
          <v-progress-linear
            :active="!error && !model"
            indeterminate
            absolute
            bottom
          ></v-progress-linear>
          <v-card-item class="text-center">
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-if="error === 'NotFound'"
            >
              <span>Oops! The share link you're looking for could not be found.</span>
            </v-alert>
            <v-alert
              variant="outlined"
              type="error"
              border="top"
              class="text-left"
              v-if="error === 'IncorrectPin'"
            >
              <span>Incorrect PIN</span>
            </v-alert>
            <template v-if="error === 'IncorrectPin' || error === 'MissingPin'">
              <span class="text-subtitle-2">Enter PIN to access model</span>
              <v-otp-input v-model="pin" type="text" @finish="fetchShareLink"></v-otp-input>
            </template>
          </v-card-item>
          <v-card-item v-if="model">
            <v-alert
              v-if="!sharedModel.canViewModel"
              variant="outlined"
              type="warning"
              border="top"
              class="text-left"
            >
              Don't have permissions to view model.
            </v-alert>
            <v-card
              v-else
              class="mx-auto"
              variant="outlined"
            >
              <v-card-item>
                <v-container>
                  <v-row>
                    <v-icon icon="mdi-file" size="x-large"></v-icon>
                      <div class="text-subtitle-2">
                        {{ model.customerFileName || sharedModel.model.file.custFileName }}
                      </div>
                  </v-row>
                  <v-row>
                    <v-progress-linear model-value="100" v-if="isModelLoaded"></v-progress-linear>
                    <v-progress-linear indeterminate v-else></v-progress-linear>
                  </v-row>
                  <v-row>
                    <div class="text-caption" v-if="uploadInProgress">File uploading...</div>
                    <div class="text-caption" v-else-if="model.isObjGenerationInProgress">Creating Mesh...</div>
                    <div class="text-caption" v-else-if="model.isObjGenerated && !isModelLoaded">Mesh generated, loading...</div>
                    <div class="text-caption" v-else-if="isModelLoaded">Loaded</div>
                  </v-row>
                </v-container>
              </v-card-item>
            </v-card>
          </v-card-item>
          <v-card-actions class="justify-center">
            <v-btn icon flat @click="dialog = false" :disabled="!isModelLoaded">
              <v-icon icon="mdi-close-circle-outline" size="x-large"></v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>
  </div>
  <AttributeViewer
    v-if="model"
    :is-active="isAttributeViewerActive"
    :attributes="model.attributes || {}"
    :is-obj-generated="model.isObjGenerated"
    :is-model-loaded="isModelLoaded"
    :can-view-model-attributes="sharedModel.canViewModelAttributes"
    :can-update-model="sharedModel.canUpdateModel"
    ref="attributeViewer"
    @update-model="updateModel"
  />
  <ExportModelDialog
    v-if="model"
    :is-active="isExportModelDialogActive"
    :shared-model="sharedModel"
    :shared-model-sub-model="model"
    :shared-model-pin="pin"
    ref="exportModelDialog"
    @update-model="updateModel"
  />
  <a :href="$route.path" v-if="isWindowLoadedInIframe" target="_blank">
    <v-sheet class="bottom-left-button d-flex flex-wrap" :height="50" :width="160" border>
      <div class="text-h6 font-weight-bold pa-2 text-white">Explore on</div>
      <v-img :src="siteConfig?.logoUrl" max-width="40" max-height="40" class="mt-1"></v-img>
    </v-sheet>
  </a>
  <ShareLinkDialog
    v-if="sharedModel"
    :is-active="isShareLinkDialogActive"
    :shared-model="sharedModel"
    ref="shareLinkDialog"
  />
  <share-with-user-dialog
    v-if="sharedModel && user"
    :curation="sharedModel.curation"
    ref="shareWithUserDialog"
    @save-share-with-user="saveShareWithUser"
  ></share-with-user-dialog>
  <v-navigation-drawer
    v-model="isDrawerOpen"
    location="right"
    width="1100"
    temporary
  >
    <SharedModelInfo v-if="drawerActiveWindow === 'modelInfo'" ref="modelInfoDrawer" :shared-model="sharedModel"/>
    <Messages v-else-if="drawerActiveWindow === 'openMessages'" ref="messagesDrawer" :shared-model="sharedModel" />
    <RunScriptPanel v-else-if="drawerActiveWindow === 'runScript'" :model="model" :viewer="viewer" :shared-model-id="sharedModel?._id"/>
  </v-navigation-drawer>
  <edit-promotion-dialog v-if="currentOrganization" ref="editPromotionDialog" collection="shared-models" :item-id="sharedModel?._id" :item-name="name"></edit-promotion-dialog>
  <ManageBookmarkDialog
    ref="manageBookmarkDialog"
    :shared-model="sharedModel"
  />
  <launch-desktop-app-dialog
    ref="launchDesktopAppDialog"
    :launching-in-progress="checkingDesktopAppIsInstalled"
    @launch-desktop-app="openModelInDesktopApp(getDesktopAppUrl(sharedModel._id))"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { models } from '@feathersjs/vuex';

import ModelViewer from "@/components/ModelViewer";
import AttributeViewer from '@/components/AttributeViewer';
import ExportModelDialog from '@/components/ExportModelDialog';
import ShareLinkDialog from '@/components/ShareLinkDialog';
import EditPromotionDialog from "@/components/EditPromotionDialog.vue";
import ObjectsListView from '@/components/ObjectsListView.vue';
import ManageBookmarkDialog from '@/components/ManageBookmarkDialog.vue';
import Messages from "@/components/Messages.vue";
import ShareWithUserDialog from "@/components/ShareWithUserDialog.vue";
import SharedModelInfo from "@/components/SharedModelInfo.vue";
import openDesktopAppMixin from '@/mixins/openDesktopAppMixin';
import LaunchDesktopAppDialog from '@/components/LaunchDesktopAppDialog.vue';
import RunScriptPanel from '@/components/RunScriptPanel.vue';

const { SharedModel, Model, OrgSecondaryReference } = models.api;

export default {
  name: 'ShareView',
  components: {
    ShareWithUserDialog,
    Messages,
    ManageBookmarkDialog,
    EditPromotionDialog,
    ShareLinkDialog,
    AttributeViewer,
    ModelViewer,
    ExportModelDialog,
    SharedModelInfo,
    ObjectsListView,
    LaunchDesktopAppDialog,
    RunScriptPanel,
  },
  mixins: [openDesktopAppMixin],
  data: () => ({
    dialog: true,
    sharedModel: null,
    model: null,
    uploadInProgress: false,
    isModelLoaded: false,
    isAttributeViewerActive: false,
    isExportModelDialogActive: false,
    isReloadingOBJ: false,
    error: '',
    isShareLinkDialogActive: false,
    isDrawerOpen: false,
    name: '',
    viewer: null,
    drawerActiveWindow: null,
    pin: null,
    sharedModelId: null,
  }),
  async created() {
    this.sharedModelId = this.$route.params.id;
    if (this.$route.query.pin) {
      this.pin = this.$route.query.pin;
    }
    await this.fetchShareLink();
  },
  computed: {
    ...mapState('auth', ['accessToken', 'user']),
    ...mapGetters('auth', ['isAuthenticated']),
    ...mapGetters('app', ['siteConfig', 'selfPronoun', 'selfName', 'currentOrganization']),
    isWindowLoadedInIframe: (vm) => vm.$route.meta.isWindowLoadedInIframe,
    hasBasicRights: (vm) => vm.isAuthenticated && vm.user?.tier !== undefined && vm.user?.tier !== 'Unverified',
    title: (vm) => `${vm.sharedModel?.title || ''} - ${vm.siteConfig?.siteTitle}`,
  },
  methods: {
    async fetchShareLink() {
      this.error = null;
      if (!this.sharedModelId) {
        return;
      }
      try {
        const extraQueryArgs = this.pin ? { pin: this.pin } : {};
        this.sharedModel = await SharedModel.get(
          this.sharedModelId,
          {
            query: {
              isActive: true,
              ...extraQueryArgs
            }
          }
        );
      } catch (error) {
        console.log(error);
        if (error.toString().includes('MissingPin')) {
          this.error = 'MissingPin';
        } else if (error.toString().includes('IncorrectPin')) {
          this.error = 'IncorrectPin';
        } else if (error.toString().includes('UserNotHaveAccess')) {
          this.error = 'NotFound';
        } else {
          this.error = 'NotFound';
        }
        return;
      }

      if (this.isAuthenticated) {
        if (
          this.sharedModel.canUpdateModel ||
          this.sharedModel.canExportFCStd ||
          this.sharedModel.canExportSTEP ||
          this.sharedModel.canExportSTL ||
          this.sharedModel.canExportOBJ
        ) {
          this.sharedModel = await this.sharedModel.patch({ data: { shouldCreateInstance: true }});
        }
        // Need to fetch model separately for reactivity for watcher
        if (this.sharedModel.versionFollowing === 'Active') {
          this.model = await Model.get(this.sharedModel.model._id, {query: { publicInfo: 'true' }})
        } else {
          this.model = await Model.get(this.sharedModel.model._id, {query: {isSharedModel: true}});
        }
      } else {
        this.model = this.sharedModel.model;
      }
      this.name = this.model.file?.custFileName || '';
      document.title = this.title;
    },
    fitModelToScreen() {
      this.$refs.modelViewer.fitModelToScreen();
    },
    openAttributeViewer() {
      this.$refs.attributeViewer.$data.dialog = true;
    },
    openExportModelDialog() {
      this.$refs.exportModelDialog.$data.dialog = true;
    },
    async updateModel() {
      this.isReloadingOBJ = true;
      this.isModelLoaded = false;
      this.model.isObjGenerated = false;
      this.model.shouldStartObjGeneration = true;

      this.sharedModel.model.isObjGenerated = this.model.isObjGenerated;
      this.sharedModel.model.shouldStartObjGeneration = this.model.shouldStartObjGeneration;
      this.sharedModel.model.attributes = this.model.attributes;

      this.sharedModel = await this.sharedModel.save();
    },
    async uploadThumbnail() {

      if (!this.isAuthenticated || this.sharedModel.thumbnailUrl) {
        return
      }
      const modelId = this.sharedModel.dummyModelId;

      try {
        this.$nextTick(async () => {
          const canvas = document.getElementsByTagName('canvas')[0];
          const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

          const fd = new FormData();
          fd.append('file', image, `${modelId}_thumbnail.PNG`);
          const uploadUrl = `${import.meta.env.VITE_APP_API_URL}upload`;

          await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: this.accessToken,
            },
            body: fd,
          });
          await this.sharedModel.patch({
            data: {
              model: {
                _id: this.sharedModel.dummyModelId,
                isThumbnailGenerated: true,
              },
              isThumbnailGenerated: true,
            }
          })
        });
      } catch (e) {
        console.error(e);
      }
    },
    openShareLinkDialog() {
      this.isShareLinkDialogActive = true;
      this.$refs.shareLinkDialog.$data.dialog = true;
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
      if (this.$refs.objectListView) {
        this.$refs.objectListView.$data.viewer= this.viewer;
      }
      setTimeout(() => this.uploadThumbnail(), 500);
    },
    objectSelected(object3d) {
      this.viewer.selectGivenObject(object3d);
    },
    async modelInfoDrawerClicked() {
      this.drawerActiveWindow = 'modelInfo'; // this causes a fresh mount which causes a data reload
      this.isDrawerOpen = !this.isDrawerOpen;
    },
    runScriptDrawerClicked() {
      this.drawerActiveWindow = 'runScript';
      this.isDrawerOpen = !this.isDrawerOpen;
    },
    async openMessages() {
      this.drawerActiveWindow = 'openMessages';
      this.isDrawerOpen = !this.isDrawerOpen;
    },
    openEditPromotionDialog() {
      this.$refs.editPromotionDialog.$data.dialog = true;
    },
    objectClicked(object3d) {
      this.$refs.objectListView.selectListItem(object3d);
    },
    async openManageBookmarkDialog() {
      await this.$refs.manageBookmarkDialog.openDialog();
    },
    async openShareWithUserDialog() {
      this.$refs.shareWithUserDialog.$data.dialog = true;
    },
    async saveShareWithUser() {
      this.$refs.shareWithUserDialog.$data.isPatchPending = true;
      const userIdSelected = this.$refs.shareWithUserDialog.$data.userIdSelected;
      const message = this.$refs.shareWithUserDialog.$data.message;
      const orgSecondaryReferencesId = this.$refs.shareWithUserDialog.$data.orgSecondaryReferencesId;
      await OrgSecondaryReference.patch(
        orgSecondaryReferencesId,
        {
          shouldAddShare: true,
          bookmark: {
            collectionName: 'shared-models',
            collectionId: this.sharedModel._id,
            description: message,
          },
          toUserId: userIdSelected,
        }
      )
      this.$refs.shareWithUserDialog.$data.isPatchPending = false;
      this.$refs.shareWithUserDialog.$data.dialog = false;
    },
    openModelInDesktopAppDialog() {
      this.$refs.launchDesktopAppDialog.openDialog();
    },
    getDesktopAppUrl(shareId) {
      return `${this.siteConfig.desktopApp.protocol}share/${shareId}`;
    },
  },
  watch: {
    async 'model.isObjGenerated'(v) {
      if (this.sharedModel.canViewModel && v) {
        if (this.isReloadingOBJ) {
          this.$refs.modelViewer.reloadOBJ(this.model.objUrl);
        } else {
          this.$refs.modelViewer.init(this.model.objUrl);
        }
      }
    }
  }
}
</script>

<style scoped>
.bottom-left-button {
  background: rgba(23, 23, 23, 0.8);
  position: fixed;
  bottom: 10px; /* Adjust this value to control the vertical position */
  /*left: 20px;   !* Adjust this value to control the horizontal position *!*/
}
</style>
