import fields from './fields/index';
import * as validators from './fields/validators';
import SchemaDefinition from './SchemaDefinition';
import MetadataDefinition from './Metadata';
import OrderParametersDefinition from './OrderParameters';
import OrderConstructDefinition from './OrderConstruct';
import OrderStatusDefinition from './OrderStatus';

const OrderDefinition = new SchemaDefinition({
  id: [
    fields.id({ prefix: 'order' }).required,
    'Order UUID',
  ],

  metadata: [
    MetadataDefinition,
    'Metadata for the order',
  ],

  projectId: [
    fields.id({ prefix: 'project' }).required,
    'Associated Project UUID',
    { avoidScaffold: true },
  ],

  projectVersion: [
    fields.version().required,
    'SHA1 version of project when order is submitted',
    { avoidScaffold: true },
  ],

  constructIds: [
    fields.arrayOf(validators.id()).required,
    `IDs of constructs in project involved in order`,
  ],

  constructs: [
    fields.arrayOf(construct => OrderConstructDefinition.validate(construct)).required,
    `Array of arrays to order - all the constructs with a parts list`,
  ],

  parameters: [
    OrderParametersDefinition,
    `Parameters associated with this order`,
  ],

  user: [
    fields.shape({
      id: validators.string(),
      email: validators.string(),
    }).required,
    'User ID and email',
  ],

  status: [
    OrderStatusDefinition,
    'Information about foundry + remote order ID',
  ],

  notes: [
    fields.object().required,
    `Notes about the Order`,
  ],
});

export default OrderDefinition;
