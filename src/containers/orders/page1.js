import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Row from './row';
import Selector from './selector';
import Input from './input';
import Checkbox from './checkbox';
import Link from './link';
import Permutations from './permutations';
import debounce from 'lodash.debounce';
import {
  orderSetName,
  orderSetParameters
} from '../../actions/orders';
import OrderParameters from '../../schemas/OrderParameters';

import '../../../src/styles/form.css';
import '../../../src/styles/ordermodal.css';

export class Page1 extends Component {
  static propTypes = {
    open: PropTypes.bool.isRequired,
    order: PropTypes.object.isRequired,
    orderSetName: PropTypes.func.isRequired,
    orderSetParameters: PropTypes.func.isRequired,
    project: PropTypes.object.isRequired,
    constructs: PropTypes.array.isRequired,
  };

  constructor() {
    super();
    this.labelChanged = debounce(value => this._labelChanged(value), 500, {leading: false, trailing: true});
  }

  assemblyOptions() {
    return [
      {value: true, label: 'All in a single container'},
      {value: false, label: 'Each in an individual container'},
    ];
  }

  assemblyContainerChanged = (newValue) => {
    const onePot = newValue === 'true';
    this.props.orderSetParameters(this.props.order.id, {
      permutations: this.props.constructs.length,
      combinatorialMethod: 'Random Subset',
      onePot,
    }, true);
  };

  _labelChanged = (newLabel) => {
    this.props.orderSetName(this.props.order.id, newLabel);
  };

  numberOfAssembliesChanged = (newValue) => {
    const total = parseInt(newValue, 10);
    this.props.orderSetParameters(this.props.order.id, {
      permutations: Number.isInteger(total) ? Math.min(this.props.constructs.length, Math.max(0, total)) : 1,
    }, true);
  };

  methodOptions() {
    //return ['Random Subset', 'Maximum Unique Set', 'All Combinations'].map(item => {
    return ['Random Subset', 'Maximum Unique Set'].map(item => {
      return {value: item, label: item};
    });
  }

  methodChanged = (newMethod) => {
    this.props.orderSetParameters(this.props.order.id, {
      combinatorialMethod: newMethod,
    }, true);
  };

  sequenceAssemblies = (state) => {
    this.props.orderSetParameters(this.props.order.id, {
      sequenceAssemblies: state,
    }, true);
  };

  render() {
    // no render when not open
    if (!this.props.open) {
      return null;
    }

    const { order } = this.props;

    return (
      <div className="order-page page1">
        <fieldset disabled={order.isSubmitted()}>
          <Row text="Label:">
            <Input
              onChange={this.labelChanged}
              value={order.metadata.name}
              placeholder="e.g. Construct A - Order #1"
            />
          </Row>
          <Row text="Assembly Containers:">
            <Selector
              value={order.parameters.onePot}
              options={this.assemblyOptions()}
              onChange={(val) => this.assemblyContainerChanged(val)}
            />
          </Row>
          <Row text="Number of assemblies:">
            <Permutations
              total={this.props.constructs.length}
              value={order.parameters.permutations}
              editable={!order.parameters.onePot}
              onChange={(val) => this.numberOfAssembliesChanged(val)}
            />
          </Row>
          <Row text="Combinatorial method:">
            <Selector
              value={order.parameters.combinatorialMethod}
              options={this.methodOptions()}
              onChange={this.methodChanged}
              disabled={order.parameters.onePot || (!order.parameters.onePot && order.parameters.permutations === this.props.constructs.length) }
            />
          </Row>
          <Row text="After fabrication:">
            <Checkbox
              onChange={this.sequenceAssemblies}
              label="Sequence Assemblies"
              value={order.parameters.sequenceAssemblies}
            />
          </Row>
          <br/>
        </fieldset>
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  return {
    project: state.projects[props.projectId],
    constructs: props.order.constructs.map(construct => construct.components
                    .map(component => component.componentId)
                    .map(componentId => state.blocks[componentId])),

  };
}

export default connect(mapStateToProps, {
  orderSetName,
  orderSetParameters,
})(Page1);
