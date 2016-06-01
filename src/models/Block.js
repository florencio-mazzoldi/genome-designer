import Instance from './Instance';
import invariant from 'invariant';
import cloneDeep from 'lodash.clonedeep';
import BlockDefinition from '../schemas/Block';
import { getSequence, writeSequence } from '../middleware/sequence';
import AnnotationDefinition from '../schemas/Annotation';
import md5 from 'md5';
import color from '../utils/generators/color';
import { dnaStrict, dnaLoose } from '../utils/dna/dna';
import * as validators from '../schemas/fields/validators';
import safeValidate from '../schemas/fields/safeValidate';

const idValidator = (id) => safeValidate(validators.id(), true, id);

export default class Block extends Instance {
  constructor(input) {
    super(input, BlockDefinition.scaffold(), { metadata: { color: color() } });
  }

  /************
   constructors etc.
   ************/

  //return an unfrozen JSON, no instance methods
  static classless(input) {
    return Object.assign({}, cloneDeep(new Block(input)));
  }

  static validate(input, throwOnError = false) {
    return BlockDefinition.validate(input, throwOnError);
  }

  // note that if you are cloning multiple blocks / blocks with components, you likely need to clone the components as well
  // need to re-map the IDs outside of this function. see blockClone action.
  clone(parentInfo) {
    const [ firstParent ] = this.parents;
    const parentObject = Object.assign({
      id: this.id,
      projectId: this.projectId,
      version: (firstParent && firstParent.projectId === this.projectId) ? firstParent.version : null,
    }, parentInfo);
    return super.clone(parentObject);
  }

  mutate(...args) {
    invariant(!this.isFrozen(), 'cannot mutate a frozen block');
    return super.mutate(...args);
  }

  merge(...args) {
    invariant(!this.isFrozen(), 'cannot mutate a frozen block');
    return super.merge(...args);
  }

  /************
   type checks
   ************/

  //isSpec() can't exist here, since dependent on children. use selector blockIsSpec instead.

  isConstruct() {
    return this.components.length > 0;
  }

  isTemplate() {
    return this.rules.fixed === true;
  }

  isFiller() {
    return !this.metadata.name && this.hasSequence() && !this.metadata.color;
  }

  isList() {
    return this.rules.list === true;
  }

  isHidden() {
    return this.rules.hidden === true;
  }

  isFrozen() {
    return this.rules.frozen === true;
  }

  isFixed() {
    return this.rules.fixed === true;
  }

  /************
   rules
   ************/

  setRule(rule, value) {
    return this.mutate(`rules.${rule}`, value);
  }

  setRole(role) {
    return this.setRule('role', role);
  }

  setListBlock(isList = true) {
    if (!!isList) {
      //clear components
      const cleared = this.merge({
        components: [],
      });
      return cleared.setRule('list', true);
    }

    const cleared = this.merge({
      options: [],
    });
    return cleared.setRule('list', false);
  }

  /************
   metadata
   ************/

  getProjectId() {
    return this.projectId;
  }

  setProjectId(projectId) {
    invariant(idValidator(projectId) || projectId === null, 'project Id is required, or null to mark unassociated');
    return this.mutate('projectId', projectId);
  }

  getName(defaultName = 'New Block') {
    // called many K per second, no es6 fluffy stuff in here.
    if (this.metadata.name) return this.metadata.name;
    if (this.rules.role) return this.rules.role;
    if (this.isTemplate()) return 'New Template';
    if (this.components.length) return 'New Construct';
    if (this.isFiller() && this.metadata.initialBases) return this.metadata.initialBases;
    return defaultName;
  }

  setName(newName) {
    const renamed = this.mutate('metadata.name', newName);

    if (this.isFiller()) {
      return renamed.setColor();
    }
    return renamed;
  }

  setDescription(desc) {
    return this.mutate('metadata.description', desc);
  }

  setColor(newColor = color()) {
    return this.mutate('metadata.color', newColor);
  }

  /************
   components
   ************/

  //future - account for block.rules.filter

  addComponent(componentId, index) {
    invariant(!this.isFixed(), 'Block is fixed - cannot add/remove/move components');
    invariant(!this.isList(), 'cannot add components to a list block');
    invariant(idValidator(componentId), 'must pass valid component ID');
    const spliceIndex = (Number.isInteger(index) && index >= 0) ? index : this.components.length;
    const newComponents = this.components.slice();
    newComponents.splice(spliceIndex, 0, componentId);
    return this.mutate('components', newComponents);
  }

  removeComponent(componentId) {
    invariant(!this.isFixed(), 'Block is fixed - cannot add/remove/move components');
    const spliceIndex = this.components.findIndex(compId => compId === componentId);

    if (spliceIndex < 0) {
      console.warn('component not found'); // eslint-disable-line
      return this;
    }

    const newComponents = this.components.slice();
    newComponents.splice(spliceIndex, 1);
    return this.mutate('components', newComponents);
  }

