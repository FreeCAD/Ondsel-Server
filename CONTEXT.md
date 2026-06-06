# Ondsel-Server — Ubiquitous Language (CONTEXT.md)

*A Domain-Driven-Design reference for the canonical vocabulary of the Lens Platform.*

This document is the **source of truth for naming** in conversation, design discussions, code reviews, and documentation. It is grounded in the actual schemas under `backend/src/services/`. When the code and this document disagree, **the code wins** — but file a PR to fix this document.

---

## Codebase Provenance (Read Me First)

This codebase was **inherited from a shutdown startup**. Many patterns visible in the code — denormalized summary fan-out, scattered hook orchestration, dead enum values, oversized config files — are not the current team's design choices; they're inherited debt. The current effort is **pruning the inheritance**, not preserving it.

Practical consequences for this document:

- Some terms in the code are *legacy* (e.g., the dead tier names `Community` and `Basic`). They are flagged below as **legacy / scheduled for removal** rather than promoted to canonical vocabulary.
- Aspirational renames listed in *Naming Conflicts to Resolve* are deliberate future-state targets — they're recorded so the new vocabulary is shared even before the code catches up.
- When in doubt about whether a pattern is *intentional* or *inherited*, assume inherited and verify before extending it.

---

## How To Use This Document

- Use these terms verbatim when talking about the system — both with engineers and with product/operations stakeholders.
- If you find yourself reaching for a synonym, stop and use the canonical term.
- If a concept is missing here, add it. The vocabulary is a living artifact.
- Every aggregate cites the schema file that defines it. Treat those files as authoritative for field-level details.

---

## Bounded Contexts

The system is best understood as **seven bounded contexts**. The same word can mean different things across contexts — most notably, *Model* (see the "Generated Model" glossary entry).

| Context | What it owns | Primary aggregates |
| --- | --- | --- |
| **Identity & Membership** | Who people are, who can act, how they group, what they've agreed to, their per-user/per-org settings | User, Organization, Group, OrgInvite, Preferences, Agreement |
| **Content** | The CAD files and how they're organized | Workspace, Directory, File, FileVersion |
| **3D Models & Sharing** | The viewable, shareable products derived from files | Generated Model, SharedModel |
| **Search & Curation** | Making content findable | Curation, Keyword |
| **Billing & Quotas** | Subscription state, accounting ledger, feature gates | Tier, Constraint, UserAccounting, AccountEvent |
| **Notifications** | Telling users that something happened | NotificationEntry, NotificationCadence |
| **Configuration** | Platform-wide admin settings owned by site administrators | SiteConfig, Publisher |

> ⚠️ **Watch the word "Model".** Always qualify it in writing:
> - **CAD Model** = the user-uploaded source file (what users mean in casual speech)
> - **Generated Model** = the rendered, shareable aggregate that the code calls `Model`
>
> Use the qualifier every time. Unqualified "Model" is ambiguous and should be avoided in this codebase.

---

## Glossary (Alphabetical)

### AccountEvent
A recorded business event that changes a user's subscription or accounting state. Append-only audit trail. Examples: a paid upgrade, a renewal, a refund, a tier downgrade.
*Schema:* `backend/src/services/account-event/account-event.schema.js`

### Active (version-following mode)
A *SharedModel* setting where the link automatically tracks the **CurrentVersion** of its File. Contrast with *Locked*.

### Admin (organization type)
An *Organization* reserved for site administrators. One per deployment.

### Agreement
A versioned legal document (Terms of Service, Privacy Policy) that users must accept. Acceptance is recorded per user with a timestamp. Lives in the *Identity & Membership* context.
*Schema:* `backend/src/services/agreements/`

### Basic (tier)
**Legacy / scheduled for removal.** Defined in the tier enum and has a constraint entry, but no code path ever assigns or checks for `Basic`. Inherited from a prior pricing structure. Do not introduce new logic that depends on this tier.

### CAD Model
**The user-uploaded source file** (FCSTD, STEP, OBJ, etc.) — what users mean when they casually say "model." In code terms, a CAD Model is a *File*. Use this qualified term in any prose that might mention both source files and generated renderings.

### Community (tier)
**Legacy / scheduled for removal.** Same status as `Basic` — defined in the enum, has a constraint entry, but unused in business logic. Inherited.

