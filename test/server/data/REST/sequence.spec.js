import { assert, expect } from 'chai';
import request from 'supertest';
import md5 from 'md5';
import uuid from 'node-uuid';
import Project from '../../../../src/models/Project';
import Block from '../../../../src/models/Block';
import * as persistence from '../../../../server/data/persistence';
import devServer from '../../../../server/server';

describe('Server', () => {
  describe('Data', () => {
    describe('REST', () => {
      describe('Sequence', () => {
        let server;
        const userId = uuid.v4();
        const projectData = new Project();
        const projectId = projectData.id;

        const sequence = 'aaaaacccccccgggggggtttttt';
        const sequenceMd5 = md5(sequence);

        const blockData = new Block({
          projectId,
          sequence: {
            md5: sequenceMd5,
            length: sequence.length,
          },
        });
        const blockId = blockData.id;

        before(() => {
          return persistence.projectCreate(projectId, projectData, userId)
            .then(() => persistence.blockCreate(blockId, blockData, projectId))
            .then(() => persistence.sequenceWrite(sequenceMd5, sequence));
        });

        beforeEach('server setup', () => {
          server = devServer.listen();
        });
        afterEach(() => {
          server.close();
        });

        it('GET errors with 400 when sequence doesnt exist', (done) => {
          const url = `/data/sequence/notReal`;
          request(server)
            .get(url)
            .expect(400, done);
        });

        it('GET an existing sequence returns the sequence', (done) => {
          const url = `/data/sequence/${sequenceMd5}`;
          request(server)
            .get(url)
            .expect(200)
            .expect('Content-Type', /text/)
            .expect(result => {
              expect(result.text).to.eql(sequence);
            })
            .end(done);
        });

        it('POST writes the sequence', (done) => {
          const newSequence = 'acgtacgtacgtacgtacgt';
          const newMd5 = md5(newSequence);
          const url = `/data/sequence/${newMd5}`;

          request(server)
            .post(url)
            .send({ sequence: newSequence })
            .expect(200)
            .end((err, result) => {
              if (err) {
                done(err);
                return;
              }

              persistence.sequenceGet(newMd5)
                .then(seq => {
                  expect(seq).to.equal(newSequence);
                  done();
                })
                .catch(done);
            });
        });

        //todo
        it('POST validates the sequence');

        it('DELETE does not allow deletion', (done) => {
          const url = `/data/sequence/${sequenceMd5}`;
          request(server)
            .del(url)
            .expect(403)
            .end((err, result) => {
              if (err) {
                done(err);
                return;
              }

              persistence.sequenceGet(sequenceMd5)
                .then((seq) => {
                  assert(seq === sequence, 'should be the same...');
                  done();
                })
                .catch(done);
            });
        });
      });
    });
  });
});
