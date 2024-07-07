export const globalErrorHandler = (err, req, res, next) => {
  // Default status code and message
  err.statusCode ||= 500;
  err.message ||= "Internal server error";

  // Handle specific MongoDB errors
  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = "Invalid ID format";
  } else if (err.code === 11000) {
    err.statusCode = 409;
    err.message = "Duplicate key error";
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    err.statusCode = 400;
    const messages = Object.values(err.errors).map((val) => val.message);
    err.message = `Validation error: ${messages.join(", ")}`;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
