/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import Instance from './Instance';
import invariant from 'invariant';
import { merge, cloneDeep } from 'lodash';
import BlockSchema from '../schemas/Block';
import { getSequence, writeSequence } from '../middleware/sequence';
import AnnotationSchema from '../schemas/Annotation';
import md5 from 'md5';
import color from '../utils/generators/color';
import { dnaStrict, dnaLoose } from '../utils/dna/dna';
import * as validators from '../schemas/fields/validators';
import safeValidate from '../schemas/fields/safeValidate';
import { symbolMap } from '../inventory/roles';

const idValidator = (id) => safeValidate(validators.id(), true, id);

//note - when blocks are frozen, they are just copied between projects. When a block becomes unfrozen, it needs to be cloned. This is in part becuase blocks that are frozen are shared between proejcts, and when two projects share a block with the same ID, it is assumed (and should be guaranteed) that they are completely identical.

/**
 * Block Model
 * @class
 * @extends Instance
 * @gc Model
 */
export default class Block extends Instance {
  /**
   * Create a block given some input object
   * @param {object} [input]
   * @returns {Block}
   */
  constructor(input) {
    super(input, BlockSchema.scaffold(), { metadata: { color: color() } });
  }

  /************
   constructors etc.
   ************/

  /**
   * Create an unfrozen block, extending input with schema
   * @param {object} [input]
   * @returns {object} an unfrozen JSON, no instance methods
   */
  static classless(input) {
    return Object.assign({}, cloneDeep(new Block(input)));
  }

  /**
   * Validate a block object
   * @param {object} input
   * @param {boolean} [throwOnError=false] Whether to throw on errors
   * @throws if `throwOnError===true`, will throw when invalid
   * @returns {boolean} if `throwOnError===false`, whether input is a valid block
   * @example
   * Block.validate({lorem: 'ipsum'}); //false
   * Block.validate(new Block()); //true
   */
  static validate(input, throwOnError = false) {
    return BlockSchema.validate(input, throwOnError);
  }

  /**
   * Clone a block, adding parent to the ancestry.
   * Calls {@link Instance.clone} internally, but structure of block history is different than that of the Instance class.
   * Cloning a block will disable the frozen rule.
   * note that if you are cloning multiple blocks / blocks with components, you likely need to clone the components as well. You will need to re-map the IDs outside of this function. See {@link blockClone} action for an example.
   * @param {object|null} parentInfo Parent info for denoting ancestry. If pass null to parentInfo, the Block is simply cloned, and nothing is added to the history.
   * @param overwrites
   * @returns {Block} Cloned block
   */
  clone(parentInfo = {}, overwrites = {}) {
    const [ firstParent ] = this.parents;

    //unfreeze a clone by default, but allow overwriting if really want to
    const mergeWith = merge({
      rules: { frozen: false },
    }, overwrites);

    if (parentInfo === null) {
      return super.clone(false, mergeWith);
    }

    const parentObject = Object.assign({
      id: this.id,
      projectId: this.projectId,
      version: (firstParent && firstParent.projectId === this.projectId) ? firstParent.version : null,
    }, parentInfo);

    return super.clone(parentObject, mergeWith);
  }

  /**
   * Mutate a property of a Block to a new value. calls {@link Instance.mutate}.
   * @param {string} path Path of property to change
   * @param {*} value New value
   * @throws if the block is frozen
   * @returns {Block} The mutated block
   * @example
   * const initial = new Block({myArray: [0,0]});
   * const next = initial.mutate('myArray[1]', 10);
   * initial.myArray[1]; //0
   * next.myArray[1]; //10
   */
  mutate(path, value) {
    invariant(!this.isFrozen(), 'cannot mutate a frozen block');
    return super.mutate(path, value);
  }

  /**
   * Return a new Block with input object merged into it. Calls {@link Instance.merge}
   * @param {object} obj Object to merge into instance
   * @throws if the block is frozen
   * @returns {Block} A new Block, with `obj` merged in
   * @example
   * const initial = new Block({myArray: [0,0]});
   * const next = initial.merge({some: 'value', myArray: false});
   * initial.myArray; //[0,1]
   * next.myArray; //false
   * initial.some; //undefined
   * next.some; //'value'
   */
  merge(obj) {
    invariant(!this.isFrozen(), 'cannot mutate a frozen block');
    return super.merge(obj);
  }

  /************
   type checks
   ************/

  /**
   * Check whether Block has components or list options
   * @returns {boolean}
   */
  hasContents() {
    return this.components.length || Object.keys(this.options).length;
  }

  //isSpec() can't exist here, since dependent on children. use selector blockIsSpec instead.

  /**
   * Check if Block is a construct (it has components)
   * @returns {boolean}
   */
  isConstruct() {
    return this.components.length > 0;
  }

  /**
   * Check whether Block is fixed
   * @returns {boolean}
   */
  isFixed() {
    return this.rules.fixed === true;
  }

