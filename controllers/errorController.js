const AppError = require('../utils/appError');

const handelCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handelDuplicateNameDB = (err) => {
  const value = err.keyValue;
  console.log(value);
  const message = `Duplicate field value : ${value}`;
  return new AppError(message, 400);
};

const handelValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  console.log(errors);
  const message = `invalid input data ${errors.join('.     ')}`;
  return new AppError(message, 400);
};

const handelJWTerror = () =>
  new AppError('invaild token please login again', 401);

const handelTokenExpiredError = () =>
  new AppError('the token has been expired please login again', 401);

const sendErrorDev = (err, req, res) => {
  console.log(err);
  // api error
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      message: err.message,
      status: err.status,
      error: err,
      stack: err.stack,
    });
  }
  // rendered website error
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // api error
  if (req.originalUrl.startsWith('/api')) {
    // opretional errors (the errors that sent by the global error handler that we did in appError.js file)
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // programming or other errors that we didnt handel in the global error handler
    // 1- log the error
    console.error('ERRORRRR', err);

    // 2- send generic message
    return res.status(500).json({
      status: 'error',
      message: 'something went wrong!!!!',
    });
  }
  // renderd website
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong',
      msg: err.message,
    });
    // programming or other errors that we didnt handel in the global error handler
  }
  // 1- log the error
  console.error('ERRORRRR', err);

  // 2- send generic message
  return res.status(500).json({
    status: 'error',
    message: 'please try agian later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    let error = { ...err };
    if (error.name === 'CastError') error = handelCastErrorDB(error);
    if (error.code === 11000) error = handelDuplicateNameDB(error);
    if (error.name === 'validationError')
      error = handelValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handelJWTerror(error);
    if (error.name === 'TokenExpiredError')
      error = handelTokenExpiredError(error);
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.module;
    if (error.name === 'CastError') error = handelCastErrorDB(error);
    if (error.code === 11000) error = handelDuplicateNameDB(error);
    if (error._message.includes('validation'))
      error = handelValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handelJWTerror();
    if (error.name === 'TokenExpiredError') error = handelTokenExpiredError();
    sendErrorProd(err, req, res);
  }
};
