export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code?: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      code: code || "INTERNAL_ERROR",
      details,
    },
  };
}
