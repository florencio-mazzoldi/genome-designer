import { expect } from 'chai';
import ProjectDefinition from '../../src/schemas/Project';
import { Project as exampleProject } from './_examples';

describe('Schema', () => {
  describe('Project', () => {
    it('should validate the example', () => {
      expect(ProjectDefinition.validate(exampleProject)).to.equal(true);
    });

    it('should create a valid scaffold', () => {
      const scaffold = ProjectDefinition.scaffold();
      //console.log(scaffold);
      expect(scaffold).to.be.an.object;
      expect(ProjectDefinition.validate(scaffold)).to.equal(true);
    });

    it('should prefix ID with project', () => {
      const scaffold = ProjectDefinition.scaffold();
      const regex = /^project/;
      //console.log(scaffold);
      expect(regex.test(scaffold.id)).to.equal(true);
    });
  });
});
