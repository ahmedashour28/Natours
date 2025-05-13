const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// .get() usally used to render pages into the browser

router.use(authController.isLoggedIn);

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview,
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/logIn', authController.isLoggedIn, viewController.getLoginForm);
router.get('/me', authController.protect, viewController.getAccountInfo);
router.get(
  '/my-bookings',
  authController.protect,
  viewController.getMyBookings,
);

router.post(
  '/submit-user-data',
  authController.protect,
  viewController.updateUserData,
);

module.exports = router;
