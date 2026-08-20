import { LitElement as d, html as u, css as i, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var b = Object.getOwnPropertyDescriptor, y = (r, s, n, a) => {
  for (var e = a > 1 ? void 0 : a ? b(s, n) : s, t = r.length - 1, l; t >= 0; t--)
    (l = r[t]) && (e = l(e) || e);
  return e;
};
let o = class extends p(d) {
  render() {
    return u`
      <uui-box headline="Power Toys">
        <p>No tools have been added yet.</p>
      </uui-box>
    `;
  }
};
o.styles = [
  i`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }
    `
];
o = y([
  m("power-toys-dashboard")
], o);
const v = o;
export {
  o as PowerToysDashboardElement,
  v as default
};
//# sourceMappingURL=dashboard.element-XfgFokBH.js.map
