import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbStringState } from "@umbraco-cms/backoffice/observable-api";

/**
 * The saved document open in a workspace right now, for the "This page" lists in the Chat
 * and Tasks sidebars, which open from the header and so can't reach the workspace themselves.
 * Set by the document workspace context, cleared when the workspace closes.
 */
export class PowerToysCurrentDocumentContext extends UmbContextBase {
  #unique = new UmbStringState(undefined);
  public readonly unique = this.#unique.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT);
  }

  set(unique: string) {
    this.#unique.setValue(unique);
  }

  /** Clears it only if it's still the one given, so an old workspace closing after a new one opened doesn't clear the new one. */
  clear(unique: string) {
    if (this.#unique.getValue() === unique) this.#unique.setValue(undefined);
  }
}

export const UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT = new UmbContextToken<PowerToysCurrentDocumentContext>(
  "PowerToys.Context.CurrentDocument"
);

export { PowerToysCurrentDocumentContext as api };
export default PowerToysCurrentDocumentContext;
