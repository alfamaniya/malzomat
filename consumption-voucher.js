const APP_DB_STORAGE_KEY = "malzomat.database.v1";
async function loadAppDatabase() {
  const response = await fetch(new URL("database.json", window.location.href), { cache: "no-store" });
  if (!response.ok) throw new Error("بارگذاری database.json ناموفق بود (" + response.status + ")");
  const base = await response.json();
  const cachedText = localStorage.getItem(APP_DB_STORAGE_KEY);
  if (cachedText) {
    try {
      const cached = JSON.parse(cachedText);
      if (cached && cached.meta && cached.meta.schemaVersion === base.meta.schemaVersion) {
        window.appDatabase = Object.assign({}, base, cached);
        return window.appDatabase;
      }
    } catch (error) {
      console.warn("داده محلی نامعتبر است؛ داده پایه دوباره خوانده می‌شود.", error);
      localStorage.removeItem(APP_DB_STORAGE_KEY);
    }
  }
  window.appDatabase = base;
  return base;
}
function saveAppDatabase(database) {
  window.appDatabase = database;
  localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new CustomEvent("malzomat:database-updated"));
}
function appEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char];
  });
}
function appLatinDigits(value) {
  const persian = "۰۱۲۳۴۵۶۷۸۹", arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value == null ? "" : value)
    .replace(/[۰-۹]/g, function (digit) { return String(persian.indexOf(digit)); })
    .replace(/[٠-٩]/g, function (digit) { return String(arabic.indexOf(digit)); });
}
function appFaNumber(value) { return new Intl.NumberFormat("fa-IR").format(Number(value || 0)); }
function showAppNotice(title, message, type) {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div"); toast.id = "appToast"; toast.className = "app-toast";
    toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite"); document.body.appendChild(toast);
  }
  toast.style.background = type === "error" ? "#93000a" : "#0b1c30";
  toast.innerHTML = "<strong>" + appEscape(title) + "</strong><p>" + appEscape(message) + "</p>";
  clearTimeout(window.appToastTimer);
  window.appToastTimer = setTimeout(function () { if (toast && toast.isConnected) toast.remove(); }, 4200);
}
function openAppDialog(title, fields, onSubmit) {
  const overlay = document.createElement("div"); overlay.className = "app-modal-overlay"; overlay.setAttribute("role", "presentation");
  const fieldMarkup = fields.map(function (field) {
    const required = field.required === false ? "" : " required";
    let control;
    if (field.type === "select") {
      const options = (field.options || []).map(function (option) {
        return "<option value=\"" + appEscape(option.value) + "\"" + (String(option.value) === String(field.value) ? " selected" : "") + ">" + appEscape(option.label) + "</option>";
      }).join("");
      control = "<select name=\"" + appEscape(field.name) + "\"" + required + ">" + options + "</select>";
    } else if (field.type === "textarea") {
      control = "<textarea name=\"" + appEscape(field.name) + "\" rows=\"3\"" + required + ">" + appEscape(field.value || "") + "</textarea>";
    } else {
      control = "<input name=\"" + appEscape(field.name) + "\" type=\"" + appEscape(field.type || "text") + "\" value=\"" + appEscape(field.value == null ? "" : field.value) + "\"" + (field.min != null ? " min=\"" + appEscape(field.min) + "\"" : "") + (field.step != null ? " step=\"" + appEscape(field.step) + "\"" : "") + required + ">";
    }
    return "<label>" + appEscape(field.label) + control + "</label>";
  }).join("");
  overlay.innerHTML = "<div class=\"app-dialog\" role=\"dialog\" aria-modal=\"true\" aria-label=\"" + appEscape(title) + "\"><h2>" + appEscape(title) + "</h2><form>" + fieldMarkup + "<div class=\"dialog-actions\"><button type=\"button\" class=\"secondary-action\" data-dialog-cancel>انصراف</button><button type=\"submit\" class=\"primary-action\">ثبت اطلاعات</button></div></form></div>";
  document.body.appendChild(overlay);
  const form = overlay.querySelector("form");
  overlay.querySelector("[data-dialog-cancel]").addEventListener("click", function () { overlay.remove(); });
  overlay.addEventListener("click", function (event) { if (event.target === overlay) overlay.remove(); });
  form.addEventListener("submit", function (event) {
    event.preventDefault(); const values = {};
    fields.forEach(function (field) { const control = form.elements.namedItem(field.name); values[field.name] = control ? control.value.trim() : ""; });
    overlay.remove(); onSubmit(values);
  });
  const firstControl = form.querySelector("input,select,textarea"); if (firstControl) firstControl.focus();
}
function downloadAppFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
function appAddTransaction(database, item, type, quantity, destination, extra) {
  const options = extra || {};
  const sequence = (database.transactions || []).length + 1;
  const now = new Date();
  const typeLabels = { receipt: "رسید انبار", issue: "حواله مصرف", transfer: "انتقال انبار", gatePass: "برگه خروج" };
  const transaction = {
    id: "TRX-LOCAL-" + Date.now() + "-" + sequence, date: "1405/07/28",
    time: String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0"),
    type, typeLabel: typeLabels[type] || "تراکنش انبار",
    documentNo: (type === "receipt" ? "RC" : type === "transfer" ? "TF" : "HW") + "-1405-07-" + String(sequence + 9000),
    gatePassNo: options.gatePassNo || "", itemId: item.id, itemCode: item.code, itemName: item.name,
    category: item.category, unit: item.unit, quantity: Number(quantity || 0), unitPrice: Number(item.unitPrice || 0),
    destination: destination || "انبار مرکزی قطعات و ملزومات", warehouse: item.location || "انبار مرکزی قطعات و ملزومات",
    operator: (database.users && database.users[0] && database.users[0].name) || "کاربر نمونه",
    status: options.status || (type === "gatePass" ? "completed" : "approved"), shift: "shift1", note: options.note || ""
  };
  database.transactions = database.transactions || []; database.transactions.push(transaction); return transaction;
}

