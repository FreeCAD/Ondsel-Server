// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {generateAndApplyKeywords, navTargetMap} from "../../curation.schema.js";
import _ from "lodash";
import {buildNewCurationForWorkspace} from "../workspaces/workspaces.curation.js";
import {OrganizationTypeMap} from "./organizations.subdocs.schema.js";
import {buildOrganizationSummary} from "./organizations.distrib.js";

export function buildNewCurationForOrganization(org) {
  // optional slug param is used for Personal Collections
  let curation =   {
    _id: org._id,
    collection: 'organizations',
    nav: {
      target: navTargetMap.organizations,
      orgname: org.refName,
    },
    name: org.name || '',
    slug: org.refName,
    description: '',
    longDescriptionMd: '',
    tags: [],
    representativeFile: null,
    promoted: [],
    keywordRefs: [],
  };
  return curation;
}

export const afterCreateHandleOrganizationCuration = async (context) => {
  // first, set up the curation
  if (!context.result.curation) {  // for a personal org, this is already set-up with a special form for users
    context.result.curation = buildNewCurationForOrganization(context.result);
  }
  const newKeywordRefs = await generateAndApplyKeywords(context, context.result.curation);
  context.result.curation.keywordRefs = newKeywordRefs;
  await context.service.patch(
    context.result._id,
    {
      curation: context.result.curation
    }
  )
  return context;
}
