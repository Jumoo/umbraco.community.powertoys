import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface EnvironmentAddEditModalValue {
  name: string;
  pattern: string;
  color: string;
}

// A small standalone sidebar for entering/editing one environment's name/pattern/colour -
// opened from the settings modal's "Add environment" button, or by clicking an existing row.
export const ENVIRONMENT_ADD_EDIT_MODAL = new UmbModalToken<object, EnvironmentAddEditModalValue>(
  "PowerToys.Modal.EnvironmentIndicator.AddEdit",
  {
    modal: {
      type: "sidebar",
      size: "small",
    },
  },
);
