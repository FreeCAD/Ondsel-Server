<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div ref="container" :style="{ width: '100%', height: `${height}px` }"></div>
  <v-snackbar
    :timeout="2000"
    v-model="showSnacker"
  >
    {{ snackerMsg }}
  </v-snackbar>
</template>

<script>
let bundle = null;

function loadBundle() {
  if (!bundle) {
    bundle = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/kicanvas/kicanvas.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load the KiCanvas viewer.'));
      document.head.appendChild(script);
    });
  }
  return bundle;
}

export default {
  name: 'KicanvasViewer',
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    showSnacker: false,
    snackerMsg: '',
  }),
  computed: {
    height: () => window.innerHeight - 64,
  },
  async mounted() {
    await this.render();
  },
  watch: {
    async src() {
      await this.render();
    },
  },
  methods: {
    async render() {
      try {
        await loadBundle();
      } catch (e) {
        this.snackerMsg = e.message;
        this.showSnacker = true;
        return;
      }
      const container = this.$refs.container;
      container.querySelectorAll('kicanvas-embed').forEach(el => el.remove());
      const embed = document.createElement('kicanvas-embed');
      embed.setAttribute('controls', 'full');
      embed.style.cssText = 'width: 100%; height: 100%; max-height: 100%; aspect-ratio: auto; background-color: transparent;';
      const source = document.createElement('kicanvas-source');
      source.setAttribute('src', this.src);
      embed.appendChild(source);
      container.appendChild(embed);
    },
  },
};
</script>
