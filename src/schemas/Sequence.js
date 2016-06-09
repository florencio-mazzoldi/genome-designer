import fields from './fields/index';
import Schema from './SchemaClass';
import AnnotationSchema from './Annotation';

/**
 @name SequenceSchema
 @description
 A sequence, typically of a part and a large string. Sequences are references because they are not usually loaded in the applicaiton, and may be very large, so can be loaded with their own API for defining desired regions.
*/

const fieldDefs = {
  md5: [
    fields.string(),
    `md5 hash of the sequence, used for lookup`,
  ],

  length: [
    fields.number(),
    `Length of the sequence (calculated on the server)`,
  ],

  annotations: [
    fields.arrayOf(AnnotationSchema.validate.bind(AnnotationSchema)),
    `List of Annotations associated with the sequence`,
  ],

  initialBases: [
    fields.sequence({loose: true}),
    `Initial 5 bases of the block, which can be displayed e.g. if a filler block`,
  ],
};

export class SequenceSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, fieldDefs, fieldDefinitions));
  }
}

export default new SequenceSchemaClass();
