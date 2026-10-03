# Market Diary — Implementation Plan

## Goal

Build a self-hosted web app for maintaining a searchable list of shares and writing notes for each share.

## Proposed stack

- **Frontend:** Angular 21 on Node.js 24 (LTS); pin both versions for the project.
- **Backend:** ASP.NET Core Web API in C# targeting .NET 10 (LTS).
- **Database:** SQLite (single-file database, no separate database server), accessed through Entity Framework Core and the `Microsoft.EntityFrameworkCore.Sqlite` provider. **Decision: SQLite replaces the originally proposed MySQL.** The database file lives on a persistent volume/path outside source control.
- **Solution structure:** Keep the Angular client and ASP.NET Core API in separate projects within the same solution; the API owns its SQLite file, so there is no separate database service. This lets each app layer be developed independently while sharing one solution and coordinated build/run workflow.
- **Styling:** Tailwind CSS with the daisyUI component plugin, configured through the standard Tailwind setup. Both are framework-agnostic, so styling stays largely independent of Angular upgrades. Use daisyUI themes and components for the layout, forms, list, and buttons, with minimal custom CSS.

## MVP scope

1. A username/password login screen.
2. A two-pane authenticated workspace:
   - Left sidebar: add shares and search/filter the saved share list.
   - Main area: select a share to see its dated notes (newest first), add a new note, and edit or delete existing notes.
3. Persistence of shares and notes in SQLite.
4. API authorization so share/note endpoints require a valid login session.
5. A clean path to replace the temporary login with proper user accounts and optionally Google sign-in later.

## Temporary login decision

**Decision: do not implement the proposed fixed shared credential.** The first deployment is intended to be reachable from the public internet, so implement proper per-user accounts from the start. Allow public self-registration with username/password; hash passwords using a standard identity/password-hashing framework, issue short-lived signed session tokens, and scope every share and note operation to the authenticated owner. Keep signing keys outside source control and use HTTPS whenever credentials are sent over a network. Do not log credentials or return them in API responses.

## Initial data model

- **User:** identity/account record with a securely hashed password.
- **Share:** database ID, owner/user ID, name (the only required share field), created timestamp.
- **Note:** database ID, associated share ID, note content, note date (defaults to today, editable), created timestamp, updated timestamp. Each share has many notes.
- Shares and notes are private to their owner. Deleting a share also deletes all of its notes.

Notes form a timeline: multiple dated entries per share, listed newest first. Index notes by share ID and note date.

## Implementation phases

### Phase 1 — Confirm requirements and deployment assumptions

- Confirm share-name validation rules; no ticker, exchange, or other field is required for the MVP.
- **Decision: the first deployment may be reachable from the public internet.**
- **Decision: use proper user accounts rather than the temporary shared credential.**
- **Decision: permit public self-registration.**
- **Decision: deleting a share also deletes its notes.**
- **Decision: use SQLite instead of MySQL.** Run a single API instance against the database file; SQLite allows one writer at a time, which is adequate for a small self-hosted diary.
- Use .NET 10, Angular 21, and Node.js 24; confirm compatible Tailwind CSS, daisyUI, and EF Core SQLite versions. Install the .NET 10 SDK and Node.js 24 first, since the current machine has .NET 9 and Node 22.

### Phase 2 — Establish the application structure

- Create one solution containing the ASP.NET Core Web API project and the Angular client project. Keep frontend and backend code in distinct project folders, with shared solution-level development and documentation files as needed.
- Configure local development settings and the SQLite database path without committing secrets or database files.
- Add EF Core, the SQLite provider, and initial database migrations.
- Configure API/frontend development origins and production HTTPS expectations.

### Phase 3 — Implement temporary authentication

- Replace the originally proposed temporary login with proper per-user username/password accounts and public registration.
- Hash passwords using the identity framework; issue and validate expiring signed tokens; keep the signing key outside source control.
- Add Angular registration, login/logout flows, and route protection.
- Attach the token to protected API requests; handle expired/invalid sessions by returning to login.
- Enforce owner-scoped authorization for all share and note operations. Keep credentials out of browser bundles, logs, URLs, and error messages.

### Phase 4 — Implement shares and notes

- Add API operations to list, create, update, and remove shares as needed.
- Add server-side search for shares so filtering remains responsive as the list grows.
- Add API operations to list (newest first), create, edit, and delete dated notes for a share.
- Validate inputs and return consistent API errors.

### Phase 5 — Build the interface

- Create the sidebar with an add-share form that requires only a name, plus a search box.
- Show the saved shares in a selectable list, including useful empty/loading/error states.
- Show the selected share's note timeline in the center panel, with an add-note form (date and text) and edit/delete per note, plus clear save feedback.
- Make the layout usable on desktop and narrower screens.

### Phase 6 — Verify and prepare deployment

- Test login success/failure, token expiry, and access to protected endpoints.
- Test registration, password requirements, and that one user's token cannot access another user's shares or notes.
- Test share creation/search/selection and note persistence after reload.
- Test that deleting a share also deletes its notes.
- Test validation, empty states, and database migration on a clean SQLite database file.
- Document local startup, SQLite backup/restore (consistent online backup), and deployment steps.
- Configure HTTPS, keep signing secrets and the database file outside source control, and persist the database file on a volume before public deployment.

## Later authentication upgrade

When ready to add real sign-in, migrate to per-user accounts with password hashes and ownership checks for every share/note query. Google sign-in can be added as an additional authentication method later; it does not require access to Gmail inbox contents. Existing data should be assigned to the first real account during the migration.

## Open decisions

- No remaining decisions from the original plan.
