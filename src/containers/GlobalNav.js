import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';
import MenuBar from '../components/Menu/MenuBar';
import UserWidget from '../components/authentication/userwidget';
import RibbonGrunt from '../components/ribbongrunt';
import {
  projectCreate,
  projectAddConstruct,
  projectSave,
  projectOpen,
} from '../actions/projects';
import {
  focusBlocks,
  focusBlocksAdd,
  focusBlocksToggle,
  focusConstruct,
} from '../actions/focus';
import { clipboardSetData } from '../actions/clipboard';
import * as clipboardFormats from '../constants/clipboardFormats';
import {
  blockCreate,
  blockDelete,
  blockDetach,
  blockClone,
  blockRemoveComponent,
  blockAddComponent,
  blockAddComponents,
  blockRename,
} from '../actions/blocks';
import {
  blockGetParents,
  blockGetChildrenRecursive,
} from '../selectors/blocks';
import { projectGetVersion } from '../selectors/projects';
import { focusDetailsExist } from '../selectors/focus';
import { undo, redo, transact, commit } from '../store/undo/actions';
import {
  uiShowGenBankImport,
  uiToggleDetailView,
  uiSetGrunt,
  uiShowAbout,
  inventorySelectTab,
} from '../actions/ui';
import { inspectorToggleVisibility, inventoryToggleVisibility, uiShowDNAImport } from '../actions/ui';
import KeyboardTrap from 'mousetrap';
import { stringToShortcut } from '../utils/ui/keyboard-translator';
import {
  sortBlocksByIndexAndDepth,
  sortBlocksByIndexAndDepthExclude,
  tos,
  privacy,
} from '../utils/ui/uiapi';
import AutosaveTracking from '../components/GlobalNav/autosaveTracking';

import '../styles/GlobalNav.css';

class GlobalNav extends Component {
  static propTypes = {
    undo: PropTypes.func.isRequired,
    redo: PropTypes.func.isRequired,
    projectCreate: PropTypes.func.isRequired,
    projectAddConstruct: PropTypes.func.isRequired,
    projectSave: PropTypes.func.isRequired,
    currentProjectId: PropTypes.string,
    blockCreate: PropTypes.func.isRequired,
    showMenu: PropTypes.bool.isRequired,
    blockGetParents: PropTypes.func.isRequired,
    focusDetailsExist: PropTypes.func.isRequired,
    focusBlocks: PropTypes.func.isRequired,
    inventoryToggleVisibility: PropTypes.func.isRequired,
    uiToggleDetailView: PropTypes.func.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    projectOpen: PropTypes.func.isRequired,
    focusConstruct: PropTypes.func.isRequired,
    transact: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    uiShowGenBankImport: PropTypes.func.isRequired,
    projectGetVersion: PropTypes.func.isRequired,
    blockClone: PropTypes.func.isRequired,
    clipboardSetData: PropTypes.func.isRequired,
    inventorySelectTab: PropTypes.func.isRequired,
    uiSetGrunt: PropTypes.func.isRequired,
    blockDetach: PropTypes.func.isRequired,
    clipboard: PropTypes.object.isRequired,
    blockGetChildrenRecursive: PropTypes.func.isRequired,
    blockAddComponent: PropTypes.func.isRequired,
    blockAddComponents: PropTypes.func.isRequired,
    uiShowAbout: PropTypes.func.isRequired,
    uiShowDNAImport: PropTypes.func.isRequired,
    inventoryVisible: PropTypes.bool.isRequired,
    inspectorVisible: PropTypes.bool.isRequired,
    detailViewVisible: PropTypes.bool.isRequired,
    focus: PropTypes.object.isRequired,
    blocks: PropTypes.object,
  };

