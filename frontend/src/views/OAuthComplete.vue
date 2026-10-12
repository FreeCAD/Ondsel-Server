<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-container fluid>
    <signup-progress-bar step="1" msg="complete your account"></signup-progress-bar>
    <v-card :title="`Complete Sign Up with ${providerName}`" class="mx-auto mt-8" width="22em" flat>
      <template v-slot:loader="{  }">
        <v-progress-linear
          :active="isCreatePending"
          height="4"
          indeterminate
        ></v-progress-linear>
      </template>
      <v-form v-model="isValid" ref="form" @submit.prevent="completeSignUp">
        <v-text-field
          :model-value="oauthData.email"
          label="Email"
          readonly
          :disabled="isCreatePending"
        ></v-text-field>

        <v-text-field
          v-model="user.name"
          label="Name"
          :rules="[rules.isRequired]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-select
          v-model="user.usageType"
          :label="`How do you plan to use ${siteConfig?.siteTitle}?`"
          :items="usageTypes"
          :rules="[rules.isRequired]"
          :disabled="isCreatePending"
        />

        <v-text-field
          v-model="usernameTemp"
          label="username builder (type here)"
          :rules="[rules.isRequired, rules.nameConforms, rules.extraHint]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-card 
          class="mx-auto" 
          color="primary" 
          variant="outlined"
          :style="{ opacity: isCreatePending ? 0.6 : 1 }"
        >
          <v-card-text v-if="user.username">
            <span class="font-weight-bold">{{user.username}}</span>
          </v-card-text>
          <v-card-text v-else>
            <span class="font-italic">no username built yet</span>
          </v-card-text>
        </v-card>

        <v-checkbox
          v-model="agreeToTOS"
          :rules="[rules.confirmTOS]"
          :disabled="isCreatePending"
          density="compact"
        >
          <template v-slot:label>
            <div>
              I understand
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <a
                    v-bind="props"
                    @click.stop="!isCreatePending && (tosDialog = true)"
                    :class="{ 'pointer-events-none': isCreatePending }"
                  >
                    <span class="font-weight-medium text-decoration-underline text-black">
                      Terms of Service
                    </span>
                  </a>
                </template>
                Click to read Terms of Service
              </v-tooltip>
            </div>
          </template>
        </v-checkbox>

        <v-checkbox
          v-model="agreeToPrivacyPolicy"
          :rules="[rules.confirmPP]"
          :disabled="isCreatePending"
          density="compact"
        >
          <template v-slot:label>
            <div>
              I understand
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <a
                    v-bind="props"
                    @click.stop="!isCreatePending && (ppDialog = true)"
                    :class="{ 'pointer-events-none': isCreatePending }"
                  >
                    <span class="font-weight-medium text-decoration-underline text-black">
                      Privacy Policy
                    </span>
                  </a>
                </template>
                Click to read Privacy Policy
              </v-tooltip>
            </div>
          </template>
        </v-checkbox>

        <v-card-actions>
          <v-btn
            type="submit"
            :disabled="isCreatePending || !isValid"
            :loading="isCreatePending"
            class="mt-2"
            color="primary"
            block
            variant="elevated"
          >Complete Sign Up</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
    <v-snackbar
      :timeout="2000"
      v-model="showSnacker"
    >
      {{ snackerMsg }}
    </v-snackbar>
    <v-dialog
      v-model="tosDialog"
    >
      <v-card>
        <v-card-title>{{ tosDoc.current.title }}</v-card-title>
        <v-card-subtitle>ver {{ tosDoc.current.version }}</v-card-subtitle>
        <v-card-text>
          <markdown-viewer :markdown-html="tosMarkdown"></markdown-viewer>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="tosDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="ppDialog"
    >
      <v-card>
        <v-card-title>{{ ppDoc.current.title }}</v-card-title>
        <v-card-subtitle>ver {{ ppDoc.current.version }}</v-card-subtitle>
        <v-card-text>
          <markdown-viewer :markdown-html="ppMarkdown"></markdown-viewer>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="ppDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { takeSafeOAuthRedirect } from "@/util/oauthRedirect";
import {mapActions, mapGetters} from 'vuex';
import { models } from '@feathersjs/vuex';
import feathersClient from '@/plugins/feathers-client';
import {marked} from "marked";
import {conformRefName} from "@/refNameFunctions";
import SignupProgressBar from "@/components/SignupProgressBar.vue";
import MarkdownViewer from "@/components/MarkdownViewer.vue";

