// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { app } from '../app.js';
import { migrateOldModelsCommand } from './migrate-models.command.js';
import { migrateOldFilesCommand } from './migrate-old-files.command.js';
import { migrateObjectsForSharedWorkspaceCommand } from './shared-workspace.command.js';
import {updateModelsForFilesCommand} from "./update-models-for-files.command.js";
import { migrateWorkspaceGroupsOrUsersCommand } from "./update-workspace-groupsOrUsers.js";
import {updateDirectoryFileSummariesCommand} from "./update-directory-file-summaries.command.js";
import {addInitialTosPp} from "./add-initial-tos-pp.js";
import {addMissingRefNamesCommand} from "./add-missing-ref-names.command.js";
import { updateDirectoryWorkspaceSubDocs } from './update-workspaceSubDocs-for-directory.js';
import { addOwnerToOrganizationCommand } from './add-owner-to-organization.js';
import { addPersonalOrgToUserCommand } from './add-personal-org-to-user.js';
import {updateUserSummariesEverywhereCommand} from "./update-user-summaries-everywhere.command.js";
import {updateWorkspaceAndUserOrganizationInfoCommand} from "./update-workspace-and-user-organization-info.command.js";
import {updateOrgUsersCommand} from "./update-org-users.command.js";
import {updateGroupUsersCommand} from "./update-group-users.command.js";
import {updateWorkspaceUsersCommand} from "./update-workspace-users.command.js";
import {updateFileRelatedUserDetailsCommand} from "./update-file-related-user-details.command.js";
import {addEmptyDirectoriesFieldToDirectoryCommand} from "./add_empty_directories_field_to_directory.js";
import {updateWorkspaceSummariesEverywhereCommand} from "./update-workspace-summaries-everywhere.command.js";
import {addIsThumbnailGeneratedFieldToSharedModelsCommand} from "./add-isThumbnailGenerated-field-to-shared-models.js";
import {addCurationToAllWorkspacesCommand} from "./add-curation-to-all-workspaces.command.js";
import {addCurationToAllOrganizationsCommand} from "./add-curation-to-all-organizations.command.js";
import { upgradeUserTierCommand } from './upgrade_user_tier.js';
import {addCurationToAllSharedModelsCommand} from "./add-curation-to-all-shared-models.command.js";
import {fixSharedModelCurationsAndKeywordsCommand} from "./fix-shared-model-curations-and-keywords.command.js";
import { upgradeUnverifiedUserToVerifiedAndMigrateToSoloTier } from './upgrade_unverified_user_to_verified_and_migrate_to_solo_tier.js';
import {addInitialLensSiteCurationCommand} from "./add-initial-lens-site-curation.command.js";
import { addShowInPublicGalleryFieldToSharedModelCommand } from './addShowInPublicGalleryFieldToSharedModel.js';
import {
  updateAllCurationsAndKeywordsForSlugNavCommand
} from "./update-all-curations-and-keywords-for-slug-nav.command.js";
import {
  addOrgSecondaryReferencesToAllOrganizationsCommand
} from "./add-org-secondary-references-to-all-organizations.command.js";
import { addMessagesFieldsToSharedModelsCommand } from './add-messages-fields-to-shared-models.command.js';
import { createAdminOrganizationCommand } from './create-admin-organization.command.js';
import {addNotificationsIdToUsersCommand} from "./add-notificationsId-to-users.command.js";
import { addProtectionFieldToSharedModelCommand } from "./addProtectionFieldToSharedModel.js";
import { addFollowSupportToSharedModelsCommand } from "./add-follow-support-to-shared-models.command.js";
import {updateSharedModelsWithTitleCommand} from "./update-sharedmodels-with-title.command.js";
import {updateDirectoriesWithTitleCommand} from "./update-directories-with-titles.command.js";
import {handleStepFileAsModelCommand} from "./handle-step-file-as-model.js";
import {fixedSharedWithMeSchemasCommand} from "./fixed-shared-with-me-schemas.command.js";
import {addDefaultAdminUserCommand} from "./create-default-admin-user.command.js";
import {createDefaultSiteConfigCommand} from "./create-default-site-config.command.js";
import {addOauthToSiteConfigCommand} from "./add-oauth-to-site-config.command.js";
import { addOidcProviderToSiteConfigCommand } from './add-oidc-provider-to-site-config.command.js';
import { addFooterToSiteConfigCommand } from './add-footer-to-site-config.command.js';
import { seedDevKeycloakOidcSiteConfigCommand } from './seed-dev-keycloak-oidc-site-config.command.js';
import {createDefaultPublisherEntriesCommand} from "./create-default-publisher-entries.command.js";
import {migrateOndselToAdminOrganizationCommand} from "./migrate-ondsel-to-admin-organization.command.js";
import { seedGlobalMacrosCommand } from './seed-global-macros.command.js';


