## What does this change?

<!-- What does this PR do, and why? -->

## Notes for the reviewer

<!-- Anything that needs calling out: tricky bits, things you're unsure about, alternatives you considered. -->

## Checklist

- [ ] `dotnet build src/PowerToys.slnx` builds cleanly
- [ ] `npm run build` (in `src/PowerToys/Client`) builds cleanly
- [ ] `CHANGELOG.md` updated under **Unreleased**
- [ ] `packages.lock.json` regenerated (`dotnet restore --force-evaluate`) if a NuGet dependency changed
- [ ] Backoffice changes clicked through manually in a running test site
