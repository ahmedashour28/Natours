const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handellerFactory');
const multer = require('multer');
//const sharp = require('sharp');

// multer is to uploading files so we used it to allow to the user to upload user photo
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});
//const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('not an image file please upload an image file', 400),
      false,
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

//this function is to resize the uploaded photo i will comment it because it is need to upgrade the node version to use sharp i will make it later
/*exports.resizeUserPhoto = (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`puplic/img/users/${req.file.filename}`);

  next();
};*/

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // we gonna send error if the user uses this function to update his password this is only for the other data (we made a function for passwords )
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'this route is not avaliable for passwords please use /updatePassword',
        400,
      ),
    );
  }

  // update the data in the body but we gonna filter this data (using filterObj  which we initilaized above)
  // because we dont want the user to modify some proberties like (role)
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  /*we used findByIdAndUpdate here and we dont use it with manipulating the password
  because as we said before the methods at the (user model) only runs with create and save
   and we were needing these methods when we updating passwords and we dont need them here so we can use (findByIdAndUpdate) */
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

exports.deleteME = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
  next();
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'function is not avilable now please use /signUp',
  });
};

exports.deleteUser = factory.deleteOne(User);
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateone(User);