  constructor(props) {
    super(props);

    // keyboard shortcuts
    //
    // ************ FILE MENU ***********
    KeyboardTrap.bind('mod+s', (evt) => {
      evt.preventDefault();
      this.saveProject();
    });
    KeyboardTrap.bind('mod+o', (evt) => {
      evt.preventDefault();
      this.props.inventoryToggleVisibility(true);
      this.props.inventorySelectTab('projects');
    });
    KeyboardTrap.bind('mod+f', (evt) => {
      evt.preventDefault();
      this.props.inventoryToggleVisibility(true);
      this.props.inventorySelectTab('search');
    });
    KeyboardTrap.bind('option+n', (evt) => {
      evt.preventDefault();
      this.newProject();
    });
    KeyboardTrap.bind('shift+option+n', (evt) => {
      evt.preventDefault();
      this.newConstruct();
    });
    // ************ EDIT MENU ***********
    KeyboardTrap.bind('mod+z', (evt) => {
      evt.preventDefault();
      this.props.undo();
    });
    KeyboardTrap.bind('mod+shift+z', (evt) => {
      evt.preventDefault();
      this.props.redo();
    });
    // select all/cut/copy/paste
    KeyboardTrap.bind('mod+a', (evt) => {
      evt.preventDefault();
      this.onSelectAll();
    });
    KeyboardTrap.bind('mod+x', (evt) => {
      evt.preventDefault();
      this.cutFocusedBlocksToClipboard();
    });
    KeyboardTrap.bind('mod+c', (evt) => {
      evt.preventDefault();
      this.copyFocusedBlocksToClipboard();
    });
    KeyboardTrap.bind('mod+v', (evt) => {
      evt.preventDefault();
      this.pasteBlocksToConstruct();
    });
    // **************** VIEW ******************
    KeyboardTrap.bind('shift+mod+i', (evt) => {
      evt.preventDefault();
      this.props.inventoryToggleVisibility();
    });
    KeyboardTrap.bind('mod+i', (evt) => {
      evt.preventDefault();
      this.props.inspectorToggleVisibility();
    });
    KeyboardTrap.bind('mod+u', (evt) => {
      evt.preventDefault();
      this.props.uiToggleDetailView();
    });
    KeyboardTrap.bind('mod+b', (evt) => {
      evt.preventDefault();
      this.props.inventoryToggleVisibility(true);
      this.props.inventorySelectTab('role');
    });
  }

  /**
   * unsink all keyboard events on unmount
   */
  componentWillUnmount() {
    KeyboardTrap.reset();
  }

  state = {
    showAddProject: false,
    recentProjects: [],
  };

  /**
   * select all blocks of the current construct
   */
  onSelectAll() {
    this.props.focusBlocks(this.props.blockGetChildrenRecursive(this.props.focus.constructId).map(block => block.id));
  }

  // get parent of block
  getBlockParentId(blockId) {
    return this.props.blockGetParents(blockId)[0].id;
  }

  /**
   * new project and navigate to new project
   */
  newProject() {
    // create project and add a default construct
    const project = this.props.projectCreate();
    // add a construct to the new project
    const block = this.props.blockCreate({ projectId: project.id });
    this.props.projectAddConstruct(project.id, block.id);
    this.props.focusConstruct(block.id);
    this.props.projectOpen(project.id);
  }

  /**
   * add a new construct to the current project
   */
  newConstruct() {
    this.props.transact();
    const block = this.props.blockCreate();
    this.props.projectAddConstruct(this.props.currentProjectId, block.id);
    this.props.commit();
    this.props.focusConstruct(block.id);
  }

  /**
   * download the current file as a genbank file
   * @return {[type]} [description]
   */
  downloadProjectGenbank() {
    this.saveProject()
      .then(() => {
        // for now use an iframe otherwise any errors will corrupt the page
        const url = `${window.location.protocol}//${window.location.host}/export/genbank/${this.props.currentProjectId}`;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
      });
  }

  /**
   * upload a genbank into current or new project
   */
  uploadGenbankFile() {
    this.saveProject()
      .then(() => {
        this.props.uiShowGenBankImport(true);
      });
  }