export default {
  name: 'OAuthComplete',
  components: {MarkdownViewer, SignupProgressBar},
  data() {
    return {
      result: {},
      user: new models.api.User(),
      usernameTemp: '',
      isValid: false,
      snackerMsg: '',
      rules: {
        isRequired: v => !!v || 'This field is required',
        confirmTOS: v => v || 'Terms of Service must be understood',
        confirmPP: v => v || 'Privacy Policy must be understood',
        nameConforms: v => this.conformNameCheck(v),
        extraHint: v => this.extraHintCheck(v),
      },
      agreeToTOS: false,
      agreeToPrivacyPolicy: false,
      showSnacker: false,
      isCreating: false,
      tosDoc: {},
      tosMarkdown: '',
      tosDialog: false,
      ppDoc: {},
      ppMarkdown: '',
      ppDialog: false,
      extraHintContent: '',
      lastBadUsername: '',
      oauthData: {
        provider: '',
        email: '',
        name: '',
        providerId: '',
        suggestedUsername: ''
      },
      oauthSignature: '',
      oauthExpires: 0
    }
  },
  computed: {
    User: () => models.api.User,
    ...mapGetters('app', ['siteConfig']),
    isCreatePending() {
      return this.isCreating
    },
    usageTypes() {
      return [
        { value: 'work', title: `I want to use ${this.siteConfig?.siteTitle} for work` },
        { value: 'personal', title: `I want to use ${this.siteConfig?.siteTitle} for personal projects` },
        { value: 'both', title: `I want to use ${this.siteConfig?.siteTitle} for both work and personal projects` }
      ];
    },
    providerName() {
      const name = this.siteConfig?.oauth?.providers?.oidc?.signInWithName?.trim();
      const providerMap = {
        google: 'Google',
        github: 'GitHub',
        oidc: name || 'SSO'
      };
      return providerMap[this.oauthData.provider] || this.oauthData.provider;
    }
  },
  methods: {
    ...mapActions('auth', ['authenticate']),
    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    clearHashFragment() {
      const hash = window.location.hash;
      if (hash) {
        const currentState = window.history.state;
        window.history.replaceState(currentState, '', window.location.pathname + window.location.search);
      }
    },
    async completeSignUp() {
      if (this.isCreatePending) {
        return;
      }

      if (this.isValid) {
        const userData = {
          email: this.oauthData.email,
          name: this.user.name,
          username: this.user.username,
          usageType: this.user.usageType,
          oauthProviders: {
            [this.oauthData.provider]: {
              id: this.oauthData.providerId
            }
          },
          // Include signature and expires for backend verification
          oauthCompletionSignature: this.oauthSignature,
          oauthCompletionExpires: this.oauthExpires,
          oauthCompletionData: this.$route.query.data
        };

        this.isCreating = true;
        try {
          // Use raw feathers client to get full response including oauthAccessToken
          const createdUser = await feathersClient.service('users').create(userData);

          // Accept agreements
          await feathersClient.service('agreements/accept').create({
            userId: createdUser._id.toString(),
            category: 'terms-of-service',
            version: this.tosDoc.current.version,
            newAccount: true
          });
          await this.sleep(200);  // wait for mongodb to distribute

          // Auto-login: Use JWT token generated by backend
          const accessToken = createdUser.oauthAccessToken;
          if (accessToken) {
            await this.authenticate({
              strategy: 'jwt',
              accessToken: accessToken
            });
            this.isCreating = false;
            // A first sign-in that arrived here from somewhere specific should
            // finish where it was going. Without this, a brand new account
            // completes signup and lands on the download page, so a flow that
            // sent the user through login never resumes.
            const back = takeSafeOAuthRedirect();
            if (back) {
              this.$router.replace(back);
            } else {
              // Redirect to Download/Explore page (same as email verification flow)
              this.$router
                .push({name: 'DownloadAndExplore', query: { psu: true }})
                .then(() => {
                  this.$router.go() // Force refresh on destination
                });
            }
          } else {
            // Fallback: redirect to login if token generation failed
            this.isCreating = false;
            this.$router.push({
              name: 'Login',
              query: { message: 'Account created successfully. Please login with ' + this.providerName + ' to continue.' }
            });
          }
        } catch (e) {
          this.isCreating = false;
          if (e.message === 'Invalid: Username already taken') {
            this.extraHintContent = 'username already taken';
            this.lastBadUsername = this.usernameTemp;
            this.$refs.form.validate();
          }
          if (e.message === 'Invalid: Email already taken') {
            this.extraHintContent = 'email already taken';
            this.$refs.form.validate();
          }
          console.log(e.message);
          this.snackerMsg = e.message;
          this.showSnacker = true;
        }
      }
    },
    conformNameCheck(rawName) {
      const conformedName = conformRefName(rawName);
      this.user.username = conformedName;
      if (conformedName.length < 4) {
        return "requires at least 4 characters in derived username";
      }
      return true;
    },
    extraHintCheck(newRawString) {
      if (this.extraHintContent === '') {
        return true;
      }
      if (this.lastBadUsername === newRawString) {
        return this.extraHintContent;
      }
      return true;
    },
    parseOAuthData() {
      const dataParam = this.$route.query.data;
      const signature = this.$route.query.signature;
      const expiresParam = this.$route.query.expires;
      const expires = expiresParam ? parseInt(expiresParam, 10) : NaN;

      if (!dataParam || !signature || isNaN(expires)) {
        this.$router.push({name: 'Login'});
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now > expires) {
        this.snackerMsg = 'OAuth signup link has expired. Please try signing in again.';
        this.showSnacker = true;
        setTimeout(() => {
          this.$router.push({name: 'Login'});
        }, 2000);
        return;
      }

      try {
        // Decode base64 data
        const decodedString = atob(decodeURIComponent(dataParam));
        const decodedData = JSON.parse(decodedString);
        this.oauthData = decodedData;
        this.oauthSignature = signature;
        this.oauthExpires = expires;
        this.usernameTemp = decodedData.suggestedUsername || '';
        this.user.username = conformRefName(this.usernameTemp);
        this.user.name = decodedData.name || '';
      } catch (error) {
        console.error('Failed to parse OAuth data:', error);
        this.$router.push({name: 'Login'});
      }
    },
    /**
     * Handle existing user OAuth login with access_token
     */
    async handleExistingUserLogin() {
      // Extract access_token from hash fragment (format: #access_token=xxx)
      const hash = window.location.hash;

      if (!hash || !hash.includes('access_token=')) {
        return false;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');

      if (!accessToken) {
        return false;
      }

      this.clearHashFragment();

      try {
        await this.authenticate({
          strategy: 'jwt',
          accessToken: accessToken
        });
        // Honour a redirect_uri that /login was given before it handed off to
        // the provider. Without this an OAuth sign-in always lands on LensHome,
        // which silently breaks any flow that sent the user through login to
        // reach a particular page.
        const back = takeSafeOAuthRedirect();
        if (back) {
          this.$router.replace(back);
        } else {
          this.$router.push({ name: 'LensHome' });
        }
        return true;
      } catch (error) {
        console.error('OAuth authentication failed:', error);
        this.snackerMsg = 'Authentication failed. Please try signing in again.';
        this.showSnacker = true;
        setTimeout(() => {
          this.$router.push({ name: 'Login' });
        }, 2000);
        return true; // Indicates we handled this case
      }
    }
  },
  async created() {
    const hasNewUserParams = this.$route.query.data && this.$route.query.signature && this.$route.query.expires;

    if (hasNewUserParams) {
      this.clearHashFragment();
      this.parseOAuthData();
    } else {
      const isExistingUserLogin = await this.handleExistingUserLogin();
      if (isExistingUserLogin) {
        return; // Don't load agreements for existing user login
      }

      this.$router.push({ name: 'Login' });
      return;
    }

    models.api.Agreements.find({
      query: {category: 'terms-of-service'}
    }).then(response => {
      this.tosDoc = (response.data.length > 0) ? response.data[0] : {current:{markdownContent: 'doc missing'}};
      this.tosMarkdown = marked.parse(this.tosDoc.current.markdownContent);
    });
    models.api.Agreements.find({
      query: {category: 'privacy-policy'}
    }).then(response => {
      this.ppDoc = (response.data.length > 0) ? response.data[0] : {current:{markdownContent: 'doc missing'}};
      this.ppMarkdown = marked.parse(this.ppDoc.current.markdownContent);
    });
  },
}
</script>

<style scoped>

</style>
