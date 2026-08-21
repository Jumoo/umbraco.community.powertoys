// A handful of ready-made colour themes shipped alongside Theme Maker, based on the Material
// Design colour palette (materialui.co/colors), lightly skinning the default light theme rather
// than a full redesign. Registered like any traditional theme extension - a static CSS file, no
// dynamic css() loader - so they behave exactly like Umbraco's own Light/Dark/High-contrast
// themes and show up in Theme Maker's "Installed Themes" list where they can be toggled off.
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "theme",
    alias: "PowerToys.Theme.Red",
    name: "Red",
    css: "/App_Plugins/PowerToys/css/red.theme.css",
    weight: 50,
  },
  {
    type: "theme",
    alias: "PowerToys.Theme.Green",
    name: "Green",
    css: "/App_Plugins/PowerToys/css/green.theme.css",
    weight: 50,
  },
  {
    type: "theme",
    alias: "PowerToys.Theme.Blue",
    name: "Blue",
    css: "/App_Plugins/PowerToys/css/blue.theme.css",
    weight: 50,
  },
  {
    type: "theme",
    alias: "PowerToys.Theme.Orange",
    name: "Orange",
    css: "/App_Plugins/PowerToys/css/orange.theme.css",
    weight: 50,
  },
];