(function () {
  let database = null;
  let draft = [];
  const DRAFT_KEY = "malzomat.voucher.draft.v1";
  const body = document.getElementById("inventoryItemsBody");
  const search = document.getElementById("filterItemsInput");
  const counter = document.getElementById("rowsCounterBadge");
  const addButton = document.getElementById("btnAddRowBtn");
  const recalcButton = document.getElementById("btnRecalculateStock");
  const approveButton = document.getElementById("btnApproveVoucher");
  const rejectButton = document.getElementById("btnRejectVoucher");
  let summary = null;

  function defaultDraft() {
    return database.items.filter(function (item) { return item.stock > 2; }).slice(0, 4).map(function (item, index) {
      return { itemCode: item.code, quantity: index === 1 ? 2 : 1, destination: "کارگاه تعمیرات و نگهداری", unitApproved: true, status: "در انتظار تأیید" };
    });
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) {
        draft = parsed.filter(function (row) { return database.items.some(function (item) { return item.code === row.itemCode; }); });
      }
    } catch (error) { console.warn("پیش‌نویس حواله خوانده نشد.", error); }
    if (!draft.length) draft = defaultDraft();
    storeDraft();
  }

  function storeDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function itemFor(code) { return database.items.find(function (item) { return item.code === code; }); }

  function makeRow(row, index) {
    const item = itemFor(row.itemCode);
    if (!item) return "";
    const overStock = row.status !== "تأیید نهایی شد" && Number(row.quantity) > Number(item.stock);
    const statusClass = row.status === "تأیید نهایی شد" ? "voucher-app-state is-approved" : row.status === "عودت داده شد" ? "voucher-app-state is-rejected" : "voucher-app-state";
    return "<tr class=\"item-row hover:bg-surface-container transition-colors\" data-item-code=\"" + appEscape(item.code) + "\">" +
      "<td class=\"py-space-sm px-space-md text-center\">" + appFaNumber(index + 1) + "</td>" +
      "<td class=\"py-space-sm px-space-md\"><button type=\"button\" data-copy-code=\"" + appEscape(item.code) + "\" class=\"font-tabular-data text-tabular-data text-primary font-bold\" title=\"کپی کد کالا\">" + appEscape(item.code) + "</button></td>" +
      "<td class=\"py-space-sm px-space-md\"><div class=\"flex flex-col\"><span class=\"font-semibold\">" + appEscape(item.name) + "</span><span class=\"text-label-sm text-outline\">" + appEscape(item.latinName || "") + "</span></div></td>" +
      "<td class=\"py-space-sm px-space-md\">" + appEscape(item.category) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center\">" + appEscape(item.unit) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center font-bold\" data-current-stock>" + appFaNumber(item.stock) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center\"><input aria-label=\"مقدار درخواستی " + appEscape(item.name) + "\" type=\"number\" min=\"1\" max=\"" + Number(item.stock) + "\" value=\"" + Number(row.quantity || 1) + "\" data-quantity=\"" + appEscape(item.code) + "\" class=\"min-w-20 rounded border border-outline-variant px-2 py-1 text-center" + (overStock ? " text-error" : "") + "\"></td>" +
      "<td class=\"py-space-sm px-space-md text-center\"><input type=\"checkbox\" aria-label=\"تأیید رئیس واحد برای " + appEscape(item.name) + "\" data-unit-approved=\"" + appEscape(item.code) + "\"" + (row.unitApproved ? " checked" : "") + (row.status === "تأیید نهایی شد" ? " disabled" : "") + "></td>" +
      "<td class=\"py-space-sm px-space-md\"><input type=\"text\" aria-label=\"محل مصرف " + appEscape(item.name) + "\" data-destination=\"" + appEscape(item.code) + "\" value=\"" + appEscape(row.destination || "") + "\" class=\"rounded border border-outline-variant px-2 py-1 min-w-36\"></td>" +
      "<td class=\"py-space-sm px-space-md text-center\"><span class=\"" + statusClass + "\">" + appEscape(overStock ? "موجودی ناکافی" : row.status || "در انتظار تأیید") + "</span></td>" +
      "<td class=\"py-space-sm px-space-md text-center\"><button type=\"button\" class=\"text-error rounded p-1\" data-remove-row=\"" + appEscape(item.code) + "\" title=\"حذف ردیف\"" + (row.status === "تأیید نهایی شد" ? " disabled" : "") + "><span class=\"material-symbols-outlined text-[18px]\">delete</span></button></td></tr>";
  }

  function ensureSummary() {
    if (summary || !body) return;
    summary = document.createElement("div");
    summary.className = "voucher-app-summary";
    const table = body.closest("table");
    if (table) table.insertAdjacentElement("beforebegin", summary);
  }

  function updateSummary() {
    ensureSummary();
    if (!summary) return;
    let totalUnits = 0, shortage = 0;
    draft.forEach(function (row) {
      const item = itemFor(row.itemCode); if (!item) return;
      totalUnits += Number(row.quantity || 0);
      if (Number(row.quantity || 0) > item.stock) shortage++;
    });
    summary.innerHTML = "<div class=\"voucher-app-metric\"><span>تعداد ردیف حواله</span><strong>" + appFaNumber(draft.length) + "</strong></div>" +
      "<div class=\"voucher-app-metric\"><span>جمع تعداد درخواستی</span><strong>" + appFaNumber(totalUnits) + "</strong></div>" +
      "<div class=\"voucher-app-metric\"><span>ردیف با موجودی ناکافی</span><strong" + (shortage ? " style=\"color:#ba1a1a\"" : "") + ">" + appFaNumber(shortage) + "</strong></div>";
  }

  function renderDraft() {
    if (!body) return;
    const query = (search ? search.value : "").toLocaleLowerCase("fa").trim();
    const rows = draft.map(function (row, index) { return { row:row, index:index, item:itemFor(row.itemCode) }; })
      .filter(function (entry) { return entry.item && [entry.item.code,entry.item.name,entry.item.latinName,entry.item.category].join(" ").toLocaleLowerCase("fa").includes(query); });
    body.innerHTML = rows.map(function (entry) { return makeRow(entry.row, entry.index); }).join("") ||
      "<tr><td colspan=\"11\" class=\"p-8 text-center text-on-surface-variant\">ردیفی یافت نشد؛ عبارت جست‌وجو را تغییر دهید.</td></tr>";
    if (counter) counter.textContent = appFaNumber(rows.length) + " ردیف";
    updateSummary();
    if (approveButton) {
      const approved = draft.length > 0 && draft.every(function (row) { return row.status === "تأیید نهایی شد"; });
      approveButton.disabled = approved;
      if (approved) approveButton.innerHTML = "<span class=\"material-symbols-outlined text-[20px]\">task_alt</span><span>حواله ثبت شده است</span>";
    }
  }

  function syncDraftFromInputs() {
    if (!body) return;
    draft.forEach(function (row) {
      const code = row.itemCode;
      const quantity = body.querySelector("[data-quantity=\"" + CSS.escape(code) + "\"]");
      const destination = body.querySelector("[data-destination=\"" + CSS.escape(code) + "\"]");
      const approved = body.querySelector("[data-unit-approved=\"" + CSS.escape(code) + "\"]");
      if (quantity) row.quantity = Math.max(1, Number(quantity.value || 1));
      if (destination) row.destination = destination.value.trim();
      if (approved) row.unitApproved = approved.checked;
      const item = itemFor(code);
      if (item && row.status !== "تأیید نهایی شد") row.status = Number(row.quantity) > item.stock ? "موجودی ناکافی" : "در انتظار تأیید";
    });
    storeDraft();
    updateSummary();
  }

  function addVoucherLine(values) {
    const item = itemFor(values.itemCode);
    if (!item) return showAppNotice("کالا پیدا نشد", "کد کالا در فهرست نمونه موجود نیست.", "error");
    const quantity = Number(values.quantity || 1);
    if (quantity < 1) return showAppNotice("مقدار نامعتبر است", "مقدار درخواستی باید بزرگ‌تر از صفر باشد.", "error");
    const existing = draft.find(function (row) { return row.itemCode === item.code && row.status !== "تأیید نهایی شد"; });
    if (existing) existing.quantity += quantity;
    else draft.push({ itemCode:item.code, quantity:quantity, destination:values.destination || "واحد اداری", unitApproved:true, status:"در انتظار تأیید" });
    storeDraft(); renderDraft(); showAppNotice("ردیف افزوده شد", item.name + " به پیش‌نویس حواله اضافه شد.");
  }

  function showAddDialog() {
    openAppDialog("افزودن قلم به حواله مصرف", [
      { name:"itemCode", label:"کالا (کد — نام)", type:"select", options:database.items.map(function (item) { return { value:item.code, label:item.code + " — " + item.name + " (موجودی " + item.stock + ")"}; }) },
      { name:"quantity", label:"مقدار درخواستی", type:"number", value:"1", min:"1" },
      { name:"destination", label:"محل مصرف", type:"text", value:"کارگاه تعمیرات و نگهداری" }
    ], addVoucherLine);
  }

  function approveVoucher() {
    syncDraftFromInputs();
    if (!draft.length) return showAppNotice("حواله خالی است", "برای ثبت نهایی حداقل یک قلم کالا اضافه کنید.", "error");
    const unchecked = draft.find(function (row) { return row.status !== "تأیید نهایی شد" && !row.unitApproved; });
    if (unchecked) return showAppNotice("تأیید واحد ناقص است", "تأیید رئیس واحد برای تمام ردیف‌ها الزامی است.", "error");
    const shortage = draft.find(function (row) { const item = itemFor(row.itemCode); return row.status !== "تأیید نهایی شد" && item && Number(row.quantity) > item.stock; });
    if (shortage) return showAppNotice("موجودی کافی نیست", "مقدار درخواستی کالای " + shortage.itemCode + " را کاهش دهید یا موجودی را بررسی کنید.", "error");
    if (!window.confirm("حواله با داده‌های نمونه ثبت شود و موجودی اقلام در این مرورگر کسر شود؟")) return;
    const note = (document.getElementById("managerNotes") || {}).value || "";
    draft.forEach(function (row) {
      if (row.status === "تأیید نهایی شد") return;
      const item = itemFor(row.itemCode);
      if (!item) return;
      item.stock -= Number(row.quantity);
      item.status = item.stock <= 0 ? "out_of_stock" : item.stock <= item.minStock ? "low_stock" : "active";
      appAddTransaction(database, item, "issue", row.quantity, row.destination, {note:note});
      row.status = "تأیید نهایی شد";
    });
    saveAppDatabase(database); storeDraft(); renderDraft();
    showAppNotice("حواله تأیید شد", "موجودی نمونه در مرورگر به‌روزرسانی و سوابق گردش ثبت شد.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAppDatabase().then(function (loaded) {
      database = loaded; loadDraft(); renderDraft();
      if (search) search.addEventListener("input", renderDraft);
      if (addButton) addButton.addEventListener("click", showAddDialog);
      if (recalcButton) recalcButton.addEventListener("click", function () {
        syncDraftFromInputs(); renderDraft();
        showAppNotice("موجودی دوباره محاسبه شد", "مقدار درخواست هر ردیف با موجودی جاری database.json و تغییرات محلی مقایسه شد.");
      });
      if (approveButton) approveButton.addEventListener("click", approveVoucher);
      if (rejectButton) rejectButton.addEventListener("click", function () {
        if (!window.confirm("حواله فعلی به متقاضی برگشت داده شود؟")) return;
        draft.forEach(function (row) { if (row.status !== "تأیید نهایی شد") row.status = "عودت داده شد"; });
        storeDraft(); renderDraft(); showAppNotice("حواله عودت داده شد", "وضعیت پیش‌نویس در مرورگر ذخیره شد.", "error");
      });
      if (body) body.addEventListener("input", function (event) {
        if (event.target.matches("[data-quantity],[data-destination]")) syncDraftFromInputs();
      });
      if (body) body.addEventListener("change", function (event) {
        if (event.target.matches("[data-unit-approved]")) syncDraftFromInputs();
      });
      if (body) body.addEventListener("click", function (event) {
        const remove = event.target.closest("[data-remove-row]");
        if (remove) {
          const row = draft.find(function (entry) { return entry.itemCode === remove.dataset.removeRow; });
          if (row && row.status === "تأیید نهایی شد") return showAppNotice("ردیف ثبت شده است", "پس از ثبت نهایی امکان حذف ردیف وجود ندارد.", "error");
          draft = draft.filter(function (entry) { return entry.itemCode !== remove.dataset.removeRow; });
          storeDraft(); renderDraft(); return;
        }
        const copy = event.target.closest("[data-copy-code]");
        if (copy) {
          const code = copy.dataset.copyCode;
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { showAppNotice("کپی شد", code); }).catch(function () { showAppNotice("کد کالا", code); });
          else showAppNotice("کد کالا", code);
        }
      });
      document.querySelectorAll("button").forEach(function (button) {
        const text = button.innerText.replace(/\s+/g," ").trim();
        if (text.includes("چاپ")) button.addEventListener("click", function () { window.print(); });
      });
    }).catch(function (error) {
      console.error(error);
      showAppNotice("خطا در بارگذاری پایگاه نمونه", "برای خواندن database.json صفحه را از طریق IIS یا وب‌سرور محلی اجرا کنید.", "error");
    });
  });
})();
