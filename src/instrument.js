const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://2279b3d391721fce953df91436ca72b1@o4511171868229632.ingest.us.sentry.io/4511171884941312',
  environment: process.env.NODE_ENV || 'production',
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
});
