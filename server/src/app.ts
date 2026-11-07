import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.config.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: ENV.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Master API router
  app.use('/api/v1', apiRouter);

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

export default createApp;
