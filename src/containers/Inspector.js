import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { inspectorToggleVisibility } from '../actions/ui';

import InspectorBlock from '../components/Inspector/InspectorBlock';
import InspectorProject from '../components/Inspector/InspectorProject';

import '../styles/Inspector.css';
import '../styles/SidePanel.css';

export class Inspector extends Component {
  static propTypes = {
    showingGrunt: PropTypes.bool,
    isVisible: PropTypes.bool.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    readOnly: PropTypes.bool.isRequired,
    forceIsConstruct: PropTypes.bool.isRequired,
    type: PropTypes.string.isRequired,
    focused: PropTypes.any.isRequired,
  };

  toggle = (forceVal) => {
    this.props.inspectorToggleVisibility(forceVal);
  };

  render() {
    const { showingGrunt, isVisible, focused, orders, type, readOnly, forceIsConstruct } = this.props;

    // inspect instances, or construct if no instance or project if no construct or instances
    let inspect;
    switch (type) {
    case 'project':
      inspect = (<InspectorProject instance={focused}
                                  orders={orders}
                                  readOnly={readOnly}/>);
      break;
    case 'construct':
    default:
      inspect = (<InspectorBlock instances={focused}
                                 orders={orders}
                                 readOnly={readOnly}
                                 forceIsConstruct={forceIsConstruct}/>);
      break;
    }

    return (
      <div className={'SidePanel Inspector no-vertical-scroll' +
      (isVisible ? ' visible' : '') +
      (readOnly ? ' readOnly' : '') +
      (showingGrunt ? ' gruntPushdown' : '')}>

        <div className="SidePanel-heading">
          <button tabIndex="-1" className="button-nostyle SidePanel-heading-trigger Inspector-trigger"
                  onClick={() => this.toggle()}/>
          <div className="SidePanel-heading-content">
            <span className="SidePanel-heading-title">Inspector</span>
            <button tabIndex="-1" className="button-nostyle SidePanel-heading-close"
                    onClick={() => this.toggle(false)}/>
          </div>
        </div>

        <div className="SidePanel-content">
          {inspect}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  const { isVisible } = state.ui.inspector;
  //UI adjustment
  const showingGrunt = !!state.ui.modals.gruntMessage;

  const { level, forceProject, forceBlocks, projectId, constructId, blockIds } = state.focus;
  let focused;
  let readOnly = false;
  let type = level;
  //if projectId is not set in store, ProjectPage is passing it in, so lets default to it
  const currentProject = state.projects[projectId || props.projectId];

  if (level === 'project' || (!constructId && !forceBlocks.length && !blockIds.length)) {
    if (forceProject) {
      focused = forceProject;
      readOnly = true;
    } else {
      focused = currentProject;
    }
    type = 'project'; //need to override so dont try to show block inspector
  } else if (level === 'construct' || (constructId && !forceBlocks.length && !blockIds.length)) {
    const construct = state.blocks[constructId];
    focused = [construct];
    readOnly = construct.isFrozen();
  } else {
    if (forceBlocks.length) {
      focused = forceBlocks;
      readOnly = true;
    } else {
      focused = blockIds.map(blockId => state.blocks[blockId]);
      readOnly = focused.some(instance => instance.isFrozen());
    }
  }

  const forceIsConstruct = (level === 'construct') ||
    blockIds.some(blockId => currentProject.components.indexOf(blockId) >= 0);

  const orders = Object.keys(state.orders)
    .map(orderId => state.orders[orderId])
    .filter(order => order.projectId === projectId && order.isSubmitted())
    .sort((one, two) => one.status.timeSent - two.status.timeSent);

  return {
    showingGrunt,
    isVisible,
    type,
    readOnly,
    focused,
    forceIsConstruct,
    orders,
  };
}

export default connect(mapStateToProps, {
  inspectorToggleVisibility,
})(Inspector);
