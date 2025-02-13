<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-sheet class="border-md flex-grow-1">
    <v-sheet class="d-flex flex-row flex-wrap justify-space-between" name="flv-top-row">
      <v-sheet class="d-flex flex-wrap flex-row">
        <v-sheet
          v-for="dir in fullPath"
          :key="dir._id"
        >
          <v-btn
            @click="gotoDirectory(dir)"
          >{{dir.name}}</v-btn>
        </v-sheet>
      </v-sheet>
      <v-sheet>
        <v-btn
          :color="iconViewMode ? '#757575' : '#F5F5F5'"
          @click="iconViewMode = true"
        >
          <v-icon>mdi-view-grid</v-icon>
        </v-btn>
        <v-btn
          :color="!iconViewMode ? '#757575' : '#F5F5F5'"
          @click="iconViewMode = false"
        >
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </v-sheet>
      <v-menu v-if="canUserWrite">
        <template v-slot:activator="{ props }">
          <v-btn
            color="decoration"
            flat
            icon="mdi-plus"
            v-bind="props"
          ></v-btn>
        </template>
        <v-list>
          <v-list-item @click="openCreateDirectoryDialog()">
            <v-list-item-title><v-icon icon="mdi-plus" class="mx-2"></v-icon> Add New Subdirectory</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$refs.uploadFileDialog.openFileUploadDialog();">
            <v-list-item-title><v-icon icon="mdi-plus" class="mx-2"></v-icon> Add New File</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn
        v-else
        color="decoration"
        flat
        icon="mdi-plus"
        disabled
      ></v-btn>
    </v-sheet>

    <v-sheet class="d-flex flex-wrap flex-row" v-if="iconViewMode" name="icon-view-middle">
      <v-sheet
        v-for="dir in dirList"
        :key="dir._id"
        class="ma-1 border-sm"
        width="8em"
        @click="gotoDirectory(dir)"
      >
        <v-sheet
          color="BDBDBD"
          height="8em"
          class="d-flex justify-center align-center"
        >
          <v-icon
            icon="mdi-folder"
            style="color: #8D8D8D"
            cover
          />
        </v-sheet>
        <v-sheet width="8em" class="d-flex justify-center text-body-2 text-center">
          {{ dir.name }}
          <v-menu v-if="canUserWrite">
            <template v-slot:activator="{ props }">
              <v-btn
                color="decoration"
                flat
                icon="mdi-dots-vertical"
                v-bind="props"
                size="x-small"
                class="ml-1"
              ></v-btn>
            </template>
            <v-list>
              <v-list-item @click="openDeleteDirectoryDialog(dir)">
                <v-list-item-title><v-icon icon="mdi-delete" class="mx-2"></v-icon> Delete This Directory</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-sheet>
      </v-sheet>
      <v-sheet
        v-for="file in fileList"
        :key="file._id"
        class="ma-1 border-sm"
        width="8em"
        @click="gotoFile(file)"
      >
        <v-img
          v-if="file.thumbnailUrlCache"
          height="8em"
          :src="file.thumbnailUrlCache"
          cover
        ></v-img>
        <v-sheet
          v-else
          color="#F4F4F4"
          height="8em"
          class="d-flex justify-center align-center"
        >
          <v-icon icon="mdi-file" style="color: #8D8D8D" cover />
        </v-sheet>
        <v-sheet width="8em" class="d-flex justify-center text-body-2 text-center">
          {{ wrapify(file.custFileName) }}
        </v-sheet>
      </v-sheet>
    </v-sheet>

    <v-sheet class="d-flex flex-column" v-if="!iconViewMode" name="list-view-middle" >
      <v-card
        v-for="dir in dirList"
        :key="dir._id"
        class="ma-1"
        @click="gotoDirectory(dir)"
      >
        <v-card-text>
          <v-icon icon="mdi-folder"></v-icon> <code>{{ dir.name }}</code>
          <v-menu v-if="canUserWrite">
            <template v-slot:activator="{ props }">
              <v-btn
                color="decoration"
                flat
                icon="mdi-dots-vertical"
                v-bind="props"
                size="x-small"
                class="ml-1"
              ></v-btn>
            </template>
            <v-list>
              <v-list-item @click="openDeleteDirectoryDialog(dir)">
                <v-list-item-title><v-icon icon="mdi-delete" class="mx-2"></v-icon> Delete This Directory</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-card-text>
      </v-card>
      <v-card
        v-for="file in fileList"
        :key="file._id"
        class="ma-1"
        @click="gotoFile(file)"
      >
        <v-card-text>
          <v-icon icon="mdi-file"></v-icon> <code>{{ file.custFileName }}</code>
        </v-card-text>
      </v-card>
    </v-sheet>

    <div v-if="fileList.length===0 && dirList.length===0" class="text-body-2 text-center" style="text-align: center; justify-content: center">
      This directory is empty
    </div>
    <div v-if="fileList.length===0 && dirList.length>0" class="text-body-2 text-center" style="text-align: center; justify-content: center">
      There are no files in this directory
    </div>
  </v-sheet>
  <upload-file-dialog v-if="!publicView" ref="uploadFileDialog" :directory="directory" />
  <create-directory-dialog ref="createDirectoryDialog" @create-directory="emitCreateDirectory" :parent-dir="directory"></create-directory-dialog>
  <delete-directory-dialog ref="deleteDirectoryDialog" @delete-directory="deleteDirectory" :directory-name="targetDirectory.name"></delete-directory-dialog>
