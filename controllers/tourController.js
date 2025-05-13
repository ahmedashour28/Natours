/* eslint-disable no-console */
const { json } = require('express');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { Mongoose } = require('mongoose');
const factory = require('./handellerFactory');

exports.aliasTopTours = (req, res, next) => {
  // this a middleware to get the top 5 ratings and cheapest tours
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

/*
exports.getTour = catchAsync(async (req, res, next) => {
  // Tour.findOne({_id: req.params.id})
  const tour = await Tour.findById(req.params.id).populate('reviews');

  if (!tour) {
    return next(new AppError('no tour found with this id', 404));
  }
  res.status(200).json({
    status: 'success',
    data: tour,
  });
});*/
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

/*
exports.createTour = catchAsync(async (req, res, next) => {
  //const newTour = new Tour({});
  //newTour.save();

  const newTour = await Tour.create(req.body);
  res.status(201).json({
    status: 'success',
    data: { newTour },
  });
});*/
exports.createTour = factory.createOne(Tour);

/*
exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!tour) {
    return next(new AppError('no tour found with this id', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});*/
exports.updateTour = factory.updateone(Tour);

exports.deleteTour = factory.deleteOne(Tour);

/*exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('no tour found with this id', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});*/

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    /*here we are gonna match or get the tours that has RatingAverage greater than or equal 4.5 in the matching stage
       and then we gonna group or categorize them by difficulty and calculate the avgrate and avgprice and the num for every group
       in the grouping stage and then we gonna sort these groups by the avgPrice that we calculted in the grouping stage*/
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.tourMonthlyPlans = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // we want to group the tours by the month
        numOfTours: { $sum: 1 },
        tors: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 }, //hide the id field
    },
    {
      $sort: { numOfTours: -1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  // this terny condition is to get the raduis from the distance
  // mongoose deal with radin so we get the distance and devide it by the radius of the earth in miles or in KM acoording to the unit in the req
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'please write the lattuide and the lungtude in the format lat,lug',
      ),
      400,
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, //this is the way that mongoose deal with geo data
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistance = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'please write the lattuide and the lungtude in the format lat,lug',
      ),
      400,
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
