# Project context for Copilot

This is a Node.js/Express backend for a Discord slash-command bot with an admin dashboard, AI-powered report tagging, and error observability.

Stack: Express, MongoDB (via mongoose), discord-interactions for 
signature verification, express-session for admin auth, Google Gemini API for AI summarization/tagging, Slack Incoming Webhook for mirroring, deployed on Render, database on MongoDB Atlas.

Conventions:
- Core Discord interaction handling lives in src/index.js
- Admin dashboard, config, and error routes live in src/routes/ (auth.js, config.js, errors.js)
- Use async/await, not .then() chains
- Environment variables are accessed via process.env, never hardcoded
- Use CommonJS (require/module.exports), NOT ES modules (import/export)
- Any fetch() call to an external service should have a timeout via AbortController and should check response.ok, not just rely on fetch throwing

MongoDB collections:
- interactions — logged slash commands, deduped by unique interactionId, includes aiTag/aiSummary for /report
- command_config — admin-editable keyword-to-tag rules, checked before falling back to Gemini's AI tag 
- error_logs — structured record of downstream failures (source, message, timestamp), shown on the admin dashboard

Current focus: project is feature-complete — core requirements, plus AI tagging, configurable rules, and observability stretch goals. 
Remaining work is polish, testing, and documentation for submission.