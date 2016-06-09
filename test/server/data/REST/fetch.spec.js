import { expect } from 'chai';
import fetch from 'isomorphic-fetch';
import Project from '../../../../src/models/Project';
import { dataApiPath } from '../../../../src/middleware/paths';
import devServer from '../../../../server/server';

describe('Server', () => {
  describe('Data', () => {
    describe('REST', () => {
      describe('fetch', function fetchTest() {
        before((done) => {
          //make sure the server has actually started and is ready to go
          devServer.listen(3000, done);
        });

        it('basic test', () => {
          const testProject = new Project({
            notes: {
              some: 'note',
            },
          });

          return fetch(dataApiPath(`${testProject.id}`), {
            method: 'put',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testProject),
          })
            .then(res => {
              expect(res.status).to.equal(200);
              return res.json();
            })
            .then(json => {
              expect(json).to.eql(testProject);
            });
        });
      });
    });
  });
});
