import {
  CHAT_PERMISSION_ANNOUNCE,
  CHAT_PERMISSION_ENTITY_TYPE,
  CHAT_PERMISSION_MENTION_GROUPS,
  CHAT_PERMISSION_MESSAGE_GROUPS,
} from "./constants.js";

const permission = (verb: string, key: string, weight: number): UmbExtensionManifest => ({
  type: "entityUserPermission",
  alias: `${verb}.Permission`,
  name: `Chat ${key} Permission`,
  weight,
  forEntityTypes: [CHAT_PERMISSION_ENTITY_TYPE],
  meta: {
    verbs: [verb],
    label: `#powerToysChat_permission${key}`,
    description: `#powerToysChat_permission${key}Description`,
  },
});

// Shown in the user group editor next to Umbraco's own permissions, whether or not the power
// toy is on, so groups can be set up before it's turned on
export const manifests: Array<UmbExtensionManifest> = [
  permission(CHAT_PERMISSION_ANNOUNCE, "Announce", 600),
  permission(CHAT_PERMISSION_MESSAGE_GROUPS, "MessageGroups", 500),
  permission(CHAT_PERMISSION_MENTION_GROUPS, "MentionGroups", 400),
];
