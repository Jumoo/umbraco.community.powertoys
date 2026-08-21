import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

// Opened from the Power Toys dashboard's footer - lets a power user download every power
// toy's enabled flag and settings as one file, or restore them from a previously downloaded one.
export const BACKUP_RESTORE_MODAL = new UmbModalToken<object, undefined>("PowerToys.Modal.BackupRestore", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
