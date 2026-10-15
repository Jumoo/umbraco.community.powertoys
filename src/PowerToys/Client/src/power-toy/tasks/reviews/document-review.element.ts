import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import type { PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { ReviewsService, type ReviewState } from "../../../api/index.js";

const DateOptions: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

/**
 * A document's review: when it's next due and where that date came from, setting the date by
 * hand, marking it reviewed, and the reviews so far. Dispatches `change` after a change, so a
 * list of due reviews beside it can refresh.
 */
@customElement("power-toys-document-review")
export class DocumentReviewElement extends UmbLitElement {
  @property({ attribute: false })
  documentKey?: string;

  @state()
  private _state?: ReviewState;

  @state()
  private _loading = true;

  @state()
  private _date = "";

  @state()
  private _note = "";

  @state()
  private _busy = false;

  override willUpdate(changed: PropertyValues) {
    if (changed.has("documentKey")) this.#load();
  }

  async #load() {
    const documentKey = this.documentKey;
    if (!documentKey) return;
    this._loading = true;
    try {
      const { data } = await ReviewsService.getReview({ path: { documentKey } });
      if (documentKey !== this.documentKey) return;
      this._state = data;
      this._date = data?.nextReview ? data.nextReview.substring(0, 10) : "";
    } catch {
      // No access, or a document the server doesn't have yet
      this._state = undefined;
    } finally {
      this._loading = false;
    }
  }

  async #run(action: () => Promise<{ error?: unknown }>) {
    this._busy = true;
    try {
      const { error } = await action();
      if (error) throw error;
      await this.#load();
      this.dispatchEvent(new Event("change"));
    } catch (error) {
      console.error("Tasks: review change failed", error);
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("danger", { data: { message: this.localize.term("powerToysTasks_reviewFailed") } });
    } finally {
      this._busy = false;
    }
  }

  #setDate(date: string | null) {
    const documentKey = this.documentKey;
    if (!documentKey) return;
    this.#run(() =>
      ReviewsService.setReviewDate({
        path: { documentKey },
        body: { date: date ? new Date(`${date}T00:00:00Z`).toISOString() : null },
      })
    );
  }

  #markReviewed() {
    const documentKey = this.documentKey;
    if (!documentKey) return;
    const note = this._note;
    this.#run(async () => {
      const result = await ReviewsService.markReviewed({ path: { documentKey }, body: { note: note || null } });
      if (!result.error) this._note = "";
      return result;
    });
  }

  #renderSource(state: ReviewState) {
    if (state.setManually) return this.localize.term("powerToysTasks_reviewSetManually");
    if (state.rule) {
      return this.localize.term(
        state.rule.fromPublish ? "powerToysTasks_reviewRuleFromPublish" : "powerToysTasks_reviewRuleFromReview",
        state.rule.intervalMonths
      );
    }
    return nothing;
  }

  // The headline fact: when it's due, as a tag that turns red with an alert icon once overdue
  #renderNext(state: ReviewState) {
    if (!state.nextReview) {
      return html`<uui-tag look="secondary"
        ><span class="tag-content"><umb-icon name="icon-calendar"></umb-icon> ${this.localize.term("powerToysTasks_reviewNone")}</span></uui-tag
      >`;
    }

    const overdue = new Date(state.nextReview) <= new Date();
    const date = this.localize.date(state.nextReview, DateOptions);
    return overdue
      ? html`<uui-tag look="primary" color="danger"
          ><span class="tag-content"><umb-icon name="icon-alert"></umb-icon> ${this.localize.term("powerToysTasks_reviewOverdue", date)}</span></uui-tag
        >`
      : html`<uui-tag look="secondary"
          ><span class="tag-content"><umb-icon name="icon-calendar"></umb-icon> ${this.localize.term("powerToysTasks_reviewBy", date)}</span></uui-tag
        >`;
  }

  #renderBody(state: ReviewState) {
    return html`
      <section class="status">
        ${this.#renderNext(state)}
        <p class="hint">${this.#renderSource(state)}</p>
      </section>

      <section>
        <h5>${this.localize.term("powerToysTasks_reviewDate")}</h5>
        <uui-input
          type="date"
          label=${this.localize.term("powerToysTasks_reviewDate")}
          .value=${this._date}
          @change=${(e: Event) => (this._date = (e.target as HTMLInputElement).value)}
        ></uui-input>
        <div class="buttons">
          ${state.setManually
            ? html`<uui-button
                look="secondary"
                label=${this.localize.term("powerToysTasks_reviewUseRule")}
                ?disabled=${this._busy}
                @click=${() => this.#setDate(null)}
              ></uui-button>`
            : nothing}
          <uui-button
            look="secondary"
            label=${this.localize.term("powerToysTasks_reviewSetDate")}
            ?disabled=${!this._date || this._busy}
            @click=${() => this.#setDate(this._date)}
          ></uui-button>
        </div>
      </section>

      <section>
        <h5>${this.localize.term("powerToysTasks_markReviewed")}</h5>
        <uui-textarea
          label=${this.localize.term("powerToysTasks_reviewNote")}
          placeholder=${this.localize.term("powerToysTasks_reviewNote")}
          maxlength="1000"
          .value=${this._note}
          @input=${(e: Event) => (this._note = (e.target as HTMLTextAreaElement).value)}
        ></uui-textarea>
        <div class="buttons">
          <uui-button
            look="primary"
            color="positive"
            label=${this.localize.term("powerToysTasks_markReviewed")}
            .state=${this._busy ? "waiting" : undefined}
            @click=${this.#markReviewed}
          ></uui-button>
        </div>
      </section>

      ${state.history.length
        ? html`<section>
            <h5>${this.localize.term("powerToysTasks_reviewHistory")}</h5>
            <ul>
              ${state.history.map(
                (h) => html`<li>
                  <umb-icon name="icon-check"></umb-icon>
                  <div>
                    <span class="who">${h.reviewedByName}</span>
                    <span class="when">${this.localize.date(h.date, DateOptions)}</span>
                    ${h.note ? html`<p class="note">${h.note}</p>` : nothing}
                  </div>
                </li>`
              )}
            </ul>
          </section>`
        : nothing}
    `;
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;
    if (!this._state) return html`<p class="hint">${this.localize.term("powerToysTasks_reviewUnavailable")}</p>`;
    return this.#renderBody(this._state);
  }

  static override styles = css`
    :host {
      display: block;
    }

    /* Icon and text side by side inside a tag */
    .tag-content {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      white-space: nowrap;
    }

    section + section {
      margin-top: var(--uui-size-space-5);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-divider);
    }

    h5 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: var(--uui-type-small-size);
      font-weight: 700;
      color: var(--uui-color-text-alt);
    }

    .hint {
      margin: var(--uui-size-space-2) 0 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    uui-input,
    uui-textarea {
      width: 100%;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
    }

    li umb-icon {
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-positive-standalone);
    }

    .who {
      font-weight: 700;
    }

    .when {
      margin-left: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .note {
      margin: var(--uui-size-space-1) 0 0;
      white-space: pre-wrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-document-review": DocumentReviewElement;
  }
}
