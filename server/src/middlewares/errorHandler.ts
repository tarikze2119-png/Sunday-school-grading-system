import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const amharicMessage =
    statusCode === 500
      ? 'ያልታሰበ የውስጥ ሲስተም ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
      : err.message || 'ስህተት ተከስቷል።';

  console.error(`[ስህተት] ${err.name || 'Error'}: ${err.message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    message: amharicMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    details: err.details,
  });
};
