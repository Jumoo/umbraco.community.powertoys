import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { ReviewsService, type ReviewRule } from "../../../api/index.js";

interface RuleDraft {
  id?: string;
  contentTypeKey: string;
  intervalMonths: number;
  fromPublish: boolean;
}

const emptyDraft = (): RuleDraft => ({ contentTypeKey: "", intervalMonths: 6, fromPublish: false });

// Rules that give content its review dates: one per content type, "every N months from the
// last review" or "from the last publish". In the Settings section while content reviews are
// on, for users allowed to manage them.
@customElement("power-toys-review-rules-dashboard")
export class ReviewRulesDashboardElement extends UmbLitElement {
  @state()
  private _rules: ReviewRule[] = [];

  @state()
  private _loading = true;

  @state()
  private _draft?: RuleDraft;

  @state()
  private _busy = false;

  override connectedCallback() {
    super.connectedCallback();
    this.#load();
  }

  async #load() {
    try {
      const { data } = await ReviewsService.getReviewRules();
      this._rules = data ?? [];
    } finally {
      this._loading = false;
    }
  }

  // A content type can only have one rule, so adding a second (or moving a rule onto a type
  // that has one) is caught before saving
  #clashes(draft: RuleDraft) {
    return this._rules.some((r) => r.contentTypeKey === draft.contentTypeKey && r.id !== draft.id);
  }

  async #save() {
    const draft = this._draft;
    if (!draft?.contentTypeKey || draft.intervalMonths < 1 || this.#clashes(draft)) return;

    const body = {
      contentTypeKey: draft.contentTypeKey,
      intervalMonths: draft.intervalMonths,
      fromPublish: draft.fromPublish,
    };

    this._busy = true;
    const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
    try {
      const { error } = draft.id
        ? await ReviewsService.updateReviewRule({ path: { id: draft.id }, body })
        : await ReviewsService.createReviewRule({ body });
      if (error) throw error;
      this._draft = undefined;
      await this.#load();
      notifications?.peek("positive", { data: { message: this.localize.term("powerToysTasks_ruleSaved") } });
    } catch (error) {
      console.error("Tasks: could not save the rule", error);
      // The list may be out of date (someone else added a rule), so show what's there now
      await this.#load();
      notifications?.peek("danger", {
        data: {
          message: this.localize.term(this.#clashes(draft) ? "powerToysTasks_ruleExists" : "powerToysTasks_ruleFailed"),
        },
      });
    } finally {
      this._busy = false;
    }
  }

  async #delete(rule: ReviewRule) {
    await ReviewsService.deleteReviewRule({ path: { id: rule.id } });
    await this.#load();
  }

  #renderEditor() {
    const draft = this._draft;
    if (!draft) return nothing;

    return html`
      <uui-box headline=${this.localize.term(draft.id ? "powerToysTasks_editRule" : "powerToysTasks_addRule")}>
        <umb-property-layout label=${this.localize.term("powerToysTasks_ruleContentType")} orientation="vertical">
          <umb-input-document-type
            slot="editor"
            document-types-only
            .max=${1}
            .selection=${draft.contentTypeKey ? [draft.contentTypeKey] : []}
            @change=${(e: Event) =>
              (this._draft = { ...draft, contentTypeKey: (e.target as unknown as { selection: string[] }).selection[0] ?? "" })}
          ></umb-input-document-type>
        </umb-property-layout>
        <umb-property-layout label=${this.localize.term("powerToysTasks_ruleInterval")} orientation="vertical">
          <uui-input
            slot="editor"
            type="number"
            min="1"
            max="120"
            label=${this.localize.term("powerToysTasks_ruleInterval")}
            .value=${String(draft.intervalMonths)}
            @input=${(e: Event) => (this._draft = { ...draft, intervalMonths: Number((e.target as HTMLInputElement).value) })}
          ></uui-input>
        </umb-property-layout>
        <umb-property-layout label=${this.localize.term("powerToysTasks_ruleCountFrom")} orientation="vertical">
          <uui-radio-group
            slot="editor"
            .value=${draft.fromPublish ? "publish" : "review"}
            @change=${(e: Event) => (this._draft = { ...draft, fromPublish: (e.target as HTMLInputElement).value === "publish" })}
          >
            <uui-radio value="review" label=${this.localize.term("powerToysTasks_ruleFromReview")}></uui-radio>
            <uui-radio value="publish" label=${this.localize.term("powerToysTasks_ruleFromPublish")}></uui-radio>
          </uui-radio-group>
        </umb-property-layout>
        ${this.#clashes(draft)
          ? html`<p class="error"><uui-icon name="icon-alert"></uui-icon> ${this.localize.term("powerToysTasks_ruleExists")}</p>`
          : html`<p class="hint">${this.localize.term("powerToysTasks_ruleHint")}</p>`}
        <div class="buttons">
          <uui-button label=${this.localize.term("powerToysTasks_cancel")} @click=${() => (this._draft = undefined)}></uui-button>
          <uui-button
            look="primary"
            label=${this.localize.term("powerToysTasks_save")}
            ?disabled=${!draft.contentTypeKey || draft.intervalMonths < 1 || this.#clashes(draft)}
            .state=${this._busy ? "waiting" : undefined}
            @click=${this.#save}
          ></uui-button>
        </div>
      </uui-box>
    `;
  }

  #renderRules() {
    if (this._loading) return html`<uui-loader></uui-loader>`;
    if (this._rules.length === 0) return html`<p class="hint">${this.localize.term("powerToysTasks_noRules")}</p>`;

    return html`<uui-table>
      <uui-table-head>
        <uui-table-head-cell>${this.localize.term("powerToysTasks_ruleContentType")}</uui-table-head-cell>
        <uui-table-head-cell>${this.localize.term("powerToysTasks_ruleEvery")}</uui-table-head-cell>
        <uui-table-head-cell></uui-table-head-cell>
      </uui-table-head>
      ${this._rules.map(
        (rule) => html`<uui-table-row>
          <uui-table-cell>${rule.contentTypeName ?? rule.contentTypeKey}</uui-table-cell>
          <uui-table-cell>
            ${this.localize.term(
              rule.fromPublish ? "powerToysTasks_reviewRuleFromPublish" : "powerToysTasks_reviewRuleFromReview",
              rule.intervalMonths
            )}
          </uui-table-cell>
          <uui-table-cell class="actions">
            <uui-button
              label=${this.localize.term("powerToysTasks_editRule")}
              @click=${() =>
                (this._draft = {
                  id: rule.id,
                  contentTypeKey: rule.contentTypeKey,
                  intervalMonths: rule.intervalMonths,
                  fromPublish: rule.fromPublish,
                })}
            ></uui-button>
            <uui-button color="danger" label=${this.localize.term("powerToysTasks_delete")} @click=${() => this.#delete(rule)}></uui-button>
          </uui-table-cell>
        </uui-table-row>`
      )}
    </uui-table>`;
  }

  override render() {
    return html`
      <uui-box headline=${this.localize.term("powerToysTasks_reviewRules")}>
        <uui-button
          slot="header-actions"
          look="secondary"
          label=${this.localize.term("powerToysTasks_addRule")}
          @click=${() => (this._draft = emptyDraft())}
        >
          <uui-icon name="icon-add"></uui-icon> ${this.localize.term("powerToysTasks_addRule")}
        </uui-button>
        ${this.#renderRules()}
      </uui-box>
      ${this.#renderEditor()}
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    .hint {
      color: var(--uui-color-text-alt);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-danger-standalone);
    }

    .actions {
      text-align: right;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }
  `;
}

export default ReviewRulesDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-review-rules-dashboard": ReviewRulesDashboardElement;
  }
}
