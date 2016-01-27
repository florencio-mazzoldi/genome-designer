import fields from './fields/index';
import * as validators from './fields/validators';
import InstanceDefinition from './Instance';
import SequenceDefinition from './Sequence';

/**
 @name BlockDefinition
 @sbol Component
 @description A component of a construct, or construct itself.

 Blocks are hierarchically composable elements which make up large constructs of DNA. Hierarchy is established with the `components` field, whereby a block references its children.

 Blocks may have a `sequence`, which is a reference to a file and associated annotations, and if so should reference their source (e.g. foundry, NCBI) whence they came.

 Blocks can define `rules`, to which constitutive blocks must adhere. For example, bounds to GC content, or template grammar (e.g. position 0 must be a promoter). The type is the key, the rule is the value (heterogeneous formats)

 List Blocks allow for combinatorial logic, where multiple blocks can be associated as combinatorial `options` for this block.

 In addition to sequence annotations, a block may list `notes`, which are essentially annotations that do not specifically reference the sequence.
 */

const BlockDefinition = InstanceDefinition.extend({
  id: [
    fields.id({prefix: 'block'}).required,
    'Block UUID',
  ],

  /*
   Part-like fields for sequence and sequence annotations, inventory source
   */
  sequence: [
    SequenceDefinition,
    `Associated Sequence (url, not the sequence itself), and Annotations etc. associated`,
  ],
  source: [
    fields.shape({
      id: validators.id(),
      existsAsPart: validators.bool(),
    }),
    `Source (Inventory) ID of the Part`,
  ],

  rules: [
    fields.object().required,
    `Grammar/rules governing the whole Block`,
  ],

  components: [
    fields.arrayOf(validators.id()).required,
    `Array of Blocks of which this Block is comprised`,
  ],

  options: [
    fields.arrayOf(validators.id()).required,
    `Array of Blocks that form the List Block`,
  ],

  notes: [
    fields.object().required,
    `Notes about the whole Block`,
  ],
});

export default BlockDefinition;

/*
 //SBOL has a field called role, particularly in defining modules. We may want to add this later. For now, this annotation can be a role per-component.
 export const enumRoles = [

 //SBOL
 'Promoter',
 'RBS',
 'CDS',
 'Terminator',
 'Gene',
 'Engineered Gene',
 'mRNA',

 //others
 'placeholder',
 ];
 */
