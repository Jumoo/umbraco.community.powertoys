# Contributing Guidelines

Contributions to this package are most welcome!

There is a test site in the solution to make working with this repository easier.
It is configured to do an unattended install, check `appSettings.json` for the login details.

Don't forget `npm install` and `npm run build` in the `src/powertoys/client` context to see powertoys in the test site.

## Where a power toy lives

Each power toy has two halves, both named after the power toy (e.g. `LoginCustomizer`, `LogoChanger`):

- **Backend** - `src/PowerToys/PowerToy/<Name>/`
  A `<Name>Settings.cs` (read/written via `IPowerToyService`), and usually a
  `<Name>BootExtension.cs` with an `Add<Name>()` extension method that wires up whatever the
  power toy needs at startup (options `PostConfigure`, endpoints, etc.). Some power toys also
  have a `<Name>PublicController.cs` for anonymous-reachable endpoints (e.g. the login screen).
- **Client** - `src/PowerToys/Client/src/power-toy/<name>/`
  A `manifest.ts` declaring the power toy's dashboard card, plus whatever elements it needs
  (a `<name>-modal.element.ts` for its settings UI, a `<name>-settings.ts` for its TypeScript
  settings shape, etc).

`src/PowerToys/Client/src/power-toy/example/` is a worked example of the minimum shape (backend
settings aren't required - see [`power-toy/example/manifest.ts`](../src/PowerToys/Client/src/power-toy/example/manifest.ts))
kept in the codebase for reference. It's commented out in `bundle.manifests.ts` so it doesn't
show up as a real tool on the dashboard.

## How they get registered

### Client

Umbraco backoffice extensions are normally declared via a package's `umbraco-package.json`, but
this project registers everything in code instead, so the whole package - client manifests
included - is described in one place. The chain is:

1. Each power toy's `manifest.ts` exports an array of `UmbExtensionManifest` (or the
   `ManifestPowerToy` type from [`power-toy.extension.ts`](../src/PowerToys/Client/src/power-toy/power-toy.extension.ts)
   for a dashboard card).
2. [`bundle.manifests.ts`](../src/PowerToys/Client/src/bundle.manifests.ts) imports and
   concatenates every power toy's manifests (along with the entrypoint and dashboard manifests)
   into one `manifests` array. **A new power toy must be added here**, or it will never load.
3. This bundle is built into `power-toys.js`, and served from `/App_Plugins/PowerToys/`.
4. [`PowerToysPackageManifestReader.cs`](../src/PowerToys/PowerToysPackageManifestReader.cs)
   implements `IPackageManifestReader` and returns a `PackageManifest` whose only extension is a
   `bundle` pointing at that `power-toys.js` file - this is what actually tells Umbraco to load it.
   The same reader can add further manifests conditionally (e.g. Login Customizer's public
   `appEntryPoint`/`localization` extensions are only added when that power toy is enabled and
   configured).

A power toy's card on the dashboard is a `type: "powerToy"` manifest. If it declares its own
`element`, that's used for its card body; otherwise it falls back to the default box, which opens
`meta.modal.element` in a shared sidebar (see [`power-toy-modal.element.ts`](../src/PowerToys/Client/src/power-toy/power-toy-modal.element.ts)).
Other extensions (header apps, entry points, etc.) can gate themselves on a power toy being
enabled with the `PowerToys.Condition.PowerToyEnabled` condition - see
[`power-toy/manifest.ts`](../src/PowerToys/Client/src/power-toy/manifest.ts).

### Backend

There's no attribute or reflection-based discovery - each power toy is wired up explicitly in
[`PowerToysApiComposer.cs`](../src/PowerToys/Composers/PowerToysApiComposer.cs), which calls its
`Add<Name>()` extension method (e.g. `builder.AddLoginCustomizer()`) during `Compose`. **A new
power toy's boot extension must be called here** for its backend behaviour to run. Settings
(enabled flag + a JSON settings blob) are stored and retrieved through `IPowerToyService`, keyed
by the power toy's alias - see [`IPowerToyService.cs`](../src/PowerToys/Services/IPowerToyService.cs).

## Adding a new power toy

1. Copy the shape of an existing power toy of similar complexity (`example` for a minimal one,
   `login-customizer` for one with backend settings and boot-time behaviour).
2. Add the client manifest import/spread to `bundle.manifests.ts`.
3. If it needs backend settings or startup behaviour, add its `Add<Name>()` call to
   `PowerToysApiComposer.Compose`.
4. Give it a distinct dashboard `weight` relative to the other power toys (see the ordering
   comment in `power-toy/navbar-clock/manifest.ts`).
