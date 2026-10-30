<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div
    ref="frame"
    class="kicanvas-frame"
    :class="{ 'kicanvas-frame--loaded': isLoaded }"
    @transitionend="onTransitionEnd"
  >
    <v-progress-linear v-if="!isLoaded" indeterminate absolute location="top" />
    <div ref="container" class="kicanvas-container"></div>
  </div>
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
  emits: ['loaded'],
  props: {
    src: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    resizeObserver: null,
    isLoaded: false,
    showSnacker: false,
    snackerMsg: '',
  }),
  async mounted() {
    this.fitToParent();
    this.resizeObserver = new ResizeObserver(this.fitToParent);
    this.resizeObserver.observe(this.$refs.frame.parentElement);
    await this.render();
  },
  beforeUnmount() {
    this.resizeObserver.disconnect();
  },
  watch: {
    async src() {
      await this.render();
    },
  },
  methods: {
    fitToParent() {
      const frame = this.$refs.frame;
      const sheet = frame.parentElement;
      const base = frame.offsetParent || document.body;
      const sheetRect = sheet.getBoundingClientRect();
      const baseRect = base.getBoundingClientRect();
      frame.style.top = `${sheetRect.top - baseRect.top + sheet.clientTop}px`;
      frame.style.left = `${sheetRect.left - baseRect.left + sheet.clientLeft}px`;
      frame.style.width = `${sheet.clientWidth}px`;
      frame.style.height = `${sheet.clientHeight}px`;
    },
    onTransitionEnd(event) {
      if (event.propertyName === 'opacity' && this.isLoaded) {
        this.$emit('loaded');
      }
    },
    async render() {
      this.isLoaded = false;
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
      embed.addEventListener('kicanvas:load', () => {
        this.isLoaded = true;
      });
      embed.style.cssText = 'width: 100%; height: 100%; max-height: 100%; aspect-ratio: auto; background-color: transparent;';
      const source = document.createElement('kicanvas-source');
      source.setAttribute('src', this.src);
      embed.appendChild(source);
      container.appendChild(embed);
    },
  },
};
</script>

<style scoped>
.kicanvas-frame {
  position: absolute;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
.kicanvas-frame--loaded {
  pointer-events: auto;
}
.kicanvas-container {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 500ms ease;
}
.kicanvas-frame--loaded .kicanvas-container {
  opacity: 1;
}
</style>
