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

// KiCanvas styles its panels, toolbars and inputs through CSS variables declared on the
// embed element, so the Lens theme colours are mapped onto them here.
function kicanvasPalette(colors) {
  const surface = colors.surface;
  const text = colors['on-surface'];
  const soft = colors['surface-soft'];
  const accent = colors.primary;
  const onAccent = colors['on-primary'];
  const outline = colors.decoration;
  const overCanvas = `color-mix(in srgb, ${surface} 88%, transparent)`;
  return {
    'bg': surface,
    'fg': text,
    'tooltip-bg': text,
    'tooltip-fg': surface,
    'tooltip-border': `1px solid ${text}`,
    'scrollbar-bg': surface,
    'scrollbar-fg': colors.secondary,
    'scrollbar-hover-fg': accent,
    'scrollbar-active-fg': accent,
    'activity-bar-bg': outline,
    'activity-bar-fg': text,
    'activity-bar-active-bg': surface,
    'activity-bar-active-fg': accent,
    'resizer-bg': outline,
    'resizer-active-bg': accent,
    'panel-bg': surface,
    'panel-fg': text,
    'panel-border': `1px solid ${outline}`,
    'panel-title-bg': soft,
    'panel-title-fg': text,
    'panel-title-border': `1px solid ${outline}`,
    'panel-title-button-fg': text,
    'panel-title-button-hover-bg': outline,
    'panel-title-button-disabled-fg': colors.muted,
    'panel-subtitle-bg': outline,
    'panel-subtitle-fg': text,
    'dropdown-bg': surface,
    'dropdown-fg': text,
    'dropdown-hover-bg': outline,
    'dropdown-hover-fg': text,
    'dropdown-active-bg': accent,
    'dropdown-active-fg': onAccent,
    'button-bg': accent,
    'button-fg': onAccent,
    'button-hover-bg': accent,
    'button-hover-fg': onAccent,
    'button-focus-outline': `1px solid ${accent}`,
    'button-selected-bg': accent,
    'button-selected-fg': onAccent,
    'button-disabled-bg': soft,
    'button-disabled-fg': colors.muted,
    'button-outline-bg': surface,
    'button-outline-fg': text,
    'button-outline-hover-bg': outline,
    'button-outline-hover-fg': accent,
    'button-outline-disabled-bg': surface,
    'button-outline-disabled-fg': colors.muted,
    'button-toolbar-bg': overCanvas,
    'button-toolbar-fg': text,
    'button-toolbar-hover-bg': outline,
    'button-toolbar-hover-fg': text,
    'button-toolbar-disabled-bg': overCanvas,
    'button-toolbar-disabled-fg': colors.muted,
    'button-toolbar-alt-bg': overCanvas,
    'button-toolbar-alt-hover-bg': outline,
    'button-toolbar-alt-hover-fg': text,
    'button-toolbar-alt-disabled-bg': overCanvas,
    'button-menu-fg': text,
    'button-menu-hover-fg': accent,
    'button-menu-disabled-fg': colors.muted,
    'input-bg': surface,
    'input-fg': text,
    'input-border': `1px solid ${colors.secondary}`,
    'input-accent': accent,
    'input-focus-outline': `1px solid ${accent}`,
    'input-placeholder': colors.muted,
    'input-disabled-bg': soft,
    'input-disabled-fg': colors.muted,
    'input-range-bg': outline,
    'input-range-fg': text,
    'input-range-hover-bg': accent,
    'input-range-disabled-bg': soft,
    'list-item-active-bg': accent,
    'list-item-active-fg': onAccent,
    'list-item-hover-bg': outline,
    'list-item-hover-fg': text,
    'list-item-disabled-fg': colors.muted,
    'focus-overlay-bg': colors.secondary,
    'focus-overlay-opacity': '0.35',
    'focus-overlay-fg': colors['on-secondary'],
    'grid-outline': outline,
  };
}

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
    '$vuetify.theme.global.name'() {
      this.applyTheme();
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
    applyTheme() {
      const embed = this.$refs.container.querySelector('kicanvas-embed');
      if (!embed) {
        return;
      }
      const theme = this.$vuetify.theme;
      const colors = theme.computedThemes[theme.global.name].colors;
      for (const [name, value] of Object.entries(kicanvasPalette(colors))) {
        embed.style.setProperty(`--${name}`, value);
      }
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
      this.applyTheme();
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
