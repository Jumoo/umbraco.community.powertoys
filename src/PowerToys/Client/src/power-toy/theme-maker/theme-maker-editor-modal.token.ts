import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ThemeMakerEditorModalData {
  /** Present when editing an existing custom theme; omitted when adding a new one. */
  name?: string;
  colors?: Record<string, string>;
}

export interface ThemeMakerEditorModalValue {
  name: string;
  colors: Record<string, string>;
}

// The colour-editing sidebar opened from the settings modal's "Add theme" button, or from an
// existing custom theme's "Edit" button - same element and token serve both, distinguished only
// by whether modal data carries an existing name/colors to prefill.
export const THEME_MAKER_EDITOR_MODAL = new UmbModalToken<ThemeMakerEditorModalData, ThemeMakerEditorModalValue>(
  "PowerToys.Modal.ThemeMaker.Editor",
  {
    modal: {
      type: "sidebar",
      size: "small",
    },
  },
);
