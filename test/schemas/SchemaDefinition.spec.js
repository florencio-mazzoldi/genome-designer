import { expect } from 'chai';
import fields from '../../src/schemas/fields/index';
import SchemaDefinition from '../../src/schemas/SchemaDefinition';
import InstanceDefinition from '../../src/schemas/Instance';

describe('Schema', () => {
  describe('SchemaDefinition', () => {
    const simpleFieldDescription = `String named field`;
    const simpleDefinition = new SchemaDefinition({
      field: [
        fields.string(),
        simpleFieldDescription,
      ],
    });
    const testDefinition = new SchemaDefinition({
      another: [
        fields.string(),
        `another field that is a string`,
      ],
      external: [
        simpleDefinition,
        `External (nested) definition`,
      ],
    });
    const valid = {another: 'yup', external: {field: 'yup '}};
    const invalid = {another: 'yup', external: {field: 100}};

    describe('Basic Methods', () => {
      it('extend() exists', () => {
        expect(typeof InstanceDefinition.extend).to.equal('function');
      });

      it('describe() exists', () => {
        expect(typeof InstanceDefinition.describe).to.equal('function');
      });
    });

    describe('validate()', () => {
      it('exists', () => {
        expect(typeof InstanceDefinition.validate).to.equal('function');
      });

      it('allows arbitrary fields', () => {
        const extended = Object.assign({}, valid, {extra: [{}, 'arbitrary']});
        expect(testDefinition.validate(extended)).to.equal(true);
      });
    });

    describe('scaffold()', () => {
      it('exists', () => {
        expect(typeof InstanceDefinition.scaffold).to.equal('function');
      });

      it('should prefix IDs with passed prefix', () => {
        const prefix = 'prefff';
        const Extended = InstanceDefinition.extend({
          id: [
            fields.id({prefix}).required,
            'Prefixed ID of the instance',
          ]
        });
        const scaffold = Extended.scaffold();

        expect( (scaffold.id).indexOf(prefix) ).to.equal(0);
      });

      it('logs errors'); //unclear how to test without buggering up console.log for everything
    });

    describe('Nested', () => {
      it('validate() with nested schema definitions', () => {
        expect(testDefinition.validate(valid)).to.equal(true);
        expect(testDefinition.validate(invalid)).to.equal(false);
      });

      it('scaffold() with nested schema definitions', () => {
        const scaffold = testDefinition.scaffold();
        expect(typeof scaffold.another).to.equal('string');
        expect(typeof scaffold.external.field).to.equal('string');
      });

      it('describe() with nested schema definitions', () => {
        const description = testDefinition.describe();
        expect(description.external.field === simpleFieldDescription);
      });
    });

    describe('Cloning', () => {
      it('should not affect the initial scaffold when changes are made to the clone');
    });
  });
});