### Constraint
The derived, **non-stored** set of feature limits a *User* gets from their current *Tier*. Computed at runtime via `getConstraint(tier)`. Fields include `maxModelObjects`, `maxShareLinksPerModel`, `canUpload`, `canExportModel`, `canCreateOpenOrganization`, etc.
*Schema:* `backend/src/services/users/users.subdocs.schema.js` lines 103–188.

### Curation
A searchable summary embedded into a *User*, *Organization*, *Workspace*, or *SharedModel* that powers search and SEO. Fields: `name`, `slug`, `description`, `longDescriptionMd`, `tags`, `representativeFile`, `keywordRefs`, `nav` (navigation reference). When a curated entity changes, the *Curation* is updated and *Keyword* records are re-indexed. Has its own `_id` and is referenced from *Keyword* records — treat as an entity, not a value object.
*Schema:* `backend/src/curation.schema.js`

### CurrentVersion
The active *FileVersion* of a *File*. Pointed to by `currentVersionId`. New uploads to a file create a new version and update this pointer.

### Direct (protection type)
A *SharedModel* visibility mode where only users explicitly listed in `directSharedTo` may access the link. Most restrictive protection.

### Directory
A folder inside a *Workspace*. Trees are recursive: a *Directory* has a `parentDirectory` (null for the root) and arrays of child files and sub-directories. The root directory of a workspace is auto-created.
*Schema:* `backend/src/services/directories/`

### File
A user-uploaded CAD asset (FCSTD, STEP, OBJ, etc.) inside a *Directory* of a *Workspace*. Synonymous in casual speech with *CAD Model*. Tracks version history, the user-supplied display name (`custFileName`), and back-references to the *Generated Models* and *SharedModels* derived from it.
*Schema:* `backend/src/services/file/file.schema.js`

### FileVersion
One historical revision of a *File*. Stored as an element of the `versions` array on the file document. Has its own `_id`, `uniqueFileName` (storage key), `userId`, optional commit `message`, and a list of *SharedModels* locked to this version. Also called a *Revision* in user-facing UI copy.
*Schema:* `backend/src/services/file/file.schema.js` lines 17–27 (fileVersionSchema).

### Generated Model
**Preferred technical term for what the code calls `Model`.** A *Generated Model* is a snapshot in time combining:
1. a specific *FileVersion*,
2. an optional *SharedModel* context, and
3. user-supplied *parameters* (CAD attribute overrides).

A *Generated Model* is the artifact that FC-Worker produces — it has a rendered 3D object (`objUrl`), a thumbnail, and exportable forms (FCStd, STEP, STL, OBJ). It is **not the file itself**; the file is a *CAD Model*. Always use the qualified form "Generated Model" in prose to avoid the overload.
*Schema:* `backend/src/services/models/models.schema.js`

### Group
A named subset of *Organization* members used to grant *Workspace* access in bulk. Groups belong to exactly one organization.
*Schema:* `backend/src/services/groups/`

### Keyword
A RAKE-extracted phrase that indexes searchable entities. Each *Keyword* document's `_id` is the phrase itself, and `sortedMatches` holds the top-200 *Curation* records ranked by relevance score. This is a **read model** (a projection rebuilt from source aggregates), not an aggregate root in its own right.
*Schema:* `backend/src/services/keywords/`

### Lens
The product / platform name. The full name is "Lens Platform." A `lens` value also appears in the *Curation* navigation-target enum as a meta-reference to the platform's homepage; this is **not** a separate collection or aggregate, just a navigation pointer.

### Listed (protection type)
A *SharedModel* visibility mode that publishes the link to the public gallery and indexes it for search.

### Locked (version-following mode)
A *SharedModel* setting where the link always references a specific *FileVersion*, even as the underlying *File* receives new versions. Contrast with *Active*.

### NotificationCadence
A user preference dictating when in-app notifications turn into emails. Values: `Never`, `Immediately`.

### NotificationEntry
A single notification record belonging to a user. Has a `message` type (e.g. `itemShared`, `verifySignupLong`, `resetPwdLong`), a `from` *Organization*, a `createdBy` *User*, a `nav` (where the link points), and a delivery log.
*Schema:* `backend/src/services/notifications/`

### Open (organization type)
An *Organization* whose *Workspaces* are publicly visible and discoverable. Requires *Peer* tier or higher to create.

