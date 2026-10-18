// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import feathers from '@feathersjs/feathers'
import nodemailer from 'nodemailer'
import { app } from '../../../src/app.js'

const { getServiceOptions } = feathers

// Build the message but send nothing. streamTransport rather than
// jsonTransport, because only the former goes through mime-node, where
// disableFileAccess and disableUrlAccess are enforced.
function stubTransport(service, transportOptions = {}) {
  const original = service.transporter
  service.transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    ...transportOptions,
  })
  return () => { service.transporter = original }
}

describe('email service', () => {
  it('registered the service', () => {
    const service = app.service('email')

    assert.ok(service, 'Registered the service')
  })

  it('exposes no methods to external transports', () => {
    const service = app.service('email')

    assert.deepStrictEqual(getServiceOptions(service).methods, [])
  })

  for (const provider of ['rest', 'socketio']) {
    it(`rejects create calls from ${provider}`, async () => {
      await assert.rejects(
        () => app.service('email').create(
          { to: 'target@example.com', subject: 'Test Rejection', text: 'This is a test. You should not get this!!' },
          { provider }
        ),
        { name: 'MethodNotAllowed' }
      )
    })
  }

  describe('internal callers', () => {
    it('still sends a plain notification message', async () => {
      const service = app.service('email')
      const restore = stubTransport(service)
      try {
        const result = await service.create({
          to: 'user@example.com',
          subject: 'Verify your account',
          text: 'Please click here',
        })
        const mime = result.message.toString()
        assert.match(mime, /To: user@example.com/)
        assert.match(mime, /Subject: Verify your account/)
      } finally {
        restore()
      }
    })

    it('pins the sender to the configured address', async () => {
      const service = app.service('email')
      const restore = stubTransport(service)
      try {
        const result = await service.create({
          from: 'spoofed-sender@example.org',
          to: 'user@example.com',
          subject: 'Spoof attempt',
          text: 'x',
        })
        const mime = result.message.toString()
        assert.doesNotMatch(mime, /spoofed-sender@example\.org/)
        assert.match(mime, new RegExp(`From: ${app.get('smtpFrom')}`))
      } finally {
        restore()
      }
    })

    // An attachment with a `path` makes nodemailer read that file off the
    // server and mail it out.
    it('refuses attachments', async () => {
      await assert.rejects(
        () => app.service('email').create({
          to: 'attacker@example.com',
          subject: 'exfil',
          text: 'x',
          attachments: [{ filename: 'canary.txt', path: '/etc/hostname' }],
        }),
        { name: 'BadRequest' }
      )
    })

    it('refuses a raw message body', async () => {
      await assert.rejects(
        () => app.service('email').create({
          to: 'attacker@example.com',
          subject: 'raw',
          text: 'x',
          raw: { path: '/etc/hostname' },
        }),
        { name: 'BadRequest' }
      )
    })

    for (const field of ['cc', 'bcc']) {
      it(`refuses ${field}`, async () => {
        await assert.rejects(
          () => app.service('email').create({
            to: 'user@example.com',
            subject: 'fan-out',
            text: 'x',
            [field]: 'everyone@example.com',
          }),
          { name: 'BadRequest' }
        )
      })
    }

    // Subjects interpolate an organization name and the site title, neither of
    // which is constrained, so a newline there must not stop the email.
    // nodemailer folds it to a space and it cannot inject a header.
    it('allows a newline in the subject without injecting a header', async () => {
      const service = app.service('email')
      const restore = stubTransport(service)
      try {
        const result = await service.create({
          to: 'user@example.com',
          subject: 'Invited to "Acme\r\nCorp"',
          text: 'x',
        })
        const headers = result.message.toString().split('\r\n\r\n')[0]
        assert.doesNotMatch(headers, /^Bcc:/m)
        assert.deepStrictEqual(result.envelope.to, ['user@example.com'])
      } finally {
        restore()
      }
    })

    // nodemailer parses a line break in the address as an address group, and
    // the SMTP envelope follows it, so the message goes to the injected
    // address instead of the intended recipient.
    it('refuses a line break in the recipient address', async () => {
      await assert.rejects(
        () => app.service('email').create({
          to: 'user@example.com\r\nBcc: attacker@example.com',
          subject: 'redirect attempt',
          text: 'x',
        }),
        { name: 'BadRequest' }
      )
    })

    it('refuses a malformed recipient address', async () => {
      await assert.rejects(
        () => app.service('email').create({
          to: 'not-an-email',
          subject: 'x',
          text: 'x',
        }),
        { name: 'BadRequest' }
      )
    })

    it('requires a recipient and a body', async () => {
      await assert.rejects(
        () => app.service('email').create({ subject: 'no recipient', text: 'x' }),
        { name: 'BadRequest' }
      )
      await assert.rejects(
        () => app.service('email').create({ to: 'user@example.com', subject: 'no body' }),
        { name: 'BadRequest' }
      )
    })
  })

  describe('transport hardening', () => {
    it('is configured to refuse file and URL access', async () => {
      const service = app.service('email')
      const restore = stubTransport(service, {
        disableFileAccess: true,
        disableUrlAccess: true,
      })
      try {
        await assert.rejects(
          () => service.transporter.sendMail({
            from: 'a@test.invalid',
            to: 'b@test.invalid',
            subject: 'x',
            text: 'x',
            attachments: [{ filename: 'canary.txt', path: '/etc/hostname' }],
          }),
          /File access rejected/
        )
      } finally {
        restore()
      }
    })
  })
})
