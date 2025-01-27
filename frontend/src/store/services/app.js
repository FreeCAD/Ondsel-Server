// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { models } from '@feathersjs/vuex';
import axios from "axios";


const state = {
  currentOrganization: null
}

function isObjectId(str) {
  // Define the ObjectId pattern
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;

  // Check if the string matches the ObjectId pattern
  return objectIdPattern.test(str);
}

export default {
  namespaced: true,
  state,
  getters: {
    currentOrganization (state, getters, rootState, rootGetters) {
      if (state.currentOrganization) {
        return state.currentOrganization;
      }
      const user = rootGetters['auth/user'];
      if (user && user.currentOrganizationId) {
        const [organization] = user.organizations.filter(org => org._id === user.currentOrganizationId);
        return organization;
      }
      return null;
    },
    selfName (state, getters, rootState, rootGetters) {
      let org = null;
      if (state.currentOrganization) {
        org = state.currentOrganization;
      } else {
        const user = rootGetters['auth/user'];
        if (user && user.currentOrganizationId) {
          const [organization] = user.organizations.filter(org => org._id === user.currentOrganizationId);
          org = organization;
        }
      }
      if (org) {
        if (org.type === 'Personal') {
          return "yourself";
        } else {
          return "organization " + org.name;
        }
      }
      return "nobody";
    },
    selfPronoun (state, getters, rootState, rootGetters) {
      let org = null;
      if (state.currentOrganization) {
        org = state.currentOrganization;
      } else {
        const user = rootGetters['auth/user'];
        if (user && user.currentOrganizationId) {
          const [organization] = user.organizations.filter(org => org._id === user.currentOrganizationId);
          org = organization;
        }
      }
      if (org) {
        if (org.type === 'Personal') {
          return "you";
        } else {
          return "organization " + org.name;
        }
      }
      return "nobody";
    },
  },
  mutations: {
    SET_CURRENT_ORGANIZATION: (stateIn, organization) => {
      stateIn.currentOrganization = organization;
    }
  },
  actions: {
    setCurrentOrganization: (context, organization) => {
      context.commit('SET_CURRENT_ORGANIZATION', organization);

      // Save to DB
      models.api.User.patch(context.rootState.auth.user._id, { currentOrganizationId: organization._id });
    },
    getOrgByIdOrNamePublic: async (context, name) => {
      // get the public details of any organization using _id or refName (slug)
      let result = undefined;
      let orgResult;
      if (isObjectId(name)) {
        orgResult = await models.api.Organization.find({
          query: {
            publicInfo: "true",
            $or: [
              {_id: name},
              {refName: name},
            ]
          }
        });
      } else {
        orgResult = await models.api.Organization.find({
          query: {
            publicInfo: "true",
            refName: name,
          }
        });
      }
      if (orgResult.total === 1) {
        result = orgResult.data[0];
      }
      return result;
    },
    getUserByIdOrNamePublic: async (context, name) => {
      // get the public details of any user using _id or username

      // using direct axios query to bypass find/get bug
      //
      const base = import.meta.env.VITE_APP_API_URL;
      let query = `${base}users?username=${name}&publicInfo=true`;
      if (isObjectId(name)) {
        query = `${base}users?_id=${name}&publicInfo=true`;
      }
      let response = await axios.get(query);
      if (response.data) {
        if (response.data.total === 1) {
          return response.data.data[0];
        }
      }
      return undefined;
    },
    getWorkspaceByNamePrivate: async (context, detail) => {
      // get the private details of workspace via refName "slug"

      let result = undefined;
      let wsResult
      try {
        wsResult = await models.api.Workspace.find({
          query: {
            refName: detail.wsName,
            "organization.refName": detail.orgName
          }
        })
      } catch (e) {
        // console.log(`  >>> ERROR ${e}`);
        // console.log(e);
      }
      if (wsResult?.total === 1) {
        let wsMissingVirtualFields = wsResult.data[0];
        result = await models.api.Workspace.get(wsMissingVirtualFields._id);
      }
      return result;
    },
    getWorkspaceByNamePublic: async (context, detail) => {
      // get the public details of workspace via refName "slug"

      let result = undefined;
      let wsResult
      try {
        wsResult = await models.api.Workspace.find({
          query: {
            publicInfo: "true",
            refName: detail.wsName,
            "organization.refName": detail.orgName
          }
        })
      } catch (e) {
        console.log(`  >>> ERROR ${e}`);
        console.log(e);
      }
      if (wsResult?.total === 1) {
        result = wsResult.data[0];
        result.haveWriteAccess = false; // this is not set on a 'find' so we are explicitly setting it here
      }
      return result;
    },
    getWorkspaceByIdPublic: async (context, workspaceId) => {
      // get the public details of any workspace using _id

      // the following flat-out does not work for user; don't know WHY; so making it two direct queries instead
      // not even non-$or queries work
      //
      try {
        const userResult = await models.api.Workspace.get(
          workspaceId,
          {
            query: {
              publicInfo: "true",
            }
          });
        return userResult;
      } catch (e) {
        return undefined;
      }
    },
    getDirectoryByIdPublic: async (context, dirId) => {
      // get the public details of any directory in an open workspace
      try {
        const dirResult = await models.api.Directory.get(
          dirId,
          {
            query: {
              publicInfo: "true",
            }
          });
        return dirResult;
      } catch (e) {
        return undefined;
      }
    },
    getFileByIdPublic: async (context, fileId) => {
      // get the public details of any directory in an open workspace
      try {
        const fileResult = await models.api.File.get(
          fileId,
          {
            query: {
              publicInfo: "true",
            }
          });
        return fileResult;
      } catch (e) {
        return undefined;
      }
    },
    retrieveFileByUniqueName: async (context, detail) => {
      const uniqueFileName = encodeURIComponent(detail.uniqueFileName);
      const accessToken = detail.accessToken;
      const uploadEndpoint = `${import.meta.env.VITE_APP_API_URL}upload`
      const fileEndpoint = `${uploadEndpoint}/${uniqueFileName}`;
      const res = await axios(
        {
          method: 'GET',
          url: fileEndpoint,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      const resBlob = await axios({
        url: res.data.url,
        method: 'GET',
        responseType: 'blob',
      })
      const content = await resBlob.data.text();
      return content;
    },
  }
}
