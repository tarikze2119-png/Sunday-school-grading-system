// Vercel Serverless Function Entrypoint (CommonJS)
// This file ensures Vercel's Express builder never generates an ESM bundle for /var/task/app.js.
// It delegates directly to the compiled TypeScript distribution in dist/app.js.
const app = require('./dist/app.js');

module.exports = app;
