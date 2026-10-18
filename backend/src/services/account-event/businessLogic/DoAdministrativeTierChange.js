// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  addTransactionToUserAndSummarize,
  makeEmptyJournalTransaction,
  verifyBalanced
} from "../../../accounting.js";
import {SubscriptionTypeMap} from "../../users/users.subdocs.schema.js";
import {isSiteAdministrator} from "../../hooks/administration.js";

// A site administrator grants or removes a tier directly, with no subscription
// and no money changing hands: support comping an account, correcting a tier
// after a failed payment flow, or dropping an account back down.
//
// Unlike the subscription events, this takes effect immediately in both
// directions. A real downgrade sets nextTier and waits for the anniversary,
// because the user has paid for the rest of the term; nothing has been paid
// for here, so there is nothing to wait out.
//
// The journal transaction is deliberately empty, as in
// DoStartSoloSubscriptionFromUnverified: the event belongs in the user's
// history, but inventing revenue entries for a free grant would corrupt the
// ledger.
export async function DoAdministrativeTierChange(context, user, actingUser) {
  //
  // 1. verify supplied data
  //
  const [isAdmin] = await isSiteAdministrator(context.params, context.app);
  if (!isAdmin) {
    context.data.resultMsg = 'ERROR: only a site administrator can change a tier administratively.';
    return;
  }
  let detail = AdministrativeTierChangeVerification(context, user, actingUser);
  if (detail.errMsg !== "") {
    context.data.resultMsg = detail.errMsg;
    return;
  }
  //
  // 2. no money moves, so the transaction is empty
  //
  let transaction = makeEmptyJournalTransaction(detail.desc, detail.note);
  let balanceMsg = verifyBalanced(transaction); // it is empty, so of course it will balance
  if (balanceMsg !== "") {
    context.data.resultMsg = balanceMsg;
    return;
  }
  addTransactionToUserAndSummarize(user, transaction);
  //
  // 3. update the user doc
  //
  context.data.transactionId = transaction.transactionId; // so the log can be matched to the journal entry
  await context.app.service('users').patch(user._id, {
    tier: detail.newTier,
    nextTier: null, // an administrative change supersedes any scheduled one
    userAccounting: user.userAccounting,
  });
  //
  // all is good; return message
  //
  context.data.success = true;
  context.data.resultMsg = "SUCCESS: " + detail.desc;
}

function AdministrativeTierChangeVerification(context, user, actingUser) {
  let result = {
    errMsg: "",
    desc: "",
    note: "",
    newTier: "",
  }
  //
  // new tier
  //
  result.newTier = context.data.detail.subscription;
  let currentTier = user.tier;
  if (!result.newTier) {
    result.errMsg = 'No target tier was supplied.';
    return result;
  }
  if (!Object.values(SubscriptionTypeMap).includes(result.newTier)) {
    result.errMsg = `${result.newTier} is not a valid tier.`;
    return result;
  }
  if (result.newTier === SubscriptionTypeMap.deleted) {
    result.errMsg = 'A tier cannot be set to Deleted; remove the user instead.';
    return result;
  }
  //
  // the caller states what it believes the current tier to be, as the other
  // account events do, so a stale page cannot silently overwrite a tier that
  // changed in the meantime
  //
  if (context.data.detail.currentSubscription !== currentTier) {
    result.errMsg = `CALLER TO API BELIEVES THE CURRENT TIER IS ${context.data.detail.currentSubscription} BUT IT IS ${currentTier}`;
    return result;
  }
  if (result.newTier === currentTier) {
    result.errMsg = `The user is already at the ${currentTier} tier.`;
    return result;
  }
  //
  // descriptions for transaction
  //
  const actor = actingUser?.username || 'unknown administrator';
  result.note = `${String(context.data.note)} [by ${actor}]`;
  result.desc = `TIER ADMINISTRATIVELY CHANGED FROM ${currentTier} TO ${result.newTier} BY ${actor}`;
  //
  // done
  //
  return result;
}
