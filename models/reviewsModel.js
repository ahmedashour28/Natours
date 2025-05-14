const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [0, 'the minimum value of the rating is 0'],
      max: [5, 'the maimum value of the rating is 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'user',
      required: [true, 'the review must belong to a tour'],
    },

    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'tour',
      required: [true, 'the review must belong to a tour'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// to prevent dupplication of reviews from the same user to the same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  /*this.populate({
    // populate is for referenceing the tour guide in the tour model to the user
    path: 'user',
    select: '-__v -passwordChangeAt', // deselect these fields
  }).populate({
    // populate is for referenceing the tour guide in the tour model to the user
    path: 'tour',
    select: 'name',
  });*/

  // we deleted the tour populate because it will lead us to an inefficient chain of populating
  // (because when we get tour the tour will populate the reviews and the reviews will populate the tours )
  this.populate({
    // populate is for referenceing the tour guide in the tour model to the user
    path: 'user',
    select: '__id name photo', // deselect these fields
  });
  next();
});

reviewSchema.statics.calcAverageRating = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: tourId,
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // we used this.constructor.calcAverageRating because its equal to Review.calcAveageRating beacuse its defiend as static function
  // but we cant use (review.)beacuse Review is not defiend yet and we cannot define it before any methods or functions because they will be neglected
  this.constructor.calcAverageRating(this.tour);
});

// we want to update the ratingAverage when any reviews is updated or deleted so here we gonna trigger this when there are queries like findAndUpdate and findAndDelete
// we used pre to get the review document from the query (because we are using query middle ware not document),
// because if we used post we cannot access the query because it will be excuted
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // we create a property called it rev will store the review that updated or deleted
  this.rev = await this.findOne();
  //console.log(this.rev);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.rev.constructor.calcAverageRating(this.rev.tour);
});

const Review = mongoose.model('review', reviewSchema);
module.exports = Review;
