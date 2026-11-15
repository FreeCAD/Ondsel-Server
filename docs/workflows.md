<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Different Workflows:

## Signup Workflow:
The signup workflow in Lens involves several steps and services working together. Users can sign up via two methods:

### Email/Password Signup:

1. User Registration:
   - User provides email, password and other required details
   - System validates the input data and creates new user account in the users service
   - Generates authentication tokens
   - Sends a verification email to the user

2. Personal Organization Creation:
   - After successful user creation, system automatically creates a personal organization for the user
   - A default workspace is created for the personal organization
   - Sample models are created within the workspace

3. Post-Verification:
   - After successful email verification, user subscription tier is upgraded from unverified to solo
   - Frontend redirects to onboarding download/explore lens page

### OAuth Signup:

1. OAuth Authentication:
   - User clicks "Sign in with [Provider]" button on login page
   - User is redirected to backend OAuth endpoint (`/oauth/:provider`)
   - Backend redirects user to OAuth provider with authentication parameters
   - User authenticates with OAuth provider
   - OAuth provider redirects back to backend callback endpoint (`/oauth/:provider/callback`)
   - System receives OAuth profile data (email, name, provider ID)

2. User Identification:
   - If user exists with matching provider ID: login directly
   - If user exists with matching email (but not provider ID): auto-link provider and login
   - If new user: proceed to OAuth completion page

3. OAuth Completion (New Users Only):
   - User completes signup form with:
     - Email (read-only, from OAuth)
     - Name (pre-filled from OAuth, editable)
     - Username (pre-filled, editable)
     - Usage type selection
     - Terms of Service and Privacy Policy checkboxes (user indicates acceptance)
   - System creates user account with OAuth provider linked
   - User is automatically marked as verified (OAuth providers verify emails)
   - Authentication Service generates JWT token

4. Post-Creation Setup:
   - System automatically creates personal organization
   - System automatically creates default workspace
   - System automatically creates sample models
   - User subscription tier is set to solo (no verification needed)
   - Frontend accepts Terms of Service and Privacy Policy agreements (API call)

5. Login & Redirect:
   - Frontend uses JWT token to authenticate user
   - Frontend redirects to onboarding download/explore lens page

The workflow utilizes multiple services including:
- Users Service: For user account management
- Organizations Service: For organization creation and management
- Models/Files/Uploads Service: For sample model creation
- Account Events Service: For tracking signup and account changes
- Authentication Service: For OAuth provider authentication and token management


## Changing Subscription Tier:
The subscription tier can be changed by the user at the url: `https://{frontend_base_url}/choose-tier`
This workflow involves the following steps:

1. User navigates to Account Settings -> Account -> Choose New Tier
2. User selects the new tier
3. When upgrading to non-free tiers, user is redirected to the payment page to complete the payment for the new tier
4. User can also chose to downgrade to a free tier, which will take effect after the current billing cycle ends

The workflow utilizes multiple services including:
- Users Service: For subscription tier change
- Account Events Service: For tracking subscription tier changes


## Organization Creation Workflow:
The organization creation workflow involves several steps and services:

1. Organization Creation:
   - User navigates to Account Settings -> Organization Memberships -> Create Organization
   - User provides organization name, slug and type (Open/Private)
   - System validates input and creates new organization
   - Creates default "Everybody" group for the organization

2. Organization Settings:
   - User selects organization from left sidebar and clicks settings gear icon
   - Here user can add members, change organization settings, delete organization

3. Managing Organization Users:
   - In the organization settings page, Users tab allows the owner to manage users in the organization
   - To invite new member by email, click on Invite New User button and enter the email address and click on Send
   - And email will be sent to the user with a link to join the organization
   - User will be added to the organization after clicking the link in the email
   - Owner can set organization permissions for users or remove users from the organization, by clicking the Actions button in the user row

4. Managing Organization Groups:
   - In the organization settings page, Groups tab allows the owner to manage groups in the organization
   - To create a new group, click on Add Group button and enter the group name and click on Create
   - To manage group members, click on the Actions button in the group row
   - Click on Add/Remove User button to add/remove users from the group
   - Take All New Users button on the top right allows the owner to add all new users that join the organization into the group

