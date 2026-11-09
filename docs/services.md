<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Different Backend Services:

## User Service:
The user service handles user onboarding and user information management. Key features include:

- On User registration, the user service:
  - sends a verification email to the user.
  - creates a default organization and workspace for the user. The workspace created is public by default.
  - creates sample models for the user.
- User profile management
- Enforce unique usernames/emails
- Integrates with the authentication management system for security features like email verification on email change or account creation.
Public view of user can be accessed by anyone at the url:
```
https://{frontend_base_url}/user/{username}
```


## Groups Service:
The groups service is used to create and manage groups of users within an organization. Key features include:
- Create, update, and delete groups of users.
- Add and remove users from groups.
- A default group "Everybody" is created for each organization when the organization is created and contains all users in the organization.


## Organization Service:
An organization is a collection of workspaces. The organization service handles organization creation, membership, and organization-specific settings. Key features include:
- Create, update, and delete organizations.
- Add and remove users/groups from organizations.
- Manage organization permissions for users.
- Integrate with the user service for user's membership management.

Organization Types:
- Personal: All workspaces, files, and activity are public by default. This can be changed by the user unless using solo tier subscription.
- Open: All workspaces, files, and activity are publicly visible.
- Private: All workspaces, files, and activity are private by default.
- Admin: Special organization type for the site administrators.

Public view of organization can be accessed by anyone at the url:
```
https://{frontend_base_url}/org/{organization_slug}
```


## Organization Invites Service:
The organization invites service handles user invitations to organizations. Key features include:
- Send invitations to users to join organizations.
- Manage invitations to organizations.


## Workspace Service:
The workspace is the main unit of organization. It is the collection of files, folders, and models. The workspace service handles workspace creation, membership, and workspace-specific settings. Key features include:
- Create, update, and delete workspaces.
- Handles public/private visibility settings for the workspace.
- Manage workspace permissions for users.
- Integrate with the users/groups service for organization membership management.


## Directories Service:
The directories are the collection of files, folders, and models. Each workspace has a root directory, and each directory can have subdirectories. Key features include:
- Create, update, and delete directories and subdirectories.
- Integrate with the file service for file management.


## File Service:
The file service deals with the file objects in the workspace. Key features include:
- Create, update, and delete file objects.
- File version control.
- Integrate with the directory service for adding/removing files from directories.
- If README.md file is uploaded to the workspace root directory, it will be used to set the workspace curation.longDescriptionMd.


## Upload Service:
The upload service handles the upload of actual files to the workspace. Key features include:
- Upload files to the configured storage backend (local or S3, default is local).
- Generate public or signed URLs for files to be used in the frontend.


## Models Service:
The model is the 3D model object in Lens. This can be rendered in the frontend using the FC-Worker service. Key features include:
- Create, update, and delete models.
- Intagrates with file service for version control for models.
- Integrates with fc-worker service for model rendering and export to different formats.
- Accepts `.kicad_pcb` uploads as models only when `KICAD_ENABLED` is on. Board models expose a signed `kicadFileUrl` for the KiCanvas viewer.


## Shared Models Service:
The shared models service handles share-links for models. Key features include:
- Create, update, and delete share-links for models.
- Handles access control for the share-links based on the protection type.
- Handles permissions like update, export, etc. for the share-links set by the creator.

Protection Types:
- Listed: The shared model is listed under public share-links at the url: `https://{frontend_base_url}/public-models`
- Unlisted: The shared model is unlisted and can only be accessed by those with the link.
- Pin: The shared model requires a pin to be accessed.
- Direct: The shared model is directly shared to the users and can only be accessed by those users.


## Account Event Service:
The account event service handles account-related events. Key features include:
- Subscription tier changes
- Create, update, and delete account events.


## Site Config Service:
The site config service manages platform-wide configuration and branding settings. Key features include:
- Site branding (title, logo, favicon, copyright text)
- Social links for email templates (Forum, Discord, YouTube)
- Homepage content (title, markdown content, RSS feed, banner)
- Default model for new user registrations
- Desktop app settings (name, protocol, version)
- The public site configuration carries `kicad.enabled`, taken from the `KICAD_ENABLED` environment variable at start and not stored in the database
- OAuth provider configuration:
  - Provider enable/disable toggles
  - Client ID and Secret storage
  - Auto-generated redirect URIs

This service is used by the [Xavier admin panel](admin-panel.md) for site-wide customization.
