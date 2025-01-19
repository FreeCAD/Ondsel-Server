// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'

import Home from "@/views/Home";
import SignUp from "@/views/SignUp";
import ChooseTier from "@/views/ChooseTier.vue";
import Login from '@/views/Login';
import Share from '@/views/Share';
import Models from '@/views/Models';
import PageNotFound from '@/views/PageNotFound';
import PublicModels from '@/views/PublicModels';
import InitialPurchaseForPeer from "@/views/InitialPurchaseForPeer.vue";
import DowngradeToSolo from "@/views/DowngradeToSolo.vue";
import CancelTierChange from "@/views/CancelTierChange.vue";
import LegalDoc from "@/views/LegalDoc.vue";
import AccountSettings from "@/views/AccountSettings.vue";
import AccountHistory from "@/views/AccountHistory.vue";
import VerifyEmail from "@/views/VerifyEmail.vue";
import PendingVerification from "@/views/PendingVerification.vue";
import ChangePassword from "@/views/ChangePassword.vue";
import CreateOrganization from '@/views/CreateOrganization';
import EditOrganization from '@/views/EditOrganization';
import EditGroup from '@/views/EditGroup';
import JoinOrganization from '@/views/JoinOrganization';
import WorkspaceHome from '@/views/WorkspaceHome.vue';
import EditWorkspace from '@/views/EditWorkspace.vue';
import OrganizationWorkspaces from "@/views/OrganizationWorkspaces.vue";
import UserWorkspaces from "@/views/UserWorkspaces.vue";
import LensHome from "@/views/LensHome.vue";
import OrganizationHome from "@/views/OrganizationHome.vue";
import PermissionError from "@/views/PermissionError.vue";
import UserHome from "@/views/UserHome.vue";
import SearchResults from "@/views/SearchResults.vue";
import DownloadAndExplore from "@/views/DownloadAndExplore.vue";
import GettingStarted from "@/views/GettingStarted.vue";
import XavierMenu from "@/views/XavierMenu.vue";
import XavierUpdateKeyDocuments from "@/views/XavierUpdateKeyDocuments.vue";
import Bookmarks from "@/views/Bookmarks.vue";
import XavierSearchResults from "@/views/XavierSearchResults.vue";
import XavierRemoveUser from "@/views/XavierRemoveUser.vue";
import SharedWithMe from "@/views/SharedWithMe.vue";
import MyNotifications from "@/views/MyNotifications.vue";
import WorkspaceFile from "@/views/WorkspaceFile.vue";
import WorkerErrorCodes from "@/views/WorkerErrorCodes.vue";
import XavierUpdateSoftwareReleases from "@/views/XavierUpdateSoftwareReleases.vue";


const isWindowLoadedInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}


