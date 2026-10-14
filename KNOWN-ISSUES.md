# Known Issues

## Mobile — npm audit

**Status:** Acknowledged, no action required for MVP

11 moderate vulnerabilities reported by `npm audit` in `mobile/`:

- All are in `xcode` → `uuid`, a transitive dependency of `@expo/config-plugins`
- The `uuid` vuln requires the caller to provide a `Buffer` to v3/v5/v6
- Expo's config plugin doesn't do this
- This is a **build-time-only** dependency — never bundled into the app JS

**Risk:** Negligible. Cannot be exploited at runtime.

**Resolution:** Will be fixed when Expo upgrades their toolchain. `npm audit fix --force` would downgrade Expo to v46 and break the project — do NOT run it.

**Reviewed:** (add date)
