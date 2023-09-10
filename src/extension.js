/*
 * Copyright (C) 2022 Amir Hossein Mafi <amir77mafi@gmail.com>
 *
 * This file is part of Activities Workspace Name.
 *
 * Activities Workspace Name is free software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * Activities Workspace Name is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Activities Workspace Name.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { main: Main, panelMenu: PanelMenu, dnd: DND, dialog: Dialog, modalDialog: ModalDialog } = imports.ui;
const { Atk, GObject, Clutter, St, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var BUTTON_DND_ACTIVATION_TIMEOUT = 250;
var LONG_PRESS_RENAME_ACTIVATION_TIMEOUT = 1000;

// The ActivitiesButton is a modified copy of gnome-shell ActivitiesButton
// that can be found in https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js
var ActivitiesButton = GObject.registerClass(
  class ActivitiesButton extends PanelMenu.Button {
    _init() {
      super._init(0.0, null, true);
      this.accessible_role = Atk.Role.TOGGLE_BUTTON;

      this.name = 'panelActivities';

      this._wmSettings = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.preferences',
      });

      const activeWorkspaceName = this._getActiveWorkspaceName();

      this._label = new St.Label({
        text: activeWorkspaceName,
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.add_actor(this._label);
      this.label_actor = this._label;

      this._activeWsChanged = global.workspace_manager.connect(
        'active-workspace-changed',
        this._setText.bind(this)
      );

      this._workspaceNamesChanged = this._wmSettings.connect(
        'changed::workspace-names',
        this._setText.bind(this)
      );

      Main.overview.connect('showing', () => {
        this.add_style_pseudo_class('overview');
        this.add_accessible_state(Atk.StateType.CHECKED);
      });
      Main.overview.connect('hiding', () => {
        this.remove_style_pseudo_class('overview');
        this.remove_accessible_state(Atk.StateType.CHECKED);
      });

      this._xdndTimeOut = 0;
    }

    _getWorkspaceNames() {
      const workspaceNames = this._wmSettings.get_strv('workspace-names');
      return workspaceNames;
    }

    _setText() {
      this._label.set_text(this._getActiveWorkspaceName());
    }

    _getActiveWorkspaceName() {
      const workspaceNames = this._getWorkspaceNames();
      const activeWorkspaceIndex =
        global.workspace_manager.get_active_workspace_index();
      const workspaceNameOrIndex =
        workspaceNames[activeWorkspaceIndex] ||
        (activeWorkspaceIndex + 1).toString();
      return workspaceNameOrIndex;
    }

    _setActiveWorkspaceName(name) {
      const workspaceNames = this._getWorkspaceNames();
      const activeWorkspaceIndex =
        global.workspace_manager.get_active_workspace_index();
      workspaceNames[activeWorkspaceIndex] = name;
      this._wmSettings.set_strv('workspace-names', workspaceNames);
    }

    handleDragOver(source, _actor, _x, _y, _time) {
      if (source != Main.xdndHandler) return DND.DragMotionResult.CONTINUE;

      if (this._xdndTimeOut != 0) GLib.source_remove(this._xdndTimeOut);
      this._xdndTimeOut = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        BUTTON_DND_ACTIVATION_TIMEOUT,
        () => {
          this._xdndToggleOverview();
        }
      );
      GLib.Source.set_name_by_id(
        this._xdndTimeOut,
        '[gnome-shell] this._xdndToggleOverview'
      );

      return DND.DragMotionResult.CONTINUE;
    }

    vfunc_captured_event(event) {
      if (
        event.type() == Clutter.EventType.BUTTON_PRESS ||
        event.type() == Clutter.EventType.TOUCH_BEGIN
      ) {
        this.startTime = Date.now();
        if (!Main.overview.shouldToggleByCornerOrButton())
          return Clutter.EVENT_STOP;
      }
      return Clutter.EVENT_PROPAGATE;
    }

    vfunc_event(event) {
      if (
        event.type() == Clutter.EventType.TOUCH_END ||
        event.type() == Clutter.EventType.BUTTON_RELEASE
      ) {
        const durationMillis = Date.now() - this.startTime;
        if (durationMillis >= LONG_PRESS_RENAME_ACTIVATION_TIMEOUT) {
          // long press detected, creating a modal dialog to rename workspace
          let testDialog = new ModalDialog.ModalDialog({
            destroyOnClose: false,
            styleClass: 'my-dialog',
          });

          const messageLayout = new Dialog.MessageDialogContent({
            title: 'Rename workspace',
            description: 'Change the current workspace name to:',
          });
          testDialog.contentLayout.add_child(messageLayout);
          
          let worskapceNameEntry = new St.Entry({
            name: 'workspaceNameEntry',
            style_class: 'big_text',
            can_focus: true,
            hint_text: this._getActiveWorkspaceName(),
            track_hover: true,
            x_expand: true,
          });
          testDialog.contentLayout.add_child(worskapceNameEntry);

          // create buttons
          testDialog.setButtons([
            {
                label: 'Rename',
                isDefault: true,
                action: () => {
                  // change name to whatever user provided...
                  this._setActiveWorkspaceName(worskapceNameEntry.get_text());
                  testDialog.destroy();
                },
            },
            {
                label: 'Cancel',
                // do nothing
                action: () => testDialog.destroy(),
            },
          ]);
          testDialog.open(global.get_current_time());
        } else if (Main.overview.shouldToggleByCornerOrButton()) {
          Main.overview.toggle();
        }
      }

      return Clutter.EVENT_PROPAGATE;
    }

    vfunc_key_release_event(keyEvent) {
      let symbol = keyEvent.keyval;
      if (symbol == Clutter.KEY_Return || symbol == Clutter.KEY_space) {
        if (Main.overview.shouldToggleByCornerOrButton()) {
          Main.overview.toggle();
          return Clutter.EVENT_STOP;
        }
      }

      return Clutter.EVENT_PROPAGATE;
    }

    _xdndToggleOverview() {
      let [x, y] = global.get_pointer();
      let pickedActor = global.stage.get_actor_at_pos(
        Clutter.PickMode.REACTIVE,
        x,
        y
      );

      if (pickedActor == this && Main.overview.shouldToggleByCornerOrButton())
        Main.overview.toggle();

      GLib.source_remove(this._xdndTimeOut);
      this._xdndTimeOut = 0;
      return GLib.SOURCE_REMOVE;
    }

    destroy() {
      if (this._activeWsChanged) {
        global.workspace_manager.disconnect(this._activeWsChanged);
        this._activeWsChanged = null;
      }

      if (this._workspaceNamesChanged) {
        this._wmSettings.disconnect(this._workspaceNamesChanged);
        this._workspaceNamesChanged = null;
      }

      super.destroy();
    }
  }
);

let activitiesButton, uuid;

function init(extensionMeta) {
  uuid = extensionMeta.uuid;
}

function enable() {
  Main.panel.statusArea.activities.container.hide();
  activitiesButton = new ActivitiesButton();
  Main.panel.addToStatusArea(uuid, activitiesButton, 0, 'left');
}

function disable() {
  if (activitiesButton) {
    activitiesButton.destroy();
    activitiesButton = null;
  }

  if (Main.sessionMode.currentMode == 'unlock-dialog') {
    Main.panel.statusArea.activities.container.hide();
  } else {
    Main.panel.statusArea.activities.container.show();
  }
}
