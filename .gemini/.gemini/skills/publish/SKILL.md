---
name: publish
description: Type-check, test, build, and publish the sigmashake Node SDK to npm.
argument-hint: "[patch|minor|major] [--dry-run] [--skip-tests] [--tag <tag>]"
allowed-tools: Bash(npx tsc *), Bash(npx vitest *), Bash(npm *), Bash(node *), Bash(git *), Bash(cat *), Bash(ls *), Bash(test *), Read
---

# Publish sigmashake Node SDK to npm

Runs the full quality pipeline, bumps the version, builds, and publishes to npm.

## Input

`$ARGUMENTS` — optional flags:
- **Version bump**: `patch` (default), `minor`, or `major`
- `--dry-run` — run all steps but use `npm publish --dry-run` at the end
- `--skip-tests` — skip the test step (NOT recommended for real publishes)
- `--tag <tag>` — publish under an npm dist-tag (e.g. `--tag beta`). Defaults to `latest`

## Steps

### 1. Pre-flight Checks

1. Verify working tree is clean: `git status --porcelain` must be empty (untracked `.gemini/` files are OK). If dirty, stop and ask the user to commit or stash first.
2. Verify on `main` branch: `git branch --show-current`. Warn (but don't block) if not on main.
3. Verify npm auth: `npm whoami`. If it fails, stop and tell the user to run `npm login` first.
4. Read current version from `package.json`.

### 2. Quality Gate (unless `--skip-tests`)

Run these sequentially — stop on first failure:

```bash
npx tsc --noEmit                    # Type-check
npx vitest run                      # Run all tests
```

If either fails, stop. Do NOT publish broken code.

### 3. Version Bump

Determine bump type from `$ARGUMENTS` (default: `patch`):

```bash
npm version <patch|minor|major> --no-git-tag-version
```

Read the new version from `package.json` and confirm with the user before proceeding.

### 4. Build

```bash
npm run build
```

Verify build output exists:

```bash
test -f dist/index.js && test -f dist/index.d.ts
```

If missing, stop and report.

### 5. Publish

Construct the publish command:

```bash
npm publish --access public [--dry-run] [--tag <tag>]
```

- Add `--dry-run` if `$ARGUMENTS` contains `--dry-run`
- Add `--tag <tag>` if `$ARGUMENTS` contains `--tag <value>`

### 6. Post-Publish (skip if `--dry-run`)

1. Commit the version bump:
   ```bash
   git add package.json package-lock.json
   git commit -m "release: v<new-version>"
   ```
2. Tag the release:
   ```bash
   git tag v<new-version>
   ```
3. Push commit and tag:
   ```bash
   git push origin main --follow-tags
   ```

### 7. Report

Print a summary:

```
Published: sigmashake@<version>
Registry:  https://www.npmjs.com/package/sigmashake
Tag:       <tag>
Commit:    <short-sha>
```

If `--dry-run`, print: `Dry run complete — nothing was published.`

## Rules

- Never publish if type-check or tests fail
- Never publish from a dirty working tree (except `.gemini/` files)
- Always confirm the new version with the user before publishing
- The `prepublishOnly` script in package.json runs `npm run build` automatically, but we build explicitly in step 4 so we can verify output
- If `npm publish` fails (e.g. version already exists), report the error clearly — do NOT retry with a different version automatically
