import fields from './fields/index';
import Schema from './SchemaClass';

const rulesFields = {
  list: [
    fields.bool(),
    'Block is a list block. It has options rather than components.',
  ],
  role: [
    fields.string(),
    'Role of the Block (often corresponds to SBOL symbols)',
  ],
  hidden: [
    fields.bool(),
    'The block is hidden in the design canvas. It serves as template logic.',
  ],
  frozen: [
    fields.bool(),
    'The block is immutable - no changes are allowed',
  ],
  fixed: [
    fields.bool(),
    'Block Ids of components are fixed - no movement, insertions, deletions, substitutions',
  ],
  /*
   //deprecated filters for now
   filter: [
   fields.object(),
   'Map of fields to allowed values for constituents (options / components)',
   ],
   */
};

export class RulesSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, rulesFields, fieldDefinitions));
  }
}

export default new RulesSchemaClass();
