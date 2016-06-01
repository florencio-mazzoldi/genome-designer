import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';
import OrderConstructComponentDefinition from './OrderConstructComponent';

const OrderConstructDefinition = new SchemaDefinition({
  id: [
    fields.id({prefix: 'oc'}).required,
    'ID of order construct',
  ],

  components: [
    fields.arrayOf((comp) => OrderConstructComponentDefinition.validate(comp)).required,
    'Array of array of all the components, with information about block and source ID',
  ],

  active: [
    fields.bool(),
    'Construct is selected and will be ordered',
    { scaffold: () => true },
  ],
});

export default OrderConstructDefinition;
