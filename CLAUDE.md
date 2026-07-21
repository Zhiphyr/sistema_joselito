# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Sistema Joselito" — a logistics/transport management system (Node.js/Express + MySQL backend, vanilla JS SPA frontend) for a trucking company. Domain: trucks (`camiones`), routes (`rutas`), trips (`viajes`), cargo (`cargas`/`detalle_carga`), incidents (`incidencias`), advances (`adelantos`), driver settlements (`liquidaciones`), client debts (`deudas`), and bank accounts (`cuentas_bancarias`). UI and all commit/log messages are in Spanish.

## Commands

- Run the server: `node app.js` (no dev/watch script or test suite is configured — `npm test` is a stub that always fails)
- One-off DB scripts live at the repo root and are run directly, e.g. `node run_sql.js`, `node migrate_db.js`, `node check_db.js` — these are throwaway scripts pointed at specific `.sql` files/tables, not a migration framework. When asked to change the schema, write a new script in this style rather than looking for a migrations directory.
- No build step: the frontend is static HTML/CSS/vanilla JS served directly by Express (`app.use(express.static('frontend'))`); there is no bundler/transpiler.

## Architecture

### Backend: routes → controllers → (models | direct db) → MySQL

- `app.js` wires middleware and mounts one router per resource under `/api/<resource>` (see the list of `app.use('/api/...')` calls there for the full route map).
- `config/db.js` exports a singleton `Database` wrapping a `mysql2/promise` pool. Use `db.query(sql, params)` for simple statements; use `await db.getConnection()` + `beginTransaction()/commit()/rollback()/release()` for anything touching multiple tables (trip registration, deliveries, incidents, settlements all do this — follow the try/catch/rollback/release pattern already in `controllers/viajeController.js`).
- **Not every resource has a Model.** `models/` only exists for Camion, Cliente, Opcion, Perfil, Producto, Ruta, Usuario. Controllers like `viajeController.js`, `deudaController.js`, and `cuentaBancariaController.js` write raw SQL directly against `db`. Match whichever pattern the resource you're touching already uses — don't introduce a Model for a controller that doesn't have one without being asked.
- SQL table name casing is inconsistent in the existing schema (`Viaje`, `Carga`, `Detalle_Carga`, `Incidencia_Viaje` vs `camiones`, `rutas`, `usuarios`, `clientes`, `productos`). MySQL table names are case-sensitive on this project's host — always match the exact casing used elsewhere for that table, don't assume a convention.
- Soft deletes: most tables use an `estado` column (`1` = active, `2` = deleted/void, sometimes `0` = inactive/pending) instead of hard deletes. Queries filter with `estado != 2` or `estado = 1`. Follow this convention rather than issuing `DELETE`.
- File uploads (proof-of-delivery images, QR codes) go through `config/cloudinary.js` (multer + multer-storage-cloudinary), not local disk storage.
- `config/seeder.js` runs on every server boot (`autoSeed()` in `app.js`'s `listen` callback) and idempotently creates the default "Caja Interna" entity/account if missing — it's not a one-time seed script.

### Auth & permissions — no sessions/JWT

- Login (`controllers/authController.js`) just verifies bcrypt-hashed credentials and returns user info; there is no token issued.
- The frontend stores the logged-in user in `sessionStorage` (`usuario_joselito`) and sends the profile id on every API call as the `x-user-profile` header (some newer endpoints also expect `x-user-id`). The backend trusts this header — `middlewares/verificarPermisos.js` (`verificarAuth`, `verificarAdmin`, `verificarDeveloper`) only checks that the header is present and matches an allowed `id_perfil` (hardcoded: `1` = Desarrollador, `2` = Administrador). There's also a dynamic RBAC layer (`OpcionModel`/`menuController`) that builds the sidebar per-profile from the `opciones`/`perfiles` tables.
- Anything checking "who is the current user" server-side should read `req.headers['x-user-profile']` (and `x-user-id` where used), matching the existing controllers — do not invent a different auth mechanism.

### Frontend: static multi-page + per-view SPA loader

- `frontend/login.html` is the entry point; `frontend/dashboard.html` is the shell for everything else.
- `frontend/js/dashboard.js` fetches the RBAC menu from `/api/menu/:id_perfil`, builds the sidebar, and on nav-link click fetches `frontend/vistas/<ruta>.html` into `#app-content`, then dynamically loads `frontend/js/vistas/<ruta>.js`.
- Each view script must expose a global `init_<ruta>()` function (matching the view's filename) — this is called after the view's HTML and script are injected. This is the required hook for any new view; there's no other lifecycle/router.
- View scripts talk to the API directly with `fetch`, manually reading `sessionStorage.usuario_joselito` and attaching `x-user-profile` on each request (there's no shared API client/wrapper — this is repeated per view, so match the existing pattern in a neighboring `frontend/js/vistas/*.js` file rather than centralizing it unprompted).
- Tables commonly use DataTables (`$.fn.DataTable`); `dashboard.js` destroys existing DataTable instances before swapping views to avoid leaks — keep that in mind if a new view also uses DataTables.

## Environment

`.env` (gitignored) provides `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MIAPICLOUD_TOKEN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Note `database/` (raw SQL schema/migration files) and `.agents/` are also gitignored — they exist locally but won't show up in `git status`/diffs as tracked changes.
