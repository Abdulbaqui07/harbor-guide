const DEFAULTS = {
  domain: "harbor-guide.vercel.app",
  label: "Harbor Terminal Portal",
  enabled: true,
};

const domainInput = document.getElementById("domain");
const enabledInput = document.getElementById("enabled");
const savedNote = document.getElementById("saved");

chrome.storage.sync.get(DEFAULTS, (v) => {
  domainInput.value = v.domain;
  enabledInput.checked = v.enabled;
});

document.getElementById("save").addEventListener("click", () => {
  const domain = domainInput.value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain) {
    savedNote.textContent = "Enter a domain.";
    savedNote.style.color = "#f59e0b";
    return;
  }
  chrome.storage.sync.set({ domain, enabled: enabledInput.checked }, () => {
    savedNote.textContent = "Saved. Reload the results page.";
    savedNote.style.color = "#0e9f6e";
    setTimeout(() => (savedNote.textContent = ""), 2600);
  });
});
