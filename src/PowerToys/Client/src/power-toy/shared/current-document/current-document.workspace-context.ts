import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/document";
import { UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT } from "./current-document.context.js";

// Reports which document is open, so the Chat and Tasks sidebars can offer a "This page" list
// without the document needing a tab of its own. A new document has a key before it's saved,
// but the server has nothing to check access against yet, so it only counts once saved.
export class PowerToysCurrentDocumentWorkspaceContext extends UmbControllerBase implements UmbApi {
  #workspace?: typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE;
  #current?: typeof UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT.TYPE;
  #unique?: string;
  #isNew?: boolean;

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (context) => {
      this.#workspace = context;
      this.#observe();
    });

    this.consumeContext(UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT, (context) => {
      this.#current = context;
      this.#update();
    });
  }

  #observe() {
    const workspace = this.#workspace;
    if (!workspace) return;

    this.observe(
      workspace.unique,
      (unique) => {
        this.#unique = unique ?? undefined;
        this.#update();
      },
      "_unique"
    );
    this.observe(
      workspace.isNew,
      (isNew) => {
        this.#isNew = isNew;
        this.#update();
      },
      "_isNew"
    );
  }

  #reported?: string;

  #update() {
    if (!this.#current) return;

    const unique = this.#unique && this.#isNew === false ? this.#unique : undefined;
    if (unique === this.#reported) return;

    if (this.#reported) this.#current.clear(this.#reported);
    this.#reported = unique;
    if (unique) this.#current.set(unique);
  }

  override destroy() {
    if (this.#reported) this.#current?.clear(this.#reported);
    this.#reported = undefined;
    super.destroy();
  }
}

export { PowerToysCurrentDocumentWorkspaceContext as api };
