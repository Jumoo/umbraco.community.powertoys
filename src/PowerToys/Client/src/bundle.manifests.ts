import { manifests as entrypoints } from "./entrypoints/manifest.js";
import { manifests as dashboards } from "./dashboards/manifest.js";
import { manifests as powerToy } from "./power-toy/manifest.js";
import { manifests as examplePowerToy } from "./power-toy/example/manifest.js";
import { manifests as navbarClockPowerToy } from "./power-toy/navbar-clock/manifest.js";
import { manifests as dashboardManagerPowerToy } from "./power-toy/dashboard-manager/manifest.js";

// Job of the bundle is to collate all the manifests from different parts of the extension and load other manifests.
// Registered in code via PowerToysPackageManifestReader.cs rather than a Client/public/umbraco-package.json.
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...dashboards,
  ...powerToy,
  ...examplePowerToy,
  ...navbarClockPowerToy,
  ...dashboardManagerPowerToy,
];
