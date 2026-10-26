---
description: Check GitHub prerequisites (CLI, login, repo), push source to my repo and deploy the built site to GitHub Pages
allowed-tools: Bash(gh --version:*), Bash(gh auth status:*), Bash(gh auth setup-git:*), Bash(gh api:*), Bash(gh repo view:*), Bash(git status:*), Bash(git remote -v:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git check-ignore:*), Bash(git ls-files:*), Bash(git log:*), Bash(git config --get:*), Bash(node --version:*), Bash(npm install:*), Bash(npm run build:*), Bash(curl:*), Read, Edit
---

Deploy this project to GitHub Pages: push the source to my GitHub repo, publish the built site to its `gh-pages` branch, and give me the live URL. Walk me through any missing prerequisite instead of failing. This must work on Windows, macOS and Linux, and in a folder that was downloaded as a zip (no git yet).

Repo name: use `$ARGUMENTS` if I gave one, otherwise the name of the current folder (e.g. `claude_code_treasure_game`). Below, `<repo>` is that name and `<login>` is my GitHub account.

Stop rules: when a step says **stop**, tell me exactly what to do (as a `! command` I can type in the prompt when it is a command), then end — I will run `/deploy_github_page` again. Never ask for, print or store a token.

## 1. GitHub CLI
Run `gh --version`. If `gh` is not found, **stop** and give the install command for my OS:
- Windows: `! winget install --id GitHub.cli -e`
- macOS: `! brew install gh` (no Homebrew → download from https://cli.github.com)
- Linux: follow https://github.com/cli/cli/blob/trunk/docs/install_linux.md

Then tell me to restart Claude Code (a new install is only on PATH in a new session) and run `/deploy_github_page` again.

## 2. GitHub login
Run `gh auth status`. If I am not logged in, **stop**: tell me to run `! gh auth login` and pick GitHub.com → HTTPS → "Login with a web browser".
When logged in: run `gh auth setup-git` (so `git push` uses this login), then `gh api user --jq .login` to get `<login>`.

## 3. Local git repo
1. `git rev-parse --is-inside-work-tree`. If this folder is not a git repo (e.g. downloaded as a zip), run `git init -b main`.
2. `git config --get user.name` and `git config --get user.email`. If either is empty, **stop** and tell me to set them: `! git config --global user.name "Your Name"` and `! git config --global user.email "you@example.com"`.
3. Make sure secrets and build output are never committed. For each of `data/`, `.env*`, `.vercel/`, `build/`, `build-gh-pages/`, `node_modules/`: if `git check-ignore <path>` prints nothing, append that line to `.gitignore` (create it if missing) and tell me. Then `git ls-files data .env .vercel` — if any of those are already tracked, **stop** and tell me (they would be published).

## 4. GitHub repo and remotes
Run `git remote -v`.
- If `origin` already points to `github.com/<login>/<repo>`, it was set up by an earlier run — go to step 5.
- If `origin` points somewhere else (e.g. the course repo), rename it: `git remote rename origin upstream`. If `upstream` already exists, **stop** and ask me what to do.
- Check `gh repo view <login>/<repo> --json visibility,isEmpty --jq '.visibility + " " + (.isEmpty|tostring)'`:
  - **not found** → create it: `gh repo create <repo> --public` (GitHub Pages needs a public repo on the free plan).
  - **exists and not empty** → this may be a different project with the same name. Ask me with AskUserQuestion: use this repo anyway (my branch and its `gh-pages` will be overwritten/updated) / use a different name (then ask for it and restart this step) / cancel. Never push into an existing non-empty repo without my yes.
  - **`PRIVATE`** → **stop** and ask me; do not change visibility on your own.
- `git remote add origin https://github.com/<login>/<repo>.git`.

## 5. Push the source
1. `git status --short`. If there are uncommitted changes, list them and ask me with AskUserQuestion:
   - **Commit all and push** — propose a one-line commit message summarizing the changes;
   - **Push only what is already committed** (not possible if the repo has no commits yet — then only offer commit or cancel);
   - **Cancel the deploy**.
2. Commit if I chose that (`git add -A`, then `git commit -m "<message>"`), then `git push -u origin <branch from git branch --show-current>`. If the push fails, show the error and **stop**.

## 6. Build for GitHub Pages
1. If `node_modules/` is missing, run `npm install`.
2. The site is served from `https://<login>.github.io/<repo>/`, so assets need the `/<repo>/` prefix. Pass it on the command line only — do **not** edit `base` in `vite.config.ts` (local dev and other deploys stay at `/`):
   - Bash (macOS, Linux, Git Bash on Windows): `MSYS_NO_PATHCONV=1 npm run build -- --base=/<repo>/ --outDir build-gh-pages`
   - PowerShell or cmd: `npm run build -- --base=/<repo>/ --outDir build-gh-pages`

   `MSYS_NO_PATHCONV=1` is required in Git Bash: without it, Git Bash rewrites `/<repo>/` into a Windows path such as `/Program Files/Git/<repo>/`, and the live site loads a blank page. It has no effect on macOS or Linux.
3. If it fails, show the error and **stop**. (If the error mentions `node:sqlite`, this project needs Node ≥ 22.13 — show `node --version` and tell me to upgrade.) Then check the exact asset paths: every `src=`/`href=` to an asset in `build-gh-pages/index.html` must start with `"/<repo>/assets/` (quote included), e.g. `grep -oE '(src|href)="[^"]*assets/[^"]*"' build-gh-pages/index.html`. If any path has something before `/<repo>/` (such as `Program Files` or a drive letter), delete `build-gh-pages/` and rebuild with the Bash command above. A substring match on `/<repo>/assets/` is not enough.

## 7. Publish to the gh-pages branch
`npx --yes gh-pages@6.3.0 -d build-gh-pages -b gh-pages -o origin --nojekyll -m "Deploy <short sha from git rev-parse --short HEAD>"`

This pushes only the built files. If it fails, show the error and **stop** — don't retry with different flags blindly.

## 8. Turn on GitHub Pages
`gh api repos/<login>/<repo>/pages --jq '.source.branch'`:
- **404** → `gh api -X POST repos/<login>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"` (a 409 "already exists" reply means it is on — continue).
- a branch other than `gh-pages` → `gh api -X PUT repos/<login>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"`.
- `gh-pages` → nothing to do.

## 9. Wait until it is live
Poll `gh api repos/<login>/<repo>/pages/builds/latest --jq .status` about every 15 s for up to 5 minutes (use Monitor with an until-loop, not repeated sleeps) until it is `built`. If it is `errored`, show `gh api repos/<login>/<repo>/pages/builds/latest` and **stop**.
Then `curl -s -o /dev/null -w "%{http_code}" https://<login>.github.io/<repo>/` should be `200` (a fresh site can take another minute; retry a few times before reporting a problem).
A `200` page can still be blank, so also fetch the live `index.html` (add a `?n=<random>` query to skip caches), check that its JS and CSS `src`/`href` start with `/<repo>/assets/`, and check that each of those files returns `200`. If not, report it — don't call the deploy done.

## 10. Report (short)
- The live URL as a clickable link: `https://<login>.github.io/<repo>/`.
- If the project has a server-side API (e.g. `server/api.mjs` for SQLite sign-in), say that GitHub Pages serves only static files, so that part does not work on the live site (here: only **guest mode**).
- What changed: git init / `.gitignore` lines added, remotes renamed or added, the commit (if any), which branches were pushed. If the browser shows an old version, a hard refresh (Ctrl+F5 / Cmd+Shift+R) helps.
