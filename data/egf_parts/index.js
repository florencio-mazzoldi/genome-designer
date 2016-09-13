import Block from '../../src/models/Block';
import Project from '../../src/models/Project';
import rollupFromArray from '../../src/utils/rollup/rollupFromArray';

import { templates, blocks as templateBlocks } from './templates';
import { examples, blocks as exampleBlocks } from './examples';

//clone everything so that IDs are unique -- note we pass clone(false), NOT clone(null) intentionally
//NOTE - if clone the tempalte blocks and example blocks, need to update components: [] in list blocks
//remember to set to frozen if clone them
const makeBlocks = () => {
  return {
    constructs: [
      ...templates.map(template => template.clone(false, { rules: { frozen: true } })).map(block => Block.classless(block)),
      ...examples.map(example => example.clone(false, { rules: { frozen: true } })).map(block => Block.classless(block)),
    ],
    blocks: [
      ...templateBlocks.map(block => Block.classless(block)),
      ...exampleBlocks.map(block => Block.classless(block)),
    ],
  };
};

const makeProject = (blockIds) => Project.classless({
  isSample: true,
  metadata: {
    name: 'EGF Sample Templates',
    description: `This project includes a set of templates - combinatorial constructs with biological function - which can be fabricated at the Edinburgh Genome Foundry. This sample project is locked. To use the templates, drag them from the inventory list on the left, into one of your own projects.`,
  },
  components: blockIds,
});

//make the blocks, make the project, return the rollup
//note that project ID will be set when write the rollup, so dont need to handle that here explicitly
export default function makeEgfRollup() {
  const blocks = makeBlocks();
  const blockIds = blocks.constructs.map(block => block.id);
  const project = makeProject(blockIds);

  return rollupFromArray(project, ...blocks.constructs, ...blocks.blocks);
}