  //pass index to be at after spliced out
  moveComponent(componentId, newIndex) {
    invariant(!this.isFixed(), 'Block is fixed - cannot add/remove/move components');
    invariant(!this.isList(), 'cannot add components to a list block');
    const spliceFromIndex = this.components.findIndex(compId => compId === componentId);

    if (spliceFromIndex < 0) {
      console.warn('component not found: ', componentId); // eslint-disable-line
      return this;
    }

    const newComponents = this.components.slice();
    newComponents.splice(spliceFromIndex, 1);
    const spliceIntoIndex = (Number.isInteger(newIndex) && newIndex <= newComponents.length) ?
      newIndex :
      newComponents.length;
    newComponents.splice(spliceIntoIndex, 0, componentId);
    return this.mutate('components', newComponents);
  }

  /************
   list block
   ************/

  //future  - account for block.rules.filter

  //for template usage i.e. the options have already been set
  toggleOptions(...optionIds) {
    invariant(this.isList(), 'must be a list block to toggle list options');
    invariant(optionIds.every(optionId => Object.prototype.hasOwnProperty.call(this.options, optionId)), 'Option ID must be present to toggle it');

    const options = cloneDeep(this.options);
    optionIds.forEach(optionId => {
      Object.assign(options, { [optionId]: !this.options[optionId] });
    });
    return this.mutate('options', options);
  }

  //for list block authoring
  addOptions(...optionIds) {
    invariant(this.isList(), 'must be a list block to add list options');
    invariant(optionIds.every(option => idValidator(option)), 'must pass component IDs');
    const toAdd = optionIds.reduce((acc, id) => Object.assign(acc, { [id]: false }));
    const newOptions = Object.assign(cloneDeep(this.options), toAdd);

    if (Object.keys(newOptions).length === Object.keys(this.options).length) {
      return this;
    }

    return this.mutate('options', newOptions);
  }

  //for list block authoring
  removeOptions(...optionIds) {
    const cloned = cloneDeep(this.options);
    optionIds.forEach(id => {
      delete cloned[id];
    });

    if (Object.keys(cloned).length === Object.keys(this.options).length) {
      return this;
    }

    return this.mutate('options', cloned);
  }

  getOptions(includeUnselected = false) {
    return Object.keys(this.options).filter(id => this.options[id] || (includeUnselected === true));
  }

  /************
   sequence
   ************/

  hasSequence() {
    return !!this.sequence.md5;
  }

  /**
   * @description Retrieve the sequence of the block. Retrieves the sequence from the server, since it is stored in a file, returning a promise.
   * @param format {String} accepts 'raw', 'fasta', 'genbank'
   * @returns {Promise} Promise which resolves with the sequence value, or (resolves) with null if no sequence is associated.
   */
  getSequence(format = 'raw') {
    const sequenceMd5 = this.sequence.md5;
    if (!sequenceMd5) {
      return Promise.resolve(null);
    }
    return getSequence(sequenceMd5, format);
  }

  /**
   * @description Writes the sequence for a block
   * @param sequence {String}
   * @param useStrict {Boolean}
   * @returns {Promise} Promise which resolves with the udpated block
   */
  setSequence(sequence, useStrict = false) {
    const sequenceLength = sequence.length;
    const sequenceMd5 = md5(sequence);

    const validatorStrict = new RegExp(`^[${dnaStrict}]*$`, 'gi');
    const validatorLoose = new RegExp(`^[${dnaLoose}]*$`, 'gi');

    const validator = !!useStrict ? validatorStrict : validatorLoose;

    if (!validator.test(sequence)) {
      return Promise.reject('sequence has invalid characters');
    }

    return writeSequence(sequenceMd5, sequence, this.id)
      .then(() => {
        const updatedSequence = {
          md5: sequenceMd5,
          length: sequenceLength,
          initialBases: sequence.substr(0, 5),
        };
        return this.merge({
          sequence: updatedSequence,
          source: {
            source: 'user',
            id: null,
          },
         });
      });
  }

  //todo - annotations are essentially keyed using name, since we got rid of ID. is that ok?

  annotate(annotation) {
    invariant(AnnotationDefinition.validate(annotation), `'annotation is not valid: ${annotation}`);
    return this.mutate('sequence.annotations', this.sequence.annotations.concat(annotation));
  }

  removeAnnotation(annotation) {
    const annotationName = typeof annotation === 'object' ? annotation.name : annotation;
    invariant(typeof annotationName === 'string', `Must pass object with Name or annotation Name directly, got ${annotation}`);

    const annotations = this.sequence.annotations.slice();
    const toSplice = annotations.findIndex((ann) => ann.name === annotationName);

    if (toSplice < 0) {
      console.warn('annotation not found'); // eslint-disable-line
      return this;
    }

    annotations.splice(toSplice, 1);
    return this.mutate('sequence.annotations', annotations);
  }
}
