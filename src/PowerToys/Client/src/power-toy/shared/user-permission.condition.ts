import { UmbConditionBase } from "@umbraco-cms/backoffice/extension-registry";
import type {
  UmbConditionConfigBase,
  UmbConditionControllerArguments,
  UmbExtensionCondition,
} from "@umbraco-cms/backoffice/extension-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";

export interface UserPermissionConditionConfig extends UmbConditionConfigBase<"PowerToys.Condition.UserPermission"> {
  /** One of the power toys' own permissions the user's groups must grant, e.g. "PowerToys.Tasks.ManageReviews". */
  match: string;
}

// Shows an extension only to users whose groups grant one of the power toys' permissions. It
// hides what they can't use; the server checks the permission again on every action.
export class UserPermissionCondition extends UmbConditionBase<UserPermissionConditionConfig> implements UmbExtensionCondition {
  constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UserPermissionConditionConfig>) {
    super(host, args);

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.currentUser,
        (user) => (this.permitted = !!user?.fallbackPermissions.includes(this.config.match)),
        "_permitted"
      );
    });
  }
}

export default UserPermissionCondition;

declare global {
  interface UmbExtensionConditionConfigMap {
    UserPermissionConditionConfig: UserPermissionConditionConfig;
  }
}