const routes = [
  {
    path: '/model/:id?',
    component: Home,
    name: 'Home',
    meta: { tryAuth: true },
  },
  {
    path: '/create_organization',
    component: CreateOrganization,
    name: 'CreateOrganization',
    meta: { requiresAuth: true },
  },
  // {
  //   path: '/signup',
  //   component: SignUp,
  //   name: 'SignUp',
  // },
  {
    path: '/getting-started',
    component: GettingStarted,
    name: 'GettingStarted',
    meta: { tryAuth: true },
  },
  {
    path: '/legal-document/:doc_name',
    component: LegalDoc,
    name: 'LegalDoc',
  },
  {
    path: '/choose-tier',
    component: ChooseTier,
    name: 'ChooseTier',
    meta: { requiresAuth: true },
  },
  {
    path: '/initial-purchase-for-peer/:stripe_session_id',
    component: InitialPurchaseForPeer,
    name: 'InitialPurchaseForPeer',
    meta: { requiresAuth: true },
  },
  {
    path: '/downgrade-to-solo',
    component: DowngradeToSolo,
    name: 'DowngradeToSolo',
    meta: { requiresAuth: true },
  },
  {
    path: '/cancel-tier-change',
    component: CancelTierChange,
    name: 'CancelTierChange',
    meta: { requiresAuth: true },
  },
  {
    // this strange pattern is used to later "auto-close" the pending verification page after 30 seconds.
    // Without the "open" replacing "_self", the page is not controlled by the script. Then you would get a
    // "Scripts may close only the windows that were opened by it." error message when attempting to `window.close()`.
    path: '/redirect-to-pending-verification',
    redirect: to => {
      window.open('/pending-verification', "_self");
      return { path: ''}
    },
    name: 'RedirectToPendingVerification',
  },
  {
    path: '/pending-verification',
    component: PendingVerification,
    name: 'PendingVerification',
    meta: { tryAuth: true },
  },
  {
    path: '/verify-email/:token/:uid',
    component: VerifyEmail,
    name: 'VerifyEmail',
    meta: { tryAuth: true },
  },
  {
    path: '/change-password/:token/:uid',
    component: ChangePassword,
    name: 'ChangePassword',
    meta: { tryAuth: true },
  },
  {
    path: '/login',
    component: Login,
    name: 'Login',
  },
  {
    path: '/exit-login',
    component: Login,
    name: 'Logout', // this version of the "Login" page is for logging out.
  },
  {
    path: '/share/:id',
    component: Share,
    name: 'Share',
    meta: { tryAuth: true, checkIframe: true },
  },
  {
    path: '/404',
    component: PageNotFound,
    name: 'PageNotFound',
    meta: { tryAuth: true },
  },
  {
    path: '/org/:slug/504/:urlCode',
    component: PermissionError,
    name: 'PermissionError',
    meta: { requiresAuth: true },
  },
  {
    path: '/join-org/:token/:id',
    component: JoinOrganization,
    name: 'JoinOrganization',
    meta: { requiresAuth: true },
  },
  {
    path: '/search-results/:text',
    component: SearchResults,
    name: 'SearchResults',
    meta: { tryAuth: true },
  },
  {
    path: '/download-and-explore',
    component: DownloadAndExplore,
    name: 'DownloadAndExplore'
  },
  {
    path: '/bookmarks',
    component: Bookmarks,
    name: 'Bookmarks',
    meta: { requiresAuth: true },
  },
  {
    path: '/shared-with-me',
    component: SharedWithMe,
    name: 'SharedWithMe',
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    component: MyNotifications,
    name: 'MyNotifications',
    meta: { requiresAuth: true },
  },
  {
    path: '/payment-processor-redirect/:prefilled_email/:utm_content',
    redirect: to => {
      let stripePurchasePeerUrl = import.meta.env.VITE_STRIPE_PURCHASE_PEER_URL;
      let prefilled_email = to.params.prefilled_email;
      let utm_content = to.params.utm_content;
      let url = `${stripePurchasePeerUrl}?prefilled_email=${prefilled_email}&utm_content=${utm_content}`;
      window.open(url, "_blank");
      return { path: ''} // don't actually go anywhere internally
    },
    name: 'PaymentProcessorForPeerSubscription',
    meta: { requiresAuth: true },
  },
  //
  // XAVIER pages
  //
  {
    path: '/xavier-68373833',
    component: XavierMenu,
    name: 'XavierMenu',
    meta: { requiresAuth: true },
  },
  {
    path: '/xavier-9384242',
    component: XavierUpdateSoftwareReleases,
    name: 'XavierUpdateSoftwareReleases',
    meta: { requiresAuth: true },
  },
  {
    path: '/xavier-7492783/:name',
    component: XavierUpdateKeyDocuments,
    name: 'XavierUpdateKeyDocuments',
    meta: { requiresAuth: true },
  },
  {
    path: '/xavier-55554337898',
    component: XavierRemoveUser,
    name: 'XavierRemoveUser',
    meta: { requiresAuth: true },
  },
  {
    path: '/xavier-9584355633/:text',
    component: XavierSearchResults,
    name: 'XavierSearchResults',
    meta: { tryAuth: true },
  },
  //
  // ONDSEL pages
  //
  {
    path: '/',
    component: LensHome,
    name: 'LensHome',
    meta: { tryAuth: true },
  },
  {
    path: '/public-models',
    component: PublicModels,
    name: 'PublicModels',
    meta: { tryAuth: true },
  },
  //
  // USER pages
  //
  {
    path: '/user/:slug',
    component: UserHome,
    name: 'UserHome',
    meta: { tryAuth: true },
  },
  {
    path: '/user/:id/workspaces',
    component: UserWorkspaces,
    name: 'UserWorkspaces',
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:slug/just-models',
    component: Models,
    name: 'Models',
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:slug/settings',
    component: AccountSettings,
    name: 'AccountSettings',
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:slug/account-history',
    component: AccountHistory,
    name: 'AccountHistory',
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:slug/workspace/:wsname',
    component: WorkspaceHome,
    name: 'UserWorkspaceHome',
    meta: { tryAuth: true },
  },
  {
    path: '/user/:slug/workspace/:wsname/dir/:dirid',
    component: WorkspaceHome,
    name: 'UserWorkspaceDir',
    meta: { tryAuth: true },
  },
  {
    path: '/user/:slug/workspace/:wsname/edit',
    component: EditWorkspace,
    name: 'UserEditWorkspace',
    meta: { requiresAuth: true },
  },
  {
    path: '/user/:slug/workspace/:wsname/file/:fileid',
    component: WorkspaceFile,
    name: 'UserWorkspaceFile',
    meta: { tryAuth: true },
  },
  //
  // ORG pages
  //
  {
    path: '/org/:slug',
    component: OrganizationHome,
    name: 'OrganizationHome',
    meta: { tryAuth: true },
  },
  {
    path: '/org/:id/workspaces',
    component: OrganizationWorkspaces,
    name: 'OrganizationWorkspaces',
    meta: { requiresAuth: true },
  },
  {
    path: '/org/:id/edit',
    component: EditOrganization,
    name: 'EditOrganization',
    meta: { requiresAuth: true },
  },
  {
    path: '/org/:slug/group/:id/edit',
    component: EditGroup,
    name: 'EditGroup',
    meta: { requiresAuth: true },
  },
  {
    path: '/org/:slug/workspace/:wsname',
    component: WorkspaceHome,
    name: 'OrgWorkspaceHome',
    meta: { tryAuth: true },
  },
  {
    path: '/org/:slug/workspace/:wsname/dir/:dirid',
    component: WorkspaceHome,
    name: 'OrgWorkspaceDir',
    meta: { tryAuth: true },
  },
  {
    path: '/org/:slug/workspace/:wsname/edit',
    component: EditWorkspace,
    name: 'OrgEditWorkspace',
    meta: { requiresAuth: true },
  },
  {
    path: '/org/:slug/workspace/:wsname/file/:fileid',
    component: WorkspaceFile,
    name: 'OrgWorkspaceFile',
    meta: { tryAuth: true },
  },
  {
    path: '/error-codes',
    component: WorkerErrorCodes,
    name: 'WorkerErrorCodes',
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const link = router.resolve(to.path);
  if (link.matched.length === 0) {
    next('/404');
    return;
  }

  window._paq.push(["setCustomUrl", to.fullPath]);
  window._paq.push(["setDocumentTitle", to.name]);

  if (to.meta && to.meta.checkIframe) {
    to.meta.isWindowLoadedInIframe = isWindowLoadedInIframe();
  }

  if (link.name === 'Login' || link.name === 'SignUp' || link.name === 'Logout') {
    try {
      let detail = await store.dispatch('auth/authenticate');
      if (detail?.user?.username) {
        window._paq.push(["setUserId", detail.user.username]);
      }
      window._paq.push(["trackPageView"]);
      next({ name: 'LensHome' });
      return;
    } catch (err) {
      // The "catch" scenario is, ironically, the normal flow. Users generally go to the Login/Signup/"Logout" page
      // when they are NOT logged in.
      if (link.name === 'Logout') {
        window._paq.push(['resetUserId']); // just in case the User has just logged out, we reset the User ID
        window._paq.push(['appendToTrackingUrl', 'new_visit=1']); // force a new visit
        window._paq.push(['trackPageView']);
        window._paq.push(['appendToTrackingUrl', '']); // needed for a single page app like this one
      }
    }
  }
  else if (to.meta && to.meta.requiresAuth) {
    try {
      let detail = await store.dispatch('auth/authenticate');
      if (detail?.user?.username) {
        window._paq.push(["setUserId", detail.user.username]);
      }
    } catch (err) {
      if (to.meta.nonAuthenticatedUsersPointsToUrl) {
        next({ name: to.meta.nonAuthenticatedUsersPointsToUrl });
      } else {
        next({ name: 'Login', query: { redirect_uri: window.location.origin + to.fullPath } });
      }
      window._paq.push(["trackPageView"]);
      return;
    }
  }
  else if (to.meta && to.meta.tryAuth) {
    try {
      let detail = await store.dispatch('auth/authenticate');
      if (detail?.user?.username) {
        window._paq.push(["setUserId", detail.user.username]);
      }
    } catch (err) {
    }
  }
  window._paq.push(["trackPageView"]);
  next();
});

export default router
