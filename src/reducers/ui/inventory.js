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
import * as ActionTypes from '../../constants/ActionTypes';
import { LOCATION_CHANGE } from 'react-router-redux';
import { getItem, setItem } from '../../middleware/localStorageCache';

export const initialState = {
  isVisible: getItem('inventoryVisibility') ? getItem('inventoryVisibility') === 'true' : false,
  currentTab: getItem('inventoryTab') || 'projects',
};

export default function inventory(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.INVENTORY_TOGGLE_VISIBILITY :
    const { nextState } = action;
    setItem('inventoryVisibility', nextState.toString());
    return Object.assign({}, state, { isVisible: nextState });

  case ActionTypes.INVENTORY_SELECT_TAB :
    const { tab } = action;
    setItem('inventoryTab', tab);
    return Object.assign({}, state, { currentTab: tab });

  default :
    return state;
  }
}
