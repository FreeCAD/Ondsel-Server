// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export async function addDefaultAdminUserCommand(app) {
  const userService = app.service('users');

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ondsel.com';
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Ondsel Admin';

  // Check/create admin user
  console.log(">>> checking for admin user");
  const adminExists = await userService.find({
    query: { email: adminEmail },
    paginate: false
  });
  if (adminExists.length) {
    console.log(`>>> ERROR default admin user ${adminEmail} already exists`);
    return;
  }

  console.log(">>> creating default admin user");
  const originalDisableSendVerificationEmail = process.env.DISABLE_SEND_VERIFICATION_EMAIL;
  process.env.DISABLE_SEND_VERIFICATION_EMAIL = true;
  const user = await userService.create({
    email: adminEmail,
    username: adminUsername,
    password: adminPassword,
    name: adminName,
    usageType: 'both',
  });
  await userService.patch(user._id, {
    isVerified: true,
    tier: 'Enterprise',
  });
  process.env.DISABLE_SEND_VERIFICATION_EMAIL = originalDisableSendVerificationEmail;
  console.log(">>> admin user created");
}
