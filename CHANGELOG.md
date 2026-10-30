# Changelog

Notable changes to `Umbraco.Community.PowerToys`.

## Unreleased

### Added

- Icon Colors power toy: add your own colours to the icon picker, or swap in the 19 icon colours
  from Umbraco 13 so icons picked in v13 get their own colour back (umbraco/Umbraco-CMS#22543).

## [17.2.0] - 2026-10-15

### Added

- Custom keyboard shortcuts: admins can add shortcuts in the Keyboard Shortcuts settings to go to
  a section or URL, open search or a Power Toys panel, or run a workspace or entity action on
  the open item. Alt+1 to Alt+9 go to the sections out of the box (#70).
- Keyboard Shortcuts power toy: press ? or use the header button to open a panel listing the
  shortcuts that work on the screen you're on, read live from Umbraco, plus the common keys
  that work everywhere (#68).

## [17.1.0] - 2026-10-15

### Added

- BackChat power toy: a chat icon in the header opens a panel to chat with everyone, about the
  page you're on, or in direct and group conversations, with @mentions, messages that need
  confirming and content activity lines (#60).
- Tasks power toy: a tasks icon in the header opens a panel with the tasks assigned to you, the
  page you're on and a global list, with assignees, due dates and live updates (#61).
- Content reviews, part of the Tasks power toy and switched on in its settings: give pages a
  review date by hand or by a rule per content type, see what's due in the Tasks panel, mark
  pages reviewed, and remind the last editor when a page falls due (#62).
- The BackChat and Tasks panels dock beside the page rather than opening over it, so they stay
  open while you move around the site.

## [17.0.0] - 2026-08-23

### Added

- Allow use of the dotnet environmentName as well as URL matching for environment-indicator
- Drag-and-drop reordering of environments in the Environment Indicator settings
- Power toy settings (and the enabled flag) can now be locked to a value set in
  `appsettings.json`, under a `PowerToys:{Name}` section - a config-provided value takes
  priority over whatever's stored in the backoffice, and the settings UI shows it as read-only

## [17.0.0-rc1] - 2026-08-21

### Fixed

- Startup exception on a brand new site: power toy boot hooks (Login Customizer, Logo Changer) no
  longer read from the database before Umbraco has finished configuring its connection string.
- Power toys are now disabled by default on a new install instead of coming enabled automatically.

## [17.0.0-rc] - 2026-08-21

First release candidate for Umbraco 17.

### Added

- Power Toys dashboard in the Umbraco Settings section, with a `powerToy` extension type and
  shared context/condition so other packages can register their own tools without touching this
  package's code.
- Built-in power toys:
  - Navbar Clock - shows the current time in the backoffice header.
  - Dashboard Manager - lists installed dashboards and lets you hide (or bring back) individual ones.
  - Login Customizer - customizes the backoffice login screen's images and password reset option.
  - Help Menu Editor - hides built-in help menu links, adds your own, or disables the help menu.
  - Environment Indicator - colours (and optionally labels) the backoffice header by matching the
    current URL against a list of environments.
  - Theme Maker - lists installed backoffice themes and lets you add your own custom themes.
  - Logo Changer - customizes the backoffice logo.
- Backup/restore of all power toy settings.
- Initial project skeleton: package project, test site, and CI workflows.
