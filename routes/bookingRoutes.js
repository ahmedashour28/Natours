const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const Router = express.Router();

Router.use(authController.protect);
Router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

Router.use(authController.restrictTo('admin', 'lead-guide'));

Router.route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

Router.route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = Router;
