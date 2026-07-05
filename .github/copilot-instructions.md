# Project context for Copilot

This is a Node.js/Express backend for a Discord slash-command bot.

Stack: Express, MongoDB (via mongoose), discord-interactions for 
signature verification, deployed on Render.

Conventions:
- All routes live in src/routes/
- Use async/await, not .then() chains
- Environment variables are accessed via process.env, never hardcoded
- MongoDB collections: interactions (logged commands), servers 
  (per-server config), command_config (admin-editable rules)
- Use CommonJS (require/module.exports), NOT ES modules (import/export)


Current focus: building the interaction handler that logs commands 
to MongoDB and dedupes by Discord interaction ID.