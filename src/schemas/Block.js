import fields from './fields/index';
import * as validators from './fields/validators';
import InstanceDefinition from './Instance';
import SequenceDefinition from './Sequence';
import RulesDefintion from './Rules';
import BlockSourceDefinition from './BlockSource';

/**
 @name BlockDefinition
 @role Component
 @description A component of a construct, or construct itself.

 Blocks are hierarchically composable elements which make up large constructs of DNA. Hierarchy is established with the `components` field, whereby a block references its children.

 Blocks may have a `sequence`, which is a reference to a file and associated annotations, and if so should reference their source (e.g. foundry, NCBI) whence they came.

 Blocks can define `rules`, to which direct descendent blocks must adhere. For example, bounds to GC content, whether locations are fixed, filters for allowed blocks. The type is the key, the rule is the value (heterogeneous formats). Currently, rules only apply to direct descendents in the design canvas.

 List Blocks allow for combinatorial logic, where multiple blocks can be associated as combinatorial `options` for this block. A block cannot be both a list block and have components.

 In addition to sequence annotations, a block may list `notes`, which are essentially annotations that do not specifically reference the sequence.
 */

const BlockDefinition = InstanceDefinition.extend({
  id: [
    fields.id({ prefix: 'block' }).required,
    'Block UUID',
  ],

  projectId: [
    fields.id({ prefix: 'project' }),
    'Project UUID',
    { avoidScaffold: true },
  ],

  sequence: [
    SequenceDefinition,
    `Associated Sequence (link, not the sequence itself), and Annotations etc. associated`,
  ],

  source: [
    BlockSourceDefinition,
    `Source (Inventory) ID of the Part`,
  ],

  rules: [
    RulesDefintion,
    `Grammar/rules governing the whole Block and direct descendants`,
  ],

  components: [
    fields.arrayOf(validators.id()).required,
    `Array of Blocks of which this Block is comprised`,
  ],

  options: [
    fields.object().required,
    `Map of Blocks that form the List Block, if rules.isList === true, where keys are block IDs possible and key is boolean whether selected. Each block MUST be a spec.`,
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
