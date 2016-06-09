import { assert, expect } from 'chai';
import uuid from 'node-uuid';
import request from 'supertest';
import Block from '../../../../src/models/Block';
import * as persistence from '../../../../server/data/persistence';
import * as rollup from '../../../../server/data/rollup';
import devServer from '../../../../server/server';
import { createExampleRollup } from '../../../utils/rollup';
import { range } from 'lodash';

describe('Server', () => {
  describe('Data', () => {
    describe('REST', () => {
      describe('Info', () => {
        let server;
        const userId = '0'; //testing

        const roll = createExampleRollup();

        const project = roll.project;
        const projectId = project.id;
        const [blockP, blockA, blockB, blockC, blockD, blockE] = roll.blocks;

        //add 5 weird role type blocks to roll
        const numberEsotericRole = 5;
        const esotericRole = 'sdlfkjasdlfkjasdf';
        const blocks = range(numberEsotericRole).map(() => new Block({
          projectId,
          rules: { role: esotericRole },
        }));
        roll.blocks.push(...blocks);

        before(() => {
          return rollup.writeProjectRollup(projectId, roll, userId);
        });

        beforeEach('server setup', () => {
          server = devServer.listen();
        });
        afterEach(() => {
          server.close();
        });

        it('/info/FAKE returns 404', (done) => {
          const url = `/data/info/notReal`;
          request(server)
            .get(url)
            .expect(404, done);
        });

        it('/info/role returns map of role types present', (done) => {
          const url = `/data/info/role`;
          request(server)
            .get(url)
            .expect(200)
            .expect(result => {
              const { body } = result;
              expect(typeof body).to.equal('object');
              expect(body[esotericRole]).to.equal(5);
            })
            .end(done);
        });

        it('/info/role/type returns matching blocks', (done) => {
          const url = `/data/info/role/${esotericRole}`;
          request(server)
            .get(url)
            .expect(200)
            .expect(result => {
              expect(result.body.length).to.equal(5);
            })
            .end(done);
        });

        it('/info/components/id returns map of components', (done) => {
          const url = `/data/info/components/${blockP.id}`;
          request(server)
            .get(url)
            .expect(200)
            .expect(result => {
              const { body } = result;
              const keys = Object.keys(body);
              expect(keys.length).to.equal(6);
              assert(keys.every(key => roll.blocks.find(block => block.id === key)), 'got wrong key, outside roll');
            })
            .end(done);
        });

      });
    });
  });
});
