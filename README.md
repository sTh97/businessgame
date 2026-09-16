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
