<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Technical Details:

## System Components:
The Lens platform consists of several key components that work together:

### Backend Server
- Node.js/Feathers.js REST API server
- Handles core business logic, authentication, and data management
- Integrates with MongoDB for data persistence
- Manages user accounts, organizations, workspaces, and files
- Integrates with FC-Worker service for model processing

### Frontend Application
- Vue.js single page application
- Provides the user interface and interactive experience
- Communicates with backend via feathersjs socketio-client
- Handles client-side model rendering
- Bundles the KiCanvas viewer for KiCad boards (see [Updating KiCanvas](#updating-kicanvas))

### FC-Worker Service
- Dedicated service for processing and rendering 3D models
- Built on FreeCAD core libraries
- Handles model format conversions and exports
- Provides a REST API written in FastAPI for communication with the backend server
- Offloads the model processing tasks to celery worker for parallel processing
- Converts KiCad boards to FreeCAD models with the KiCadStepUp workbench
- Resolves component 3D models from the mounted KiCad 3D model library

### Storage Systems
- MongoDB for structured data and metadata
- Configurable file storage backend: local filesystem or S3

### Matomo Analytics
- Matomo is used for analytics of the frontend application


## Backend Services Structure:

Official documentation:
- https://feathersjs.com/guides/basics/services
- https://feathersjs.com/api/services
- https://feathersjs.com/guides/cli/service.html

Each service is a separate module that is responsible for a specific functionality.
The service files are located in the `src/services` directory and each service generally follows the structure:

```
src/services/
├── [service-name]/
│ ├── [service-name].class.js
│ ├── [service-name].shared.js
│ ├── [service-name].schema.js
│ ├── [service-name].subdocs.schema.js
│ ├── [service-name].js
│ ├── [service-name].distrib.js
│ ├── [service-name].curation.js
│ ├── helpers.js
│ └── commands/
│     └── [command-name1].js
│     └── [command-name2].js
│     └── [command-name3].js
```

- `src/services/[service-name]/[service-name].class.js`: This file contains:
     - The service class definition which defines the CRUD methods for the service as defined [here](https://feathersjs.com/guides/basics/services#service-methods). If the service interacts with a database, the service class extends the `MongoDBService` class. You can also define custom services like `upload.class.js` which is used for uploading files to the server.
     - The `getOptions` function which defines the service configuration as defined [here](https://feathersjs.com/guides/cli/service.class.html#getoptions). This function is called when registering our service in the feathers application (in file `[service-name].js` or `[service-name].class.js`).

- `src/services/[service-name]/[service-name].shared.js`: This file contains variables and type declarations that are shared between the client and the server application. More information about the shared files can be found [here](https://feathersjs.com/guides/cli/service.shared.html). Example:
     - The path of the service: `export const [service-name]Path = '[service-name]'`
     - The methods of the service: `export const [service-name]Methods = ['find', 'get', 'create', 'patch', 'remove']`, which is imported in the `[service-name].js` file.
     - The client configuration: `export const [service-name]Client = (client) => { const connection = client.get('connection'); client.use([service-name]Path, connection.service([service-name]Path), { methods: [service-name]Methods }) }`, which is imported in the `src/client.js` file.

- `src/services/[service-name]/[service-name].schema.js`: This file contains schemas and resolvers for the service. It is used for validation and data transformation. These schemas are also used for the documentation of the service in swagger. More information about the schemas can be found [here](https://feathersjs.com/guides/cli/service.schemas.html).

- `src/services/[service-name]/[service-name].subdocs.schema.js`: This file contains schemas which are imported in other services' schemas. Example: userSummarySchema from  users.subdocs.schema.js is used in many other services like organizations.schema.js, groups.schema.js, etc.

- `src/services/[service-name]/[service-name].js`: This file mainly defines a configure function that registers the service via `app.configure`, by importing this function in the `src/services/index.js` file. This file performs the following tasks:
     - Imports the service class from the `[service-name].class.js` file, which is used to register the service in the feathers application.
     - Imports the `[service-name]Path` and `[service-name]Methods` from the `[service-name].shared.js` file, which are used when registering the service and the service hooks.
     - Imports the schemas and resolvers from the `[service-name].schema.js` file, which are used for validation and in swagger documentation.
     - Defines and registers hooks for the service, e.g: `before patch` hook, `after patch` hook, `before create` hook, `after create` hook, etc.
     - Imports and registers hooks from `[service-name].distrib.js` file, which are used to distribute information between other collections.
     - Imports and registers hooks from `[service-name].curation.js` file, which are used to create and update curations for the objects.
     - Imports and registers hooks from `helpers.js` file, which are used to perform tasks like checking permissions, assigning default values, etc.
     - Imports and registers hooks from `commands` folder, which are used to perform tasks defined in those command files.

- `src/services/[service-name]/[service-name].distrib.js`: This file is used for taking/sending "second-class" information between collections. Each collection is the "source of truth" for it's key fields. However, many collections have "summary" sub-documents stored that contain information summaries from other collections. These sub-documents are "second-class" because they are not authoritative and might need update when the reference collection is updated. This file typically contains functions, which are used in service hooks or other service files, like:
     - `build[collection-name]Summary` which builds a summary object for a collection.
     - `copy[collection-name]BeforePatch` which copies the collection before a patch event.
     - `distribute[collection-name]Summaries` which is used to distribute the summary object to other collections on patch events.
     - `upsert[other-collection-name]SummaryTo[collection-name]` or `update[other-collection-name]SummaryTo[collection-name]` which is used to upsert/update the summary object from other collection to the current collection.

- `src/services/[service-name]/[service-name].curation.js`: This file is used for visibly decorating an object and handling pre-emptive keyword indexing (for later searches.). This file typically contains functions:
     - `afterCreateHandle[collection-name]Curation` which is hooked into the service's `after create` hook to create the curation after the object is created.
     - `buildNewCurationFor[collection-name]` which builds a new curation for the collection. This is called by the `afterCreateHandle[collection-name]Curation` function and also hooked into the service's `before patch` hook via `beforePatchHandleGenericCuration` function defined in `curation.schema.js`.

- `src/services/[service-name]/helpers.js`: This file contains helper functions for the service. These functions are mostly used in service hooks or service methods.

- `src/services/[service-name]/commands/[command-name].js`: This file contains command function to perform a specific task related to the service, like `addFilesToDirectory`, `addUsersToGroup`, etc. These functions are used in the service's hooks or other services' hooks.


## Updating KiCanvas:

KiCanvas is not published on npm, so the frontend ships a bundle built from a pinned commit under `frontend/public/kicanvas/`. To move to a newer commit:

```bash
git clone https://github.com/theacodes/kicanvas.git
cd kicanvas
git checkout <commit>
npm ci
npm run build                                  # writes build/kicanvas.js

DST=/path/to/Ondsel-Server/frontend/public/kicanvas
cp build/kicanvas.js "$DST/kicanvas.js"
cp LICENSE.md "$DST/LICENSE.md"
cp third_party/earcut/LICENSE "$DST/LICENSE.earcut"
git log -1 --format='%H %ci %s' > "$DST/VERSION"
```

Then:
- Check that `NOTICE` and the `frontend/public/kicanvas` block in `REUSE.toml` still describe what the bundle contains.
- Run `reuse lint`.
- Open a board in the viewer.
