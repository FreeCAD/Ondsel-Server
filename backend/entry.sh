#!/bin/bash

# Run migrations before starting the application
npm run migration addInitialTosPp
npm run migration updateTos2023Aug31

# Start the application
npm run start
