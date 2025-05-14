/* eslint-disable no-console */
const path = require('path');
const express = require('express');
const csp = require('express-csp');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const { title } = require('process');

const app = express();

// setting pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//middlewares

// set security HTTP headers
/*app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; " +
      "style-src 'self' https://unpkg.com; " +
      "img-src 'self' data: https://tile.openstreetmap.org;" +
      "script-src 'self' https://js.stripe.com;",
  );
  next();
});*/
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://cdn.jsdelivr.net',
  'https://js.stripe.com/',
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = ['https://unpkg.com', 'https://tile.openstreetmap.org'];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      imgSrc: [
        "'self'",
        'blob:',
        'data:',
        'https://unpkg.com/',
        'https://tile.openstreetmap.org/',
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
      connectSrc: ["'self'", 'blob:', 'data:', ...connectSrcUrls],
      frameSrc: ['https://js.stripe.com/'],
    },
  }),
);
//app.use(helmet());

// body parser , reading the data from body into req.body
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// data sanitizing against NoSQL query injection attack
app.use(mongoSanitize());
/* this library express-mongo-sanitize remove the dolar sign from the data written by the user
because all the opreators that used in express must started with dolar sign like ({$gt: ''})*/

// data sanitizing against xss by cleaning every user input from any malicious HTML code
app.use(xss());

// prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      // whiteList is to allow to these fields to be duplicated in the URL
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// development enviroment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // return req information
}

// this limiter will limit the number of requests came from one IP to prevet brute force attack and DOS attack
const limiter = rateLimit({
  max: 100, // number of requests
  windowMs: 60 * 60 * 1000, // per time in miliseconds (this limiter limit 100 requests per 1 hour)
  message: 'to many requests from this IP please please try again after 1 hour',
});
app.use('/api', limiter); // allow this limiter to any routes from the /api

// serving static files
app.use(express.static(path.join(__dirname, 'public'))); // serve static files from a folder not from a route
app.use(compression());

app.use((req, res, next) => {
  // create middleware should be put before the routes and runs at every request (dont forget next function to avoid stuckness)
  req.requstTime = new Date().toISOString();
  //console.log(req.cookies);
  next(); // go to the next middleware
});

// routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

/* we put this middleware after the routes to catch all the requests (get,post,patch....) (app.all)
 that will not be reached by the above routes so we handeld the erorr in this middleware*/
app.all('*', (req, res, next) => {
  /* Because now we need to actually pass that error into next, so if the next function receives an argument, no matter what it is,
Express will automatically know that there was an error so it will assume that whatever we pass into next is gonna be an error.
And that applies to every next function in every single middleware anywhere in our application. So again, whenever we pass anything into next,
it will assume that it is an error, and it will then skip all the other middlewares in the middleware stack
and sent the error that we passed into our global error handling middleware*/
  next(new AppError(`can't find ${req.originalUrl} in the server`, 404));
});

//our global error handling middleware
app.use(globalErrorHandler);
module.exports = app;