### Organization
The unit of multi-tenancy. Owns *Workspaces*, has *Members* and *Groups*, and is the source of access-control decisions. Every *User* has exactly one **Personal Organization** auto-created on signup, plus zero or more team organizations they belong to.
*Schema:* `backend/src/services/organizations/organizations.schema.js`

### OrgInvite
A pending invitation for a person (by email) to join an *Organization* with a specified role. Becomes a *Member* on acceptance.
*Schema:* `backend/src/services/org-invites/`

### Owner (of an organization)
The *User* who created the *Organization* and holds the highest-privilege role on it. Embedded as a `userSummary` on the organization document.

### Personal (organization type)
The default *Organization* automatically created for every *User* on signup. Cannot have additional members added (single-user by definition; enforced in `addUsersToOrganization` command). Workspaces in a Personal org are forced public for free tiers (Solo/Unverified) and respect the user's choice for paid tiers (Peer+).

### Pin (protection type)
A *SharedModel* visibility mode where the link is unlisted and additionally requires a 6-character `pin` to view. The link and the pin are shared separately.

### Preferences
A per-user (and per-organization) configuration document. The user-preferences schema is large (over 1,600 lines in `preferences.config.js`) and aggregates UI, notification, export, and editor preferences. Lives in *Identity & Membership*.
*Schema:* `backend/src/services/preferences/`

### Private (organization type)
An *Organization* whose *Workspaces* are private by default. Only invited members may view its content. Requires *Enterprise* tier to create.

### Protection
The enumerated visibility class of a *SharedModel*. One of: `Listed`, `Unlisted`, `Pin`, `Direct`. See each value's entry.

### Publisher
A configuration document holding software-release info (download links, version metadata). Owned by site administrators.
*Schema:* `backend/src/services/publisher/`

### RefName
The URL-safe identifier of an *Organization* or *Workspace*. Distinct from the display `name`. Uniqueness is enforced case-insensitively via a hash. Used in URLs.

### Revision
*Synonym for FileVersion.* Used in UI copy and code comments (e.g., `DeleteFileDialog.vue` says "All file revisions"). Prefer **FileVersion** in code identifiers.

### SharedModel
**The canonical term — both in code and in vocabulary.** A pointer from the public internet (or an invited set of users) into a specific *Generated Model*. Each *SharedModel* is a record with its own `_id`, *Protection* level, *VersionFollowing* mode, fine-grained permissions, and optional discussion thread. A SharedModel can be revoked (`isActive = false`) without deleting the underlying *File* or *Generated Model*. Despite the name containing "Model," a SharedModel is not itself a model — it is a *link* (pointer) plus access-control metadata.
*Schema:* `backend/src/services/shared-models/shared-models.schema.js`

### SiteConfig
The singleton platform configuration document (one row, fixed `_id`). Contains branding (title, logo, favicon), OAuth provider credentials, homepage content, RSS feeds, and desktop-app integration info.
*Schema:* `backend/src/services/site-config/`

### Solo (tier)
The default free tier assigned to users immediately after email verification (or auto-set for OAuth users at signup). Cannot be purchased; `DoInitialSubscriptionPurchase.js` explicitly rejects subscription attempts to Solo. Constraints: 50 max generated models, 2 share-links per model, no parameter editing, no export. Workspaces in a *Personal* org owned by a Solo user are forced public.

### Summary
A **denormalized embedded sub-document** that copies a small subset of fields from one aggregate into another. Example: a *Workspace* document embeds an `organizationSummary` so a quick read doesn't have to fetch the parent. Summaries are second-class data — when the source changes, `*.distrib.js` hooks fan-out the update to every collection that embeds the summary. Treat summaries as **eventually consistent**.
*Schemas:* `*.subdocs.schema.js` per service.

### Tier
The user's subscription tier. Active enumerated values: `Unverified`, `Solo`, `Peer`, `Enterprise`, `Deleted`. Legacy (scheduled for removal): `Community`, `Basic`. Determines the *Constraint* a user receives. A user may have a `nextTier` set when a downgrade or upgrade is pending.
*Schema:* `backend/src/services/users/users.subdocs.schema.js` lines 14–36.

### Unlisted (protection type)
A *SharedModel* visibility mode that does not appear in the public gallery or search, but anyone with the URL can view it.

### Upload
The act (and the service) that ingests bytes for a new *FileVersion*. Storage is pluggable: local filesystem or AWS S3.
*Schema:* `backend/src/services/upload/`

