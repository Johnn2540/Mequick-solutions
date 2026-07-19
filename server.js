// Local development entry point only. Vercel never runs this file — it
// invokes api/index.js directly, which exports the same Express app
// without binding a port. Keeping app.js listen-free is what makes the
// app portable between `node server.js` and a serverless function.
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mequick Solutions server running at http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
