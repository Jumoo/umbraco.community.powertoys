import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbExtensionApiInitializer, type UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_ENTITY_CONTEXT } from "@umbraco-cms/backoffice/entity";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { SHORTCUTS_CONTEXT } from "../shortcuts.context.js";
import type { ShortcutEntry } from "../constants.js";
import { isGlobal, type CustomShortcut } from "../settings/shortcuts-settings.js";

// The bits of Umbraco's UmbShortcut and its controller this uses. Workspace contexts keep their
// shortcuts on `view.shortcuts`, which isn't on the UmbWorkspaceContext type, so it's read defensively.
interface RegisteredShortcut {
  unique?: string | symbol;
  key: string;
  modifier: boolean;
  shift: boolean;
  alt: boolean;
  label?: string;
}

interface ShortcutController {
  all?: Observable<RegisteredShortcut[]>;
  addOne?(shortcut: RegisteredShortcut & { action: () => void }): void;
  removeOne?(unique: string | symbol): void;
}

type WithView = { view?: { shortcuts?: ShortcutController } };

type Executable = UmbApi & { execute?: () => Promise<void> };

const UNIQUE_PREFIX = "PowerToys.Shortcut.";

/**
 * Runs in every workspace. It reports the shortcuts the workspace registers, so the Keyboard
 * Shortcuts panel (which opens from the header) can list them. It also adds the custom
 * workspace-action and entity-action shortcuts to the workspace's own shortcut list, only where
 * the action applies, so Umbraco handles the key itself.
 */
export class ShortcutsReporterWorkspaceContext extends UmbControllerBase implements UmbApi {
  #id = Symbol();
  #shortcuts?: typeof SHORTCUTS_CONTEXT.TYPE;
  #controller?: ShortcutController;
  #reported: ShortcutEntry[] = [];

  #custom: CustomShortcut[] = [];
  #entityType?: string;
  #unique?: string | null;

  // One initializer per custom shortcut added here, so its action is loaded (and its
  // conditions checked) the normal way
  #initializers = new Map<string, UmbExtensionApiInitializer<never>>();

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(SHORTCUTS_CONTEXT, (context) => {
      this.#shortcuts = context;
      this.#report();
      if (!context) return;
      this.observe(
        context.custom,
        (custom) => {
          this.#custom = custom.filter((s) => !isGlobal(s.action));
          this.#addCustom();
        },
        "_custom"
      );
    });

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (workspace) => {
      this.#controller = (workspace as unknown as WithView | undefined)?.view?.shortcuts;
      const all = this.#controller?.all;
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
      this.#addCustom();
    });

    // Entity actions run against the open item, so they follow it (a new item gets its key on save)
    this.consumeContext(UMB_ENTITY_CONTEXT, (entity) => {
      if (!entity) return;
      this.observe(
        observeMultiple([entity.entityType, entity.unique]),
        ([entityType, unique]) => {
          this.#entityType = entityType ?? undefined;
          this.#unique = unique;
          this.#addCustom();
        },
        "_entity"
      );
    });
  }

  #report() {
    this.#shortcuts?.set(this.#id, this.#reported);
  }

  #addCustom() {
    this.#removeCustom();
    if (!this.#controller?.addOne) return;

    for (const shortcut of this.#custom) {
      const manifest = umbExtensionsRegistry.getByAlias(shortcut.action.target ?? "") as
        | { meta?: { label?: string }; forEntityTypes?: string[] }
        | undefined;
      if (!manifest) continue;

      let args: Array<unknown>;
      if (shortcut.action.type === "entityAction") {
        // Only on items the action is for, and only once the item exists
        if (!this.#entityType || !this.#unique || !manifest.forEntityTypes?.includes(this.#entityType)) continue;
        args = [{ entityType: this.#entityType, unique: this.#unique, meta: manifest.meta }];
      } else {
        args = [{ meta: manifest.meta }];
      }

      const unique = UNIQUE_PREFIX + shortcut.id;
      const initializer = new UmbExtensionApiInitializer<never>(
        this,
        umbExtensionsRegistry,
        shortcut.action.target!,
        args,
        (permitted, controller) => {
          if (!permitted || !controller.api) {
            this.#controller?.removeOne?.(unique);
            return;
          }
          const api = controller.api as Executable;
          this.#controller?.addOne?.({
            unique,
            key: shortcut.key,
            modifier: !!shortcut.modifier,
            shift: !!shortcut.shift,
            alt: !!shortcut.alt,
            label: shortcut.label || manifest.meta?.label || shortcut.action.target,
            action: () => api.execute?.(),
          });
        }
      );
      this.#initializers.set(unique, initializer);
    }
  }

  #removeCustom() {
    for (const [unique, initializer] of this.#initializers) {
      this.#controller?.removeOne?.(unique);
      initializer.destroy();
    }
    this.#initializers.clear();
  }

  override destroy() {
    this.#removeCustom();
    this.#shortcuts?.remove(this.#id);
    super.destroy();
  }
}

export { ShortcutsReporterWorkspaceContext as api };
