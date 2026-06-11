export function getErrorMessage(error: any, fallback = 'Ocorreu um erro inesperado.') {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}
