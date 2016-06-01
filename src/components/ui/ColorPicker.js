import React, { Component, PropTypes } from 'react';
import { colorMap, colors } from '../../utils/generators/color';
import PickerItem from './PickerItem';

import '../../styles/Picker.css';
import '../../styles/ColorPicker.css';

//todo - this has a lot of logic shared with Symbol Picker, but some differences in data structure etc. Should probably merge them though.

export default class ColorPicker extends Component {
  static propTypes = {
    readOnly: PropTypes.bool,
    current: PropTypes.string,
    onSelect: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      showContent: false,
      hoverText: this.nameColor(props.current),
    };
  }

  nameColor(color) {
    return colorMap[color] || '';
  }

  onClickCurrent = () => {
    const handleDocumentClick = (evt) => {
      this.setState({ showContent: false });
      document.removeEventListener('click', handleDocumentClick);
    };
    if (this.state.showContent || this.props.readOnly) return; //dont register more than once

    document.addEventListener('click', handleDocumentClick);
    this.setState({ showContent: true });
  };

  onMouseEnter = (hoverText) => {
    this.setState({ hoverText: this.nameColor(hoverText) });
  };

  onMouseOut = () => {
    this.setState({ hoverText: this.nameColor(this.props.current) });
  };

  render() {
    const { current, readOnly, onSelect } = this.props;

    return (
      <div className={'Picker ColorPicker' + (!!readOnly ? ' readOnly' : '')}>
        <div ref={ref => this.pickerToggler = ref}
             className="Picker-current"
             onClick={this.onClickCurrent}>
          <PickerItem isCurrent={false}
                      styles={{backgroundColor: current}}/>
        </div>
        {this.state.showContent && (
          <div className="Picker-content"
               onMouseOut={this.onMouseOut}>
            <div className="Picker-currentHovered">{this.state.hoverText}</div>
            <div className="Picker-options">
              {colors.map(color => {
                return (<PickerItem key={color}
                                    isCurrent={current === color}
                                    onMouseEnter={() => this.onMouseEnter(color)}
                                    onClick={() => !readOnly && onSelect(color)}
                                    styles={{backgroundColor: color}}/>);
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
}
