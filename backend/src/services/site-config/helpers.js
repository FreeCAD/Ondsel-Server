// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const OAUTH_SECRET_MASKED_VALUE = '***MASKED***'

export const filterOAuthDataForAdmin = (oauthData) => {
  if (!oauthData?.providers) return oauthData
  const filteredProviders = {}
  for (const [providerName, providerData] of Object.entries(oauthData.providers)) {
    if (providerData) {
      if (providerData.clientSecret) {
        filteredProviders[providerName] = {
          ...providerData,
          clientSecret: OAUTH_SECRET_MASKED_VALUE
        }
      } else {
        filteredProviders[providerName] = providerData
      }
    }
  }
  return {
    providers: filteredProviders
  }
}

export const filterOAuthDataForPublic = (oauthData) => {
  if (!oauthData?.providers) return oauthData
  return {
    providers: {
      google: oauthData.providers.google ? { enabled: oauthData.providers.google.enabled } : undefined,
      github: oauthData.providers.github ? { enabled: oauthData.providers.github.enabled } : undefined,
      oidc: oauthData.providers.oidc ? { enabled: oauthData.providers.oidc.enabled, signInWithName: oauthData.providers.oidc.signInWithName } : undefined
    }
  }
}

export const filterSiteConfigForPublic = (siteConfig) => {
  if (!siteConfig) return siteConfig
  return {
    _id: siteConfig._id,
    logoUrl: siteConfig.logoUrl,
    faviconUrl: siteConfig.faviconUrl,
    siteTitle: siteConfig.siteTitle,
    socialLinks: siteConfig.socialLinks,
    copyrightText: siteConfig.copyrightText,
    footer: siteConfig.footer,
    homepageContent: siteConfig.homepageContent,
    desktopApp: siteConfig.desktopApp,
    oauth: filterOAuthDataForPublic(siteConfig.oauth),
  }
}

export const filterMaskedOAuthSecretsFromPatch = (oauthData, existingOAuthData) => {
  if (!oauthData?.providers) return oauthData

  const filteredProviders = {}
  for (const [providerName, providerData] of Object.entries(oauthData.providers)) {
    if (providerData) {
      const { clientSecret, ...rest } = providerData
      if (clientSecret === OAUTH_SECRET_MASKED_VALUE) {
        const existingProvider = existingOAuthData?.providers?.[providerName]
        if (existingProvider?.clientSecret) {
          filteredProviders[providerName] = {
            ...rest,
            clientSecret: existingProvider.clientSecret
          }
        } else {
          filteredProviders[providerName] = rest
        }
      } else {
        filteredProviders[providerName] = providerData
      }
    }
  }

  return {
    providers: filteredProviders
  }
}
