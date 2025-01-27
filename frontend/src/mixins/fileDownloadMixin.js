// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import axios from 'axios';
import { mapState } from 'vuex';

const uploadEndpoint = `${import.meta.env.VITE_APP_API_URL}upload`

export default {
  data: () => ({
    isFileDownloadInProgress: false,
  }),
  computed: {
    ...mapState('auth', ['accessToken']),
  },
  methods: {
    async downloadFile(uniqueFileName, custFileName) {
      this.isFileDownloadInProgress = true;
      const fileEndpoint = `${uploadEndpoint}/${encodeURIComponent(uniqueFileName)}`;
      const res = await axios(
        {
          method: 'GET',
          url: fileEndpoint,
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      )
      const resBlob = await axios({
        url: res.data.url,
        method: 'GET',
        responseType: 'blob',
      })
      const fileUrl = window.URL.createObjectURL(new Blob([resBlob.data]));
      const docUrl = document.createElement('a');
      docUrl.href = fileUrl;
      docUrl.setAttribute('download', custFileName);
      document.body.appendChild(docUrl);
      docUrl.click();
      this.isFileDownloadInProgress = false;
    },
  }
}

