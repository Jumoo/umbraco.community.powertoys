# Umbraco Community PowerToys

[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.PowerToys?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.PowerToys/)
[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.PowerToys?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.PowerToys)
[![GitHub license](https://img.shields.io/github/license/jumoo/umbraco.community.powertoys?color=8AB803)](../LICENSE)

A dashboard in the Umbraco Settings section for small, focused admin tools ("power toys"). Each
tool registers itself against a `powerToy` backoffice extension type, so both this package and
other packages can add tools to the same dashboard without touching PowerToys' own code.

<!--
Including screenshots is a really good idea! 

If you put images into /docs/screenshots, then you would reference them in this readme as, for example:

<img alt="..." src="https://github.com/jumoo/umbraco.community.powertoys/blob/v17/main/docs/screenshots/screenshot.png">

And don't forget to add the screenshot files to umbraco-marketplace.json too!
-->

## Installation

Add the package to an existing Umbraco website (v17+) from nuget:

`dotnet add package Umbraco.Community.PowerToys`

No configuration is required - a **Power Toys** dashboard appears under the Settings section on
first load. It starts out empty; tools are added by other packages (or later versions of this
one) registering a `powerToy` extension, at which point they show up on the dashboard
automatically with an enable/disable toggle.

## Contributing

Contributions to this package are most welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md).

## Acknowledgments

Built with the community `Umbraco.Community.Templates.PackageStarter` and Umbraco's own
`umbraco-extension` dotnet templates, and follows the repo/CI conventions used across Jumoo's
other Umbraco packages, such as [Xliff.Connector](https://github.com/Jumoo/Xliff.Connector).