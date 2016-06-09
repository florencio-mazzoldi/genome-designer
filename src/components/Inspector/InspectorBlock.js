import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Block from '../../models/Block';
import { transact, commit, abort } from '../../store/undo/actions';
import { blockMerge, blockSetColor, blockSetRole, blockRename } from '../../actions/blocks';
import { uiShowOrderForm } from '../../actions/ui';
import InputSimple from './../InputSimple';
import ColorPicker from './../ui/ColorPicker';
import Toggler from './../ui/Toggler';
import SymbolPicker from './../ui/SymbolPicker';
import BlockSource from './BlockSource';
import ListOptions from './ListOptions';
import OrderList from './OrderList';
import InspectorRow from './InspectorRow';
import BlockNotes from './BlockNotes';

export class InspectorBlock extends Component {
  static propTypes = {
    readOnly: PropTypes.bool.isRequired,
    instances: PropTypes.arrayOf((propValue, key) => {
      const instance = propValue[key];
      if (!(Block.validate(instance) && instance instanceof Block)) {
        return new Error('Must pass valid instances of blocks to the inspector, got ' + JSON.stringify(instance));
      }
    }).isRequired,
    orders: PropTypes.array.isRequired,
    blockSetColor: PropTypes.func.isRequired,
    blockSetRole: PropTypes.func.isRequired,
    blockMerge: PropTypes.func.isRequired,
    blockRename: PropTypes.func.isRequired,
    transact: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    abort: PropTypes.func.isRequired,
    uiShowOrderForm: PropTypes.func.isRequired,
    forceIsConstruct: PropTypes.bool,
  };

  static defaultProps = {
    forceIsConstruct: false,
  };

  setBlockName = (name) => {
    this.props.instances.forEach((block) => {
      this.props.blockRename(block.id, name);
    });
  };

  setBlockDescription = (description) => {
    this.props.instances.forEach((block) => {
      this.props.blockMerge(block.id, { metadata: { description } });
    });
  };

  selectColor = (color) => {
    this.startTransaction();
    this.props.instances.forEach((block) => {
      this.props.blockSetColor(block.id, color);
    });
    this.endTransaction();
  };

  selectSymbol = (symbol) => {
    this.startTransaction();
    this.props.instances.forEach((block) => {
      this.props.blockSetRole(block.id, symbol);
    });
    this.endTransaction();
  };

  startTransaction = () => {
    this.props.transact();
  };

  endTransaction = (shouldAbort = false) => {
    if (shouldAbort === true) {
      this.props.abort();
      return;
    }
    this.props.commit();
  };

  handleOpenOrder = (orderId) => {
    this.props.uiShowOrderForm(true, orderId);
  };

  /**
   * color of selected instance or null if multiple blocks selected
   */
  currentColor() {
    if (this.props.instances.length === 1) {
      return this.props.instances[0].metadata.color;
    }
    return null;
  }

  /**
   * role symbol of selected instance or null if multiple blocks selected
   */
  currentRoleSymbol() {
    if (this.props.instances.length === 1) {
      return this.props.instances[0].rules.role;
    }
    //false is specially handled in symbol picker as blank, and is different than null (no symbol)
    return false;
  }

  /**
   * current name of instance or null if multi-select
   */
  currentName(defaultToRole) {
    if (this.props.instances.length === 1) {
      return this.props.instances[0].metadata.name || (defaultToRole ? this.props.instances[0].rules.role : '') || '';
    }
    return '';
  }

  /**
   * current name of instance or null if multi-select
   */
  currentDescription() {
    if (this.props.instances.length === 1) {
      return this.props.instances[0].metadata.description || '';
    }
    return '';
  }

  allBlocksWithSequence() {
    return this.props.instances.every(instance => instance.sequence.length);
  }

  currentSequenceLength() {
    if (this.allBlocksWithSequence()) {
      const reduced = this.props.instances.reduce((acc, instance) => acc + (instance.sequence.length || 0), 0);
      return reduced + ' bp';
    }
    return this.props.instances.length > 1 ?
      'Incomplete Sketch' :
      'No Sequence';
  }

  currentAnnotations() {
    if (this.props.instances.length > 1) {
      return [];
    } else if (this.props.instances.length === 1) {
      return this.props.instances[0].sequence.annotations;
    }
    return [];
  }