### User
A person with an account. Owns a *Personal Organization*, belongs to zero or more team organizations, has a *Tier*, and carries a *UserAccounting* ledger. Unique by email and by case-insensitive username.
*Schema:* `backend/src/services/users/users.schema.js`

### UserAccounting
A double-entry accounting ledger embedded on each *User*. Holds running balances (`Cash`, `UnearnedRevenue`, `Revenue`, `SalesReturnsAndAllowances`, `ProcessorExpense`) and an immutable `journal` of transactions. All amounts are integer cents.

### VersionFollowing
A *SharedModel* setting: `Locked` or `Active`. See each.

### Workspace
A logical container of *Directories* and *Files* inside an *Organization*. Has a visibility flag (`open`), a license, an access-control list of users/groups (with `read`/`write` permission), and a root *Directory*. Names are unique per organization via case-insensitive *RefName*. The `open` flag is resolved against the org type: Open orgs force `open=true`; Personal orgs owned by free-tier users (Solo/Unverified) force `open=true`; Private and paid-tier Personal orgs respect the stored value.
*Schema:* `backend/src/services/workspaces/workspaces.schema.js`

---

## Aggregates and Their Invariants

A DDD **aggregate** is a cluster of objects that change together and are loaded/saved as a unit. The aggregate root is the only entity callers reference directly.

### User (aggregate root)
- **Identity:** `_id`, unique `email`, case-insensitive unique `username`.
- **Belongs to:** none (top-level).
- **Owns:** `personalOrganization` (summary), `organizations[]` (membership records), `userAccounting` (ledger), `agreementsAccepted[]`.
- **Invariants:**
  - Every *User* has exactly one *Personal Organization*.
  - `tier` belongs to the active enumerated set; `Constraint` is derived, never stored.
  - The accounting ledger is append-only — *journal* entries are never modified or deleted.

### Organization (aggregate root)
- **Identity:** `_id`, case-insensitive unique `refName`.
- **Owns:** `users[]` (members with `isAdmin` flag), `groups[]` (summaries), `owner` (summary).
- **Invariants:**
  - Exactly one `owner`.
  - `type` is one of `Personal`, `Open`, `Private`, `Admin`.
  - Personal organizations cannot have additional members added (enforced by `addUsersToOrganization` throwing on `type === 'Personal'`).

### Workspace (aggregate root)
- **Identity:** `_id`, `refName` unique within parent organization.
- **Belongs to:** one *Organization* (`organizationId`, embeds `organizationSummary`).
- **Owns:** `rootDirectory` (summary), `groupsOrUsers[]` (ACL entries).
- **Invariants:**
  - Every workspace has a root *Directory* created on first save.
  - The `open` flag is resolved against the organization type and owner tier (see Workspace glossary entry).

### File (aggregate root)
- **Identity:** `_id`.
- **Belongs to:** one *Workspace* and one *Directory* (both embedded as summaries).
- **Owns:** `versions[]` (all *FileVersions*), `currentVersionId` (pointer into `versions[]`), back-references to *Generated Models* and *SharedModels*.
- **Invariants:**
  - `currentVersionId` always points to an existing element in `versions[]`.
  - Soft-deleting a *File* does not delete its derived *Generated Models* or *SharedModels*; those are handled by separate flows.

### Generated Model (aggregate root, code name `Model`)
- **Identity:** `_id`. Uniquely defined by `(fileId, fileVersionId, parameters, sharedModelContext)`.
- **Belongs to:** one *File*, optionally one *SharedModel*.
- **Owns:** generation flags (`isObjGenerated`, `isThumbnailGenerated`, per-format export flags), `attributes` (user-supplied *parameters*), `errorMsg`, viewer hints.
- **Invariants:**
  - Generation is asynchronous: a *Generated Model* may exist with `isObjGenerated=false` for a while; FC-Worker fills it in.
  - `attributes` only meaningful if the source *File* supports parametric attributes.

