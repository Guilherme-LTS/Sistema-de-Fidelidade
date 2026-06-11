export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError;
};
