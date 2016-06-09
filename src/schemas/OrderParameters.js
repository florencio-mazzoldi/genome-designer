import fields from './fields/index';
import Schema from './SchemaClass';

const fieldDefs = {
  method: [
    fields.string(),
    `Assembly method to be used`,
  ],
  onePot: [
    fields.bool().required,
    'Reaction is combinatorial and all parts will be combined in one tube, resulting in many combinatorial assemblies mixed together.',
    { scaffold: () => true },
  ],
  sequenceAssemblies: [
    fields.bool(),
    'Whether to sequence all assemblies after production',
    { scaffold : () => true },
  ],
  permutations: [
    fields.number(),
    'For multi pot combinatorial this is number of random constructs to assemble',
  ],
  combinatorialMethod: [
    fields.oneOf(['Random Subset', 'Maximum Unique Set']),
    'Combinatorial Method',
  ],
};

export class OrderParametersSchemaClass extends Schema {
  constructor(fieldDefinitions) {
    super(Object.assign({}, fieldDefs, fieldDefinitions));
  }

  validate(instance, shouldThrow) {
    const fieldsValid = super.validateFields(instance, shouldThrow);

    if (!fieldsValid) {
      return false;
    }

    const hasFieldsIfNotOnePot = instance.onePot || (instance.combinatorialMethod && instance.permutations);

    if (!hasFieldsIfNotOnePot) {
      const errorMessage = 'Combinatorial method and # permutations required if not one pot';
      if (shouldThrow) {
        throw Error(errorMessage, instance);
      } else if (process.env.NODE_ENV !== 'production') {
        console.error(errorMessage); //eslint-disable-line
      }
    }

    return fieldsValid && hasFieldsIfNotOnePot;
  }
}

export default new OrderParametersSchemaClass();
