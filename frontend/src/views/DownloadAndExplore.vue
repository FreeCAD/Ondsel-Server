<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-container class="d-flex flex-column justify-center">
    <signup-progress-bar step="2" msg="recommend downloading Ondsel ES next"></signup-progress-bar>
    <v-card v-if="promptForSurvey">
      <v-card-text>
        <markdown-viewer :markdown-html="promptForSurveyHtml"></markdown-viewer>
      </v-card-text>
    </v-card>
    <v-container class="d-flex flex-wrap justify-center">
      <v-card flat>
        <v-card-title>Download</v-card-title>
        <v-card-text>
          <v-card width="30em">
            <v-card-title>Ondsel ES</v-card-title>
            <v-card-subtitle>v {{ondselEsVersionTxt}}</v-card-subtitle>
            <v-card-text class="overflow-y-auto" >
              <v-container class="d-flex flex-row justify-start">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Linux"
                    src="https://ondsel.com/img/os_linux.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <download-published-link
                    :details="ondselEsDownload['Linux-x86_64.AppImage']"
                    :user-id="userId"
                    :small="false"
                  ></download-published-link>
                  <download-published-link
                    :details="ondselEsDownload['Linux-x86_64.AppImage-SHA256.txt']"
                    :user-id="userId"
                    :small="true"
                  ></download-published-link>
                  <p/>
                  <download-published-link
                    :details="ondselEsDownload['Linux-aarch64.AppImage']"
                    :user-id="userId"
                    :small="false"
                  ></download-published-link>
                  <download-published-link
                    :details="ondselEsDownload['Linux-aarch64.AppImage-SHA256.txt']"
                    :user-id="userId"
                    :small="true"
                  ></download-published-link>
                </v-container>
              </v-container>
              <p/>
              <v-container class="d-flex flex-row justify-start">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Mac"
                    src="https://ondsel.com/img/os_mac.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <download-published-link
                    :details="ondselEsDownload['macOS-apple-silicon-arm64.dmg']"
                    :user-id="userId"
                    :small="false"
                  ></download-published-link>
                  <download-published-link
                    :details="ondselEsDownload['macOS-apple-silicon-arm64.dmg-SHA256.txt']"
                    :user-id="userId"
                    :small="true"
                  ></download-published-link>
                  <p/>
                  <download-published-link
                    :details="ondselEsDownload['macOS-intel-x86_64.dmg']"
                    :user-id="userId"
                    :small="false"
                  ></download-published-link>
                  <download-published-link
                    :details="ondselEsDownload['macOS-intel-x86_64.dmg-SHA256.txt']"
                    :user-id="userId"
                    :small="true"
                  ></download-published-link>
                </v-container>
              </v-container>
              <v-container class="d-flex flex-row mt-4 justify-start">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Windows"
                    src="https://ondsel.com/img/os_windows.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <download-published-link
                    :details="ondselEsDownload['Windows-x86_64-installer.exe']"
                    :user-id="userId"
                    :small="false"
                  ></download-published-link>
                  <download-published-link
                    :details="ondselEsDownload['Windows-x86_64-installer.exe-SHA256.txt']"
                    :user-id="userId"
                    :small="true"
                  ></download-published-link>
                </v-container>
              </v-container>
            </v-card-text>
          </v-card>

          <v-card class="mt-4" width="30em">
            <v-card-title>Pre-Releases</v-card-title>
            <v-card-text class="overflow-y-auto" >
              <b>The latest pre-release version of Ondsel ES was built on {{weeklyBuildDate}}</b>
              <p>
                ⚠️ These are intended for testing purposes only. Please don't use them for regular work. ⚠️
              </p>
              <v-container class="d-flex flex-row justify-start">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Linux"
                    src="https://ondsel.com/img/os_linux.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <v-expansion-panels>
                    <v-expansion-panel title="for testing">
                      <v-expansion-panel-text>
                        <download-published-link
                          :details="weeklyDownload['Linux-x86_64.AppImage']"
                          :user-id="userId"
                          :small="false"
                        ></download-published-link>
                        <p/>
                        <download-published-link
                          :details="weeklyDownload['Linux-aarch64.AppImage']"
                          :user-id="userId"
                          :small="false"
                        ></download-published-link>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-container>
              </v-container>
              <p/>
              <v-container class="d-flex flex-row justify-start">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Mac"
                    src="https://ondsel.com/img/os_mac.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <v-expansion-panels>
                    <v-expansion-panel title="for testing">
                      <v-expansion-panel-text>
                        <download-published-link
                          :details="weeklyDownload['macOS-apple-silicon-arm64.dmg']"
                          :user-id="userId"
                          :small="false"
                        ></download-published-link>
                        <p/>
                        <download-published-link
                          :details="weeklyDownload['macOS-intel-x86_64.dmg']"
                          :user-id="userId"
                          :small="false"
                        ></download-published-link>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-container>
              </v-container>
              <v-container class="d-flex flex-row justify-start mt-4">
                <v-avatar width="7em" rounded="0" class="mr-2">
                  <v-img
                    width="6em"
                    alt="Windows"
                    src="https://ondsel.com/img/os_windows.svg"
                  />
                </v-avatar>
                <v-container style="border-left: 4px solid black;">
                  <v-expansion-panels>
                    <v-expansion-panel title="for testing">
                      <v-expansion-panel-text>
                        <download-published-link
                          :details="weeklyDownload['Windows-x86_64.7z']"
                          :user-id="userId"
                          :small="false"
                        ></download-published-link>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-container>
              </v-container>
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>

      <v-card flat>
        <v-card-title>Explore</v-card-title>
        <v-card-text>
          <v-card class="mt-12">
            <v-card-title>Links</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item @click-once="goPublicModels()" color="link">
                  <v-list-item-title>Public CAD Models</v-list-item-title>
                  <v-list-item-subtitle>Browse the models made public by other users and organizations.</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>
    </v-container>

    <v-card flat>
      <v-card-text>
        <i>You can always get back to this page from the right-hand app-bar menu.</i>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>

