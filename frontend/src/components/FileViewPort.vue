<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-sheet name="view-port">
    <v-sheet
      v-if="viewChosen === viewEnum.thumbnail"
      height="18em"
      width="24em"
      class="d-flex justify-space-between"
    >
      <v-sheet></v-sheet>
      <v-img
        v-if="properUrl"
        :src="properUrl"
        cover
      ></v-img>
      <v-sheet
        v-else
        class="ma-16 d-flex flex-row justify-center align-center"
      >
        <v-sheet width="20em">
          <p>
            Thumbnail Not Generated Yet
          </p>
          <p v-if="file.currentVersion._id.toString() === versionId">
            Click on "Explore" to create image
          </p>
          <p v-if="file.currentVersion._id.toString() !== versionId">
            You can only create new Images on the active version.
          </p>
        </v-sheet>
      </v-sheet>
    </v-sheet>
    <v-sheet
      v-if="viewChosen === viewEnum.default"
      color="placeholder"
      height="30em"
      width="100%"
      class="d-flex justify-center align-center"
    >
      <v-icon icon="mdi-file" class="text-muted" cover />
    </v-sheet>
    <v-sheet
      v-if="viewChosen === viewEnum.markdown"
      color="placeholder"
      height="30em"
      width="100%"
      class="pa-4"
    >
      <v-sheet height="28em" style="overflow-y: scroll;">
        <markdown-viewer :markdown-html="htmlContent"></markdown-viewer>
      </v-sheet>
    </v-sheet>
  </v-sheet>
</template>

<script>
import {mapActions, mapState} from "vuex";
import {marked} from "marked";
import MarkdownViewer from "@/components/MarkdownViewer.vue";
import {models} from "@feathersjs/vuex";

const { Upload } = models.api;

export default {
  name: 'FileViewPort',
  components: {MarkdownViewer},
  emits: ['activeVersionModelSeen'],
  props: {
    file: {
      type: Object,
      default: null,
    },
    versionId: {
      type: String,
      default: null,
    }
  },
  data: () => ({
    viewEnum: {
      default: 1,
      thumbnail: 2,
      markdown: 3,
    },
    htmlContent: 'tbd',
    viewChosen: 1,
  }),
  computed: {
    ...mapState('auth', ['accessToken']),
    properUrl() {
      let url = null;
      if (this.versionId) {
        if (this.viewChosen === this.viewEnum.thumbnail) {
          if (this.file?.versions) {
            const viewedVersion = this.file.versions.find(v => v._id.toString() === this.versionId.toString());
            if (viewedVersion) {
              url = viewedVersion.thumbnailUrlCache || undefined;
              if (url) {
                if (viewedVersion._id.toString() === this.file.currentVersion._id.toString()) {
                  this.$emit('activeVersionModelSeen');
                }
              }
            } else {
              console.log("FAIL cannot locate visible version in File");
            }
          }
        }
      }
      return url;
    }
  },
  async created() {
    await this.chooseViewer(this.file);
    await this.getMarkdownHtml();
  },
  methods: {
    ...mapActions('app', [
      'retrieveFileByUniqueName',
    ]),
    async chooseViewer(file) {
      if (!file) {
        this.viewChosen = this.viewEnum.default;
        return;
      }
      if (file.model) {
        this.viewChosen = this.viewEnum.thumbnail;
        return;
      }
      let fileName = file.custFileName || '';
      if (fileName.endsWith(".md")) {
        this.viewChosen = this.viewEnum.markdown;
        return;
      }
      this.viewChosen = this.viewEnum.default;
    },
    async getMarkdownHtml() {
      if (this.viewChosen !== this.viewEnum.markdown) {
        return;
      }
      let content = "unable to retrieve";
      if (this.file.custFileName) {
        if (this.accessToken) {
          let uName = this.file.currentVersion.uniqueFileName;
          let contentResult = await this.retrieveFileByUniqueName({uniqueFileName: uName, accessToken: this.accessToken});
          if (contentResult) {
            content = contentResult;
          }
        } else {
          content = "# Markdown document"
        }
      }
      this.htmlContent = marked(content);
    },
  },
  watch: {
    async 'file'(to, from) {
      await this.chooseViewer(this.file)
      await this.getMarkdownHtml();
    },
    async 'versionId'(to, from) {
      await this.chooseViewer(this.file)
      await this.getMarkdownHtml();
    }
  },

};
</script>
