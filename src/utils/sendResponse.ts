import { Response } from "express";

interface SendResponseOptions<T> {
  res: Response;
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export const sendResponse = <T>({
  res,
  statusCode,
  success,
  message,
  data,
  meta,
}: SendResponseOptions<T>): void => {
  res.status(statusCode).json({
    success,
    message,
    ...(meta && { meta }),
    ...(data !== undefined && { data }),
  });
};
