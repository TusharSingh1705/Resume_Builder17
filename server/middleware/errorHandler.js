
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join('. ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for: ${field}. Please use a different value.`;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
    statusCode = 403;
    message = 'Invalid or missing CSRF token. Please refresh the page and try again.';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('ERROR:', {
      status: statusCode,
      message: message,
      stack: err.stack,
    });
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  }

  res.status(statusCode).send(
    `<h1>Error ${statusCode}</h1>` +
    `<p>${message}</p>` +
    `<p><a href="/dashboard">Go to Dashboard</a> | <a href="/login">Go to Login</a></p>`
  );
};

module.exports = { AppError, globalErrorHandler };
