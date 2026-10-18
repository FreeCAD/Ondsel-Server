// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { resolve } from '@feathersjs/schema'
import { Type, getValidator } from '@feathersjs/typebox'
import { dataValidator } from '../../validators.js'

// This service only sends plain notification mail. `additionalProperties`
// rejects `attachments` and `raw`, which make nodemailer read from disk or
// fetch a URL, and `cc`/`bcc`.
//
// The address formats reject a CR/LF, which nodemailer would otherwise parse
// as an address group, putting the injected address in the SMTP envelope and
// delivering there instead. The subject is deliberately unconstrained: a
// newline in it is folded to a space by nodemailer and cannot inject a header,
// while subjects interpolate an organization name and the site title, so
// rejecting one would silently stop a legitimate email.
export const emailDataSchema = Type.Object(
  {
    // Sent by the existing callers; overwritten by emailDataResolver.
    from: Type.Optional(Type.String({ format: 'email' })),
    to: Type.Union([
      Type.String({ format: 'email' }),
      Type.Array(Type.String({ format: 'email' }), { minItems: 1 }),
    ]),
    replyTo: Type.Optional(Type.String({ format: 'email' })),
    subject: Type.String(),
    text: Type.Optional(Type.String()),
    html: Type.Optional(Type.String()),
  },
  {
    $id: 'EmailData',
    additionalProperties: false,
    anyOf: [{ required: ['text'] }, { required: ['html'] }],
  }
)

export const emailDataValidator = getValidator(emailDataSchema, dataValidator)

// Pin the sender to the configured address whatever the caller passed.
export const emailDataResolver = resolve({
  from: async (_value, _data, context) =>
    context.app.get('smtpFrom') || context.app.get('smtpUser'),
})
