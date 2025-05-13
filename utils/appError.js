class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // see if the errorcode is 400 (fail) or 500(error)
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); // hide it from the stack and go to the main function that caused the error
  }
}

module.exports = AppError;
