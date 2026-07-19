// Vercel serverless entry point. Vercel's @vercel/node runtime detects any
// file under /api and treats its export as a request handler — an Express
// app is callable as (req, res), so exporting it directly is sufficient.
// No app.listen() here: Vercel manages the HTTP server itself.
module.exports = require('../app');
