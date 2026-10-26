(() => {
  const host = window.location.hostname;
  const isGitHubPages = host.endsWith(".github.io");
  const isForcedPublic = new URLSearchParams(window.location.search).get("edition") === "public";
  if (!(isGitHubPages || isForcedPublic)) return;

  window.PUBLIC_EDITION = true;
  document.documentElement.dataset.edition = "public";

  const withheld = [];
  for (const [id, item] of Object.entries(window.WORK_MEDIA || {})) {
    if (item.status === "research-preview") {
      withheld.push(id);
      item.src = null;
      item.status = "rights-held";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".top-header");
    if (!header || document.querySelector(".public-edition-note")) return;
    const note = document.createElement("div");
    note.className = "public-edition-note";
    note.innerHTML = `
      <strong>PUBLIC EDITION / 公开研究版</strong>
      <span>${withheld.length} 张图像因权利状态仅保留于研究版；本页仍可检索全部案例、来源、反方与证据缺口。</span>
    `;
    header.insertAdjacentElement("afterend", note);
  });
})();
