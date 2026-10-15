import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbApi } from "@umbraco-cms/backoffice/extension-api";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/document";
import { CHAT_CONTEXT } from "../global/chat.context.token.js";

// Tells the chat which document is open, so the header sidebar can offer a "This page" chat
// without the document needing a tab of its own. A new document has a key before it's saved,
// but the server has nothing to check access against yet, so it only counts once saved.
export class ChatCurrentDocumentWorkspaceContext extends UmbControllerBase implements UmbApi {
  #workspace?: typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE;
  #chat?: typeof CHAT_CONTEXT.TYPE;
  #unique?: string;
  #isNew?: boolean;

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (context) => {
      this.#workspace = context;
      this.#observe();
    });

    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#chat = context;
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
    if (!this.#chat) return;

    const unique = this.#unique && this.#isNew === false ? this.#unique : undefined;
    if (unique === this.#reported) return;

    if (this.#reported) this.#chat.clearCurrentDocument(this.#reported);
    this.#reported = unique;
    if (unique) this.#chat.setCurrentDocument(unique);
  }

  override destroy() {
    if (this.#reported) this.#chat?.clearCurrentDocument(this.#reported);
    this.#reported = undefined;
    super.destroy();
  }
}

export { ChatCurrentDocumentWorkspaceContext as api };
