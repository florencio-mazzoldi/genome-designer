import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import {
  uiShowOrderForm,
} from '../../actions/ui';
import {
  orderSubmit,
} from '../../actions/orders';
import ModalWindow from '../../components/modal/modalwindow';
import Page1 from './page1';
import Page2 from './page2';
import Page3 from './page3';
import NavLeftRight from './nav-left-right';
import Order from '../../models/Order';

import '../../../src/styles/form.css';
import '../../../src/styles/ordermodal.css';

class OrderModal extends Component {

  static propTypes = {
    uiShowOrderForm: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    projectId: PropTypes.string.isRequired,
    orderSubmit: PropTypes.func.isRequired,
  };

  state = {
    page: 1,
  };

  nav(inc) {
    let page = this.state.page + inc;
    if (page < 1) page = 3;
    if (page > 3) page = 1;
    this.setState({page});
  }

  componentWillReceiveProps(nextProps) {
    // page 1 on opening and create order
    if (!this.props.open && nextProps.open) {
      this.setState({
        page: nextProps.order.isSubmitted() ? 3 : 1,
      });
    }
  }

  onSubmit = (evt) => {
    evt.preventDefault();
    if (this.props.order.isSubmitted()) {
      this.props.uiShowOrderForm(false);
    } else {
      this.props.orderSubmit(this.props.order.id)
        .then(() => {
          this.setState({page: 3})
        });
    }
  };

  modalButtons() {
    if (!this.props.order.isSubmitted()) {
      return (
        <div className="buttons">
          <button type="submit">Submit Order</button>
          <button
            type="button"
            onClick={() => {
              this.props.uiShowOrderForm(false);
            }}>Cancel
          </button>
        </div>
      )
    }
    return (
      <div className="buttons">
        <button type="submit">Done</button>
      </div>
    )
  }

  render() {
    // no render when not open
    if (!this.props.open) {
      return null;
    }
    const leftText = ['', 'Change Settings', 'Review Assemblies'][this.state.page - 1];
    const rightText = ['Review Assemblies', 'Order Details', ''][this.state.page - 1];
    const titleText = ['Order DNA', 'Review Assemblies', 'Order Details'][this.state.page -1];

    return (<ModalWindow
      open={this.props.open}
      title="Order DNA"
      closeOnClickOutside
      closeModal={(buttonText) => {
        this.props.uiShowOrderForm(false);
      }}
      payload={
          <form className="gd-form order-form" onSubmit={this.onSubmit}>
            <div className="title">{titleText}</div>
            <div>
              <Page1 open={this.state.page === 1} order={this.props.order}/>
              <Page2 open={this.state.page === 2} order={this.props.order}/>
              <Page3 open={this.state.page === 3} order={this.props.order}/>
            </div>
            <div className="actions">
              <NavLeftRight
                onClick={this.nav.bind(this, -1)}
                left={true}
                text={leftText}
                visible={this.state.page > 1}/>
              {this.modalButtons()}
              <NavLeftRight
                onClick={this.nav.bind(this, 1)}
                left={false}
                text={rightText}
              visible={this.state.page < 3 && !(this.state.page === 2 && !this.props.order.isSubmitted())}/>
            </div>
          </form>}

    />);
  }
}

function mapStateToProps(state, props) {
  return {
    open: state.ui.modals.showOrderForm,
    project: state.projects[props.projectId],
    order: state.orders[state.ui.modals.orderId],
  };
}

export default connect(mapStateToProps, {
  uiShowOrderForm,
  orderSubmit,
})(OrderModal);
