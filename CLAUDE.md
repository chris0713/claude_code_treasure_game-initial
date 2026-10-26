# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page React 18 + TypeScript treasure-hunt game, exported from Figma Make and built with Vite. It is the starter project (`initial` branch of https://github.com/uopsdod/claude_code_treasure_game) for a Claude Code course. `README.md` lists the course exercises: sound effects, a win/tie/loss result, a key cursor on hover, SQLite sign-in, and the Vercel / GitHub Pages deploy commands.

## Commands

```bash
npm install
npm run dev                         # Vite dev server on http://localhost:3000 (opens the browser)
npm run build                       # production build to build/ (not dist/)
npx vite preview                    # serve build/ locally, with the /api routes (no npm script)
npm test                            # Vitest, every tests/**/*.test.{ts,tsx}
npx vitest run tests/App.test.tsx   # one file (add -t "<name>" for one test)
npm run coverage                    # V8 coverage; fails below 95% statements/branches/functions/lines
```

There is no linter and no `tsconfig.json`. Vite (SWC) strips types without checking them, so type errors fail neither the build nor the tests. Node ≥ 22.13 is required for `node:sqlite`, which prints an ExperimentalWarning. On Node 25+, `vitest.config.ts` runs test workers with `--no-experimental-webstorage` so that Node's own `localStorage` doesn't hide jsdom's.

Deploys are project commands in `.claude/commands/`:
- `/deploy_vercel` builds and runs `vercel deploy --prod`. `vercel.json` sets `outputDirectory: build`.
- `/deploy_github_page` pushes the source to the user's GitHub repo. It builds with `npm run build -- --base=/<repo>/ --outDir build-gh-pages` and publishes that folder to the `gh-pages` branch. If the folder came from the course repo, its `origin` is renamed to `upstream`. A zip download has no `.git` yet, and the command runs `git init -b main` in that case.

Keep `base` out of `vite.config.ts`, because dev and Vercel serve from `/`. Both deployed sites are static, with no `/api`, so only guest mode works there.

## Architecture

- **Game logic is all in `src/App.tsx`.** There are three boxes, and one random box has `hasTreasure`. Opening a box scores +200 for the treasure and −100 for a skeleton. The game ends when the treasure is found or every box is open. Then a Win / Tie / Loss badge (score > 0 / = 0 / < 0) appears next to the score.
- **Opening a box.** `openBox` calls `setScore` inside the `setBoxes` updater, reading `score` from the closure. Side effects such as `new Audio(...).play()` run in `openBox` before `setBoxes`, never inside the updater, because React may run an updater twice.
- **Assets.** Images and audio are imported as ES modules from `src/assets/` and `src/audios/`. `chest_open.mp3` plays for the treasure and `chest_open_with_evil_laugh.mp3` for a skeleton. Closed boxes use `key.png` as the cursor through an inline `style`. Animations use `motion/react`.
- **Accounts and scores (SQLite).**
  - `server/api.mjs` exports `createApiHandler({ dbPath })`, a Connect-style middleware with a route table: `POST /api/signup|signin|signout`, `GET /api/me` and `GET`/`POST /api/scores`.
  - It runs in no separate process: the `sqliteApi` plugin in `vite.config.ts` mounts it into `vite` (dev) and `vite preview`.
  - The database is `data/treasure.db`. It is gitignored, excluded from Vercel uploads, created on first start, and ignored by the dev watcher. Its tables are `users`, `sessions` and `scores`. Passwords are scrypt-hashed, and session tokens are stored as sha256 hashes.
  - On the client, `src/api.ts` wraps `fetch` and keeps the token in `localStorage`. The UI is `src/components/AuthScreen.tsx` and `ScoreHistory.tsx`.
  - In `App.tsx`, `player` is `null` (show the auth screen), a guest, or a signed-in user. Only signed-in players' final scores are POSTed, once per `round` (guarded by `savedRoundRef`).
- **UI library.** `src/components/ui/` is a generated shadcn/ui library (Radix-based, with `cn()` in `utils.ts`). `Button`, `Input` and `Label` are used today. Reuse these components instead of writing new primitives.
- **Leftovers.** `src/components/figma/ImageWithFallback.tsx` and `src/guidelines/Guidelines.md` (an empty template) are left over from Figma Make. `result/` and `src/results/` hold screenshots only.

## Tests

- Tests live in `tests/` and mirror `src/` and `server/`. `tests/ui/` covers the generated `ui/` library.
- They run in jsdom with Testing Library. `tests/setup.ts` adds the jest-dom matchers and cleanup, and stubs the browser APIs jsdom lacks: ResizeObserver, IntersectionObserver, matchMedia, `elementFromPoint`, `scrollIntoView` and pointer capture.
- `vitest.config.ts` reuses the Vite aliases but not the `sqlite-api` plugin. Server tests start with `// @vitest-environment node` and use a temp SQLite file.
- Coverage counts every file in `src/` (including `ui/`) and in `server/`. Don't exclude files to meet the threshold.

## Conventions

- Put a one-line comment above every new function that says what it does and names its inputs and output, e.g. `// Starts a fresh game for a guest or signed-in player. Input: player. Output: none.` (a course rule from `README.md` that the existing code follows).

## Gotchas

- **Tailwind is precompiled.** `src/index.css` is static Tailwind v4 output, imported by `main.tsx`. There is no Tailwind dependency or PostCSS step, so a utility class that isn't already in `index.css` has no effect. Use an inline `style`, or add the CSS rule to `index.css` by hand. `src/styles/globals.css` holds theme tokens but is not imported anywhere.
- **Versioned imports need an alias.** The Figma-generated `ui/` files import with version suffixes such as `'@radix-ui/react-slot@1.1.2'`. `vite.config.ts` aliases each one to the plain package name, so add an alias when you add a new versioned import. `@` resolves to `src/`.
