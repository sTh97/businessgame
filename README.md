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

4. Trigger a new deploy. The static client is published as-is; industry content is seeded into MongoDB on the first API request (`seedIfNeeded`), not during the Netlify build.
5. Open `https://YOUR-SITE.netlify.app`. `https://YOUR-SITE.netlify.app/api/health` should return `{"success":true,"data":{"ok":true}}`.

If the API returns `BOOT_FAILED` / `Missing required environment variable`, the variables above are missing in Netlify. Add them under **Site configuration → Environment variables**, then redeploy. Do not put Atlas credentials in `netlify.toml`.
