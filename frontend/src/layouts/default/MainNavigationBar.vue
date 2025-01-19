<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-navigation-drawer
    :rail="rail"
    permanent
  >
    <v-list-item
      title = "Ondsel Lens"
      :to="{name: 'LensHome'}"
    >
      <template v-slot:prepend>
        <v-img
          src="https://ondsel.com/img/Icon_Orange.svg"
          width="24"
          height="24"
          class="mr-8"
        ></v-img>
      </template>
    </v-list-item>
    <v-list-item
      :title = "currentOrganization?.name || 'public'"
      id="navbar-org-action-activator"
    >
      <template v-slot:prepend>
        <v-sheet
          v-if="loggedInUser"
          class="d-flex flex-column justify-center align-center text-uppercase mr-8"
          width="24"
          height="24"
          rounded="circle"
          color="grey-darken-2"
        >
          {{ getInitials(currentOrganization?.name || '?') }}
        </v-sheet>
        <v-sheet
          v-else
          class="d-flex flex-column justify-center align-center text-uppercase mr-8"
          width="24"
          height="24"
          rounded="circle"
          color="grey-darken-2"
        >
          -
        </v-sheet>
      </template>
    </v-list-item>
    <v-list-item
      :prepend-icon="railIcon"
      title = " "
      @click="rail = !rail"
    ></v-list-item>
    <v-list-item
      prepend-icon="mdi-magnify"
    >
      <v-text-field
        v-model="searchText"
        density="compact"
        label="Search..."
        :variant="rail ? 'plain' : 'outlined'"
        hide-details
        single-line
        @click:append-inner="doSearch"
        @keyup.enter="doSearch"
      ></v-text-field>
    </v-list-item>
    <v-list-item
      v-for="item in mainItems"
      :key="item.icon"
      :prepend-icon="item.icon"
      :to="item.route"
      :title="item.title"
      link
    ></v-list-item>
    <template #append>
      <v-list-item
        v-for="item in secondaryItems"
        :key="item.icon"
        :prepend-icon="item.icon"
        :to="item.route"
        :title="item.title"
        link
      ></v-list-item>
      <v-divider></v-divider>
      <v-list-item
        prepend-icon="mdi-copyright"
        title="2024 Ondsel Inc."
      ></v-list-item>
      <v-divider></v-divider>
      <v-list-item
        id="navbar-user-action-activator"
        v-if="loggedInUser"
      >
        <template #prepend>
          <v-sheet
            class="d-flex flex-column justify-center align-center text-uppercase mr-8"
            min-width="24"
            min-height="24"
            rounded="circle"
            color="grey"
          >
            {{ getInitials(loggedInUser.user.name) }}
          </v-sheet>
        </template>
        <template #title>
          <v-sheet
            class="d-flex flex-row justify-space-between"
          >
            <v-sheet>{{ loggedInUser.user.name }}</v-sheet>
            <v-icon>mdi-dots-vertical</v-icon>
          </v-sheet>
        </template>
      </v-list-item>
      <v-list-item
        v-else
        :to="{name: 'Login'}"
      >
        <template #prepend>
          <v-icon>mdi-login</v-icon>
        </template>
        <template #title>
          <template v-if="currentRouteName !== 'Login'">
            <v-btn
              variant="outlined"
              :to="{ name: 'Login' }"
              density="compact"
              class="navBarButtons"
            >
              Login
            </v-btn>
          </template>
          <template v-if="currentRouteName !== 'SignUp'">
            <v-btn
              variant="tonal"
              color="primary"
              :to="{ name: 'SignUp' }"
              density="compact"
              class="navBarButtons"
            >
              SignUp
            </v-btn>
          </template>
        </template>
      </v-list-item>
      <v-list-item
        :prepend-icon="railIcon"
        title = " "
        @click="rail = !rail"
      ></v-list-item>
    </template>
  </v-navigation-drawer>



  <v-menu
    activator="#navbar-org-action-activator"
    v-if="loggedInUser"
  >
    <v-card>
      <v-card-title>Select Organization</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="(organization, i) in user.organizations"
            :key="i"
            variant="text"
            flat
            :value="organization"
            :active="currentOrganization ? organization._id === currentOrganization._id : false"
          >
            <template #title>
              <v-sheet @click="goToOrganization(organization)">
                {{ organization.name }}
                <v-icon v-if="organization.type==='Open'" class="text-body-2" icon="mdi-earth" flag />
              </v-sheet>
            </template>
            <template #append>
              <v-btn
                color="decorative"
                flat
                icon="mdi-cog"
                @click="goToOrganizationEdit(organization)"
              ></v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
  <v-menu
    v-if="loggedInUser"
    activator="#navbar-user-action-activator"
    v-model="menu"
    :close-on-content-click="false"
    transition="slide-y-transition"
  >
    <v-card min-width="200">
      <v-list v-if="loggedInUser">
        <v-list-item
          :title="`${loggedInUser.user.name}`"
        >
        </v-list-item>
        <v-list-item>
          <v-btn
            variant="text"
            @click="gotoAccountSettings()"
          >
            account settings
          </v-btn>
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          @click="logout"
        >
          Logout
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
import { mapActions, mapState, mapGetters } from 'vuex';
import { getInitials } from '@/genericHelpers';
import OrganizationMixin from '@/mixins/organizationMixin';

