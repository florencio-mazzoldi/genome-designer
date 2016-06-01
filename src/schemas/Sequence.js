import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';
import AnnotationDefinition from './Annotation';

/**
 @name SequenceDefinition
 @description
 A sequence, typically of a part and a large string. Sequences are references because they are not usually loaded in the applicaiton, and may be very large, so can be loaded with their own API for defining desired regions.
*/

const SequenceDefinition = new SchemaDefinition({
  md5: [
    fields.string(),
    `md5 hash of the sequence, used for lookup`,
  ],

  length: [
    fields.number(),
    `Length of the sequence (calculated on the server)`,
  ],

  annotations: [
    fields.arrayOf(AnnotationDefinition.validate.bind(AnnotationDefinition)),
    `List of Annotations associated with the sequence`,
  ],

  initialBases: [
    fields.sequence({loose: true}),
    `Initial 5 bases of the block, which can be displayed e.g. if a filler block`,
  ],
});

export default SequenceDefinition;
