<!--
SPDX-FileCopyrightText: 2026 Frédéric Druppel <contact@fredcorp.cc>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title>Manage Users</v-card-title>
    <v-card-subtitle>
      <v-btn
        density="default"
        icon="mdi-home"
        color="success"
        @click="$router.push({ name: 'XavierMenu', params: {} })"
      ></v-btn>
      <b><i>Professor Xavier's School For The Hidden</i></b>
    </v-card-subtitle>
    <v-card-text>
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search users..."
        variant="outlined"
        density="compact"
        clearable
        class="mb-4"
      ></v-text-field>

      <v-progress-linear
        v-if="isLoading"
        indeterminate
        color="primary"
        class="mb-4"
      ></v-progress-linear>

      <v-table v-if="!isLoading">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th class="text-center">Admin</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filteredUsers" :key="u._id">
            <td>{{ u.name }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.email }}</td>
            <td class="text-center">
              <v-switch
                :model-value="isUserAdmin(u)"
                color="primary"
                density="compact"
                hide-details
                class="d-flex justify-center"
                :disabled="pendingUserId === u._id || u._id === currentUser._id"
                @update:model-value="toggleAdmin(u, $event)"
              ></v-switch>
            </td>
            <td class="text-center">
              <v-btn
                icon="mdi-delete"
                color="error"
                variant="text"
                size="small"
                :disabled="pendingUserId === u._id || u._id === currentUser._id"
                @click="confirmDelete(u)"
              ></v-btn>
            </td>
          </tr>
          <tr v-if="filteredUsers.length === 0">
            <td colspan="5" class="text-center text-grey pa-4">
              No users found.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <!-- Delete confirmation dialog -->
  <v-dialog v-model="deleteDialog" max-width="480">
    <v-card>
      <v-card-title class="text-error">Delete User</v-card-title>
      <v-card-text>
        Are you sure you want to delete <b>{{ userToDelete?.name }}</b> ({{
          userToDelete?.email
        }})? This action is <b>not reversible</b>.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn
          color="error"
          variant="elevated"
          :loading="isDeleting"
          @click="doDelete"
          >Delete</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="showSnackbar" :timeout="4000" :color="snackbarColor">
    {{ snackbarMessage }}
  </v-snackbar>
</template>

<script>
import { mapActions, mapState } from "vuex";
import { models } from "@feathersjs/vuex";
import { crc32 } from "@/refNameFunctions";

const { User, Organization } = models.api;

export default {
  name: "XavierManageUsers",
  data() {
    return {
      users: [],
      adminOrg: null,
      isLoading: true,
      search: "",
      pendingUserId: null,
      deleteDialog: false,
      userToDelete: null,
      isDeleting: false,
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "success",
    };
  },
  computed: {
    ...mapState("auth", ["user"]),
    currentUser() {
      return this.user || {};
    },
    filteredUsers() {
      if (!this.search) return this.users;
      const q = this.search.toLowerCase();
      return this.users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    },
  },
  async created() {
    if (!(await this.isSiteAdministrator())) {
      this.$router.push({ name: "LensHome", params: {} });
      return;
    }
    await this.loadUsers();
  },
  methods: {
    ...mapActions("app", ["isSiteAdministrator"]),
    async loadUsers() {
      this.isLoading = true;
      try {
        const orgResult = await Organization.find({
          query: { refName: "AdminOrganization" },
        });
        this.adminOrg = orgResult?.data?.[0] || null;

        const result = await User.find({ query: { $limit: 200 } });
        this.users = result?.data || [];
      } catch (error) {
        console.error("Failed to load users:", error);
        this.showMessage("Failed to load users", "error");
      } finally {
        this.isLoading = false;
      }
    },
    isUserAdmin(u) {
      if (!this.adminOrg?.users) return false;
      const orgUser = this.adminOrg.users.find(
        (o) => o._id?.toString() === u._id?.toString()
      );
      return orgUser?.isAdmin === true;
    },
    async toggleAdmin(u, makeAdmin) {
      this.pendingUserId = u._id;
      try {
        if (makeAdmin) {
          const alreadyInOrg = this.adminOrg?.users?.some(
            (o) => o._id?.toString() === u._id?.toString()
          );
          if (!alreadyInOrg) {
            await Organization.patch(this.adminOrg._id, {
              shouldAddUsersToOrganization: true,
              userIds: [u._id.toString()],
            });
          }
          await Organization.patch(this.adminOrg._id, {
            shouldGiveAdminAccessToUsersOfOrganization: true,
            userIds: [u._id.toString()],
          });
          this.showMessage(`${u.name} is now an admin`, "success");
        } else {
          await Organization.patch(this.adminOrg._id, {
            shouldRevokeAdminAccessFromUsersOfOrganization: true,
            userIds: [u._id.toString()],
          });
          this.showMessage(`${u.name} is no longer an admin`, "success");
        }
        await this.loadUsers();
      } catch (error) {
        console.error("Failed to toggle admin:", error);
        this.showMessage(
          error.message || "Failed to update admin status",
          "error"
        );
      } finally {
        this.pendingUserId = null;
      }
    },
    confirmDelete(u) {
      this.userToDelete = u;
      this.deleteDialog = true;
    },
    async doDelete() {
      if (!this.userToDelete) return;
      this.isDeleting = true;
      try {
        const crcValue = crc32(this.userToDelete.email);
        const target = this.userToDelete._id + "z" + crcValue.toString();
        const result = await User.remove(target);
        if (result?.success === false) {
          this.showMessage(result.message || "Deletion failed", "error");
        } else {
          this.showMessage(
            `User ${this.userToDelete.name} deleted successfully`,
            "success"
          );
          this.deleteDialog = false;
          this.userToDelete = null;
          await this.loadUsers();
        }
      } catch (error) {
        console.error("Failed to delete user:", error);
        this.showMessage(error.message || "Failed to delete user", "error");
      } finally {
        this.isDeleting = false;
      }
    },
    showMessage(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.showSnackbar = true;
    },
  },
};
</script>

<style scoped></style>
