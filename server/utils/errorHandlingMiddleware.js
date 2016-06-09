export default function generalErrorHandler(err, req, res, next) {
  if (err) {
    console.error(err);
    console.error(err.stack);
    if (res.headersSent) {
      return next(err);
    }
    res.status(502).send(err);
  }
  return next();
}
