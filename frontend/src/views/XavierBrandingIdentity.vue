<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title>Branding Configuration</v-card-title>
    <v-card-subtitle>
      <v-btn density="default" icon="mdi-home" color="success"
        @click="$router.push({ name: 'XavierBrandingHub', params: {} })"></v-btn> <b><i>Professor Xavier's School For
          The Hidden</i></b>
    </v-card-subtitle>
    <v-card-text>
      <v-form ref="form" v-model="valid">
        <!-- Site Title -->
        <v-text-field v-model="siteTitle" label="Site Title" :rules="titleRules" counter="50"
          maxlength="50"></v-text-field>

        <!-- Logo file input -->
        <v-file-input v-model="selectedLogoFile" accept="image/*,.svg" label="Select Logo File" prepend-icon="mdi-camera"
          show-size :rules="fileRules" :disabled="isSaving" class="mb-4"></v-file-input>

        <!-- Favicon file input -->
        <v-file-input v-model="selectedFaviconFile" accept="image/*,.svg,.ico" label="Select Favicon File"
          prepend-icon="mdi-camera" show-size :rules="fileRules" :disabled="isSaving"
          class="mb-4"></v-file-input>

        <!-- Side-by-side logo preview section -->
        <div class="mt-4">
          <h4>Logo Preview</h4>
          <v-row class="mt-2">
            <!-- Current Logo -->
            <v-col cols="12" md="6">
              <div class="text-center">
                <h5 class="text-grey-darken-1 mb-2">Current Logo</h5>
                <div v-if="siteConfig?.logoUrl">
                  <v-img :src="siteConfig.logoUrl" max-width="150" max-height="150" class="mx-auto" contain></v-img>
                </div>
                <div v-else class="pa-4">
                  <v-icon size="48" color="grey">mdi-image-off</v-icon>
                  <p class="text-grey mt-2">No logo uploaded</p>
                </div>
              </div>
            </v-col>

            <!-- New Logo Preview -->
            <v-col cols="12" md="6">
              <div class="text-center">
                <h5 class="text-primary mb-2">New Logo Preview</h5>
                <div v-if="previewUrl">
                  <v-img :src="previewUrl" max-width="150" max-height="150" class="mx-auto" contain></v-img>
                  <p class="text-caption text-primary mt-2">
                    This will replace the current logo
                  </p>
                </div>
                <div v-else class="pa-4">
                  <v-icon size="48" color="grey-lighten-1">mdi-camera-plus</v-icon>
                  <p class="text-grey-lighten-1 mt-2">Select a file to preview</p>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Side-by-side favicon preview section -->
        <div class="mt-4">
          <h4>Favicon Preview</h4>
          <v-row class="mt-2">
            <!-- Current Favicon -->
            <v-col cols="12" md="6">
              <div class="text-center">
                <h5 class="text-grey-darken-1 mb-2">Current Favicon</h5>
                <div v-if="siteConfig?.faviconUrl">
                  <v-img :src="siteConfig.faviconUrl" max-width="32" max-height="32" class="mx-auto" contain></v-img>
                </div>
                <div v-else class="pa-4">
                  <v-icon size="48" color="grey">mdi-image-off</v-icon>
                  <p class="text-grey mt-2">No favicon uploaded</p>
                </div>
              </div>
            </v-col>

            <!-- New Favicon Preview -->
            <v-col cols="12" md="6">
              <div class="text-center">
                <h5 class="text-primary mb-2">New Favicon Preview</h5>
                <div v-if="previewFaviconUrl">
                  <v-img :src="previewFaviconUrl" max-width="32" max-height="32" class="mx-auto" contain></v-img>
                  <p class="text-caption text-primary mt-2">
                    This will replace the current favicon
                  </p>
                </div>
                <div v-else class="pa-4">
                  <v-icon size="48" color="grey-lighten-1">mdi-camera-plus</v-icon>
                  <p class="text-grey-lighten-1 mt-2">Select a file to preview</p>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Copyright Text Section -->
        <v-divider class="my-6"></v-divider>

        <v-row>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>Copyright Text</v-card-title>
              <v-card-text>
                <v-text-field v-model="copyrightText" label="Copyright Text" :rules="copyrightRules" counter="80"
                  maxlength="80" :hint="copyrightHint" persistent-hint></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Footer Section -->
        <v-divider class="my-6"></v-divider>

        <v-row>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>Footer</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-2">
                  A footer spans the full page width, so it fits longer copyright notices than the sidebar does.
                  While it shows the copyright, the sidebar entry is hidden to avoid repeating it.
                </p>
                <v-switch v-model="footer.enabled" label="Show site footer" color="primary" density="compact"
                  hide-details></v-switch>
                <v-switch v-model="footer.showCopyright" label="Copyright" color="primary" density="compact"
                  :disabled="!footer.enabled" hide-details></v-switch>
                <v-switch v-model="footer.showTermsOfService" label="Terms of Service link" color="primary"
                  density="compact" :disabled="!footer.enabled" hide-details></v-switch>
                <v-switch v-model="footer.showPrivacyPolicy" label="Privacy Policy link" color="primary"
                  density="compact" :disabled="!footer.enabled" hide-details></v-switch>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>Preview</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-2">{{ previewCaption }}</p>
                <v-card v-if="footer.enabled" border="primary md" class="pa-3">
                  <div class="d-flex flex-wrap align-center justify-center ga-4 text-body-2">
                    <span v-if="footer.showCopyright" class="d-flex align-center">
                      <v-icon size="16" class="mr-1">mdi-copyright</v-icon>
                      <span>{{ copyrightText }}</span>
                    </span>
                    <span v-if="footer.showTermsOfService" class="text-link">Terms of Service</span>
                    <span v-if="footer.showPrivacyPolicy" class="text-link">Privacy Policy</span>
                  </div>
                </v-card>
                <v-card v-else border="primary md" class="pa-3">
                  <div class="d-flex align-center text-body-2">
                    <v-icon size="16" class="mr-1">mdi-copyright</v-icon>
                    <span>{{ copyrightText }}</span>
                  </div>
                </v-card>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Social Links Section -->
        <v-divider class="my-6"></v-divider>

        <v-row>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>Social Links</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-4">Configure social media links used in email templates. Leave URL empty to exclude from emails.</p>
                
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field 
                      v-model="socialLinks.forum.label" 
                      label="Forum Label" 
                      hint="Display name for the forum link"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-text-field 
                      v-model="socialLinks.forum.url" 
                      label="Forum URL" 
                      hint="Full URL to your forum"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field 
                      v-model="socialLinks.discord.label" 
                      label="Discord Label" 
                      hint="Display name for the Discord link"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-text-field 
                      v-model="socialLinks.discord.url" 
                      label="Discord URL" 
                      hint="Full URL to your Discord server"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field 
                      v-model="socialLinks.youtube.label" 
                      label="YouTube Label" 
                      hint="Display name for the YouTube link"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-text-field 
                      v-model="socialLinks.youtube.url" 
                      label="YouTube URL" 
                      hint="Full URL to your YouTube channel"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="success" variant="elevated" :disabled="!valid || isSaving" :loading="isSaving" @click="save">
        Save
      </v-btn>
    </v-card-actions>

    <v-snackbar v-model="showSnackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-card>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { SITE_CONFIG_ID } from '@/store/services/site-config';

