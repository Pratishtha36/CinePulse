import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If it's a known Prisma concurrency conflict or transaction timeout
  if (err?.code === 'P2034' || err?.code === 'P1008' || err?.code === 'P2028') {
    return res.status(409).json({
      error: 'Concurrency conflict: Another transaction modified or locked the seat. Please retry.',
      code: err.code,
    });
  }


  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: `Resource already exists or constraint violation on: ${err.meta?.target || 'unique field'}`,
      code: err.code,
    });
  }

  console.error('[SERVER ERROR]:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