  /**
   * get parent block of block with given id
   */
  blockGetParent(blockId) {
    return this.props.blockGetParents(blockId)[0];
  }

  /**
   * return the block we are going to insert after
   */
  findInsertBlock() {
    // sort blocks according to 'natural order'
    const sorted = sortBlocksByIndexAndDepth(this.props.focus.blockIds);
    // the right most, top most block is the insertion point
    const highest = sorted.pop();
    // return parent of highest block and index + 1 so that the block is inserted after the highest block
    return {
      parent: this.blockGetParent(this.props.blocks[highest.blockId].id).id,
      index: highest.index + 1,
    };
  }

  // copy the focused blocks to the clipboard using a deep clone
  copyFocusedBlocksToClipboard() {
    if (this.props.focus.blockIds.length) {
      // sort selected blocks so they are pasted in the same order as they exist now.
      // NOTE: we don't copy the children of any selected parents since they will
      // be cloned along with their parent
      const sorted = sortBlocksByIndexAndDepthExclude(this.props.focus.blockIds);
      // sorted is an array of array, flatten while retaining order
      const currentProjectVersion = this.props.projectGetVersion(this.props.currentProjectId);
      const clones = sorted.map(info => {
        return this.props.blockClone(info.blockId, {
          projectId: this.props.currentProjectId,
          version: currentProjectVersion,
        });
      });
      // put clones on the clipboardparentObjectInput
      this.props.clipboardSetData([clipboardFormats.blocks], [clones]);
    }
  }

  /**
   * select all the empty blocks in the current construct
   */
  selectEmptyBlocks() {
    const allChildren = this.props.blockGetChildrenRecursive(this.props.focus.constructId);
    const emptySet = allChildren.filter(block => !block.hasSequence()).map(block => block.id);
    this.props.focusBlocks(emptySet);
    if (!emptySet.length) {
      this.props.uiSetGrunt('There are no empty blocks in the current construct');
    }
  }

  /**
   * save current project, return promise for chaining
   */
  saveProject() {
    return this.props.projectSave(this.props.currentProjectId);
  }

  /**
   * add a new construct to the current project
   */
  newConstruct() {
    this.props.transact();
    const block = this.props.blockCreate();
    this.props.projectAddConstruct(this.props.currentProjectId, block.id);
    this.props.commit();
    this.props.focusConstruct(block.id);
  }

  /**
   * new project and navigate to new project
   */
  newProject() {
    // create project and add a default construct
    const project = this.props.projectCreate();
    // add a construct to the new project
    const block = this.props.blockCreate({ projectId: project.id });
    this.props.projectAddConstruct(project.id, block.id);
    this.props.focusConstruct(block.id);
    this.props.projectOpen(project.id);
  }

  /**
   * return true if the focused construct is fixrf
   * @return {Boolean} [description]
   */
  focusedConstruct() {
    if (this.props.focus.constructId) {
      return this.props.blocks[this.props.focus.constructId];
    }
    return null;
  }

  // cut focused blocks to the clipboard, no clone required since we are removing them.
  cutFocusedBlocksToClipboard() {
    if (this.props.focus.blockIds.length && !this.focusedConstruct().isFixed() && this.focusedConstruct().isFrozen()) {
      // TODO, cut must be prevents on fixed or frozen blocks
      const blockIds = this.props.blockDetach(...this.props.focus.blockIds);
      this.props.clipboardSetData([clipboardFormats.blocks], [blockIds.map(blockId => this.props.blocks[blockId])]);
      this.props.focusBlocks([]);
    }
  }

