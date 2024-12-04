export const ApiError = (statusCode, message) => {
  const error = new Error();
  error.statusCode = statusCode || 500;
  error.message = message || "Internal Server Error";
  return error;
};
