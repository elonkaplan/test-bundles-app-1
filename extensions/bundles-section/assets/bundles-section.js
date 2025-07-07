/* global Alpine */

document.addEventListener("alpine:init", () => {
  Alpine.data("bundles", () => ({
    bundles: [],
    init() {
      fetch("apps/api/bundles")
        .then((res) => res.json())
        .then((bundles) => (this.bundles = bundles))
        .catch(console.log);
    },
  }));
});
