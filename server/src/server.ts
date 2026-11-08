import app = require('./app.js');
import { ENV } from './config/env.config.js';

if (!process.env.VERCEL) {
  const server = app.listen(ENV.PORT, () => {
    console.log('================================================================');
    console.log(` የሰንበት ትምህርት ቤት የተማሪዎች ውጤት አስተዳደር ሥርዓት ሰርቨር ተነስቷል`);
    console.log(` Sunday School Grading System Server running on port: ${ENV.PORT}`);
    console.log(` Environment: ${ENV.NODE_ENV}`);
    console.log(` Health check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log('================================================================');
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

export = app;

