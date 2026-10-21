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
// Recipients are checked only for CR/LF, not for a strict address shape:
// nodemailer parses a line break as an address group and the SMTP envelope
// follows it, so a CR/LF would redirect delivery, but a display-name address
// such as `Joe Bob <joe@example.com>` is legitimate and must still work. The
// subject is left unconstrained for the same reason: a newline there is folded
// to a space and cannot inject a header, while subjects interpolate an
// organization name and the site title, so rejecting one would silently stop a
// legitimate email.
const noLineBreak = { pattern: '^[^\\r\\n]*$' }

export const emailDataSchema = Type.Object(
  {
    // Sent by the existing callers but always overwritten by emailDataResolver,
    // so it is accepted without validation rather than rejected.
    from: Type.Optional(Type.String()),
    to: Type.String(noLineBreak),
    replyTo: Type.Optional(Type.String(noLineBreak)),
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
