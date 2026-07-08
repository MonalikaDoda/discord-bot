# AI Notes

## AI tools used and how work was split

- **Claude** (web, free) — used for architecture planning and debugging: understanding Discord's interaction lifecycle (PING/PONG, deferred responses, Ed25519 signature verification), working through 
errors when something broke, and reviewing code before committing.
- **GitHub Copilot Free** (VS Code) — used for in-editor code generation: writing individual functions and routes (Mongoose schemas, Express routes, the Gemini API call, dashboard JS) based on my own descriptions of what each piece needed to do, referencing a `.github/copilot-instructions.md` context file for stack and conventions.
- I wrote the actual prompts to Copilot myself in most cases, working out what a piece of code needed to do (what comes in, what happens to it, what goes out) before describing it — rather than asking Copilot to  figure out the task from scratch. When something failed, I diagnosed it primarily myself using logs and testing, using Claude to confirm or narrow down the cause rather than just handing over the error and waiting for an answer.

## Key decisions I made myself

1. **Architecture: kept everything in a single Express service rather than splitting into separate services** (e.g. a separate worker for AI tagging or Slack mirroring). Given the scope and time available, one service handling interactions, dashboard routes, and background calls together was simpler to reason about and deploy, at the cost of the interaction handler doing more work inline than a larger production system might.
2. **Slack Incoming Webhook over a second Discord channel** for the mirror requirement, since it demonstrates integrating outside Discord's own ecosystem, and Slack's webhook setup is a single POST request with no auth complexity.
3. **Service choice: MongoDB over the suggested Postgres**, since I already had MongoDB/Mongoose experience from prior projects — the task explicitly allows any stack, and this let me move faster 
without learning a new query paradigm mid-task.

## The hardest bug / wrong turn

The recurring issue was a single line: `app.use(express.json())` applied globally in `index.js`. Discord's `discord-interactions` library needs the **raw, unparsed request body** to verify its 
Ed25519 signature but `express.json()` consumes and parses the body stream before that verification can happen, silently breaking `/interactions` (Discord would show "The application did not respond," 
with no obvious link back to this cause).

I removed this line early on after diagnosing it via the library's own warning log (`req.body was tampered with, probably by some other middleware`). But it came back **twice more** as the project grew — Copilot re-added `express.json()` globally while generating code for unrelated features (the login form, then again around the config/error routes), since a JSON/form body parser is a completely reasonable default for those specific routes, but Copilot had no memory that this exact line had already broken a *different* route earlier in the project.

I noticed it each time by recognizing the same distinctive log line, and fixed it the same way each time: removing the global parser and, eventually, scoping `express.json()` only to the specific routes that actually need it (e.g. the `/api/config` POST route), leaving `/interactions` completely untouched. I also updated `.github/copilot-instructions.md` afterward to explicitly call out this constraint, to reduce the chance of a fourth recurrence.

## What I'd improve with more time

- Render's free tier cold-starts after ~15 minutes of inactivity, which can exceed even the deferred-response window on the first 
request after idle. Adding an external keep-alive ping as a mitigation would fix this problem, but a paid always-on tier would be the production-correct fix.
- `sendSlackMessage` only catches thrown/network-level exceptions, not HTTP error responses — a request that reaches Slack but gets rejected (e.g. an invalid webhook) doesn't currently trigger the error-logging path, since `fetch()` doesn't throw on a non-2xx response by itself. I found this while deliberately testing the error-log feature; the fix is a `response.ok` check that throws manually so the existing catch/logError path picks it up.
- Multi-server support was intentionally skipped — the current setup assumes a single connected Discord server, sufficient for this task but not scalable to multiple servers without real config isolation.