  // paste from clipboard to current construct
  pasteBlocksToConstruct() {
    // verify current construct
    invariant(this.focusedConstruct(), 'expected a construct');
    // ignore if construct is immutable
    if (this.focusedConstruct().isFixed() && this.focusedConstruct().isFrozen()) {
      return;
    }
    // paste blocks into construct if format available
    const index = this.props.clipboard.formats.indexOf(clipboardFormats.blocks);
    if (index >= 0) {
      // TODO, paste must be prevented on fixed or frozen blocks
      const blocks = this.props.clipboard.data[index];
      invariant(blocks && blocks.length && Array.isArray(blocks), 'expected array of blocks on clipboard for this format');
      // we have to clone the blocks currently on the clipboard since they
      // can't be pasted twice
      const clones = blocks.map(block => {
        return this.props.blockClone(block.id);
      });
      // insert at end of construct if no blocks selected
      let insertIndex = this.focusedConstruct().components.length;
      let parentId = this.focusedConstruct().id;
      if (this.props.focus.blockIds.length) {
        const insertInfo = this.findInsertBlock();
        insertIndex = insertInfo.index;
        parentId = insertInfo.parent;
      }
      // add to construct
      this.props.blockAddComponents(parentId, clones.map(clone => clone.id), insertIndex);

      // select the clones
      this.props.focusBlocks(clones.map(clone => clone.id));
    }
  }

  menuBar() {
    return (<MenuBar
      menus={[
        {
          text: 'FILE',
          items: [
            {
              text: 'Save Project',
              shortcut: stringToShortcut('meta S'),
              action: () => {
                this.saveProject();
              },
            },
            {
              text: 'Open Project',
              shortcut: stringToShortcut('meta O'),
              action: () => {
                this.props.inventoryToggleVisibility(true);
                this.props.inventorySelectTab('projects');
              },
            },
            {
              text: 'Search',
              shortcut: stringToShortcut('meta F'),
              action: () => {
                this.props.inventoryToggleVisibility(true);
                this.props.inventorySelectTab('search');
              },
            },
            {},
            {
              text: 'New Project',
              shortcut: stringToShortcut('option N'),
              action: () => {
                this.newProject();
              },
            },
            {
              text: 'New Construct',
              shortcut: stringToShortcut('shift option N'),
              action: () => {
                this.newConstruct();
              },
            },
            {},
            {
              text: 'Import Genbank or CSV File...',
              action: () => {
                this.uploadGenbankFile();
              },
            },
            {
              text: 'Download Genbank File',
              action: () => {
                this.downloadProjectGenbank();
              },
            },
          ],
        },
        {
          text: 'EDIT',
          items: [
            {
              text: 'Undo',
              shortcut: stringToShortcut('meta z'),
              action: () => {
                this.props.undo();
              },
            }, {
              text: 'Redo',
              shortcut: stringToShortcut('shift meta z'),
              action: () => {
                this.props.redo();
              },
            }, {}, {
              text: 'Select All',
              shortcut: stringToShortcut('meta A'),
              disabled: !this.props.focus.constructId,
              action: () => {
                this.onSelectAll();
              },
            }, {
              text: 'Cut',
              shortcut: stringToShortcut('meta X'),
              disabled: !this.props.focus.blockIds.length || !this.focusedConstruct() || this.focusedConstruct().isFixed() || this.focusedConstruct().isFrozen(),
              action: () => {
                this.cutFocusedBlocksToClipboard();
              },
            }, {
              text: 'Copy',
              shortcut: stringToShortcut('meta C'),
              disabled: !this.props.focus.blockIds.length,
              action: () => {
                this.copyFocusedBlocksToClipboard();
              },
            }, {
              text: 'Paste',
              shortcut: stringToShortcut('meta V'),
              disabled: !this.props.clipboard.formats.includes(clipboardFormats.blocks) || !this.focusedConstruct() || this.focusedConstruct().isFixed() || this.focusedConstruct().isFrozen(),
              action: () => {
                this.pasteBlocksToConstruct();
              },
            }, {}, {
              text: 'Add Sequence',
              action: () => {
                if (!this.props.focus.blockIds.length) {
                  this.props.uiSetGrunt('Sequence data must be added to or before a selected block. Please select a block and try again.');
                } else {
                  this.props.uiShowDNAImport(true);
                }
              },
            }, {
              text: 'Select Empty Blocks',
              disabled: !this.props.focus.constructId,
              action: () => {
                this.selectEmptyBlocks();
              },
            },
          ],
        },
        {
          text: 'VIEW',
          items: [
            {
              text: 'Inventory',
              checked: this.props.inventoryVisible,
              action: () => {
                this.props.inventoryToggleVisibility(!this.props.inventoryVisible);
              },
              shortcut: stringToShortcut('shift meta i'),
            }, {
              text: 'Inspector',
              checked: this.props.inspectorVisible,
              action: () => {
                this.props.inspectorToggleVisibility(!this.props.inspectorVisible);
              },
              shortcut: stringToShortcut('meta i'),
            }, {
              text: 'Sequence Details',
              disabled: !this.props.focusDetailsExist(),
              action: () => {
                this.props.uiToggleDetailView();
              },
              checked: this.props.detailViewVisible,
              shortcut: stringToShortcut('meta u'),
            }, {},
            {
              text: 'Sketch Library',
              shortcut: stringToShortcut('meta B'),
              action: () => {
                this.props.inventoryToggleVisibility(true);
                this.props.inventorySelectTab('role');
              },
            },
          ],
        },
        {
          text: 'HELP',
          items: [
            {
              text: 'User Guide',
              action: this.disgorgeDiscourse.bind(this, '/c/genome-designer/user-guide'),
            }, {
              text: 'Tutorials',
              action: this.disgorgeDiscourse.bind(this, '/c/genome-designer/tutorials'),
            }, {
              text: 'Forums',
              action: this.disgorgeDiscourse.bind(this, '/c/genome-designer'),
            }, {
              text: 'Get Support',
              action: this.disgorgeDiscourse.bind(this, '/c/genome-designer/support'),
            }, {
              text: 'Keyboard Shortcuts',
              action: () => {},
            }, {
              text: 'Give Us Feedback',
              action: this.disgorgeDiscourse.bind(this, '/c/genome-designer/feedback'),
            }, {}, {
              text: 'About Genome Designer',
              action: () => {
                this.props.uiShowAbout(true);
              },
            }, {
              text: 'Terms of Use',
              action: () => {
                window.open(tos, '_blank');
              },
            }, {
              text: 'Privacy Policy',
              action: () => {
                window.open(privacy, '_blank');
              },
            },
          ],
        },
      ]}/>);
  }

