import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN } from "@umbraco-cms/backoffice/document";
import { ReviewsService, type DueReview } from "../../../api/index.js";

const PAGE_SIZE = 20;

/**
 * Pages due for review that you're responsible for (you edited them last), soonest first.
 * Opening one goes to the page; the panel stays open beside it.
 */
@customElement("power-toys-due-reviews")
export class DueReviewsElement extends UmbLitElement {
  @state()
  private _items: DueReview[] = [];

  @state()
  private _total = 0;

  @state()
  private _loading = true;

  override connectedCallback() {
    super.connectedCallback();
    this.reload();
  }

  /** How many pages are due, for the box headline around the list. */
  get total() {
    return this._total;
  }

  async reload() {
    try {
      const { data } = await ReviewsService.getDueReviews({ query: { skip: 0, take: PAGE_SIZE } });
      this._items = data?.items ?? [];
      this._total = data?.total ?? 0;
    } finally {
      this._loading = false;
      this.dispatchEvent(new Event("change"));
    }
  }

  #open(review: DueReview) {
    window.history.pushState({}, "", UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN.generateAbsolute({ unique: review.documentKey }));
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    if (this._items.length === 0) {
      return html`<p class="empty"><umb-icon name="icon-check"></umb-icon> ${this.localize.term("powerToysTasks_noReviewsDue")}</p>`;
    }

    return html`
      <uui-ref-list>
        ${this._items.map(
          (review) => html`<uui-ref-node
            name=${review.documentName ?? ""}
            detail=${this.localize.term("powerToysTasks_reviewDueSince", this.localize.date(review.nextReview, { dateStyle: "medium" }))}
            @open=${() => this.#open(review)}
          >
            <umb-icon slot="icon" name="icon-document"></umb-icon>
            <uui-tag slot="tag" color="danger"
              ><span class="tag-content"><umb-icon name="icon-alert"></umb-icon> ${this.localize.term("powerToysTasks_overdue")}</span></uui-tag
            >
          </uui-ref-node>`
        )}
      </uui-ref-list>
      ${this._total > this._items.length
        ? html`<p class="more">${this.localize.term("powerToysTasks_moreAssigned", this._total - this._items.length)}</p>`
        : nothing}
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .tag-content {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      white-space: nowrap;
    }

    .empty,
    .more {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .more {
      margin-top: var(--uui-size-space-3);
    }

    .empty umb-icon {
      color: var(--uui-color-positive-standalone);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-due-reviews": DueReviewsElement;
  }
}
