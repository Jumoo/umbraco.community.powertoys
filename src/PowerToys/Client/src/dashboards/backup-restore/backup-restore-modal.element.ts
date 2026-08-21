import { css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_CONFIRM_MODAL, umbOpenModal } from "@umbraco-cms/backoffice/modal";
import { UmbPowerToysBackupRepository } from "./backup-restore.repository.js";

// Downloads every power toy's enabled flag and settings as one JSON file, or restores them
// from a file produced by that download. Restoring overwrites whatever's currently saved, so
// it's confirmed before anything is sent.
@customElement("power-toys-backup-restore-modal")
export class BackupRestoreModalElement extends UmbModalBaseElement<object, undefined> {
  @state()
  private _fileName?: string;

  @state()
  private _pendingValues?: Record<string, string>;

  @state()
  private _busy = false;

  @state()
  private _error?: string;

  #repository = new UmbPowerToysBackupRepository(this);

  get #fileInput(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>("#file-input");
  }

  async #onDownload() {
    this._busy = true;
    this._error = undefined;
    try {
      const values = await this.#repository.getBackup();
      const blob = new Blob([JSON.stringify(values, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `powertoys-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this._error = "Could not download the backup - see the browser console for details.";
    } finally {
      this._busy = false;
    }
  }

  #onPickFile = () => this.#fileInput?.click();

  #onFileChange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    this._pendingValues = undefined;
    this._error = undefined;
    if (!file) {
      this._fileName = undefined;
      return;
    }

    this._fileName = file.name;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Not a backup file.");
      }
      this._pendingValues = parsed as Record<string, string>;
    } catch {
      this._error = "That file doesn't look like a Power Toys backup.";
    }
  };

  async #onRestore() {
    if (!this._pendingValues) return;

    const confirmed = await umbOpenModal(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Restore backup?",
        content: `This will overwrite the current enabled state and settings for every power toy with the contents of "${this._fileName}". This can't be undone.`,
        color: "danger",
        confirmLabel: "Restore",
      },
    })
      .then(() => true)
      .catch(() => false);
    if (!confirmed) return;

    this._busy = true;
    this._error = undefined;
    try {
      await this.#repository.restoreBackup(this._pendingValues);
      // Every power toy's enabled state / settings are cached in contexts across the backoffice -
      // a full reload is the simplest way to make sure everything reflects the restored values.
      window.location.reload();
    } catch {
      this._error = "Could not restore the backup - see the browser console for details.";
      this._busy = false;
    }
  }

  render() {
    return html`
      <umb-body-layout headline="Backup / Restore">
        <uui-box>
          <div slot="headline">Backup</div>
          <p>Download every power toy's enabled state and settings as a single JSON file.</p>
          <uui-button look="outline" label="Download backup" ?disabled=${this._busy} @click=${() => this.#onDownload()}>
            <uui-icon name="icon-download-alt"></uui-icon>
            Download backup
          </uui-button>
        </uui-box>

        <uui-box>
          <div slot="headline">Restore</div>
          <p>Restore power toy settings from a previously downloaded backup file. This overwrites current settings.</p>
          <input id="file-input" type="file" accept="application/json" hidden @change=${this.#onFileChange} />
          <div class="restore-row">
            <uui-button look="outline" label="Choose file" ?disabled=${this._busy} @click=${this.#onPickFile}>
              <uui-icon name="icon-page-up"></uui-icon>
              Choose file
            </uui-button>
            ${this._fileName ? html`<span class="file-name">${this._fileName}</span>` : ""}
          </div>
          <uui-button
            look="primary"
            color="danger"
            label="Restore backup"
            ?disabled=${this._busy || !this._pendingValues}
            @click=${() => this.#onRestore()}>
            Restore backup
          </uui-button>
        </uui-box>

        ${this._error ? html`<uui-box class="error"><p>${this._error}</p></uui-box>` : ""}

        <div slot="actions">
          <uui-button label="Close" @click=${() => this._submitModal()}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      uui-box {
        margin-bottom: var(--uui-size-space-4);
      }

      uui-box uui-button {
        width: 100%;
      }

      .restore-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-4);
      }

      .restore-row uui-button {
        width: auto;
        flex: 0 0 auto;
      }

      .file-name {
        color: var(--uui-color-text-alt);
      }

      .error p {
        color: var(--uui-color-danger);
        margin: 0;
      }
    `,
  ];
}

export default BackupRestoreModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-backup-restore-modal": BackupRestoreModalElement;
  }
}
