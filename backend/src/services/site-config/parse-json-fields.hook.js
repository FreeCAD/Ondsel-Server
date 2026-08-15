// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2026 The FreeCAD project association AISBL
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Object-valued fields arrive as JSON strings when the admin UI saves via
// FormData, which it must do to carry the branding file uploads.
const JSON_FIELDS = ['socialLinks', 'footer']

export const parseJsonFields = async (context) => {
    if (context.method !== 'patch' || !context.data) {
        return context
    }

    for (const field of JSON_FIELDS) {
        if (typeof context.data[field] === 'string') {
            try {
                context.data[field] = JSON.parse(context.data[field])
            } catch (error) {
                // Leave the original value in place for the schema to reject
                console.error(`Failed to parse ${field} JSON:`, error)
            }
        }
    }

    return context
}
