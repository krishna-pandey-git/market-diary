# Market Diary

> **Authentication is temporarily disabled.** Everything runs as a single seeded local user. Search the code for `AUTH-DISABLED` to find what to uncomment (Program.cs, the Shares/Notes controllers, and the frontend routes, config and workspace component). Do not expose this publicly in this state.

A self-hosted share journal with a searchable share list and dated notes. The Angular client and ASP.NET Core API are separate projects in one solution; data is stored in a single SQLite database file.

## Requirements

- Node.js **24.21.0** and npm 12 (pinned in `.node-version` / `.nvmrc`)
- .NET SDK **10.0.401** or a later patch in the same feature band (`global.json`)
- Docker Compose for the containerized deployment (not needed for local development)

## Local development

The API stores data in a SQLite file (`backend/MarketDiary.Api/App_Data/market-diary.db` by default, ignored by Git). No database server is required.

1. Store the token-signing key in .NET user secrets (not in source control). Initialize user secrets once:

   ```sh
   dotnet user-secrets init --project backend/MarketDiary.Api
   dotnet user-secrets set "Authentication:JwtSigningKey" "YOUR_RANDOM_SECRET_OF_AT_LEAST_32_BYTES" --project backend/MarketDiary.Api
   ```

   To use a different database location, also set `ConnectionStrings:Default` (for example `Data Source=C:\data\market-diary.db`).

2. In one terminal, start the API:

   ```sh
   dotnet run --project backend/MarketDiary.Api
   ```

   The API creates the database directory, applies checked-in EF Core migrations at startup, enables WAL mode, and listens at `http://localhost:5101`.

3. In another terminal, start Angular:

   ```sh
   cd frontend
   npm ci
   npm start
   ```

   Open `http://localhost:4200`. The dev-server proxy forwards `/api` requests to the API.

To create a later migration, restore the repository's EF tool:

```sh
dotnet tool restore
dotnet ef migrations add DescribeYourChange --project backend/MarketDiary.Api
```
## Accounts and data

Anyone can register a username and password. Passwords are stored using ASP.NET Core Identity's password hasher, and login/register endpoints are rate-limited. Each account can access only its own shares and notes. Sessions are signed bearer tokens that expire after one hour; the client keeps them in session storage and sends them only in the authorization header.

There is no email verification, password reset, or account recovery yet. Treat public registration as an MVP feature and monitor the service. Usernames are 3–32 letters, digits, dots, dashes, or underscores; passwords need at least 12 characters including uppercase, lowercase, a number, and a symbol. Share names are required and limited to 120 characters; notes are limited to 10,000 characters and default to today's date.

## Self-hosted deployment

Use a publicly reachable DNS name pointing to the host. Forward TCP ports 80 and 443 (and optionally UDP 443 for HTTP/3) to it. Install Docker Compose, copy `.env.example` to `.env`, and set:

- `DOMAIN` to the DNS name
- `JWT_SIGNING_KEY` to a random value of at least 32 bytes

Generate secrets with a trusted password manager or `openssl rand -hex 32`. Then deploy:

```sh
docker compose up -d --build
docker compose logs -f
```

Caddy obtains and renews HTTPS certificates for `DOMAIN`; the API and its database are not published; only the web proxy exposes ports. The SQLite file lives in the `api_data` Docker volume (`/data/market-diary.db`), and the API must run as a single instance. Back up `.env` securely along with the database—losing the signing key invalidates all active sessions. Do not expose the app over plain HTTP or publish the fixed shared credential from the original proposal.

## Database backup and restore

Create a consistent online backup of the SQLite file (safe while the API is running) using a throwaway container. The volume name is normally `<project>_api_data`; confirm it with `docker volume ls`:

```sh
docker run --rm -v market-diary_api_data:/data -v "${PWD}:/backup" alpine:3 sh -c "apk add --no-cache sqlite >/dev/null && sqlite3 /data/market-diary.db \".backup '/backup/market-diary.db'\""
```

To restore, stop the API, replace the database, and start it again (this overwrites current data):

```sh
docker compose stop api
docker run --rm -v market-diary_api_data:/data -v "${PWD}:/backup" alpine:3 sh -c "rm -f /data/market-diary.db* && cp /backup/market-diary.db /data/market-diary.db && chown 1654 /data/market-diary.db"
docker compose start api
```

Keep backups encrypted and off-host, and verify restores periodically. The `api_data` volume is persistent storage, not a backup.
## Project layout

- `backend/MarketDiary.Api` — ASP.NET Core 10 API, Identity authentication, EF Core models and migrations
- `frontend` — Angular 21 SPA, Tailwind CSS and daisyUI
- `compose.yml` — API (with SQLite volume), static frontend, and Caddy HTTPS reverse proxy
