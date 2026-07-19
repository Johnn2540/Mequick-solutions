const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const prisma = require('./db');
const { logAction } = require('../services/audit.service');
const AUDIT = require('../utils/auditActions');

// Fields safe to expose as req.user / res.locals.currentUser and to
// templates. passwordHash is deliberately never selected here — it's only
// ever read inside the strategy's own verify callback below.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  lastLogin: true,
  createdAt: true,
};

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', passReqToCallback: true },
    async (req, email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        const ipAddress = req.ip;
        const userAgent = req.get('user-agent') || null;

        if (!user) {
          // No matching account — nothing to attach a LoginHistory row to.
          return done(null, false, { message: 'Invalid email or password.' });
        }

        if (!user.isActive) {
          await prisma.loginHistory.create({ data: { userId: user.id, success: false, ipAddress, userAgent } });
          await logAction({
            req,
            userId: user.id,
            action: AUDIT.LOGIN_FAILURE,
            entityType: 'User',
            entityId: user.id,
            description: `Login attempt on deactivated account (${user.email}).`,
          });
          return done(null, false, { message: 'This account has been deactivated.' });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          await prisma.loginHistory.create({ data: { userId: user.id, success: false, ipAddress, userAgent } });
          await logAction({
            req,
            userId: user.id,
            action: AUDIT.LOGIN_FAILURE,
            entityType: 'User',
            entityId: user.id,
            description: `Failed login attempt (wrong password) for ${user.email}.`,
          });
          return done(null, false, { message: 'Invalid email or password.' });
        }

        await prisma.$transaction([
          prisma.loginHistory.create({ data: { userId: user.id, success: true, ipAddress, userAgent } }),
          prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }),
        ]);
        await logAction({
          req,
          userId: user.id,
          action: AUDIT.LOGIN_SUCCESS,
          entityType: 'User',
          entityId: user.id,
          description: `${user.name} logged in.`,
        });

        const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: SAFE_USER_SELECT });
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Only the user id is written into the session row — keeps each session
// payload tiny regardless of how much profile data the user has.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Runs on every authenticated request. Re-fetching from the DB (rather
// than trusting a stale session copy) means a deactivated account or role
// change takes effect on the user's very next request.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
    if (!user || !user.isActive) {
      return done(null, false);
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
