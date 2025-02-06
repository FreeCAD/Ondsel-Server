#!/bin/bash

# Run migrations before starting the application
npm run migration addInitialTosPp
npm run migration updateTos2023Aug31
npm run migration addDefaultAdminUser

# Start the application
if [ "$NODE_ENV" = "development" ]; then
  npm run dev
else
  npm run start
fi
