// SPDX-FileCopyrightText: 2026 William Dunn <william.dunn@quasarke.net>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// An OAuth sign-in leaves the SPA and returns at /oauth-complete, so a
// redirect_uri handed to /login has to survive a full page load. sessionStorage
// is scoped to the tab and cleared when it closes, which suits a one-shot hop.
export const OAUTH_REDIRECT_KEY = "ondsel.oauthRedirect";

// Only ever return somewhere on this origin. A value that arrived as a query
// parameter must not be able to bounce an authenticated visitor off-site.
export function takeSafeOAuthRedirect() {
  let raw = null;
  try {
    raw = window.sessionStorage.getItem(OAUTH_REDIRECT_KEY);
    window.sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  } catch (error) {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch (error) {
    return null;
  }
}
