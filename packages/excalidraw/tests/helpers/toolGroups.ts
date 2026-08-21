/**
 * The adaptive toolbar renders most tools inside semantic group dropdowns
 * (and non-required units in the overflow menu), so the per-tool button only
 * exists in the DOM while its menu is open. Maps a tool to the testid of the
 * trigger that reveals it.
 *
 * Kept in its own module (not in queries/toolQueries.ts) because test-utils
 * spreads every export of that module into the custom queries object passed
 * to testing-library's render().
 */
export const TOOL_GROUP_TRIGGER: Record<string, string> = {
  hand: "toolbar-selection",
  selection: "toolbar-selection",
  lasso: "toolbar-selection",
  image: "toolbar-upload-group",
  video: "toolbar-upload-group",
  audio: "toolbar-upload-group",
  rectangle: "toolbar-shapes-group",
  diamond: "toolbar-shapes-group",
  ellipse: "toolbar-shapes-group",
  arrow: "toolbar-shapes-group",
  line: "toolbar-shapes-group",
  freedraw: "toolbar-freedraw",
  autoshape: "toolbar-freedraw",
};
