const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');
const { promises } = require('nodemailer/lib/xoauth2');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour name must be defined'],
      unique: true,
      trim: true, // removing the white space in the beggining and the end of the sentence
      maxlength: [40, 'the maximum length of the name is 40'],
      minlength: [10, 'the minimum length of the name is 10'],
      //validate: [validator.isAlpha, 'Tour name must contain only characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty must be either: easy or medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [0, 'the minimum value of the rating is 0'],
      max: [5, 'the maimum value of the rating is 5'],
      set: (val) => Math.round(val * 10) / 10, // to round the result to one decimal number
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour price must be defined'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only works when create new document not when updating
          return val < this.price;
        },
      },
    },
    summary: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a coverImage'],
    },
    images: [String], // an array
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    maxGroupSize: {
      type: Number,
      required: true,
    },
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON  this is the way to store geospatial data (locations) in mongoBD
      type: {
        type: String,
        default: 'point',
        //enum: ['point'],
      },
      coordinates: [Number],
      adresss: String,
      description: String,
    },
    // to create an embedded documents gonna use [] just like locations below
    locations: [
      {
        type: {
          type: String,
          default: 'point',
          //enum: ['point'],
        },
        coordinates: [Number],
        adresss: String,
        description: String,
        day: Number,
      },
    ],
    //guides: Array,  // for embedding
    // this is the way to reference a user
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// the index is to create an index file sorted by the indexed fileld and the values is 1 for ascending and -1 for desending
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// virtual fields are fields that can be driven from other fields so we dont need to save it in the database to min the storage
// **note virtual proberty cannot be used in the find query, which means that we cannot use .find().where(durationWeek=1)
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'review',
  foreignField: 'tour', // this the name of the filed in the other schema that we want to populate
  localField: '_id', // this is the name of the field in this schema that we will choose the document depending on it
});

// DOCUMENT MIDDLEWARE is a middleware that runs with actions on documents
tourSchema.pre('save', function (next) {
  //this middleware will be triggerd before .save() and .create()
  this.slug = slugify(this.name, { lower: true });
  next();
});

/* this is the way to embedd a user to a tour but we will not use it in that way, we will use child referencing not embedding
(i did this to illustrate how can i embedd user)
tourSchema.pre('save', async function (next) {
  // this middleware is for embedd the tour guides (users) to the tour document
  // the guidespromises is a array of promises
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});*/

tourSchema.pre(/^find/, function (next) {
  this.populate({
    // populate is for referenceing the tour guide in the tour model to the user
    path: 'guides',
    select: '-__v -passwordChangeAt', // deselect these fields
  });
  next();
});

tourSchema.post('save', (doc, next) => {
  //console.log(doc);
  next();
});

//QUERY MIDDLEWARE is a middleware that runs with queries
tourSchema.pre(/^find/, function (next) {
  // we used regulaer expression for (find) because there are more than one find function to get document such as findOne() and findOneAndUpdate()
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

/*tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start} milliseconds`);
  console.log(docs);
  next();
});*/

// AGGREGATION MIDDLEWARE
/*
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // adding a match function in the beggening (unshift) of the pipeline to exclude the secret tours
  console.log(this.pipeline());
  next();
});*/

const Tour = mongoose.model('tour', tourSchema);
module.exports = Tour;
