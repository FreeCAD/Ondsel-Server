<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Troubleshooting Guide

Common issues and solutions for Lens Platform deployments.

---

## Table of Contents

- [Service Startup Issues](#service-startup-issues)
- [Database Issues](#database-issues)
- [OAuth Issues](#oauth-issues)
- [Branding Issues](#branding-issues)
- [Script Execution Issues](#script-execution-issues)
- [KiCad Issues](#kicad-issues)
- [Common Issues](#common-issues)

---

## Service Startup Issues

### Backend Won't Start

**Symptoms**: Backend service exits or fails to start.

**Solutions**:

1. **Verify migrations ran**:
   ```bash
   mongosh "mongodb://localhost:27017/backend-db" --eval "db['site-config'].countDocuments()"
   # Expected: 1
   ```
   If missing, run migrations (see [`docs/migration.md`](migration.md))

2. **Check backend logs** for specific error messages:
   ```bash
   docker-compose logs backend
   ```

### Frontend Won't Start

**Symptoms**: Frontend service exits or shows blank page.

**Solutions**:

1. **Verify API URL**:
   - Check `VITE_APP_API_URL` in `.env`
   - Ensure it matches backend URL (including port)

2. **Try rebuilding frontend**:
   ```bash
   docker-compose build --no-cache frontend
   docker-compose restart frontend
   ```

3. **Check frontend logs** and browser console (F12) for specific errors

### WebSocket Connection Failed

**Symptoms**: Browser console shows `WebSocket connection to 'ws://localhost:3030/socket.io/?EIO=4&transport=websocket' failed`, login page hangs.

**Solutions**:

1. **Verify backend is running**:
   ```bash
   docker-compose ps backend
   curl http://localhost:3030/
   ```

2. **Check `VITE_APP_API_URL` configuration**:
   - For Docker Compose on remote server: Use server IP/hostname, not `localhost`
   - Example: `VITE_APP_API_URL=http://192.168.1.100:3030/` (not `http://localhost:3030/`)
   - Ensure it matches backend URL exactly (including trailing slash)

3. **Rebuild frontend** after changing environment variables:
   ```bash
   docker-compose build frontend
   docker-compose restart frontend
   ```

4. **Check browser console** (F12) for specific WebSocket errors

### FC-Worker Not Responding

**Symptoms**: Model processing fails or times out.

**Solutions**:

1. **Verify FC-Worker is running**:
   ```bash
   # Docker Compose (test from backend container which has network access)
   docker-compose exec backend curl http://127.0.0.1:8080/2015-03-31/functions/function/invocations \
     -X POST -H "Content-Type: application/json" \
     -d '{"command":"health_check"}'
   # Expected: {"Status":"OK"}

   # Manual installation (if FC-Worker is running separately on port 9000)
   curl http://127.0.0.1:9000/2015-03-31/functions/function/invocations \
     -X POST -H "Content-Type: application/json" \
     -d '{"command":"health_check"}'
   # Expected: {"Status":"OK"}
   ```

2. **Check FC-Worker URL**:
   - Verify `FC_WORKER_URL` in backend `.env`
   - Format: `http://0.0.0.0:8080/2015-03-31/functions/function/invocations`

3. **Check FC-Worker logs**:
   ```bash
   # Docker Compose
   docker-compose logs fc-worker-api
   docker-compose logs fc-worker-celery
   
   # Manual installation (if FC-Worker is running separately)
   cd FC-Worker && docker-compose logs
   ```

4. **Rebuild FC-Worker**:
   ```bash
   # Docker Compose
   docker-compose build fc-worker-api fc-worker-celery
   docker-compose restart fc-worker-api fc-worker-celery
   
   # Manual installation (if FC-Worker is running separately)
   cd FC-Worker && docker-compose build && docker-compose up -d
   ```

---

## Database Issues

### MongoDB Connection Failed

**Symptoms**: Backend can't connect to MongoDB, migrations fail with `getaddrinfo ENOTFOUND mongodb`.

**Solutions**:

1. **Verify MongoDB is running**:
   ```bash
   # Docker Compose
   docker-compose ps mongodb
   docker-compose logs mongodb
   
   # Manual installation
   sudo systemctl status mongod
   ```

2. **Check `DB_URL` environment variable**:
   - **Docker Compose**: `DB_URL` is already configured correctly in `docker-compose.yml` as `mongodb://mongodb:27017/backend-db`. Only check this if you've modified the docker-compose configuration.
   - **Manual installation**: Verify `DB_URL` in `.env` points to correct host/port (e.g., `mongodb://localhost:27017/backend-db`)

### Migration Fails

**Symptoms**: `npm run migration` command fails.

**Solutions**:

1. **Verify migrations run in order** (see [`docs/migration.md`](migration.md))

2. **Check migration logs** for specific error messages

---

## OAuth Issues

### OAuth Login Not Working

**Symptoms**: OAuth button appears but login fails or redirects to error page.

**Solutions**:

1. **Check redirect URI**:
   - Copy redirect URI from admin panel → OAuth Configuration (displayed below credentials)
   - Verify it matches exactly in provider settings:
     - **Google**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Authorized redirect URIs
     - **GitHub**: GitHub → Settings → Developer settings → OAuth Apps → Authorization callback URL
   - Redirect URI format: `{backend-base-url}/oauth/{provider}/callback` (e.g., `http://your-domain:port/oauth/google/callback`)

2. **Verify credentials**:
   - Check admin panel → OAuth Configuration
   - Ensure Client ID and Client Secret are correct (no extra spaces, copied completely)
   - For Google: Verify OAuth consent screen is configured
   - For GitHub: Verify OAuth app is active

3. **Check backend logs** for OAuth errors:
   ```bash
   docker-compose logs backend | grep -i oauth
   ```

### OAuth Provider Not Appearing

**Symptoms**: OAuth provider button doesn't show on login page.

**Solutions**:

1. Check OAuth configuration in admin panel → OAuth Configuration:
   - Verify provider toggle is enabled
   - Ensure Client ID and Client Secret are set

2. Verify frontend has latest code:
   ```bash
   # Docker Compose
   docker-compose build frontend
   docker-compose restart frontend
   
   # Manual installation
   cd frontend && npm ci && npm run build
   ```

3. **Hard refresh browser** (if frontend code was updated):
   - `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

---

## Branding Issues

### Default Model Upload Fails

**Symptoms**: Error when uploading default model in admin panel → Branding Hub → Default Model.

**Solutions**:

1. **Verify file type**: Only `.FCStd` files are allowed

2. **Check FC-Worker is running** (required for OBJ generation):
   - See [FC-Worker Not Responding](#fc-worker-not-responding) for troubleshooting steps

3. **Check backend logs** for specific errors:
   ```bash
   docker-compose logs backend | grep -i "default.*model\|obj.*generation"
   ```
   Common errors:
   - "OBJ generation timeout" - FC-Worker is slow or unresponsive (timeout occurs after multiple retry attempts)
   - "OBJ generation failed" - FC-Worker processing error

---

## Script Execution Issues

### Script fails with "Script runner is temporarily unavailable"

**Symptoms**: Run history shows `error` with this message immediately after clicking Run.

**Solutions**:

This means the backend dispatched the job but FC-Worker was unreachable. See [FC-Worker Not Responding](#fc-worker-not-responding).

---

### Script fails with "Failed to load the model"

**Symptoms**: Run history shows `error` with this message.

**Solutions**:

1. **Check FC-Worker logs** for model download errors:
   ```bash
   docker-compose logs fc-worker-celery | grep "failed to fetch model"
   ```

2. **Verify the model file exists** in the upload storage and is accessible from the FC-Worker container

3. **Check `UPLOAD_URL`** in FC-Worker config points to the correct storage endpoint and is reachable from the FC-Worker container

---

### Script output is truncated

**Symptoms**: `stdout` or `stderr` ends abruptly; output appears cut off.

**Solutions**:

Each of `stdout` and `stderr` is capped at **256 KB**. Reduce the amount of output your script produces (e.g. avoid printing every iteration of a loop).

---

## KiCad Issues

See [KiCad Support](kicad.md) for background.

### Board converts but components are missing

**Symptoms**: The 3D viewer shows the board with some or all components absent.

**Solutions**:

1. **Check the celery log** for the missing models:
   ```bash
   docker-compose logs fc-worker-celery | grep "KiCad 3D models missing"
   ```

2. **Project-folder models**: models referenced as `${KIPRJMOD}/...` are not uploaded because only the `.kicad_pcb` is uploaded. Embed the models in the board or use library models.

3. **WRL-only models**: models without a STEP file are left out.

4. **Library not provisioned**: check that the `kicad-3dmodels` init service completed and that `KICAD_ENABLED` is not `false`:
   ```bash
   docker-compose logs kicad-3dmodels
   ```

---

### "KiCad board has no Edge.Cuts outline"

**Symptoms**: Conversion fails with this message.

**Solutions**:

The board has no closed outline on the `Edge.Cuts` layer. Close the board outline in KiCad and upload the file again.

---

### STL export of a large board is slow or the worker is killed

**Symptoms**: STL export takes a long time, or the FC-Worker container is killed.

**Solutions**:

1. STL meshes every face at 0.1 mm. For very dense boards, export STEP or OBJ instead.
2. Give the FC-Worker container more memory.

---

### KiCanvas shows an empty view

**Symptoms**: The KiCanvas viewer shows no board.

**Solutions**:

1. KiCanvas could not parse the file. Open the board in KiCad, save it again, and upload the new version.
2. On a share link, enable **Can view model** on the link.

---

## Common Issues

### Admin Panel Not Accessible

**Symptoms**: Cannot access admin panel or Xavier menu.

**Solutions**:

1. **Verify admin user exists**:
   ```bash
   mongosh "mongodb://localhost:27017/backend-db" --eval "db.users.find({ email: 'admin@local.test' })"
   ```

2. **Check Admin organization exists**:
   ```bash
   mongosh "mongodb://localhost:27017/backend-db" --eval "db.organizations.find({ type: 'Admin' })"
   ```

3. **Verify admin user is member of Admin organization**:
   ```bash
   mongosh "mongodb://localhost:27017/backend-db" --eval "db.users.findOne({ email: 'admin@local.test' }, { organizations: 1 })"
   ```

4. **Create admin user** (if missing):
   ```bash
   cd backend
   npm run migration addDefaultAdminUser
   ```

5. **Log out and log back in** with admin credentials

### API Endpoints Return 404

**Symptoms**: API calls fail with 404 errors.

**Solutions**:

1. **Check API URL**:
   - Frontend: Verify `VITE_APP_API_URL` matches backend URL
   - Ensure trailing slash: `http://localhost:3030/`

2. **Check Swagger docs** to verify route exists:
   ```bash
   curl http://localhost:3030/docs
   ```

### User Registration/Email Errors

**Symptoms**: Error `connect ECONNREFUSED ::1:465` when registering user, email verification fails.

**Solutions**:

1. **Configure SMTP settings**:
   - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in backend `.env`
   - SMTP is required for user registration (sends verification/welcome emails)

2. **Verify SMTP server is accessible**:
   - Test SMTP connection from backend container
   - Check firewall rules if using external SMTP server

3. **Check backend logs** for SMTP errors:
   ```bash
   docker-compose logs backend | grep -i smtp
   ```

### Model Upload/Download Fails

**Symptoms**: Cannot upload or download models.

**Solutions**:

1. **Check backend logs** for upload errors:
   ```bash
   docker-compose logs backend | grep -i upload
   ```

2. **Verify FC-Worker is running** (for model processing) - see [FC-Worker Not Responding](#fc-worker-not-responding)

---

## If Issues Persist

Additional troubleshooting steps:

1. **Check logs**:
   - Backend: `docker-compose logs backend`
   - Frontend: Browser console (F12) and `docker-compose logs frontend`
   - FC-Worker: `docker-compose logs fc-worker-api` and `docker-compose logs fc-worker-celery`

2. **Review documentation**:
   - [`docs/migration.md`](migration.md) - Migration troubleshooting
   - [`docs/admin-panel.md`](admin-panel.md) - Admin panel configuration
   - [`docs/upgrade.md`](upgrade.md) - FC-Worker upgrade troubleshooting

3. **Verify migrations**: Ensure all migrations have run (see [`docs/migration.md`](migration.md))