export default {
  name: "MainNavigationBar",
  components: {},
  mixins: [ OrganizationMixin ],
  data: () => ({
    menu: false,
    searchText: '',
    drawer: null,
    rail: false,
  }),
  computed: {
    ...mapState('auth', { loggedInUser: 'payload' }),
    ...mapState('auth', ['user']),
    ...mapGetters('app', { userCurrentOrganization: 'currentOrganization' }),
    currentRouteName: (vm) => vm.$route.name,
    currentOrganization: (vm) => vm.userCurrentOrganization,
    railIcon () {
      return this.rail ? 'mdi-arrow-expand-right' : 'mdi-arrow-collapse-left'
    },
    isMobile() {
      return this.$vuetify.display.mobile;
    },
    mainItems() {
      const items = [
        {
          icon: 'mdi-folder-multiple-outline',
          title: 'Workspaces',
          condition: this.user && this.currentOrganization && this.currentOrganization?.type === 'Personal',
          route: {name: 'UserWorkspaces', params: {id: this.user?.username}}
        },
        {
          icon: 'mdi-folder-multiple-outline',
          title: 'Workspaces',
          condition: this.user && this.currentOrganization && this.currentOrganization?.type !== 'Personal',
          route: { name: 'OrganizationWorkspaces', params: { id: this.currentOrganization?.refName }}
        },
        {
          icon: 'mdi-cube-outline',
          title: 'Models',
          condition: this.user,
          route: {name: 'Models', params: {slug: this.user?.username}}
        },
        {
          icon: 'mdi-view-dashboard-outline',  // icon
          title:   `Public view of ${this.currentOrganization?.name}`,  // label
          condition: this.user && this.currentOrganization && this.currentOrganization?.type !== 'Personal',  // condition
          route: {name: 'OrganizationHome', params: {slug: this.currentOrganization?.refName}}  // route
        },
        {
          icon: 'mdi-earth',
          title:    'Public View of Me',
          condition: this.user && this.currentOrganization && this.currentOrganization?.type === 'Personal',
          route: {name: 'UserHome', params: {slug: this.user?.username}}
        },
        {
          icon: 'mdi-dots-square',
          title: 'Public ShareLinks',
          condition: true,
          route: {name: 'PublicModels'}
        },
      ];
      return items.filter(item => item.condition);
    },
    secondaryItems() {
      return [
        {
          icon: 'mdi-bell-outline',
          title: 'Notifications',
          condition: this.user,
          route: {name: 'MyNotifications'}
        },
        {
          icon: 'mdi-inbox',
          title: 'Shared With Me',
          condition: this.user,
          route: {name: 'SharedWithMe'}
        },
        {
          icon: 'mdi-bookmark-outline',
          title: 'Bookmarks',
          condition: this.user,
          route: {name: 'Bookmarks'}
        },
        {
          icon: 'mdi-download-outline',
          title: 'Download Ondsel ES',
          condition: true,
          route: {name: 'DownloadAndExplore'}
        },
      ].filter(item => item.condition);
    },
  },
  methods: {
    getInitials,
    ...mapActions('auth', {authLogout: 'logout'}),
    logout() {
      this.authLogout().then(() => this.$router.push({ name: 'Logout' }));
      this.menu = false;
    },
    gotoAccountSettings() {
      this.$router.push({name: 'AccountSettings', params: {slug: this.user.username}});
      this.menu = false;
    },
    adjustRail() {
      this.rail = !!this.isMobile;
    },
    doSearch() {
      this.rail = false;
      if (this.searchText) {
        this.$router.push({ name: 'SearchResults', params: { text: this.searchText } });
      }
    },
  },
  async created() {
    this.adjustRail();
  },
  watch: {
    async 'isMobile'(to, from) {
      this.adjustRail();
    },
    async '$route'(to, from) {
      if (this.isMobile) {
        this.rail = true;
      }
    },
  }
}
</script>


<style scoped>
.navBarButtons {
  margin-right: 2px;
  padding-left: 12px;
  padding-right: 12px;
}
</style>