  /**
   * Check whether Block is a template
   * @returns {boolean}
   */
  isTemplate() {
    return this.isFixed();
  }

  /**
   * Check whether Block is a filler block
   * @returns {boolean}
   */
  isFiller() {
    return !this.metadata.name && this.hasSequence() && !this.metadata.color;
  }

  /**
   * Check whether Block is a list Block
   * @returns {boolean}
   */
  isList() {
    return this.rules.list === true;
  }

  /**
   * Check whether Block is hidden
   * @returns {boolean}
   */
  isHidden() {
    return this.rules.hidden === true;
  }

  /**
   * Check whether Block is frozen
   * @returns {boolean}
   */
  isFrozen() {
    return this.rules.frozen === true;
  }

  /************
   rules
   ************/

  /**
   * Set a rule on a Block
   * @param rule
   * @param value
   * @returns {Block}
   */
  setRule(rule, value) {
    return this.mutate(`rules.${rule}`, value);
  }

  /**
   * Get the Block's role. Roles are defined in {@link module:roles}
   * @param {boolean} [userFriendly=true] Format string to human readable version
   * @returns {string} Block rule
   */
  getRole(userFriendly = true) {
    const role = this.rules.role;
    const friendly = symbolMap[role];

    return (userFriendly === true && friendly) ?
      friendly :
      role;
  }

  /**
   * Freeze a Block. Returns the instance if attempt to freeze a frozen Block.
   * @param {boolean} [isFrozen=true] Frozen state
   * @throws if `!isFrozen` and block is frozen (must clone block to unfreeze it)
   * @returns {Block}
   */
  setFrozen(isFrozen = true) {
    if (this.rules.frozen === true) {
      invariant(!!isFrozen, 'attempting to unfreeze a frozen block. You must clone it!');
      return this;
    }
    return this.setRule('frozen', isFrozen);
  }

  /**
   * Set the role of the Block
   * @param {string} role Role, should be from {@link module:roles}
   * @returns {Block}
   */
  setRole(role) {
    return this.setRule('role', role);
  }

  //todo - should this delete the options entirely?
  /**
   * Specify whether Block is a list block. Clears components when setting to true, and clears options when setting to false.
   * @param {boolean} isList
   * @returns {Block}
   */
  setListBlock(isList = true) {
    if (!!isList) {
      //clear components
      const cleared = this.merge({
        components: [],
      });
      return cleared.setRule('list', true);
    }

    const cleared = this.merge(Object.keys(this.options).reduce((acc, key) => Object.assign(acc, { [key]: false })));
    return cleared.setRule('list', false);
  }

  /************
   metadata
   ************/

  //todo - avoid setting project ID once already associated? force clone? or allow moving block from one project to another?
  /**
   * Set Project ID for block.
   * @param {UUID|null} projectId
   * @returns {Block}
   */
  setProjectId(projectId) {
    invariant(idValidator(projectId) || projectId === null, 'project Id is required, or null to mark unassociated');
    return this.mutate('projectId', projectId);
  }

  /**
   * Get Block's name
   * @param {string} [defaultName] Prefer this string to the default e.g. `New Block`
   * @param {boolean} [defaultToBases] If no name, use initial bases as default
   * @returns {string}
   */
  getName(defaultName, defaultToBases) {
    // called many K per second, no es6 fluffy stuff in here.
    if (this.metadata.name) return this.metadata.name;
    if (this.rules.role) return this.getRole();
    if ((!!defaultToBases || this.isFiller()) && this.metadata.initialBases) return this.metadata.initialBases.substring(0, 3) + '...';
    return defaultName || 'New ' + this.getType();
  }

  /**
   * Set Block's name
   * @param {string} newName
   * @returns {Block}
   */
  setName(newName) {
    const renamed = this.mutate('metadata.name', newName);

    if (this.isFiller()) {
      return renamed.setColor();
    }
    return renamed;
  }

  /**
   * Get the type of Block
   * @param {string} [defaultType='Block']
   * @returns {string}
   */
  getType(defaultType = 'Block') {
    if (this.isTemplate()) return 'Template';
    if (this.isConstruct()) return 'Construct';
    if (this.isFiller()) return 'Filler';
    return defaultType;
  }

  /**
   * Set Block's description
   * @param {string} desc New Description
   * @returns {Block}
   */
  setDescription(desc) {
    return this.mutate('metadata.description', desc);
  }

  /**
   * Set Block's color
   * @param {string} [newColor] Hex string to use as color. Include leading `#`. Defaults to random color.
   * @returns {Block}
   * @example
   * new Block().setColor('#99aaaa');
   */
  setColor(newColor = color()) {
    return this.mutate('metadata.color', newColor);
  }

  /************
   components
   ************/

  //future - account for block.rules.filter