import {mapState} from "vuex";
import {SubscriptionTypeMap} from "@/store/services/users";
import SignupProgressBar from "@/components/SignupProgressBar.vue";
import {models} from "@feathersjs/vuex";
import DownloadPublishedLink from "@/components/DownloadPublishedLink.vue";
import {marked} from "marked";
import MarkdownViewer from "@/components/MarkdownViewer.vue";

const { Publisher, Agreements } = models.api;

export default {
  name: 'DownloadAndExplore',
  components: {MarkdownViewer, DownloadPublishedLink, SignupProgressBar},
  data: () => ({
    promptForSurvey: false,
    promptForSurveyHtml: '',
    ondselEsDownload: {},
    ondselEsVersionTxt: 'tbd',
    weeklyDownload: {},
    weeklyBuildDate: 'tbd',
    releaseFileTypes: {
      'Linux-x86_64.AppImage': 'x86_64 AppImage',
      'Linux-x86_64.AppImage-SHA256.txt': 'SHA256',
      'Linux-aarch64.AppImage': 'aarch64 AppImage',
      'Linux-aarch64.AppImage-SHA256.txt': 'SHA256',
      'macOS-apple-silicon-arm64.dmg': 'Apple Silicon dmg',
      'macOS-apple-silicon-arm64.dmg-SHA256.txt': 'SHA256',
      'macOS-intel-x86_64.dmg': "Intel dmg",
      'macOS-intel-x86_64.dmg-SHA256.txt': 'SHA256',
      'Windows-x86_64-installer.exe': 'x86_64 installer',
      'Windows-x86_64-installer.exe-SHA256.txt': 'SHA256',
    },
    weeklyFileTypes: {
      'Linux-aarch64.AppImage': 'aarch64 AppImage',
      'Linux-x86_64.AppImage': 'x86_64 AppImage',
      'macOS-apple-silicon-arm64.dmg': 'Apple Silicon dmg',
      'macOS-intel-x86_64.dmg': "Intel dmg",
      'Windows-x86_64.7z': 'x86_64.7z',
    },
    userId: '',
  }),
  computed: {
    ...mapState('auth', { loggedInUser: 'payload' }),
    ...mapState('auth', ['user']),
  },
  async created() {
    if (this.loggedInUser.user.tier === SubscriptionTypeMap.unverified) {
      this.$router.push({name: 'PendingVerification'})
    }
    await this.getSurveyPrompt();
    let osVer = 'unknown';
    let buildDate = 'unknown';
    let osd = {};
    let wd = {};
    const results = await Publisher.find({query: {$limit: 100}});
    const publishedList = results.data;
    for (const item of publishedList) {
      const target = item.target;
      const cadence = item.releaseCadence;
      let url;
      if (import.meta.env.VITE_DEV_PROXY_TO_API_HACK) {
        url = `${import.meta.env.VITE_DEV_PROXY_TO_API_HACK}/publisher/${item._id}/download/${item.filename}`;
      } else {
        url = `/publisher/${item._id}/download/${item.filename}`;
      }
      if (cadence === 'stable') {
        const shortName = this.releaseFileTypes[target];
        osd[target] = item;
        osd[target].browser_download_url = url;
        osd[target].shortName = shortName;
        osd[target].releaseDate = false; // prevents display
        osVer = item.release;
      } else {
        const shortName = this.weeklyFileTypes[target];
        wd[target] = item;
        wd[target].browser_download_url = url;
        wd[target].shortName = shortName;
        buildDate = this.dateFormat(item.releaseDate);
      }
    }
    this.ondselEsDownload = osd;
    this.ondselEsVersionTxt = osVer;
    this.weeklyDownload = wd;
    this.weeklyBuildDate = buildDate;
    this.userId = this.user._id.toString();
  },
  methods: {
    async getSurveyPrompt() {
      Agreements.find({
        query: {category: 'signup-survey-prompt'}
      }).then(response => {
        if (response.data.length > 0) {
          const promptDoc = response.data[0];
          this.promptForSurvey = true;
          this.promptForSurveyHtml = marked.parse(promptDoc.current.markdownContent);
        }
      }).catch((e) => {
        console.error(e);
      })
    },
    async goPublicModels() {
      this.$router.push({name: 'PublicModels'})
    },
    dateFormat(number) {
      if (number) {
        const date = new Date(number);
        return date.toDateString();
      }
      return "unknown"
    },
  },
}
</script>

<style scoped>

</style>
