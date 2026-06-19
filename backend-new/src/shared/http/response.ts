export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    message,
    data,
  };
}
