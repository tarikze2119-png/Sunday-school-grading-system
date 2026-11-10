import app = require('./app.js');
import { ENV } from './config/env.config.js';
import announcementService from './services/announcement.service.js';

if (!process.env.VERCEL) {
  const server = app.listen(ENV.PORT, () => {
    console.log('================================================================');
    console.log(` የሰንበት ትምህርት ቤት የተማሪዎች ውጤት አስተዳደር ሥርዓት ሰርቨር ተነስቷል`);
    console.log(` Sunday School Grading System Server running on port: ${ENV.PORT}`);
    console.log(` Environment: ${ENV.NODE_ENV}`);
    console.log(` Health check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log('================================================================');
  });

  // Background automated synchronization for scheduled & expired announcements (every 60s)
  const syncTimer = setInterval(async () => {
    try {
      await announcementService.autoSyncAnnouncementStatuses();
    } catch (err) {
      console.error('Error syncing scheduled announcements:', err);
    }
  }, 60000);

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    clearInterval(syncTimer);
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

export = app;

