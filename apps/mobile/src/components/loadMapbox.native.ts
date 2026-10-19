export function loadMapbox(): typeof import("@rnmapbox/maps").default {
  // Metro bundles this dependency without creating an async chunk.
  return require("@rnmapbox/maps").default;
}
