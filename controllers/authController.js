const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/Email');
const crypto = require('crypto');

/*const signToken = (id) => {
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};*/

const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    //secure: true, // the cookie will only sent in secure (https)

    httpOnly: true, // this will make it so that the cookie cannot be accessed or modified in any way by the browser and so this is important in order to prevent those cross-site scripting attacks
  };
  // we will make it secure only in the production env
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // remove the password from the output (but still not changed in the data base)
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user: user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    passwordChangesAt: req.body.passwordChangesAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // destructuring ES6

  // 1- check if the email and the password are exist in the body of the request
  if (!email || !password) {
    return next(new AppError('please write your email and password', 401));
  }

  // 2- check if the email is exists in the data base and the password is correct
  const user = await User.findOne({ email }).select('+password'); //  we used + with password because the password is hidden field and this is the way to get the hidden field

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('email or password is not correct'));
  }
  // 3- if every thing is ok then send the token to the client
  createSendToken(user, 200, res);
});

exports.logOut = async (req, res) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 10 * 1000),
    //secure: true, // the cookie will only sent in secure (https)

    httpOnly: true, // this will make it so that the cookie cannot be accessed or modified in any way by the browser and so this is important in order to prevent those cross-site scripting attacks
  };
  res.cookie('jwt', 'logging out', cookieOptions);
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1- getting the tokens from the header of the request
  let token;
  // check if the req.headers.authorization is starting with "Bearer" then the token will be the string after "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('you are not logged in please log in and try again', 401),
    );
  }
  //2- verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3- check if the user is still exists (the user did not delete his email before the time if the token is expired)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'the user belong to this token is not exist please signUp again',
        401,
      ),
    );
  }

  // 4- check if the password is changed after the token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'user changed the password recently, please log in again',
        401,
      ),
    );
  }
  // after passes all the conditions above the user will have grant access to the protected data
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.isLoggedIn = async (req, res, next) => {
  // 1- getting the tokens from the header of the request

  // check if the req.headers.authorization is starting with "Bearer" then the token will be the string after "Bearer"
  if (req.cookies.jwt) {
    try {
      const token = req.cookies.jwt;
      //2- verification token
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET,
      );
      // 3- check if the user is still exists (the user did not delete his email before the time if the token is expired)
      const currentUser = await User.findById(decoded.id);
      // 4- check if the password is changed after the token was issued
      if (currentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }
      // after passes all the conditions above there is a logged in user so we gonna save it in res.locals to check for it in the PUG file
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// function that will restrict modifing the data from the normal user only admin and lead-guide can modify the data
// we gonna wrape the function because the middleware don't accept paramaters
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is admin and lead-guide
    if (!roles.includes(req.user.role)) {
      return next(new AppError('you do not have a premission'), 403);
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // we gonna get the user who forgot his password from the email posted with the body
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with this eamil address', 404));
  }

  // we gonna generate the random reset token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  console.log(user);

  // we gonna send email to the user contains the reset token

  /*const message = `forgot your password? submit a patch request with your new password
  and confirm new password to : ${resetURL}.\nif you did not forgot your password please ignore this email`;*/

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    /*await sendEmail({
      email: user.email,
      subject: 'your password reset token will be vaild for 10 minuts',
      message,
    });*/
    await new Email(user, resetURL).sendResetPassword();

    res.status(200).json({
      status: 'success',
      message: 'reset token sent to your email',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'there was an error while sending an eamil please try again later',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1- we gonna get the user based on the token, so we gonna encrypt the reset token that sent in the email
  // and the user used it in the URL request with resetPasswordpath and compare it with the token in the database
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  console.log(hashToken);
  const user = await User.findOne({
    PasswordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2- if the user is found and the resetExpires is not expired so we gonna set the new password
  if (!user) {
    return next(new AppError('token is invaild or expired', 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('something went wrong please log in again', 400));
  }
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(
      new AppError(
        'inncorrect current password please enter the correct password ',
        401,
      ),
    );
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();

  createSendToken(user, 200, res);
});
