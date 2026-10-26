---
description: Build this project and deploy it to Vercel production, then report the live URL
allowed-tools: Bash(npm run build:*), Bash(npx --yes vercel:*), Bash(npx vercel:*), Read, Write, Edit
---

Deploy this local project to Vercel (production) and give me the public URL.

Extra notes from me (may be empty): $ARGUMENTS

Steps:

1. **Build locally first.** Run `npm run build`. If it fails, stop and show me the error — do not deploy a broken build.

2. **Make sure Vercel uses the right output folder.** This project builds to `build/`, not Vite's default `dist/`. If `vercel.json` is missing, create it with exactly:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "vite",
     "buildCommand": "npm run build",
     "outputDirectory": "build"
   }
   ```
   If it exists, check that `outputDirectory` is `build` and fix only that field.

3. **Check the Vercel login.** Run `npx --yes vercel whoami`. If I am not logged in, stop and tell me to run `! npx vercel login` in the prompt (it is interactive), then run this command again. Never ask me for or print a token.

4. **Deploy.** Run `npx --yes vercel deploy --prod --yes`. On the first run this creates and links a Vercel project (the `.vercel/` folder, already gitignored). If it fails, show the error and stop — don't retry with different flags blindly.

5. **Report**, short:
   - The **production URL** (the stable `https://<project>.vercel.app` alias, not only the one-off deployment URL) as a clickable link.
   - Note that Vercel serves only the static build: the SQLite sign-in / score API (`server/api.mjs`, runs inside the Vite server) does not exist there, so on the live site only **guest mode** works.
   - Any files you created or changed (e.g. `vercel.json`). Do not commit or push.
