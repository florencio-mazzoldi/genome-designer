export default function generalErrorHandler(err, req, res, next) {
  console.error(err);
  console.error(err.stack);
  res.status(500).send('Uh oh!');
};
