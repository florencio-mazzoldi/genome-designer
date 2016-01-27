import React, { Component, PropTypes } from 'react';
import Menu from './Menu';

import '../../styles/Menu.css';

export default class MenuBar extends Component {
  static propTypes = {
    menus: PropTypes.array.isRequired,
  };

  state = {
    openMenu: null,
  };

  toggleMenu(menuId, forceVal) {
    const lastOpen = this.state.openMenu;
    const requested = menuId;
    const isOpen = (forceVal === true || forceVal === false) ? forceVal : (lastOpen !== requested);
    const openMenu = isOpen ? requested : null;

    this.setState({
      openMenu,
    });
  }

  render() {
    return (
      <div className="menu-bar">
        {this.props.menus.map((menu) => {
          const menuId = menu.text;
          return (<Menu key={menuId}
                        title={menu.text}
                        isOpen={this.state.openMenu === menuId}
                        onToggle={(forceVal) => this.toggleMenu(menuId, forceVal)}
                        menuItems={menu.items}/> );
        })}
      </div>
    );
  }
}
