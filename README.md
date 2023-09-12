<div align="center">
  <h1>GNOME Extension - Activities Workspace Name</h1>
  <p><b>Replace Activities Text with Current Workspace Name</b></p>
  <a href="https://extensions.gnome.org/extension/5311/activities-workspace-name/">
    <img src="https://img.shields.io/badge/Install%20from-extensions.gnome.org-4A86CF?style=for-the-badge&logo=Gnome&logoColor=white"/>
  </a>
</div>

![GNOME Extension - Activities Workspace Name Screenshot](https://github.com/ahmafi/gnome-activities-workspace-name/raw/main/images/gnome-activities-workspace-name.jpg)

To set the workspace names do one of the followings:

1- After installing the extension do a long press on activities name, then you
can edit the current workspace name through the showing dialog.

2- Manually through command line:

```
gsettings set org.gnome.desktop.wm.preferences workspace-names "['workspace1', 'workspace2', 'workspace3']"
```

# Installation

## Recommended

Install from [GNOME Shell Extensions](https://extensions.gnome.org/extension/5311/activities-workspace-name/) website to get the latest version.

## Manual

1. Clone the repo

   ```
   git clone https://github.com/ahmafi/gnome-activities-workspace-name
   ```

2. Install the extension (it will use `gnome-extensions` CLI tool to install into `~/.local/share/gnome-shell/extensions`)

   ```
   cd gnome-activities-workspace-name
   make install
   ```

   **Or** do it manually

   ```
   cd gnome-activities-workspace-name
   mkdir ~/.local/share/gnome-shell/extension/activitiesworkspacename@ahmafi.ir
   cp -r src/* ~/.local/share/gnome-shell/extension/activitiesworkspacename@ahmafi.ir
   ```

3. Restart the GNOME shell

   - **Wayland**: Logout and login.

   - **X11**: Press `Alt+F2` and run `r` to restart. Or logout and login.

4. Enable the extension:
   ```
   gnome-extensions enable activitiesworkspacename@ahmafi.ir
   ```
   You can also enable it in GUI from the [Extension Manager](https://github.com/mjakeman/extension-manager) app.

# Development

Copy the source files into extensions directory

```
make install
```

Enable the extension (Only for the first time)

```
gnome-extensions enable activitiesworkspacename@ahmafi.ir
```

Run a wayland nested session

```
make run
```

If you are using X11, or for more details see [here](https://gjs.guide/extensions/development/creating.html#enabling-the-extension).

# Disclaimer

This extension is an independent project and is not affiliated with, authorized by, sponsored by, or in any way associated with GNOME Foundation.

Legal disclaimer for brand icons and trademarks:

_All brand icons are trademarks of their respective owners. The use of these trademarks does not indicate endorsement of the trademark holder by "Activities Workspace Name" project, nor vice versa. Please do not use brand logos for any purpose except to represent the company, product, or service to which they refer._

<details>
<summary><b>Read More...</b></summary>
<p>

- **GNOME** - The GNOME logo and GNOME name are registered trademarks or trademarks of GNOME Foundation in the United States or other countries.

</p>
</details>

# License

[GPL-3.0](https://github.com/ahmafi/gnome-activities-workspace-name/blob/main/LICENSE) &copy; Amir Hossein Mafi
