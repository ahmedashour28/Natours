const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIfeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('no data found with this id', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateone = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('no data found with this id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    //const newTour = new Tour({});
    //newTour.save();

    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { newDoc },
    });
  });

exports.getOne = (Model, popObtions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popObtions) query = query.populate(popObtions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('no data found with this id', 404));
    }
    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to allow for nested GET reviews on tour (hack) (it is only for reviews)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIfeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .fieldsLimiting()
      .pagination();
    const docs = await features.query; // we can use .explain() to see all the data of the query and we can use it in optimization

    // send response
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: { docs },
    });
  });
