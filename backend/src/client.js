// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import authenticationClient from '@feathersjs/authentication-client'
import { userEngagementsClient } from './services/user-engagements/user-engagements.shared.js'

import { notificationsClient } from './services/notifications/notifications.shared.js'

import { orgSecondaryReferencesClient } from './services/org-secondary-references/org-secondary-references.shared.js'

import { preferencesClient } from './services/preferences/preferences.shared.js'

import { keywordsClient } from './services/keywords/keywords.shared.js'

import { orgInvitesClient } from './services/org-invites/org-invites.shared.js'

import { directoryClient } from './services/directories/directories.shared.js'

import { groupClient } from './services/groups/groups.shared.js'

import { workspaceClient } from './services/workspaces/workspaces.shared.js'

import { organizationClient } from './services/organizations/organizations.shared.js'

import { authManagementClient } from './services/auth-management/auth-management.shared.js'

import { runnerLogsClient } from './services/runner-logs/runner-logs.shared.js'

import { codeRunsClient } from './services/code-runs/code-runs.shared.js'

import { macrosClient } from './services/macros/macros.shared.js'

import { accountEventClient } from './services/account-event/account-event.shared.js'

import { acceptAgreementClient } from './services/agreements/accept/accept.shared.js'

import { agreementsClient } from './services/agreements/agreements.shared.js'

import { fileClient } from './services/file/file.shared.js'

import { sharedModelsClient } from './services/shared-models/shared-models.shared.js'

import { modelClient } from './services/models/models.shared.js'

import { uploadClient } from './services/upload/upload.shared.js'

import { userClient } from './services/users/users.shared.js'

import { downloadClient } from './services/download/download.shared.js'

import { publisherClient } from './services/publisher/publisher.shared.js'

import { siteConfigClient } from './services/site-config/site-config.shared.js'

/**
 * Returns a  client for the backend app.
 *
 * @param connection The REST or Socket.io Feathers client connection
 * @param authenticationOptions Additional settings for the authentication client
 * @see https://dove.feathersjs.com/api/client.html
 * @returns The Feathers client application
 */
export const createClient = (connection, authenticationOptions = {}) => {
  const client = feathers()

  client.configure(connection)
  client.configure(authenticationClient(authenticationOptions))
  client.set('connection', connection)

  client.configure(userClient)

  client.configure(uploadClient)

  client.configure(modelClient)

  client.configure(sharedModelsClient)

  client.configure(fileClient)

  client.configure(accountEventClient)

  client.configure(agreementsClient)

  client.configure(acceptAgreementClient)

  client.configure(runnerLogsClient)

  client.configure(codeRunsClient)

  client.configure(macrosClient)

  client.configure(organizationClient)

  client.configure(workspaceClient)

  client.configure(groupClient)

  client.configure(directoryClient)

  client.configure(authManagementClient)

  client.configure(orgInvitesClient)

  client.configure(keywordsClient)

  client.configure(preferencesClient)

  client.configure(orgSecondaryReferencesClient)

  client.configure(notificationsClient)

  client.configure(userEngagementsClient)

  client.configure(downloadClient)

  client.configure(publisherClient)

  client.configure(siteConfigClient)

  return client
}