</template>

<script>
import {mapActions} from "vuex";
import CreateDirectoryDialog from "@/components/CreateDirectoryDialog.vue";
import DeleteDirectoryDialog from "@/components/DeleteDirectoryDialog.vue";
import {models} from "@feathersjs/vuex";
import UploadFileDialog from "@/components/UploadFileDialog.vue";

const { Directory } = models.api;

export default {
  name: 'FileListView',
  components: {UploadFileDialog, DeleteDirectoryDialog, CreateDirectoryDialog},
  emits: ['selectedDirectory', 'createDirectory'],
  props: {
    directory: Object,
    path: String,
    parentDirectoryPath: String,
    activeDirectory: Object,
    publicView: Boolean,
    canUserWrite: Boolean,
    fullPath: Array,
  },
  data: () => ({
    iconViewMode: true,
    targetDirectory: {},
  }),
  computed: {
    fileList: vm => vm.directory.files || [],
    dirList: vm => vm.directory.directories || [],
    userRouteFlag: vm => vm.$route.path.startsWith("/user"),
  },
  methods: {
    ...mapActions('app', [
    ]),
    async openCreateDirectoryDialog() {
      this.$refs.createDirectoryDialog.$data.dialog = true;
    },
    async openDeleteDirectoryDialog(newTargetDir) {
      this.targetDirectory = newTargetDir;
      this.$refs.deleteDirectoryDialog.$data.dialog = true;
    },
    async emitCreateDirectory(dirName, parentDir) {
      // pass this up to the parent unmodified
      this.$emit('createDirectory', dirName, parentDir);
      this.$refs.createDirectoryDialog.$data.dialog = false;
    },
    async deleteDirectory() {
      await Directory.remove(
        this.targetDirectory._id
      ).then(() => {
        this.$refs.deleteDirectoryDialog.$data.dialog = false;
      }).catch((e) => {
        this.$refs.deleteDirectoryDialog.$data.snackerMsg = e.message;
        this.$refs.deleteDirectoryDialog.$data.showSnacker = true;
      });
    },
    async gotoFile(fileSummary) {
      const slug = this.$route.params.slug;
      const wsName = this.$route.params.wsname;
      const fileId = fileSummary._id.toString();
      if (this.userRouteFlag) {
        this.$router.push({ name: 'UserWorkspaceFile', params: { slug: slug, wsname: wsName, fileid: fileId } });
      } else {
        this.$router.push({ name: 'OrgWorkspaceFile', params: { slug: slug, wsname: wsName, fileid: fileId } });
      }
    },
    wrapify(text) {
      // insert generic text-wrap (ZERO-WIDTH-SPACE) 200B unicode to help with wrapping long filenames
      let newText = "";
      let prevRune = null;
      let prevLowerCaseLetter = false;
      for (const rune of Array.from(text)) {
        if (rune === "_") {
          newText += rune;
          newText += '\u{200B}';
        } else if (prevLowerCaseLetter && /^[A-Z]*$/.test(rune)) {
          // lowercase to uppercase transition just as aA
          newText += '\u{200B}';
          newText += rune;
        } else if (['.', ','].includes(rune)) { // html already wraps on dashes and hyphens
          newText += '\u{200B}';
          newText += rune;
        } else {
          newText += rune;
        }
        prevRune = rune;
        prevLowerCaseLetter = /^[a-z]*$/.test(prevRune);
      }
      return newText;
    },
    async gotoDirectory(dirSummary) {
      const slug = this.$route.params.slug;
      const wsName = this.$route.params.wsname;
      const dirId = dirSummary._id.toString();
      if (this.userRouteFlag) {
        this.$router.push({ name: 'UserWorkspaceDir', params: { slug: slug, wsname: wsName, dirid: dirId } });
      } else {
        this.$router.push({ name: 'OrgWorkspaceDir', params: { slug: slug, wsname: wsName, dirid: dirId } });
      }

    }
  },
};
</script>

<style scoped>
.show-indent {
  border-left-style: solid;
  border-left-color: grey;
  border-left-width: 1px;
}
</style>
