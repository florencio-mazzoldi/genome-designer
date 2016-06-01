import fields from './fields/index';
import SchemaDefinition from './SchemaDefinition';

const OrderStatusDefinition = new SchemaDefinition({
  foundry: [
    fields.string().required,
    `key of foundry the Order has been submitted to`,
  ],

  remoteId: [
    fields.string().required,
    `ID at remote foundry`,
  ],

  price: [
    fields.number(),
    `Quote for the order`,
  ],
});

export default OrderStatusDefinition;
