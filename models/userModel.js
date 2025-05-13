const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { type } = require('os');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user name must be defined'],
    trim: true, // removing the white space in the beggining and the end of the sentence
    maxlength: [40, 'the maximum length of the name is 40'],
    minlength: [5, 'the minimum length of the name is 5'],
  },
  email: {
    type: String,
    required: [true, 'A user name must be defined'],
    unique: true,
    lowercase: true,
    trim: true, // removing the white space in the beggining and the end of the sentence
    validate: [validator.isEmail, 'please enter a vaild email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'password is required'],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, 'please confirm your password'],
    validate: {
      // it will only work with save and create opreations not with update (we will solve this problem later)
      validator: function (el) {
        return el === this.password;
      },
      message: 'password is not the same',
    },
  },
  passwordChangesAt: {
    type: Date,
  },
  PasswordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// this function is to encrypt the password at the data base
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //if the password not modified so go to the next

  // hasing the password with the cost 12 (increasing the cost will be more secure but it will take more time, so 12 is balanced)
  this.password = await bcrypt.hash(this.password, 12);

  // deleting the confirmPassword field because we no longer need it
  this.confirmPassword = undefined;
  next();
});

// this function will check if the password has been modified (like reset password function) or not to update the passwordChangedAt proberty
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next(); //if the password not modified or the user is just intitilzed so go to the next

  this.passwordChangesAt = Date.now() - 1000; //we subtract 1000 (1 sec) because the delay that will happened while get the database

  next();
});

// this fun is for dont show the inactive accounts (users) when we used any find query
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});
//instance method is basically a method that is gonna be available on all documents of a certain collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangesAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangesAt.getTime() / 1000,
      10,
    );
    console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp; // if the JWTTime is smaller (earlyer) than the changdTime
    // then the password has been changed so we need to log the user out and let him log in again with the new password so we gonna return false
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.PasswordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log(
    { resetToken },
    this.PasswordResetToken,
    this.passwordResetExpires,
  );

  return resetToken;
};
const User = mongoose.model('user', userSchema);
module.exports = User;