  disgorgeDiscourse(path) {
    const uri = window.discourseDomain + path;
    window.open(uri, '_blank');
  }

  render() {
    const { currentProjectId, showMenu } = this.props;

    return (
      <div className="GlobalNav">
        <RibbonGrunt />
        <span className="GlobalNav-title">GD</span>
        {showMenu && this.menuBar()}
        <span className="GlobalNav-spacer"/>
        {showMenu && <AutosaveTracking projectId={currentProjectId}/>}
        <UserWidget/>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    focus: state.focus,
    blocks: state.blocks,
    clipboard: state.clipboard,
    inspectorVisible: state.ui.inspector.isVisible,
    inventoryVisible: state.ui.inventory.isVisible,
    detailViewVisible: state.ui.detailView.isVisible,
  };
}

export default connect(mapStateToProps, {
  projectAddConstruct,
  projectCreate,
  projectSave,
  projectOpen,
  projectGetVersion,
  blockCreate,
  blockClone,
  blockDelete,
  blockDetach,
  blockRename,
  inspectorToggleVisibility,
  inventoryToggleVisibility,
  blockRemoveComponent,
  blockGetParents,
  blockGetChildrenRecursive,
  uiShowDNAImport,
  inventorySelectTab,
  undo,
  redo,
  transact,
  commit,
  uiShowGenBankImport,
  uiToggleDetailView,
  uiShowAbout,
  uiSetGrunt,
  focusBlocks,
  focusBlocksAdd,
  focusBlocksToggle,
  focusConstruct,
  focusDetailsExist,
  clipboardSetData,
  blockAddComponent,
  blockAddComponents,
})(GlobalNav);
