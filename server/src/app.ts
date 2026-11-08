import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.config.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const createApp = (): Express => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === ENV.CLIENT_URL || origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Master API router (supports both /api/v1 and direct /api prefixes)
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // 404 handler for undefined API routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `የተጠየቀው አድራሻ '${req.originalUrl}' በሲስተሙ ውስጥ አልተገኘም።`,
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

const app = createApp();

// Universal export interop: ensures require('./app.js') is directly the Express app function
// while also supporting .default, .app, and .createApp for any consumer
(app as any).default = app;
(app as any).app = app;
(app as any).createApp = createApp;

export = app;