  currentSource() {
    const lenInstances = this.props.instances.length;
    const firstBlock = this.props.instances[0];
    const firstSource = firstBlock.source;
    const { id: firstId, source: firstName } = firstSource;
    const firstHasSource = !!firstName;

    if (firstHasSource && (lenInstances === 1 ||
      this.props.instances.every(block => block.source.id === firstId && block.source.source === firstName))) {
      return (<BlockSource block={firstBlock}/>);
    }
    if (lenInstances > 1) {
      return (<p>Multiple Sources</p>);
    }
    return null;
  }

  render() {
    const { instances, orders, readOnly, forceIsConstruct } = this.props;
    const singleInstance = instances.length === 1;
    const isList = singleInstance && instances[0].isList();
    const isTemplate = singleInstance && instances[0].isTemplate();
    const isConstruct = singleInstance && instances[0].isConstruct();
    const inputKey = instances.map(inst => inst.id).join(',');

    const name = isTemplate ? 'Template' : (isConstruct ? 'Construct' : 'Block'); //eslint-disable-line no-nested-ternary

    const currentSourceElement = this.currentSource();
    const annotations = this.currentAnnotations();

    const hasSequence = this.allBlocksWithSequence();
    const hasNotes = singleInstance && Object.keys(instances[0].notes).length > 0;

    const relevantOrders = orders.filter(order => singleInstance && order.constructIds.indexOf(instances[0].id) >= 0);

    return (
      <div className="InspectorContent InspectorContentBlock">

        <InspectorRow heading={name}>
          <InputSimple refKey={inputKey}
                       placeholder={this.currentName(true) || 'Enter a name'}
                       readOnly={readOnly}
                       onChange={this.setBlockName}
                       onFocus={this.startTransaction}
                       onBlur={this.endTransaction}
                       onEscape={() => this.endTransaction(true)}
                       maxLength={64}
                       value={this.currentName(false)}/>
        </InspectorRow>

        <InspectorRow heading={name}>
          <InputSimple refKey={inputKey + 'desc'}
                       placeholder="Enter a description"
                       useTextarea
                       readOnly={readOnly}
                       onChange={this.setBlockDescription}
                       onFocus={this.startTransaction}
                       onBlur={this.endTransaction}
                       onEscape={() => this.endTransaction(true)}
                       maxLength={1024}
                       value={this.currentDescription()}/>
        </InspectorRow>

        <InspectorRow heading="Source"
                      condition={!!currentSourceElement}>
          {currentSourceElement}
        </InspectorRow>

        <InspectorRow heading="Sequence Length"
                      condition={hasSequence}>
          <p><strong>{this.currentSequenceLength()}</strong></p>
        </InspectorRow>

        {/* todo - this should have its own component */}
        <InspectorRow heading={ name + ' Metadata'}
                      hasToggle
                      condition={hasNotes}>
          <div className="InspectorContent-section">
            <BlockNotes notes={instances[0].notes}/>
          </div>
        </InspectorRow>

        <InspectorRow heading="Order History"
                      hasToggle
                      condition={relevantOrders.length > 0}>
          <div className="InspectorContent-section">
            <OrderList orders={relevantOrders}
                       onClick={(orderId) => this.handleOpenOrder(orderId)}/>
          </div>
        </InspectorRow>

        <InspectorRow heading="Color & Symbol">
          <div className="InspectorContent-pickerWrap">
            <ColorPicker current={this.currentColor()}
                         readOnly={readOnly}
                         onSelect={this.selectColor}/>

            <SymbolPicker current={this.currentRoleSymbol()}
                          readOnly={readOnly || isConstruct || isTemplate || isList || forceIsConstruct}
                          onSelect={this.selectSymbol}/>
          </div>
        </InspectorRow>

        <InspectorRow heading="Annotations"
                      condition={annotations.length > 0}>
          <div className="InspectorContentBlock-Annotations">
            {annotations.map((annotation, idx) => {
              return (
                <span className="InspectorContentBlock-Annotation"
                      key={idx}>
                {annotation.name || annotation.description || '?'}
              </span>
              );
            })}
          </div>
        </InspectorRow>

        <InspectorRow heading="List Options"
                      condition={isList}>
          <ListOptions block={instances[0]}/>
        </InspectorRow>

      </div>
    );
  }
}

export default connect(() => ({}), {
  blockSetColor,
  blockSetRole,
  blockRename,
  blockMerge,
  transact,
  commit,
  abort,
  uiShowOrderForm,
})(InspectorBlock);
