const express = require('express');

const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const Router = express.Router();

//Router.param('id', tourController.checkId);
Router.use('/:tourId/reviews', reviewRouter);

Router.route('/top-5-cheap').get(
  tourController.aliasTopTours,
  tourController.getAllTours,
);

Router.route('/tour-stats').get(tourController.getTourStats);

Router.route('/monthly-plan/:year').get(
  authController.protect,
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.tourMonthlyPlans,
);

Router.route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  ); // shortcut for the the two line above

Router.route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'laed-guide'),
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'laed-guide'),
    tourController.deleteTour,
  );

Router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(
  tourController.getToursWithin,
);
Router.route('/distances/:latlng/unit/:unit').get(tourController.getDistance);

/*
// we  gonna use merge params feature at express instead of this code
Router.route('/:tourId/reviews').post(
  authController.protect,
  authController.restrictTo('user'),
  reviewController.createReview,
);*/

module.exports = Router;
