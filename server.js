/* eslint-disable no-console */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// handle the unhandled exception from sync fun
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('unhandeled Exeption ...shutting down');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const db = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('db connected successfully');
  });

//console.log(process.env);

const port = process.env.port || 3000;
const server = app.listen(port, () => {
  console.log(`app is running using port ${port}...`);
});

// handle the unhandled rejection
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('unhandeled rejection ...shutting down');
  // what we do is in the below lines to shutdown gracefully where we first close the server and only then, we shut down the application
  server.close(() => {
    process.exit(1);
  });
});
