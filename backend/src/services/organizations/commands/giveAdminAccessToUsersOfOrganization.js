// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import _ from 'lodash';

export const giveAdminAccessToUsersOfOrganization = async (context) => {
  const { data } = context;
  const { users } = await context.service.get(context.id);

  users.map(user => {
    if (data.userIds.includes(user._id.toString())) {
      user.isAdmin = true;
    }
  })

  data.users = users;
  context.data = _.omit(data, ['shouldGiveAdminAccessToUsersOfOrganization', 'userIds']);
  return context;
}