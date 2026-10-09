const SITE_DATA = {
  companyName: "結　清掃",
  companyInfo: "〒839-0851 福岡県久留米市御井町1771-49-2-202",
  phone: "080-3187-8771",
  coverageLabel: "福岡県全域対応",
  caseCount: "3,000",
  totalCasesLabel: "累計3,000件以上",
  prefectureCount: "福岡県全域",
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

const estimateForm = document.querySelector("[data-estimate-form]");
const formNote = document.querySelector("[data-form-note]");

if (estimateForm && formNote) {
  estimateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const phrases = ["入力内容を", "受け付けました。", "公開時は", "送信先の", "フォーム連携を", "設定してください。"];
    formNote.replaceChildren();
    phrases.forEach((phrase, index) => {
      if (index > 0) formNote.append(document.createElement("wbr"));
      const unit = document.createElement("span");
      unit.className = "copy-unit";
      unit.textContent = phrase;
      formNote.append(unit);
    });
    formNote.setAttribute("role", "status");
  });
}
