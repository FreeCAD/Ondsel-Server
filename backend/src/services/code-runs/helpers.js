// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { BadRequest } from '@feathersjs/errors';
import { workerSourceFileName } from '../models/helpers.js';


export const userBelongingCodeRuns = async context => {
  // Restrict find/get/patch to rows owned by the calling user.
  context.params.query = {
    ...context.params.query,
    userId: context.params.user._id,
  };
  return context;
}


export const canUserAccessModelForRun = async context => {
  // used 'before' a 'create'; verifies the caller has run access (share link flag or
  // workspace write), then stashes $modelFileName and $organizationId on context.params
  if (context.data.sharedModelId) {
    const sharedModel = await context.app.service('shared-models').get(
      context.data.sharedModelId
    );
    if (!sharedModel.canRunScripts) {
      throw new BadRequest('This share link does not allow running scripts', { type: 'PermissionError' });
    }
    const { uniqueFileName, file } = await context.app.service('models').get(
      sharedModel.cloneModelId,
      { query: { $select: ['uniqueFileName', 'file'] } }
    );
    const { organizationId } = await context.app.service('workspaces').get(
      file.workspace._id,
      { query: { $select: ['organizationId'] } }
    );
    context.data.modelId = sharedModel.cloneModelId;
    context.params.$modelFileName = workerSourceFileName(sharedModel.cloneModelId, uniqueFileName);
    context.params.$organizationId = organizationId;
    return context;
  }

  const { file, uniqueFileName } = await context.app.service('models').get(
    context.data.modelId,
    {
      user: context.params.user,
      query: { $select: ['uniqueFileName', 'file'] },
    }
  );
  const workspace = await context.app.service('workspaces').get(
    file.workspace._id,
    { user: context.params.user }
  );
  if (!workspace.haveWriteAccess) {
    throw new BadRequest('You dont have write access to this model', { type: 'PermissionError' });
  }
  context.params.$modelFileName = workerSourceFileName(context.data.modelId, uniqueFileName);
  context.params.$organizationId = workspace.organizationId;
  return context;
}


export const resolveMacro = async context => {
  // used 'before' a 'create'; if macroId is provided, confirms the caller can
  // read it (macros.get throws NotFound otherwise) and snapshots the name so
  // history remains accurate if the macro is later renamed or deleted
  const macroId = context.data?.macroId;
  if (!macroId) return context;
  const macro = await context.app.service('macros').get(macroId, { user: context.params.user });
  context.data.macroName = macro.name;
  return context;
}
