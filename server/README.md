# PolyGame online service

Run `node server/arcade.mjs` with Node 20+. No extra packages are needed.
The service binds only to 127.0.0.1:3001. Put it behind an HTTPS reverse proxy
and set ARCADE_ORIGIN to the exact frontend origin. Set ARCADE_DATA to a
persistent, writable directory outside the public web root. Back up scores.json.
Build the frontend with VITE_ARCADE_API set to the HTTPS service URL.
Do not expose a plain HTTP backend to an HTTPS frontend.

Players join with display names and anonymous random session tokens. Polling
every two seconds supplies presence and match state. Queueing matches two
available players. Turns, legal columns and winners are checked on the server.
Absent players expire after 30 seconds, awarding the match to their opponent.
Rooms are memory-only and disappear on restart. Scores persist in a JSON file.

Score submissions are client-reported, not cheat-proof. Do not award coupons,
money or prizes from this leaderboard. Production public launch requires
authenticated identities, stronger rate limits and server-verified scored games.
Without VITE_ARCADE_API the frontend honestly displays local records and an
offline lobby notice. Deploying GitHub Pages alone cannot activate the lobby.
