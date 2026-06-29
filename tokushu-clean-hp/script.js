const SITE_DATA = {
  companyName: "○○株式会社",
  companyInfo: "〒000-0000 ○○県○○市○○町0-0-0 / 代表者名・許認可情報は公開前に差し替え",
  phone: "050-XXXX-XXXX",
  coverageLabel: "福岡県全域対応",
  caseCount: "3,000",
  totalCasesLabel: "累計3,000件以上",
  prefectureCount: "47",
  surveyNote: "自社調べ／2026年6月時点"
};

document.querySelectorAll("[data-bind]").forEach((node) => {
  const key = node.getAttribute("data-bind");
  if (Object.prototype.hasOwnProperty.call(SITE_DATA, key)) {
    node.textContent = SITE_DATA[key];
  }
});

document.querySelectorAll("[data-phone-link]").forEach((link) => {
  const digits = SITE_DATA.phone.replace(/\D/g, "");
  link.setAttribute("href", digits.length >= 10 ? `tel:${digits}` : "#phone");
});

const referenceImage = document.querySelector("[data-reference-image]");
const referenceImg = referenceImage?.querySelector("img");

if (referenceImg) {
  const showReferenceHero = () => {
    document.body.classList.add("has-reference-hero");
  };

  const hideReferenceHero = () => {
    referenceImage.hidden = true;
    document.body.classList.remove("has-reference-hero");
  };

  if (referenceImg.complete && referenceImg.naturalWidth > 0) {
    showReferenceHero();
  } else {
    referenceImg.addEventListener("load", showReferenceHero, { once: true });
  }

  referenceImg.addEventListener("error", hideReferenceHero, { once: true });
}

const menuButton = document.querySelector(".menu-button");

if (menuButton) {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
  });
}
