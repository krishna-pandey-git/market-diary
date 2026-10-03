# Market Diary

> **Authentication is temporarily disabled.** Everything runs as a single seeded local user. Search the code for `AUTH-DISABLED` to find what to uncomment (Program.cs, the Shares/Notes controllers, and the frontend routes, config and workspace component). Do not expose this publicly in this state.

A self-hosted share journal with a searchable share list and dated notes. The Angular client and ASP.NET Core API are separate projects in one solution; data is stored in a single SQLite database file.

## Requirements

- Node.js **24.21.0** and npm 12 (pinned in `.node-version` / `.nvmrc`)
- .NET SDK **10.0.401** or a later patch in the same feature band (`global.json`)

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

## Deployment (single app, e.g. Azure App Service)

`dotnet publish backend/MarketDiary.Api -c Release -o publish` builds the Angular app and places it in `wwwroot` of the output, so the API serves the UI and `/api` from one origin. Use `-p:BuildFrontend=false` to skip the frontend build.

- Set `ConnectionStrings__Default` to a persistent path (on App Service for Linux, e.g. `Data Source=/home/data/market-diary.db`); files in the app folder are overwritten on each deploy.
- Run a single instance; SQLite does not support scaling out.
- When auth is re-enabled, also set `Authentication__JwtSigningKey` (random, 32+ bytes).

## Database backup

Copy the SQLite file while the API is stopped, or use `sqlite3 market-diary.db ".backup 'backup.db'"` for a consistent online copy. To restore, stop the app, replace the file (and delete any `-wal`/`-shm` files), and start it again. Keep backups off-host.
## Project layout

- `backend/MarketDiary.Api` — ASP.NET Core 10 API, Identity authentication, EF Core models and migrations
- `frontend` — Angular 21 SPA, Tailwind CSS and daisyUI
