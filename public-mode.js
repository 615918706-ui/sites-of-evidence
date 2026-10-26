(() => {
  const host = window.location.hostname;
  const isGitHubPages = host.endsWith(".github.io");
  const isForcedPublic = new URLSearchParams(window.location.search).get("edition") === "public";
  if (!(isGitHubPages || isForcedPublic)) return;

  window.PUBLIC_EDITION = true;
  document.documentElement.dataset.edition = "public";

  const researchOnly = [];
  for (const [id, item] of Object.entries(window.WORK_MEDIA || {})) {
    if (item.status === "research-preview") {
      researchOnly.push(id);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".top-header");
    if (!header || document.querySelector(".public-edition-note")) return;
    const note = document.createElement("div");
    note.className = "public-edition-note";
    note.innerHTML = `
      <strong>STUDY EDITION / 学习研究版</strong>
      <span>${researchOnly.length} 张图像为未完成公开授权核查的研究预览。本页仅用于学习、评论与研究，版权归原作者及机构，禁止商业再使用。</span>
    `;
    header.insertAdjacentElement("afterend", note);
  });
})();