async function runOne(command) {
  switch (command) {
    case 'migrateOldModels':
      await migrateOldModelsCommand(app);
      break;
    case 'migrateOldFiles':
      await migrateOldFilesCommand(app);
      break;
    // case 'updateTierNames':
    //   await updateTierNames(app);
    //   break;
    case 'addInitialTosPp':
      await addInitialTosPp(app);
      break;
    // case 'addUsername':
    //   await addUsernameCommand(app);
    //   break;
    // case 'mergeFirstLastName':
    //   await mergeFirstLastNameCommand(app);
    //   break;
    case 'updateModelsForFiles':
      await updateModelsForFilesCommand(app);
      break;
    case 'migrateObjectsForSharedWorkspace':
      await migrateObjectsForSharedWorkspaceCommand(app);
      break;
    case 'migrateWorkspaceGroupsOrUsers':
      await migrateWorkspaceGroupsOrUsersCommand(app);
      break;
    case 'updateDirectoryFileSummaries':
      await updateDirectoryFileSummariesCommand(app);
      break
    case 'addMissingRefNames':
      await addMissingRefNamesCommand(app)
      break;
    case 'updateDirectoryWorkspaceSubDocs':
      await updateDirectoryWorkspaceSubDocs(app);
      break;
    case 'addOwnerToOrganization':
      await addOwnerToOrganizationCommand(app);
      break;
    case 'addPersonalOrganizationToUser':
      await addPersonalOrgToUserCommand(app);
      break;
    case 'updateUserSummariesEverywhere':
      await updateUserSummariesEverywhereCommand(app);
      break;
    case 'updateWorkspaceAndUserOrganizationInfo':
      await updateWorkspaceAndUserOrganizationInfoCommand(app);
      break;
    case 'updateOrgUsers':
      await updateOrgUsersCommand(app);
      break;
    case 'updateGroupUsers':
      await updateGroupUsersCommand(app);
      break;
    case 'updateWorkspaceUsers':
      await updateWorkspaceUsersCommand(app);
      break;
    case 'updateFileRelatedUserDetails':
      await updateFileRelatedUserDetailsCommand(app);
      break;
    case 'addEmptyDirectoriesFieldToDirectory':
      await addEmptyDirectoriesFieldToDirectoryCommand(app);
      break;
    case 'updateWorkspaceSummariesEverywhere':
      await updateWorkspaceSummariesEverywhereCommand(app);
      break;
    case 'addIsThumbnailGeneratedFieldToSharedModels':
      await addIsThumbnailGeneratedFieldToSharedModelsCommand(app);
      break;
    case 'addCurationToAllWorkspaces':
      await addCurationToAllWorkspacesCommand(app);
      break;
    case 'upgradeUserTier':
      if (process.argv.length == 4) {
        await upgradeUserTierCommand(app, process.argv[3]);
      }
      else{
        console.error('Please provide the email as argument.');
	process.exit(1);
      }
      break;
    case 'addCurationToAllOrganizations':
      await addCurationToAllOrganizationsCommand(app);
      break;
    case 'addCurationToAllSharedModels':
      await addCurationToAllSharedModelsCommand(app);
      break;
    case 'fixSharedModelCurationsAndKeywords':
      await fixSharedModelCurationsAndKeywordsCommand(app);
      break;
    case 'upgradeUnverifiedUserToVerifiedAndMigrateToSoloTier':
      if (process.argv.length == 4) {
        await upgradeUnverifiedUserToVerifiedAndMigrateToSoloTier(app, process.argv[3]);
      }
      else{
        console.error('Please provide the email or "--all" as argument.');
	process.exit(1);
      }
      break;
    case 'addInitialLensSiteCuration':
      await addInitialLensSiteCurationCommand(app);
      break;
    case 'addShowInPublicGalleryFieldToSharedModel':
      await addShowInPublicGalleryFieldToSharedModelCommand(app);
      break;
    case 'updateAllCurationsAndKeywordsForSlugNav':
      await updateAllCurationsAndKeywordsForSlugNavCommand(app);
      break;
    case 'addOrgSecondaryReferencesToAllOrganizations':
      await addOrgSecondaryReferencesToAllOrganizationsCommand(app);
      break;
    case 'addMessagesFieldsToSharedModels':
      await addMessagesFieldsToSharedModelsCommand(app);
      break;
    case 'createAdminOrganization':
      await createAdminOrganizationCommand(app);
      break;
    case 'addNotificationsIdToUsers':
      await addNotificationsIdToUsersCommand(app);
      break;
    case 'addProtectionFieldToSharedModel':
      await addProtectionFieldToSharedModelCommand(app);
      break;
    case 'addFollowSupportToSharedModels':
      await addFollowSupportToSharedModelsCommand(app)
      break;
    case 'updateSharedModelsWithTitle':
      await updateSharedModelsWithTitleCommand(app);
      break;
    case 'updateDirectoriesWithTitles':
      await updateDirectoriesWithTitleCommand(app);
      break;
    case 'handleStepFileAsModel':
      await handleStepFileAsModelCommand(app);
      break;
    case 'fixedSharedWithMeSchemas':
      await fixedSharedWithMeSchemasCommand(app);
      break;
    case 'addDefaultAdminUser':
      await addDefaultAdminUserCommand(app);
      break;
    case 'createDefaultSiteConfig':
      await createDefaultSiteConfigCommand(app);
      break;
    case 'addOauthToSiteConfig':
      await addOauthToSiteConfigCommand(app);
      break;
    case 'addOidcProviderToSiteConfig':
      await addOidcProviderToSiteConfigCommand(app);
      break;
    case 'addFooterToSiteConfig':
      await addFooterToSiteConfigCommand(app);
      break;
    case 'seedDevKeycloakOidcSiteConfig':
      await seedDevKeycloakOidcSiteConfigCommand(app);
      break;
    case 'createDefaultPublisherEntries':
      await createDefaultPublisherEntriesCommand(app);
      break;
    case 'migrateOndselToAdminOrganization':
      await migrateOndselToAdminOrganizationCommand(app);
      break;
    case 'seedGlobalMacros':
      await seedGlobalMacrosCommand(app);
      break;
    default:
      throw new Error(`Unknown migration command: ${command}`);
  }
}

// Commands that read a positional arg from process.argv[3]; must be
// invoked as a single command (cannot be batched).
const ARG_TAKING_COMMANDS = new Set([
  'upgradeUserTier',
  'upgradeUnverifiedUserToVerifiedAndMigrateToSoloTier',
]);

async function runMigrations() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please specify at least one migration command.');
    process.exit(1);
  }
  const commands = ARG_TAKING_COMMANDS.has(args[0]) ? [args[0]] : args;
  for (const command of commands) {
    console.log(`Migration start: ${command}`);
    await runOne(command);
    console.log(`Migration successfully applied: ${command}`);
  }
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('Migration runner crashed:', error);
  process.exit(1);
});
