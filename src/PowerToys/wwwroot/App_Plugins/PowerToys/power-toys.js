const o = [
  {
    name: "Power Toys Entrypoint",
    alias: "PowerToys.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-CM2ZtNc2.js")
  }
], t = [
  {
    name: "Power Toys Dashboard",
    alias: "PowerToys.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element-XfgFokBH.js"),
    meta: {
      label: "Power Toys",
      pathname: "power-toys"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Settings"
      }
    ]
  }
], s = [
  ...o,
  ...t
];
export {
  s as manifests
};
//# sourceMappingURL=power-toys.js.map
