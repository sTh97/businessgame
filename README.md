# Business Empire Simulator

Browser-based single-player business strategy game. MVP implements authentication, save/resume, the simulation pipeline, and the Software House industry (~30 authored situations covering Survival and Early Growth).

## Stack

- Client: HTML5 / CSS3 / vanilla ES6
- Server: Node.js + Express
- Database: MongoDB Atlas
- Auth: JWT access token (15 min) + httpOnly refresh cookie (7 days), bcrypt cost 12

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

```bash
npm test          # engine unit tests
npm run seed      # re-seed industry content
```

Environment variables live in `.env` (see `.env.example`). MongoDB credentials are read from there at boot.

## Admin

Open `#/admin` (or `/#/admin`). Default login is username `admin` and password `12345678`. Override with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

The console reads `GET /v1/admin` and shows:

- how many users have logged in
- time spent on the site
- games each player started
- the level they are playing
- login history (time, IP, client)

Player time is accumulated while they are signed in (heartbeat every 25s). Login events are written on each successful player login.

## Deploy on Netlify

The UI is served as static files from `client/`. Auth, saves, and gameplay run as a Netlify Function at `/api/*` against MongoDB Atlas.

1. In [MongoDB Atlas](https://cloud.mongodb.com) → Network Access, allow `0.0.0.0/0` (Netlify Functions use changing IPs).
2. Connect this repo in Netlify. `netlify.toml` sets **Publish directory** to `client` and **Functions directory** to `netlify/functions`. If the Netlify UI already has different build settings, change them to match (UI overrides the file).
3. Site configuration → Environment variables (available at build and runtime):

   | Variable | Production value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_ACCESS_SECRET` | long random string |
   | `JWT_REFRESH_SECRET` | long random string |
   | `CSRF_SECRET` | long random string |
   | `CORS_ORIGINS` | `https://YOUR-SITE.netlify.app` |
   | `PUBLIC_APP_URL` | `https://YOUR-SITE.netlify.app` |

4. Add the variables **before** deploying. The build copies them into the function bundle. Use the short Atlas `mongodb+srv://` URI when possible. `CORS_ORIGINS` / `PUBLIC_APP_URL` default to the Netlify site URL if omitted. `CSRF_SECRET` falls back to `JWT_ACCESS_SECRET` if omitted.
5. Trigger a new deploy. Industry content is seeded into MongoDB on the first API request (`seedIfNeeded`).
6. Open `https://YOUR-SITE.netlify.app`. `https://YOUR-SITE.netlify.app/api/health` should return `{"success":true,"data":{"ok":true}}`.

Local `.env` is gitignored and never reaches Netlify. Values in `netlify.toml` are also not passed to functions. If `/api/health` returns `BOOT_FAILED`, the variables are not set on **that** Netlify site — add them, then **Trigger deploy → Deploy site**.