### SharedModel (aggregate root)
- **Identity:** `_id`.
- **Belongs to:** one *Generated Model* (by `cloneModelId`); a `fileDetail` records the exact File+Version it points to.
- **Owns:** `protection`, `versionFollowing`, fine-grained permissions (`canViewModelAttributes`, `canUpdateModel`, `canExport*`, `canDownloadDefaultModel`), `directSharedTo[]`, `pin`, `messages[]`, the share-time clone `dummyModelId`.
- **Invariants:**
  - `protection=Pin` ⇒ `pin` is 6 characters.
  - `protection=Direct` ⇒ `directSharedTo` is non-empty.
  - `versionFollowing=Active` ⇒ `fileDetail.versionId` is null.
  - `versionFollowing=Locked` ⇒ `fileDetail.versionId` is a real FileVersion id on the referenced File.
  - A revoked share link sets `isActive=false`; it is not deleted, preserving audit trail.

### Curation (entity, embedded)
- Not an aggregate root — always embedded in another aggregate (User, Organization, Workspace, SharedModel).
- Has its own `_id` so it can be referenced from *Keyword* read models.
- Conceptually a projection of the parent into a searchable shape.

### Keyword (read model)
- The search index. Each *Keyword* document is one phrase with the top-N matching curations.
- A projection — not an aggregate root with invariants. Rebuilt asynchronously from source curations.

---

## Domain Events

These are the events worth naming in conversation and (eventually) wiring to an explicit event bus. Past-tense naming convention.

| Event | Triggered by | Side effects |
| --- | --- | --- |
| **UserSignedUp** | `users.create` | Personal org created, sample workspace seeded, verification email sent |
| **UserVerified** | Auth-management verify flow | Tier moves Unverified → Solo; `start-solo-subscription-from-unverified` *AccountEvent* recorded |
| **SubscriptionTierChanged** | Manual or Stripe webhook | Constraint recomputed; *AccountEvent* of type `initial-subscription-purchase` / `subscription-tier-downgrade` / etc. recorded; UserAccounting journal entry posted |
| **SubscriptionRefunded** | Refund webhook | `subscription-refund` *AccountEvent*; ledger entries to `SalesReturnsAndAllowances`/`Cash` |
| **OrganizationRenamed** | `organizations.patch` of `name`/`refName` | `*.distrib.js` fans out to every collection embedding `organizationSummary` |
| **MemberAddedToOrganization** | `addUsersToOrganization` command | User's `organizations[]` updated, possibly added to default groups |
| **MemberRemovedFromOrganization** | `removeUserFromOrganization` command | Cascade clean-up of group memberships, workspace ACL entries |
| **WorkspaceCreated** | `workspaces.create` | Root directory auto-created; *Curation* indexed |
| **FileUploaded** | `file.create` | *FileVersion* added; *Curation* indexed; README detection may update workspace description |
| **FileVersionCreated** | New upload to existing file | `currentVersionId` advanced; *SharedModels* with `versionFollowing=Active` now resolve to this version |
| **GeneratedModelRequested** | `model.create` or parameter change | FC-Worker call; `isObjGenerationInProgress=true` |
| **GeneratedModelCompleted** | FC-Worker callback | `isObjGenerated=true`; `objUrl` populated; thumbnail generation enqueued |
| **SharedModelCreated** | `shared-models.create` | *NotificationEntry* of `itemShared` may be sent to `directSharedTo`; *Curation* indexed if Listed |
| **SharedModelRevoked** | `shared-models.patch` of `isActive=false` | Public access gone; record retained |
| **AgreementAccepted** | `accept-agreement` endpoint | Recorded in user's `agreementsAccepted[]` |

