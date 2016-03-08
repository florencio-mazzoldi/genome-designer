import express from 'express';
const router = express.Router();

var defaultUser = {
  uuid: "0",
  email: "developer@localhost",
};

router.post('/login', function (req, res) {
  res.cookie('sess', 'mock-auth', {httpOnly: false});
  res.statusCode = 200;
  res.send(defaultUser);
  return res.end();
});

router.get('/current-user', function (req, res) {
  if (req.cookies.sess == null) {
    console.log("didn't find the session cookie; check the mock login route.");
    return res.status(401).end();
  }

  if (req.user == null) {
    console.log("auth middleware error; req.user is null");
    res.statusCode = 500;
    return res.end();
  }

  res.statusCode = 200;
  res.send(req.user);
  return res.end();
});

//testing only
router.get('/cookies', function(req, res) {
  if (req.cookies.sess) res.send(req.cookies.sess);
  else res.send(':(');
});

var mockUser = function (req, res, next) {
  if (req.cookies.sess != null) {
    Object.assign(req, { user: defaultUser });
  }
  next();
};

module.exports.router = router;
module.exports.mockUser = mockUser;