export default {
  name: 'XavierBrandingIdentity',
  data() {
    return {
      valid: false,
      isSaving: false,
      selectedLogoFile: null,
      selectedFaviconFile: null,
      previewUrl: null,
      previewFaviconUrl: null,
      siteTitle: '',
      copyrightText: '',
      footer: {
        enabled: false,
        showCopyright: true,
        showTermsOfService: true,
        showPrivacyPolicy: true
      },
      socialLinks: {
        forum: { url: '', label: 'Forum' },
        discord: { url: '', label: 'Discord' },
        youtube: { url: '', label: 'YouTube' }
      },
      showSnackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',
      titleRules: [
        v => !!v || 'Title is required',
        v => (v && v.length <= 50) || 'Title must be less than 50 characters',
      ],
      fileRules: [
        v => {
          if (!v) return true;

          const file = Array.isArray(v) ? v[0] : v;
          if (!file) return true;

          if (!(file instanceof File)) {
            return 'Please select a valid file';
          }

          if (file.size >= 10000000) {
            return 'File size should be less than 10 MB';
          }

          if (!/^image\//.test(file.type) && file.type !== 'image/svg+xml') {
            return 'File must be an image (PNG, JPG, SVG)';
          }

          return true;
        }
      ],
      copyrightRules: [
        v => !!v || 'Copyright text is required',
        v => (v && v.length >= 5) || 'Copyright text must be at least 5 characters',
        v => (v && v.length <= 80) || 'Copyright text must be at most 80 characters for the sidebar'
      ],
    }
  },
  async created() {
    // Check if user is admin
    if (!(await this.isSiteAdministrator())) {
      console.log("alert-33236-bl");
      this.$router.push({name: 'LensHome', params: {}});
      return;
    }
  },
  computed: {
    ...mapState('auth', ['accessToken', 'user']),
    ...mapGetters('app', ['siteConfig']),
    copyrightHint() {
      return this.footer.enabled && this.footer.showCopyright
        ? 'This text appears in the footer.'
        : 'This text appears in the sidebar. Keep it short to fit the limited space.';
    },
    previewCaption() {
      return this.footer.enabled
        ? 'Preview of how the footer appears:'
        : 'Preview of how the copyright appears in the sidebar:';
    },
  },
  watch: {
    'siteConfig': {
      handler(newVal) {
        if (newVal) {
          if (newVal.siteTitle && !this.siteTitle) {
            this.siteTitle = newVal.siteTitle;
          }
          if (newVal.copyrightText && !this.copyrightText) {
            this.copyrightText = newVal.copyrightText;
          }
          if (newVal.footer) {
            this.footer = { ...this.footer, ...newVal.footer };
          }
          if (newVal.socialLinks) {
            if (newVal.socialLinks.forum) {
              this.socialLinks.forum = { ...newVal.socialLinks.forum };
            }
            if (newVal.socialLinks.discord) {
              this.socialLinks.discord = { ...newVal.socialLinks.discord };
            }
            if (newVal.socialLinks.youtube) {
              this.socialLinks.youtube = { ...newVal.socialLinks.youtube };
            }
          }
        }
      },
      immediate: true
    },
    selectedLogoFile(newFile) {
      this.handleFileChange(newFile);
    },
    selectedFaviconFile(newFile) {
      this.handleFaviconFileChange(newFile);
    }
  },
  methods: {
    ...mapActions('app', ['isSiteAdministrator']),
    handleFileChange(file) {
      // Clean up previous preview URL
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = null;
      }

      // Handle both single file and array of files
      const fileObj = Array.isArray(file) ? file[0] : file;

      if (fileObj && fileObj instanceof File) {
        // Create preview URL
        try {
          this.previewUrl = URL.createObjectURL(fileObj);
        } catch (error) {
          console.error('Error creating object URL:', error);
          this.previewUrl = null;
        }

        // Trigger form validation
        this.$nextTick(() => {
          if (this.$refs.form) {
            this.$refs.form.validate();
          }
        });
      }
    },
    handleFaviconFileChange(file) {
      // Clean up previous preview URL
      if (this.previewFaviconUrl) {
        URL.revokeObjectURL(this.previewFaviconUrl);
        this.previewFaviconUrl = null;
      }

      // Handle both single file and array of files
      const fileObj = Array.isArray(file) ? file[0] : file;

      if (fileObj && fileObj instanceof File) {
        // Create preview URL
        try {
          this.previewFaviconUrl = URL.createObjectURL(fileObj);
        } catch (error) {
          console.error('Error creating object URL:', error);
          this.previewFaviconUrl = null;
        }

        // Trigger form validation
        this.$nextTick(() => {
          if (this.$refs.form) {
            this.$refs.form.validate();
          }
        });
      }
    },
    async save() {
      if (!this.valid) return;

      this.isSaving = true;

      try {
        const formData = new FormData();
        formData.append('siteTitle', this.siteTitle);
        if (this.selectedLogoFile) {
          formData.append('logoFile', this.selectedLogoFile);
        }
        if (this.selectedFaviconFile) {
          formData.append('faviconFile', this.selectedFaviconFile);
        }
        formData.append('copyrightText', this.copyrightText);
        formData.append('footer', JSON.stringify(this.footer));
        formData.append('socialLinks', JSON.stringify(this.socialLinks));
        const response = await fetch(`${import.meta.env.VITE_APP_API_URL}site-config/${SITE_CONFIG_ID}`, {
          method: 'PATCH',
          headers: {
            Authorization: this.accessToken,
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Upload failed: ${response.status}`);
        }

        this.showMessage('Branding configuration saved successfully', 'success');

        // Clear selected files and previews after successful save
        this.selectedLogoFile = null;
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
          this.previewUrl = null;
        }
        this.selectedFaviconFile = null;
        if (this.previewFaviconUrl) {
          URL.revokeObjectURL(this.previewFaviconUrl);
          this.previewFaviconUrl = null;
        }
      } catch (error) {
        console.error('Failed to save:', error);
        this.showMessage(error.message || 'Failed to save branding configuration', 'error');
      } finally {
        this.isSaving = false;
      }
    },
    showMessage(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.showSnackbar = true;
    }
  },
  beforeUnmount() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    if (this.previewFaviconUrl) {
      URL.revokeObjectURL(this.previewFaviconUrl);
    }
  }
}
</script>

<style scoped>
</style>