The current code does not yet have an explicit event bus — these "events" are implemented as chains of Feathers hooks plus `*.distrib.js` fan-out. Naming them explicitly is the first step toward extracting an event layer (see `ARCHITECTURE_REVIEW.md` recommendation #1).

---

## Context Map (How Contexts Talk)

```
Identity & Membership ─── owns ──→ Content
        │                            │
        │ Tier→Constraint            │ embeds summaries of
        ↓                            ↓
Billing & Quotas ←─ gates ─ 3D Models & Sharing
        │                            │
        │ AccountEvent               │ Curation embedded
        ↓                            ↓
   UserAccounting              Search & Curation ── indexes ──→ Keyword
                                     │
                                     │ messageType=itemShared
                                     ↓
                              Notifications
```

- **Identity → Content:** Workspaces and Files always belong to an Organization (owned by a User).
- **Billing → 3D Models:** Constraints gate creation of Generated Models, SharedModels, exports.
- **Content → Search:** Every searchable entity embeds a *Curation* projection.
- **3D Models → Notifications:** Creating a SharedModel can emit an `itemShared` notification.
- **Configuration → all:** *SiteConfig* parameterizes OAuth providers, branding, and platform behavior at runtime.

---

## External Systems & Anti-Corruption Boundaries

These are the systems outside the domain. The domain should not leak their vocabulary inward.

| External system | What it provides | Our boundary |
| --- | --- | --- |
| **FC-Worker** (FreeCAD service) | CAD rendering, thumbnail generation, format conversion | HTTP call in `models` service; FC-Worker terms (e.g. `command: "configure_model"`) live only in the boundary code |
| **AWS S3 / local FS** | Blob storage for *FileVersion* bytes | `upload` service; presigned URL secret in `LOCAL_SIGNED_URL_SECRET` |
| **Stripe** | Subscription billing | Webhook handler emits domain *AccountEvent*s; Stripe IDs stored in `subscriptionDetail.subscriptionId` |
| **OAuth providers (GitHub, Google, OIDC)** | Federated identity | `authentication/` adapters map provider profiles to our *User* on sign-up |
| **Mailchimp / SMTP** | Email delivery | `email` service; delivery method enum includes `mailchimp SMTP`, `mailchimp email API`, `mailchimp SMS API`; results recorded in *NotificationEntry*.`deliveryDetails` |
| **Matomo** (optional) | Web analytics | Frontend plugin; not visible in domain |
| **Keycloak** (dev only) | Local OIDC test IdP | Configured via `seedDevKeycloakOidcSiteConfig` migration |

---

## Source-of-Truth vs. Denormalized Copies

Because the codebase relies heavily on embedded *Summaries*, every concept has two locations: the **canonical** one and the **denormalized** copies. When in doubt, read the canonical record.

| Concept | Canonical | Denormalized copies |
| --- | --- | --- |
| User identity | `users` collection | `organizations.users[]`, `groups.users[]`, `workspaces.groupsOrUsers[]`, `notifications.from`, etc. |
| Organization identity | `organizations` collection | `users.personalOrganization`, `users.organizations[]`, `workspaces.organization`, `notifications.from` |
| Workspace identity | `workspaces` collection | `file.workspace`, `directory.workspace`, `curation.nav` |
| File identity | `file` collection | `directory.files[]`, `curation.representativeFile`, `model.file` |
| Generated Model identity | `models` collection | `file.model`, `shared-models.model` |
| Curation | embedded in source aggregate | `keywords.sortedMatches[].curation` |

All summary propagation flows through `backend/src/services/*/[service].distrib.js`.

---

## Naming Conflicts to Resolve (Aspirational Renames)

These are code field names where the current term is misleading or has accumulated meaning that doesn't match its identifier. The vocabulary target is recorded here so we share the *intent* even before the code catches up. **No code rename is in flight today** — these are deliberate future-state goals.

| Code says | Target term | Why |
| --- | --- | --- |
| `cloneModelId` (on a SharedModel) | **`referencedModelId`** | This field points to the *source* Generated Model the share link references. "Clone" is misleading — the actual clone is the `dummyModelId`. |
| `dummyModelId` (on a SharedModel) | **`snapshotModelId`** | A point-in-time clone of the source Model captured at share-link-creation time. "Dummy" suggests throwaway; it's actually a meaningful snapshot used for anonymous viewing. |
| `file.custFileName` | **`displayName`** | User-supplied display name for the file. The "cust" prefix is opaque legacy. |
| `models.attributes` | **`parameters`** | The user-modified CAD values are conventionally called *parameters* in FreeCAD/CAD vocabulary. "Attributes" is overloaded with HTML/UI usage. |

The `SharedModel` aggregate name itself is **kept as canonical** (in both code and vocabulary), not renamed. Despite the name containing "Model," it remains the agreed-upon term.

The `Community` and `Basic` tier names are **scheduled for removal from both code and vocabulary** — they are inherited from the prior pricing structure and have no behavior attached to them.

---

## See Also

- `ARCHITECTURE_REVIEW.md` — opinionated architecture review and refactor priorities.
- `docs/services.md`, `docs/technical.md`, `docs/workflows.md` — narrative documentation.
- `backend/src/services/*/[service].schema.js` — canonical field-level definitions.
- `backend/src/services/*/[service].subdocs.schema.js` — canonical summary/value-object definitions.
