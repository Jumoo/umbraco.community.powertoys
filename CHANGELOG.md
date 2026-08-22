# Changelog

Notable changes to `Umbraco.Community.PowerToys`.

## Unreleased

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
