<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-treeview
    v-if="model3d"
    :items="treeViewItems"
    item-props
    slim
    selectable
    activatable
    open-on-click
    height="90%"
    density="compact"
    select-strategy="single-independent"
    style="position: absolute; top: 70px; max-width: 25%; background: transparent;"
  >
    <template v-slot:title="{ item }">
      <span class="object-title" :title="item.title">{{ item.title }}</span>
    </template>
    <template v-slot:prepend="{ item, open }">
      <v-checkbox v-model="selectedObjects[item.uuid]" density="compact" hide-details @click.stop="objectSelected(item)"/>
      <v-btn
        :icon="item.visibility? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
        variant="text"
        flat
        @click.stop="toggleVisibility(item)"
      />
    </template>
    <template v-slot:append="{ item, open }">
      <v-btn
        v-if="linkedObjects.hasOwnProperty(item.realName)"
        icon="mdi-open-in-new"
        variant="text"
        @click.stop="openAssemblyObjectInfoDialog(item.realName)"
      />
    </template>
  </v-treeview>
  <AssemblyObjectInfoDialog ref="assemblyObjectInfoDialog" />
</template>

<script>
import AssemblyObjectInfoDialog from '@/components/AssemblyObjectInfoDialog.vue';

export default {
  name: "ObjectsListView",
  emits: ['selectGivenObject'],
  components: {AssemblyObjectInfoDialog},
  props: {
    model: {
      type: Object,
      required: false,
    }
  },
  data: () => ({
    viewer: null,
    open: ['Objects'],
    active: [],
    selectedObjsUuid: [],
  }),
  computed: {
    model3d: vm => vm.viewer ? vm.viewer.model : null,
    objects3d: vm => vm.viewer ? vm.viewer.model.objects3d : null,
    linkedObjects: vm => vm.viewer ? vm.viewer.importer.activeImporter?.document?.LinkedFiles() || {} : {},
    treeViewItems() {
      function convertToTitleObject(modelObject) {
        let result = {
          id: modelObject.uuid,
          title: modelObject.GetLabel(),
          uuid: modelObject.uuid,
          visibility: modelObject.GetVisibility(),
          realName: modelObject.GetRealName(),
        };

        if (modelObject.children.length > 0) {
          result.children = modelObject.children.map(child => convertToTitleObject(child));
        }

        return result;
      }
      return this.model3d ? this.model3d.GetRootObjects().map(root => convertToTitleObject(root)) : [];
    },
    selectedObjects() {
      const data = {};
      if (this.model3d) {
        this.model3d.GetObjects().forEach(o => {
          data[o.uuid] = this.selectedObjsUuid.some(uuid => uuid === o.uuid);
        })
      }
      return data;
    },
    activated() {
      return this.model3d ? this.model3d.GetRootObjects().map(m => m.uuid) : [];
    }
  },
  methods: {
    objectSelected(item) {
      const object3d = this.model3d.findObjectByUuid(item.uuid);
      const isObjSelected = this.selectedObjects[item.uuid];

      for (let obj of [object3d, ...object3d.GetAllChildren()]) {
        if (isObjSelected === this.selectedObjects[obj.uuid]) {
          this.viewer.selectGivenObject(obj);
          if (this.viewer.selectedObjs.some(selectedObj => selectedObj.uuid === obj.uuid)) {
            this.selectedObjsUuid.push(obj.uuid);
          } else {
            const index = this.selectedObjsUuid.indexOf(obj.uuid);
            if (index > -1) {
              this.selectedObjsUuid.splice(index, 1);
            }
          }
        }
      }
    },
    selectListItem(object3d) {
      const index = this.selectedObjsUuid.indexOf(object3d.uuid);
      if (index > -1) {
        this.selectedObjsUuid.splice(index, 1);
      } else {
        this.selectedObjsUuid.push(object3d.uuid);
      }
    },
    openAssemblyObjectInfoDialog(objectName) {
      if (this.model && this.linkedObjects.hasOwnProperty(objectName)) {
        this.$refs.assemblyObjectInfoDialog.openDialog(this.model.file.directory._id, this.linkedObjects[objectName]);
      }
    },
    toggleVisibility(item) {
      const object3d = this.model3d.findObjectByUuid(item.uuid);
      object3d.ToggleVisibility();
    },
  }
}

</script>

<style scoped>
.object-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
