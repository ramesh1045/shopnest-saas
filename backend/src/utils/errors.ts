export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}