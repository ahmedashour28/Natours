const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const Router = express.Router();

Router.post('/signUp', authController.signUp);
Router.post('/logIn', authController.logIn);
Router.get('/logout', authController.logOut);
Router.post('/forgotPassword', authController.forgotPassword);
Router.patch('/resetPassword/:token', authController.resetPassword);

// using this line will apply this middle ware to all of the routes that come after it because the middle ware are called by order
// so we dont need to call authcontroller.protect to any of the upcoming routes it will be applied by defulat
Router.use(authController.protect);

Router.patch('/updateMyPassword', authController.updateMyPassword);
Router.get('/Me', userController.getMe, userController.getUser);
Router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.updateMe,
);
Router.delete('/deleteMe', userController.deleteME);

// the same idea of the above comment all of the upcoming routes will be restricted to admin
Router.use(authController.restrictTo('admin'));

Router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

Router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = Router;
