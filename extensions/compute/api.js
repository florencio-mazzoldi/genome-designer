import express from 'express';
import bodyParser from 'body-parser';
import { runNode } from './runNode';
import { sessionMiddleware } from '../../server/utils/authentication';

const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json({
  strict: false, //allow values other than arrays and objects
});

router.use(sessionMiddleware);

router.post('/:id', jsonParser, (req, resp) => {
  const { id } = req.params;
  const fileUrls = req.body;
  const key = req.headers.sessionkey;
  const header = {'sessionkey': key, 'host': 'http://0.0.0.0:3000'};

  runNode(id, fileUrls, header)
    .then( result => {
      resp.json(result);
    })
    .catch( err => {
      resp.status(500).send(err);
    });
}); //router.post


module.exports = router;
