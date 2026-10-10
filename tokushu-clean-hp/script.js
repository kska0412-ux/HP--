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
  const submitButton = estimateForm.querySelector('button[type="submit"]');
  let sending = false;

  const setCopy = (node, phrases) => {
    node.replaceChildren();
    phrases.forEach((phrase, index) => {
      if (index > 0) node.append(document.createElement("wbr"));
      const unit = document.createElement("span");
      unit.className = "copy-unit";
      unit.textContent = phrase;
      node.append(unit);
    });
  };

  const setStatus = (state, phrases) => {
    formNote.dataset.state = state;
    formNote.setAttribute("role", state === "error" || state === "activation-required" ? "alert" : "status");
    setCopy(formNote, phrases);
  };

  estimateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || !estimateForm.reportValidity()) return;

    const payload = Object.fromEntries(new FormData(estimateForm));
    // Use the provider's AJAX endpoint; the HTML action remains a no-JS fallback.
    const endpoint = estimateForm.action.replace("https://formsubmit.co/", "https://formsubmit.co/ajax/");
    sending = true;
    submitButton.disabled = true;
    estimateForm.setAttribute("aria-busy", "true");
    setCopy(submitButton, ["送信中…"]);
    setStatus("sending", ["送信しています。", "しばらく", "お待ちください。"]);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json();
      if (/activat|confirm.*email/i.test(result.message || "")) {
        setStatus("activation-required", ["現在、WEB受付の", "準備中です。", "お急ぎの場合は", "080-3187-8771へ", "お電話ください。"]);
        return;
      }
      if (!response.ok || (result.success !== true && result.success !== "true")) {
        throw new Error("Submission was not accepted");
      }

      estimateForm.reset();
      setStatus("success", ["お問い合わせを", "送信しました。", "内容を確認後、", "担当者から", "ご連絡します。"]);
    } catch (error) {
      setStatus("error", ["送信を", "確認できませんでした。", "入力内容は", "残っています。", "再度お試しになるか、", "080-3187-8771へ", "お電話ください。"]);
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      estimateForm.removeAttribute("aria-busy");
      setCopy(submitButton, ["無料見積りを", "送信する"]);
    }
  });
}