5. Organization Access:
   - Public view of organization available at: `https://{frontend_base_url}/org/{organization_slug}`
   - For Open organizations, this lists public workspaces and organization members
   - For Private organizations, this lists only public workspaces

The workflow utilizes multiple services including:
- Organizations Service: For organization creation and management
- Organization Invites Service: For managing member invitations
- Groups Service: For group creation and management


## Workspace Creation Workflow:
The workspaces within an organization can be accessed at: `https://{frontend_base_url}/org/{organization_slug}/workspaces`
The workspace creation workflow involves several steps and services:

1. Workspace Creation:
   - User navigates to the Workspaces page and clicks on the Create Workspace button
   - User provides workspace name, description, and slug
   - System validates input and creates new workspace
   - A default root directory is created for the workspace
   - A default "Everybody" group is created for the workspace

2. Workspace Settings:
   - In Workspace page, user clicks settings gear icon in the workspace card
   - Here user can manage workspace settings, visibility, users/groups access, and delete workspace

3. Managing Workspace Users/Groups:
   - For non-Personal organizations, in workspace settings, owner can manage users/groups access and permissions
   - Can grant access to specific users or groups from the parent organization
   - Access levels include read and write permissions
   - To manage users/groups access, in workspace settings, click on Users/Groups tab
   - Click on Add/Remove User/Group button to add/remove users/groups to the workspace selected from parent organization and select user/group from the list and click on Update
   - To change permissions, change the permission in the user/group row and click on Tick icon next to the row

4. Managing Workspace Files/Directories:
   - In Workspaces page, click on the workspace card to open the workspace
   - Click on plus icon to add a new file/directory
   - To navigate into a file/directory, click on the file/directory card
   - Three dots in the directory card can used to perform actions like delete for directory
   - File specific actions include explore, download, delete, version management, etc. can be performed by navigating into the file
   - README.md file if present in root directory is used to set workspace long description and rendered in workspace page

5. Workspace Access:
   - Public view of workspace available at: `https://{frontend_base_url}/org/{organization_slug}/workspace/{workspace_slug}`
   - Workspace content inherits visibility settings from workspace level
   - For personal organizations, workspaces are public by default and can be made private by the owner using non-solo tier
   - For Private organizations, all workspaces are private by default and can be made public by the owner
   - For Open organizations, all workspaces are public

The workflow utilizes multiple services including:
- Workspaces Service: For workspace creation and management
- Directories Service: For managing workspace file structure
- Files Service: For file management within workspace
- Models Service: For managing 3D models in workspace
- Uploads Service: For managing file uploads


## File Upload Workflow:
Any type of file can be uploaded to a workspace. The file upload workflow involves:

1. File Upload Initiation:
   - In workspace page, user navigates to the directory where the file is to be uploaded and clicks plus icon -> Add New File
   - Click on Browse or drag and drop a file from local machine to upload
   - File is uploaded to configured storage backend
   - File is added to the workspace directory structure
   - If filename is README.md and is present in root directory, it is used to set workspace long description and rendered in workspace page

2. File Access:
   - File inherits access permissions from parent workspace

The workflow utilizes multiple services including:
- Uploads Service: For managing file upload process to configured storage backend (local or S3, default is local)
- Files Service: For file record management and metadata
- Workspaces/Directories Service: For adding file to workspace directory structure


## Version Control of Model/File Workflow:
Files and models in workspace support version control. The version control workflow involves several steps and services:

1. Initial Version:
   - When a file/model is uploaded, it is added to the workspace directory structure and an initial version is created for it
   - The version information is stored in the file record

2. Uploading New Version:
   - Navigate to a file/model detail page in the workspace
   - Click on Upload New Version button
   - Add a commit message for the new version and select the file/model to upload
   - A new version is created and activated for the file/model

3. Version History:
   - The file/model detail page shows the version history of the file/model
   - It lists all versions with commit message, creator and timestamp
   - The current version is highlighted in the list

4. Switching to a different version:
   - In the version history list, click on the version to switch to
   - A dialog is shown with buttons to download the version or switch to the version
   - Click on SET AS ACTIVE button to switch to the version
   - The file/model is updated to the selected version and model generation is triggered for model files
   - The updated version will be highlighted in the list

The workflow utilizes multiple services including:
- Files Service: For file version management and metadata
- Models Service: To trigger model generation for model files
- Uploads Service: For storing version files in configured storage backend

