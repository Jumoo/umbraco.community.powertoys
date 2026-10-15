import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { SHORTCUTS_CONTEXT } from "../shortcuts.context.js";
import type { ShortcutEntry } from "../constants.js";

// The bits of Umbraco's UmbShortcut this reads. Workspace contexts keep their shortcuts on
// `view.shortcuts`, which isn't on the UmbWorkspaceContext type, so it's read defensively.
interface RegisteredShortcut {
  key: string;
  modifier: boolean;
  shift: boolean;
  alt: boolean;
  label?: string;
}

type WithView = { view?: { shortcuts?: { all?: Observable<RegisteredShortcut[]> } } };

// Runs in every workspace and reports the shortcuts it registers, so the Keyboard Shortcuts
// panel (which opens from the header) can list them
export class ShortcutsReporterWorkspaceContext extends UmbControllerBase implements UmbApi {
  #id = Symbol();
  #shortcuts?: typeof SHORTCUTS_CONTEXT.TYPE;
  #reported: ShortcutEntry[] = [];

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(SHORTCUTS_CONTEXT, (context) => {
      this.#shortcuts = context;
      this.#report();
    });

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (workspace) => {
      const all = (workspace as unknown as WithView | undefined)?.view?.shortcuts?.all;
      if (!all) return;
      this.observe(
        all,
        (list) => {
          // Only the ones that say what they do; an unlabelled shortcut can't be explained
          this.#reported = list
            .filter((s) => !!s.label)
            .map((s) => ({ key: s.key, modifier: s.modifier, shift: s.shift, alt: s.alt, label: s.label! }));
          this.#report();
        },
        "_shortcuts"
      );
    });
  }

  #report() {
    this.#shortcuts?.set(this.#id, this.#reported);
  }

  override destroy() {
    this.#shortcuts?.remove(this.#id);
    super.destroy();
  }
}

export { ShortcutsReporterWorkspaceContext as api };
