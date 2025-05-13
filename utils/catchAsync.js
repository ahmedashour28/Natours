module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/* this function is to catch errors in the async functions and if there is an error it will sent it to the global error handler (.catch(next))
 and if there is no error it will return the caller function again
this function is will replace the (try catch ) block in every async function 
all we have to do is to call this function and then pass our async function to it */
