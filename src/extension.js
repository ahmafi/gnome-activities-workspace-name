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

const { main: Main, panelMenu: PanelMenu, dnd: DND } = imports.ui;
const { Atk, GObject, Clutter, St, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var BUTTON_DND_ACTIVATION_TIMEOUT = 250;

// The ActivitiesButton is a modified copy of gnome-shell ActivitiesButton
// that can be found in https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js
var ActivitiesButton = GObject.registerClass(
  class ActivitiesButton extends PanelMenu.Button {
    _init() {
      super._init(0.0, null, true);
      this.accessible_role = Atk.Role.TOGGLE_BUTTON;

      this.name = 'panelActivities';

      const activeWorkspaceName = this._getActiveWorkspaceName();

      this._label = new St.Label({
        text: activeWorkspaceName,
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.add_actor(this._label);

      this._activeWsChanged = global.workspace_manager.connect(
        'active-workspace-changed',
        () => {
          this._label.set_text(this._getActiveWorkspaceName());
        }
      );

      this.label_actor = this._label;

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
      const wmPref = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.preferences',
      });
      const workspaceNames = wmPref.get_strv('workspace-names');

      return workspaceNames;
    }

    _getActiveWorkspaceName() {
      const workspaceNames = this._getWorkspaceNames();
      const activeWorkspaceIndex =
        global.workspace_manager.get_active_workspace_index();
      return (
        workspaceNames[activeWorkspaceIndex] ||
        (activeWorkspaceIndex + 1).toString()
      );
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
        if (Main.overview.shouldToggleByCornerOrButton())
          Main.overview.toggle();
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
