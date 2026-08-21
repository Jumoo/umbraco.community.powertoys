import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbExtensionElementInitializer } from "@umbraco-cms/backoffice/extension-api";
import type { ManifestPowerToy } from "../power-toy/power-toy.extension.js";
import "../power-toy/power-toy-card.element.js";
import "../power-toy/power-toy-default-body.element.js";
import { BACKUP_RESTORE_MODAL } from "./backup-restore/backup-restore-modal.token.js";

@customElement("power-toys-dashboard")
export class PowerToysDashboardElement extends UmbElementMixin(LitElement) {
  // UmbPowerToyContext is provided globally (see power-toy/manifest.ts's globalContext
  // entry) so it's reachable from anywhere - not just descendants of this dashboard.

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  #renderPowerToy = (ext: UmbExtensionElementInitializer) => html`
    <power-toys-card .manifest=${ext.manifest as ManifestPowerToy}
      >${ext.component}</power-toys-card
    >
  `;

  #onBackupRestore = () => {
    this.#modalManager?.open(this, BACKUP_RESTORE_MODAL, {});
  };

  render() {
    return html`
      <umb-body-layout>
        <uui-box id="intro">
          <div id="intro-content">
            <uui-icon name="icon-plugin"></uui-icon>
            <div>
              <p>
                Power Toys is a collection of small, focused admin tools for the
                Umbraco backoffice. Made with ❤ by the Umbraco community.
              </p>
              <div id="links">
                <a
                  href="https://github.com/jumoo/umbraco.community.powertoys/wiki"
                  target="_blank"
                  rel="noopener"
                >
                  Documentation
                </a>
                <a
                  href="https://github.com/jumoo/umbraco.community.powertoys"
                  target="_blank"
                  rel="noopener"
                >
                  GitHub repository
                </a>
                <a
                  href="https://github.com/jumoo/umbraco.community.powertoys/issues/new?template=bug.yml"
                  target="_blank"
                  rel="noopener"
                >
                  Report a bug
                </a>
                <a
                  href="https://github.com/jumoo/umbraco.community.powertoys/issues/new?template=feature_request.yml"
                  target="_blank"
                  rel="noopener"
                >
                  Request a feature
                </a>
              </div>
            </div>
          </div>
        </uui-box>

        <div id="power-toys">
          <umb-extension-slot
            type="powerToy"
            default-element="power-toys-default-body"
            .renderMethod=${this.#renderPowerToy}
          >
            <uui-box>
              <p>No Power Toys have been registered yet.</p>
            </uui-box>
          </umb-extension-slot>
        </div>

        <uui-button
          slot="actions"
          look="outline"
          label="Backup / Restore"
          @click=${this.#onBackupRestore}
        >
          <uui-icon name="icon-database"></uui-icon>
          Backup / Restore
        </uui-button>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
      }

      #intro {
        margin-bottom: var(--uui-size-layout-1);
      }

      #intro-content {
        display: flex;
        align-items: flex-start;
        gap: var(--uui-size-space-5);
      }

      #intro-content uui-icon {
        flex: 0 0 auto;
        font-size: 2.5em;
        color: var(--uui-color-interactive);
      }

      #intro-content p {
        margin-top: 0;
      }

      #links {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-5);
      }

      #power-toys {
        display: grid;
        gap: var(--uui-size-layout-1);
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }
    `,
  ];
}

export default PowerToysDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-dashboard": PowerToysDashboardElement;
  }
}
