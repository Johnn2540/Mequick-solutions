// Fails fast with a clear message if a required env var is missing, instead
// of letting each subsystem discover it independently deep in its own code
// path — e.g. a missing CSRF_SECRET otherwise surfaces as a bare
// `TypeError [ERR_INVALID_ARG_TYPE]` inside csrf-csrf's crypto internals,
// and a missing DATABASE_URL as a Prisma error on the first query that
// happens to run. Neither tells you which env var to go set.
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        "These are never read from a committed .env file in production — set them in your " +
        'deployment platform\'s project settings (e.g. Vercel → Settings → Environment Variables) ' +
        'and redeploy.'
    );
  }
}

module.exports = validateEnv;
