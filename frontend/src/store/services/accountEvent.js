// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import feathersClient, { makeServicePlugin, BaseModel } from '@/plugins/feathers-client'
import {SubscriptionMonthlyPricingMap} from "@/store/services/users";

class AccountEvent extends BaseModel {
  constructor(data, options) {
    super(data, options)
  }
  // Required for $FeathersVuex plugin to work after production transpile.
  static modelName = 'AccountEvent';
  // Define default properties here
  static instanceDefaults() {
    return {
      event: '',
      note: '', // not seen by end user
      amount: 0,
      originalCurrency: 'USD',
      originalAmt: undefined,
      detail: {
        subscription: '',
        term: '',
        currentSubscription: '',
      },
      success: false,
      resultMsg: '',
      additionalData: {},
    }
  }

  get successFlag() {
    return this.success;
  }
}

const servicePath = 'account-event'
const servicePlugin = makeServicePlugin({
  Model: AccountEvent,
  service: feathersClient.service(servicePath),
  servicePath
})

// Setup the client-side Feathers hooks.
feathersClient.service(servicePath).hooks({
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
})

export const AccountEventTypeMap = {
  initialSubscriptionPurchase : 'initial-subscription-purchase',
  recurringSubscriptionPurchase: 'recurring-subscription-purchase',
  subscriptionServiceCompleted: 'subscription-service-completed',
  subscriptionRefund: 'subscription-refund',
  subscriptionTierDowngrade: 'subscription-tier-downgrade',
  subscriptionTierUpgrade: 'subscription-tier-upgrade',
  cancelTierDowngrade: 'cancel-tier-downgrade',
  startSoloSubscriptionFromUnverified: 'start-solo-subscription-from-unverified',
  administrativeTierChange: 'administrative-tier-change',
}

export const SubscriptionTermTypeMap = {
  monthly: 'Monthly',
  yearly: 'Yearly',
}

// consider adding "currentSubscription" details

// export function getLastRenewalDetail(user) {
//   // for now, simply look at unearned revenue. Later, this might get more complicated if we start fractionally
//   // accounting for each month.
//   let hasSubscription = false;
//   let lastRenewalDate = Date.now();
//   lastRenewalDate.setHours(0, 0, 0, 0);
//   let lastAmount = 0;
//   const ledger = user?.userAccounting?.journal || [];
//   for (const item of ledger) {
//     if (item.description.startsWith("INITIAL SUBSCRIPTION FOR")) {
//       lastRenewalDate = new Date(item.time);
//       lastAmount = item.entries.findLast(e => e.ledger === 'UnearnedRevenue')?.amount || 0;
//       hasSubscription = true;
//     }
//   }
//   return {
//     lastRenewalDate: lastRenewalDate,
//     lastAmount: lastAmount,
//   };
// }

export function calculateUpgradeNumbers(currentTier, currentTerm, lastValue, nextTier, nextTerm, nextAmount, lastRenewal, now) {
  // lastRenewal is the latest Date of the term renewal, NOT the date the payment cleared. Those can be different.
  let result = {
    customerCredit: 0,
    recognizedRevenue: 0,
    proportionalChargeAmount: 0,
  };
  let cleanNow = now;
  cleanNow.setHours(0,0,0,0)
  //
  // determine how much as been used already (consumed)
  //
  let ratioConsumed = 0.0;
  const daysToLastRenew = Math.round((cleanNow - lastRenewal) / (1000 * 3600 * 24));
  switch (currentTerm) {
    case SubscriptionTermTypeMap.monthly:
      if (lastRenewal === cleanNow) {
        ratioConsumed = 0.0;
      } else {
        let daysInMonth;
        if (lastRenewal.getMonth() === cleanNow.getMonth()) {
          daysInMonth = new Date(cleanNow.getFullYear(), cleanNow.getMonth(), 0).getDate();
        } else {
          daysInMonth = new Date(lastRenewal.getFullYear(), lastRenewal.getMonth(), 0).getDate();
        }
        ratioConsumed = daysToLastRenew / daysInMonth;
      }
      break;
    case SubscriptionTermTypeMap.yearly:
      const daysInYear = new Date(lastRenewal.getFullYear(),1,29).getMonth()===1?366:365;
      ratioConsumed = daysToLastRenew / daysInYear;
      break;
    default:
      throw new Error(`Subscription Term ${currentTerm} not known.`);
  }
  if (ratioConsumed > 1.0) {
    ratioConsumed = 1.0;
  } else if (ratioConsumed < 0.0) {
    ratioConsumed = 0.0;
  }
  //
  // determine remaining ratio of upgrade
  //
  let nextRenewal;
  let daysInNextTerm;
  switch (nextTerm) {
    case SubscriptionTermTypeMap.monthly:
      nextRenewal = new Date(lastRenewal.getFullYear(), lastRenewal.getMonth() + 1, lastRenewal.getDate());
      daysInNextTerm = new Date(cleanNow.getFullYear(), cleanNow.getMonth(), 0).getDate();
      break;
    case SubscriptionTermTypeMap.yearly:
      nextRenewal = new Date(lastRenewal.getFullYear() + 1, lastRenewal.getMonth(), lastRenewal.getDate());
      if (nextRenewal.getMonth() > 1) {
        // next renewal is after february, so consider that year's leap
        daysInNextTerm = new Date(nextRenewal.getFullYear(),1,29).getMonth()===1?366:365;
      } else {
        daysInNextTerm = new Date(cleanNow.getFullYear(),1,29).getMonth()===1?366:365;
      }
      break;
    default:
      throw new Error(`Subscription Term ${nextTerm} not known.`);
  }
  const daysToNextRenew = Math.round((nextRenewal - cleanNow) / (1000 * 3600 * 24))
  let remainingRatioOfNewTerm = daysToNextRenew / daysInNextTerm;
  //
  // calculate
  //
  result.recognizedRevenue = Math.round(ratioConsumed * lastValue);
  let creditAvailable = lastValue - result.recognizedRevenue;
  let remainingAmount = Math.round(remainingRatioOfNewTerm * nextAmount)
  if (creditAvailable >= remainingAmount) {
    result.customerCredit = creditAvailable - remainingAmount;
    result.proportionalChargeAmount = 0;
  } else {
    result.customerCredit = 0;
    result.proportionalChargeAmount = remainingAmount - creditAvailable;
  }
  return result;
}


export default servicePlugin
