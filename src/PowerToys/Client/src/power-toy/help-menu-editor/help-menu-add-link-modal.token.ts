import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface HelpMenuAddLinkModalValue {
  name: string;
  href: string;
  icon: string;
}

// A small standalone modal (no data of its own to pass in) for entering a new help menu
// link's name/URL/icon - opened from the settings modal's "Add link" button.
export const HELP_MENU_ADD_LINK_MODAL = new UmbModalToken<object, HelpMenuAddLinkModalValue>(
  "PowerToys.Modal.HelpMenuEditor.AddLink",
  {
    modal: {
      type: "sidebar",
      size: "small",
    },
  },
);
