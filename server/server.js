
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { doubleCsrf } = require('csrf-csrf');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const { globalErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache the DB connection promise so it's only called once
const dbReady = connectDB();

// Ensure DB is connected before handling any request
app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (err) {
    res.status(500).send('Database connection failed. Please check server logs.');
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/views'));

// Trust Vercel's reverse proxy (required for secure cookies to work)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: '10kb' }));

app.use(cookieParser(process.env.SESSION_SECRET));

app.use(mongoSanitize());

app.use(hpp());

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000, 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

if (process.env.MONGODB_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, 
    collectionName: 'sessions',
  });
} else {
  console.warn('  ⚠️  MONGODB_URI not set — using in-memory session store (sessions will not persist)');
}

app.use(session(sessionConfig));

app.use(flash());

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'fallback-csrf-secret',
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  getTokenFromRequest: (req) => {

    return req.body._csrf || req.headers['x-csrf-token'] || req.headers['x-csrftoken'];
  },
});

app.use('/static', express.static(path.join(__dirname, '../client/public')));

app.use('/media', express.static(path.join(__dirname, 'media')));

app.use((req, res, next) => {

  res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;

  res.locals.messages = req.flash();

  res.locals.csrfToken = generateToken(req, res);

  next();
});

app.use(doubleCsrfProtection);

app.use('/', authRoutes);

app.use('/', resumeRoutes);

app.use((req, res) => {
  res.status(404).send(
    '<h1>Page Not Found</h1><p>The requested URL was not found.</p>' +
    '<p><a href="/login">Go to Login</a></p>'
  );
});

app.use(globalErrorHandler);

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n  ✅ Resume Builder running at http://localhost:${PORT}`);
    console.log(`  📂 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
