# SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
#
# SPDX-License-Identifier: AGPL-3.0-or-later

FROM node:lts-alpine3.17

# copy both 'package.json' and 'package-lock.json' (if available)
COPY ./package*.json ./

# RUN npm version patch && npm install
RUN npm ci

FROM node:lts-alpine3.17

WORKDIR /app

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY ./ .

## Copy built node modules and binaries without including the toolchain
COPY --from=0 node_modules ./node_modules

ENV NODE_ENV production

EXPOSE 3030

CMD [ "sh", "./entry.sh" ]
