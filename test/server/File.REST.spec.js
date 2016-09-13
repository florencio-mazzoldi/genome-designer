import { expect } from 'chai';
import request from 'supertest';
import fs from 'fs';
import { createFilePath } from '../../server/utils/filePaths';

const devServer = require('../../server/server');

describe('Server', () => {
  describe('Files', () => {
    let server;
    beforeEach('server setup', () => {
      server = devServer.listen();
    });
    afterEach(() => {
      server.close();
    });

    const makeStoragePath = (path) => createFilePath(path);
    const makeApiPath = (path) => '/file/' + path;

    it('/file POST for creating files, returns route as result', (done) => {
      const fileName = 'testfile1';
      const apiPath = makeApiPath(fileName);

      request(server)
        .post(apiPath)
        .send('file contents')
        .expect(200)
        .expect(apiPath, done);
    });

    it('/file GET for getting files', function fileGet(done) {
      const fileName = 'testfile2';
      const fileContents = 'yada!';
      const apiPath = makeApiPath(fileName);

      fs.writeFile(makeStoragePath(fileName), fileContents, 'utf8', (err, result) => {
        request(server)
          .get(apiPath)
          .expect(200)
          .expect(fileContents, done);
      });
    });

    it('/file DELETE for deleting files', function fileDelete(done) {
      const fileName = 'testfile3';
      const fileContents = 'deleteme';
      const apiPath = makeApiPath(fileName);

      fs.writeFile(makeStoragePath(fileName), fileContents, 'utf8', (writeErr, result) => {
        request(server)
          .delete(apiPath)
          .expect(200)
          .end((deleteErr, res) => {
            fs.readFile(makeStoragePath(fileName), 'utf8', (readErr, result) => {
              expect(readErr).to.be.defined;
              expect(readErr.code).to.equal('ENOENT');
              done(deleteErr);
            });
          });
      });
    });

    it('should support deep paths', (done) => {
      const fileName = 'deep/long/path';
      const fileContents = 'content';
      const apiPath = makeApiPath(fileName);

      request(server)
        .post(apiPath)
        .send(fileContents)
        .end(() => {
          fs.readFile(makeStoragePath(fileName), 'utf8', (err, result) => {
            expect(result).to.equal(fileContents);
            done();
          });
        });
    });

    it('should support paths starting with /test/');
  });
});
