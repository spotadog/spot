# Prompt 011 — Browser toolbar icon

## Purpose

Create and package a recognizable Spot a Dog extension and toolbar icon.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Create and integrate an icon for the existing plugin/extension so that its icon is displayed correctly in the browser toolbar/bar after the plugin is installed.

## Repository Review

Before making changes:

1. Inspect the repository structure and all relevant project documentation.
2. Identify the plugin/extension type, browser-extension manifest version, build system, and existing asset conventions.
3. Inspect the current extension manifest and determine how icons are currently configured, if at all.
4. Follow all existing repository architecture, naming, formatting, and asset conventions.
5. Avoid unrelated changes or unnecessary restructuring.

## Icon

Create a clean, recognizable icon appropriate for the plugin's purpose and existing visual identity.

If the repository already contains a logo, brand mark, color palette, or other visual assets, use those as the basis for the browser icon rather than inventing an unrelated design.

The icon must remain recognizable at small browser-toolbar sizes and should avoid excessive detail, tiny text, or other elements that become illegible when scaled down.

Generate the icon assets in the sizes required by the plugin's supported browser(s) and manifest format. Include high-resolution variants where appropriate so the icon remains sharp on high-DPI displays.

Store the assets in the repository's existing icons/assets directory. If no appropriate directory exists, create one that fits the current project organization.

## Browser Integration

Update the plugin/extension configuration so the new icon actually appears in the browser toolbar.

Configure all relevant icon declarations required by the existing extension architecture, including the extension-level and toolbar/action icon configuration where applicable.

Do not change the manifest version or extension architecture merely to add the icon.

Ensure asset paths work both in development and in the final packaged/build output.

If the project has a build or packaging process, verify that the icon files are copied or bundled into the final extension package.

## Compatibility

Preserve all existing plugin functionality.

Support the browsers already targeted by the repository. Do not introduce additional browser dependencies solely for the icon.

Do not remove or replace existing branding assets unless necessary for this task.

## Testing and Verification

Verify that:

- The extension builds successfully.
- The manifest/configuration remains valid.
- All referenced icon files exist in the expected build output.
- Installing or loading the extension shows the icon in the browser toolbar/bar.
- The icon renders clearly at normal and high-DPI sizes.
- No missing-asset or manifest errors appear in the browser's extension diagnostics.
- Existing functionality and tests continue to work.

Run the repository's relevant formatting, linting, testing, type-checking, build, and validation commands where available.

## Documentation

Update relevant project documentation if the addition of the icon or its asset location needs to be documented.

Keep changes focused on creating and integrating the browser-bar icon.

## Acceptance Criteria

The task is complete when the plugin has an appropriate icon, all necessary icon assets are included in the repository and packaged output, the extension configuration references them correctly, and the icon visibly appears in the browser toolbar when the plugin is installed or loaded.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed the prompt workflow, README, requirements/features, build, UI palette, manifest, browser tests and previous publication instructions. This remains a Chrome 120+ Manifest V3 extension bundled by esbuild.
- Created an editable, simple cream paw on the existing #246447 green, with transparent rounded corners and no text. Added nine PNG sizes (16/20/24/32/40/48/64/128/256) under src/icons. No earlier branding assets existed or were removed.
- Configured extension-level icons and action.default_icon; the build copies committed PNGs to dist/icons. npm run icons regenerates PNGs from SVG using the existing development Playwright dependency; normal builds do not require Chromium. No runtime dependencies, permissions or architecture changes.
- Validation passed: npm run check (55 unit tests, build, real MV3 browser regression suite), syntax checks for both build/generation scripts and git diff --check. Separate browser checks verified source/build manifest equality, byte-identical packaged PNGs, expected dimensions, successful decoding of every declared asset, enabled installation and pinned toolbar state. Chrome reported no manifest/runtime errors or installation warnings. Inspected light/dark size previews at device scale factors 1 and 2 and the extension diagnostics screenshot.
- Limitation: native toolbar visual acceptance remains pending. Headed Chromium loaded and pinned the extension, but desktop screenshot capture failed with “could not create image from display”; page screenshots do not include browser chrome. README documents the final manual pin/appearance/click check. No separate formatter, linter or type checker is configured.
- GitHub flow follows prompt 002 and implementation-log: current main branch, no new branch, existing SSH identity. Fetched origin and confirmed no divergence before publication. GitHub CLI authentication remains invalid, so request/change/validation/issue/next-step notes are retained here and in the commit description as the documented fallback for standalone comments.
- Suggested next step: visually confirm the pinned paw in native Chrome at normal and high-DPI display scales and click it to open the editor.
