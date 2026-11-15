import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Handle Prisma interactive transaction timeout (P2028) as an infrastructure timeout (HTTP 503 Service Unavailable)
  // Ensures infrastructure transaction timeouts remain strictly distinguishable from HTTP 400 business-rule rejections
  if (err.code === 'P2028' || (err as any).code === 'P2028') {
    const statusCode = 503;
    const errorCode = 'TRANSACTION_TIMEOUT';
    const amharicMessage = 'የዳታቤዝ ግብይት ጊዜው አልቋል፤ እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።';
    console.error(`[ስህተት] PrismaClientKnownRequestError [P2028 - 503]: ${err.message}`);
    return res.status(statusCode).json({
      success: false,
      message: amharicMessage,
      code: errorCode,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      details: err.details,
    });
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');

  const amharicMessage =
    statusCode === 500 && !err.message.includes('SystemSetting') && !err.message.includes('General Admin')
      ? 'ያልታሰበ የውስጥ ሲስተም ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
      : err.message || 'ስህተት ተከስቷል።';

  console.error(`[ስህተት] ${err.name || 'Error'} [${errorCode} - ${statusCode}]: ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: amharicMessage,
    code: errorCode,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    details: err.details,
  });
};
