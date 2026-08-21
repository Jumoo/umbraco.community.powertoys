# uPowertoys

## Reference repos

- Umbraco CMS source: `D:\Source\Umbraco\v17\Umbraco-CMS-v17` — a local clone of the Umbraco-CMS repo, used to check exact backoffice extension API shapes, authorization policy names/values, and condition/context implementation patterns before relying on them (e.g. confirming `AuthorizationPolicies.SectionAccessSettings`, `UmbConditionBase`, `createExtensionElement`, global-context wiring).

## Testing backoffice/browser features

- Don't attempt to browser-test backoffice/dashboard features as part of a fix — hand verification back to the user instead. Claude can eventually navigate to Umbraco dashboards, but it's slow and unreliable; it's much quicker for the user to just look and check themselves.