## Model Creation Workflow:
Models can be created from supported CAD files (file extensions: fcstd, obj, step, stp, kicad_pcb). The model creation workflow involves:

1. Model Creation:
   - User uploads a supported CAD file to workspace
   - File is added to workspace directory structure
   - Model record is created for the file
   - Model processing is triggered to start object generation

2. Model Viewer:
   - User clicks on the EXPLORE button on the model file detail page
   - Thumbnail generation is triggered for the model
   - The model is rendered in 3D viewer
   - User can rotate, zoom in and out, and move the model around
   - User can update the model attributes using attributes button in right sidebar
   - User can export the model in different file formats from export icon in right sidebar
   - User can set the thumbnail for the model in workspace from thumbnail icon in right sidebar
   - For KiCad boards, a chip icon in the right sidebar switches to the KiCanvas viewer and back (see [KiCad Support](kicad.md))

3. Model Access:
   - Model inherits access permissions from parent workspace
   - Model can be shared with other users by creating a share link which is described in Share-Link Workflow

4. Model Updates:
   - When a new version of CAD file is uploaded
   - Model processing is re-triggered automatically
   - Previous thumbnail is deleted and new thumbnail is generated when model is explored

The workflow utilizes multiple services including:
- Files/Uploads Service: For uploading CAD files and storing them in configured storage backend
- Models Service: For model record management and model processing using fc-worker
- Shared Models Service: For managing shared model records and access permissions


## Share-Link Workflow:
Share links allow users to share models with others. The share link workflow involves:

1. Share Link Creation:
   - User clicks on SHARE icon on right sidebar in model explore page
   - Share link dialog opens with sharing options
   - User clicks on CREATE SHARE LINK button and a dialog opens with share link details input fields
   - User provides share link title, private note, protection type (listed, unlisted, pin, direct - desctibed in shared models service), version change handling (current or active) and permissions (view model, view model attributes, update model attributes, allowed export types, etc.)
   - User clicks on GENERATE LINK button to create the share link
   - Share link URL is generated and displayed to user
   - For KiCad boards, the view model permission also allows opening the board in KiCanvas

2. Managing Share Links:
   - User can view all share links listed in share link dialog opened from model explore page
   - User can edit permissions, title, private note of existing share links
   - User can activate/deactivate and delete share links

The workflow utilizes multiple services including:
- Shared Models Service: For creating and managing share link records
- Users Service: For managing direct sharing of models to users


## Bookmarking Workflow:
Bookmarking allows users to save models for quick access later. The bookmarking workflow involves:

1. Bookmark Creation:
   - User visits the public share link page from left sidebar
   - User clicks on bookmark icon in model card for a model they want to bookmark or can click on bookmark icon in model explore page from right sidebar
   - A dialog opens with list of organizations to bookmark the model to
   - User selects the organizations to bookmark the model to
   - Model is added to the organization's bookmarks list

2. Bookmarks List:
   - User can view all their bookmarked models from Bookmarks page in left sidebar
   - User will be shown list of bookmarked models grouped by organization

The workflow utilizes:
- org-secondary-references service: For managing bookmarks

## How search works:

Search functionality is powered by RAKE (Rapid Automatic Keyword Extraction) algorithm. And curations - searchable records that are generated and updated when changes occur using service hooks. The curation workflow involves:

1. Curation Creation:
   - When a new record is created (organization, workspace, etc), a corresponding curation hook is triggered
   - This hook generates keywords for the record using helper method which uses RAKE algorithm
   - The curation contains search metadata like id, collection, nav, name, slug, description, longDescriptionMd, tags, representativeFile, promoted, keywordRefs.
   - Curations are stored inside keywords collection in sortedMatches based on score.

2. Curation Updates:
   - When a record is updated, a generic curation hook `beforePatchHandleGenericCuration` is triggered
   - This hook is passed the callback function which is used to build new curation as in creation
   - This handles the proper updating of curation when record is updated

3. Curation Deletion:
   - When a record is deleted, a generic curation hook `removeCurationFromSearch` is triggered
   - This hook removes the curation from search results

The search workflow utilizes:
- Helper methods and curation hooks defined in `curation.schema.js`
- Hooks defined in `[service_name].curation.js`
- Keywords service for querying curations and returning results