  /**
   * Adds a component by ID
   * @param {UUID} componentId ID of child block
   * @param {number} [index=this.components.length]
   * @throws if fixed or list block, or if component ID invalid
   * @returns {Block}
   */
  addComponent(componentId, index) {
    invariant(!this.isFixed(), 'Block is fixed - cannot add/remove/move components');
    invariant(!this.isList(), 'cannot add components to a list block');
    invariant(idValidator(componentId), 'must pass valid component ID');
    const spliceIndex = (Number.isInteger(index) && index >= 0) ? index : this.components.length;
    const newComponents = this.components.slice();
    newComponents.splice(spliceIndex, 0, componentId);
    return this.mutate('components', newComponents);
  }

  /**
   * Remove a component by ID
   * @param componentId
   * @throws If fixed
   * @returns {Block} Returns same instance if componentId not found
   */
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

  /**
   * Move a component to a new index
   * @param {UUID} componentId Component ID
   * @param {number} newIndex index for block, after spliced out
   * @throws if fixed or list
   * @returns {Block}
   */
  //
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

  /**
   * Toggle whether a list option is active.
   * For Template usage.
   * @param {...UUID} optionIds
   * @throws if not a list block, or any optionId is not already a list option
   * @returns {Block}
   */
  toggleOptions(...optionIds) {
    invariant(this.isList(), 'must be a list block to toggle list options');
    invariant(optionIds.every(optionId => Object.prototype.hasOwnProperty.call(this.options, optionId)), 'Option ID must be present to toggle it');

    const options = cloneDeep(this.options);
    optionIds.forEach(optionId => {
      Object.assign(options, { [optionId]: !this.options[optionId] });
    });
    return this.mutate('options', options);
  }

  /**
   * Add list options as possibilities (they will be inactive).
   * For template authoring.
   * @param {...UUID} optionIds Block IDs to set as options
   * @throws if not list block, or any option ID is invalid
   * @returns {Block}
   */
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

  /**
   * Remove list options from possibilities.
   * For template authoring.
   * @param {...UUID} optionIds Block IDs to set as options
   * @returns {Block}
   */
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

  /**
   * Returns array of list options, by default only active ones
   * @param {boolean} [includeUnselected=false] Include inactive list options
   * @returns {Array.<UUID>}
   */
  getOptions(includeUnselected = false) {
    return Object.keys(this.options).filter(id => this.options[id] || (includeUnselected === true));
  }

  /************
   sequence
   ************/

  /**
   * Check whether block has a sequence saved on the server, or an associated URL
   * @returns {boolean}
   */
  hasSequence() {
    return !!this.sequence.md5 || !!this.sequence.url;
  }

  /**
   * Retrieve the sequence of the block. Retrieves the sequence from the server, since it is stored in a separate file.
   * @returns {Promise} Promise which resolves with the sequence value, or (resolves) with null if no sequence is associated.
   */
  getSequence() {
    const { md5, download, url } = this.sequence;

    if (typeof download === 'function') {
      return Promise.resolve(download());
    } else if (md5) {
      return getSequence(md5);
    } else if (url) {
      return fetch(url).then(resp => resp.text());
    }

    return Promise.resolve(null);
  }

  //todo - ability to set source
  /**
   * Set sequence and write to server. Updates the length and initial bases. The block's source will be set to 'user'.
   * @param {string} sequence New sequence
   * @param {boolean} [useStrict=false] strictness of sequence validation (IUPAC bases)
   * @param {boolean} [persistSource=false] Maintain the source of the block
   * @returns {Promise} Promise which resolves with the udpated block after the sequence is written to the server
   */
  setSequence(sequence, useStrict = false, persistSource = false) {
    const sequenceLength = sequence.length;
    const sequenceMd5 = md5(sequence);

    const validatorStrict = new RegExp(`^[${dnaStrict}]*$`, 'gi');
    const validatorLoose = new RegExp(`^[${dnaLoose}]*$`, 'gi');

    const validator = !!useStrict ? validatorStrict : validatorLoose;

    if (!validator.test(sequence)) {
      return Promise.reject('sequence has invalid characters');
    }

    //todo - 'user' source should be marked as a constant and shared with sequence dialog
    const updatedSource = persistSource === true ? this.source : { source: 'user', id: null };

    return writeSequence(sequenceMd5, sequence, this.id)
      .then(() => {
        const updatedSequence = {
          md5: sequenceMd5,
          length: sequenceLength,
          initialBases: '' + sequence.substr(0, 6),
          download: null,
        };

        return this.merge({
          sequence: updatedSequence,
          source: updatedSource,
        });
      });
  }

  //todo - annotations are essentially keyed using name, since we got rid of ID. is that ok?

  /**
   * Add an Annotation
   * @param {Annotation} annotation
   * @returns {Block}
   */
  annotate(annotation) {
    invariant(AnnotationSchema.validate(annotation), `annotation is not valid: ${annotation}`);
    return this.mutate('sequence.annotations', this.sequence.annotations.concat(annotation));
  }

  /**
   * Remove an annotation
   * @param {Annotation|string} annotation Annotation or annotation's name
   * @returns {Block}
   */
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
