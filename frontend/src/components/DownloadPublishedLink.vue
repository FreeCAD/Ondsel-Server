<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <form method="POST" :action="`${details?.browser_download_url}`">
    <input type="hidden" name="downloadCounter" :value="`${getObscuredForCustomMiddleware()}`">
    <v-btn
      v-if="small"
      flat
      size="x-small"
      class="text-caption text-red"
      type="submit"
    >{{details.shortName}}</v-btn>
    <v-btn
      v-else
      size="large"
      variant="outlined"
      class="text-none justify-start mt-4"
      min-width="14em"
      type="submit"
    >
      <span>
        {{details.shortName}}
        <span
          v-if="details.releaseDate"
          class="text-sm-caption"
        >
          <br>
          {{dateFormat(details.releaseDate)}}
        </span>
      </span>
    </v-btn>

  </form>
</template>

<script>

export default {
  name: 'DownloadPublishedLink',
  props: {
    details: {
      Type: Object,
      default: [],
    },
    userId: {
      Type: String,
      default: '',
    },
    small: {
      type: Boolean,
      default: false,
    }
  },
  created() {
  },
  data: () => ({
  }),
  computed: {
  },
  methods: {
    getObscuredForCustomMiddleware() {
      return this.rot13rot5(this.userId);
    },
    rot13rot5(str) {
      // ========== from chatGPT:
      return str.replace(/[A-Za-z0-9]/g, function(c) {
        if (/[A-Za-z]/.test(c)) {
          return String.fromCharCode(c.charCodeAt(0) + (c.toUpperCase() <= 'M' ? 13 : -13));
        } else if (/[0-9]/.test(c)) {
          return String.fromCharCode((c.charCodeAt(0) - 48 + 5) % 10 + 48);
        }
      });
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
