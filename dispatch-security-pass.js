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
  let gateItems = [];
  let activeLogFilter = "all";
  const tables = Array.from(document.querySelectorAll("table"));
  const itemBody = tables[0] ? tables[0].querySelector("tbody") : null;
  const logBody = tables[1] ? tables[1].querySelector("tbody") : null;

  function statusText(status) {
    return status === "held" ? "معلق / توقیف" : status === "inspection" ? "در حال بازرسی" : "خارج شده";
  }

  function renderGateItems() {
    if (!itemBody) return;
    itemBody.innerHTML = gateItems.map(function (entry, index) {
      const item = database.items.find(function (product) { return product.code === entry.itemCode; });
      if (!item) return "";
      return "<tr class=\"h-11 bg-surface-container-lowest hover:bg-surface-container-low transition-colors\" data-gate-item=\"" + appEscape(item.code) + "\">" +
        "<td class=\"px-space-md text-center\">" + appFaNumber(index + 1) + "</td>" +
        "<td class=\"px-space-md\"><button type=\"button\" data-copy-code=\"" + appEscape(item.code) + "\" class=\"dir-ltr text-primary font-bold\" title=\"کپی کد\">" + appEscape(item.code) + "</button></td>" +
        "<td class=\"px-space-md\"><div class=\"flex flex-col\"><span class=\"font-bold\">" + appEscape(item.name) + "</span><span class=\"text-body-sm text-on-surface-variant\">" + appEscape(item.latinName || "") + "</span></div></td>" +
        "<td class=\"px-space-md\">" + appEscape(item.category) + "</td><td class=\"px-space-md\">" + appEscape(item.unit) + "</td>" +
        "<td class=\"px-space-md text-center font-bold\">" + appFaNumber(entry.quantity) + "</td>" +
        "<td class=\"px-space-md text-center\"><input class=\"gate-app-count\" type=\"number\" min=\"0\" max=\"" + item.stock + "\" value=\"" + entry.gateCount + "\" aria-label=\"شمارش گیت برای " + appEscape(item.name) + "\" data-gate-count=\"" + appEscape(item.code) + "\"></td>" +
        "<td class=\"px-space-md text-center\"><label class=\"inline-flex gap-1 items-center\"><input type=\"checkbox\" data-seal-verified=\"" + appEscape(item.code) + "\"" + (entry.sealVerified ? " checked" : "") + "><span class=\"text-label-sm\">" + (entry.sealVerified ? "تأیید شد" : "تأیید پلمپ") + "</span></label></td></tr>";
    }).join("");
  }

  function renderLog() {
    if (!logBody) return;
    const logs = database.transactions.filter(function (transaction) { return transaction.type === "gatePass" || transaction.gatePassNo; }).slice().reverse();
    const filtered = logs.filter(function (transaction) {
      if (activeLogFilter === "completed") return transaction.status === "completed" || transaction.status === "approved";
      if (activeLogFilter === "inspection") return transaction.status === "inspection";
      if (activeLogFilter === "held") return transaction.status === "held";
      return true;
    }).slice(0, 30);
    logBody.innerHTML = filtered.map(function (transaction) {
      return "<tr class=\"h-10 hover:bg-surface-container-low transition-colors\" data-status=\"" + appEscape(transaction.status || "completed") + "\">" +
        "<td class=\"px-space-md dir-ltr text-right font-bold text-primary\">" + appEscape(transaction.gatePassNo || "GP-" + transaction.id.slice(-7)) + "</td>" +
        "<td class=\"px-space-md dir-ltr text-right\">" + appEscape(transaction.documentNo) + "</td>" +
        "<td class=\"px-space-md\">" + appEscape(transaction.operator || "مسئول گیت") + "</td>" +
        "<td class=\"px-space-md\">" + appEscape(transaction.destination) + "</td>" +
        "<td class=\"px-space-md dir-ltr text-right\">" + appEscape(transaction.time || "—") + "</td>" +
        "<td class=\"px-space-md\">" + appEscape(transaction.operator || "افسر گیت") + "</td>" +
        "<td class=\"px-space-md text-center\"><span class=\"gate-app-status\">" + appEscape(statusText(transaction.status)) + "</span></td>" +
        "<td class=\"px-space-md text-center\"><button type=\"button\" data-view-gate=\"" + appEscape(transaction.id) + "\" class=\"text-primary\" title=\"مشاهده مجوز\"><span class=\"material-symbols-outlined text-[18px]\">visibility</span></button></td></tr>";
    }).join("") || "<tr><td colspan=\"8\" class=\"p-6 text-center text-on-surface-variant\">مجوزی در این وضعیت یافت نشد.</td></tr>";
    document.querySelectorAll("[data-gate-filter]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.gateFilter === activeLogFilter ? "true" : "false");
    });
    updateFilterButtons();
  }

  function updateFilterButtons() {
    const all = database.transactions.filter(function (x) { return x.type === "gatePass" || x.gatePassNo; });
    document.querySelectorAll("button").forEach(function (button) {
      const text = button.innerText.replace(/\s+/g," ").trim();
      if (text.startsWith("همه (") || text.startsWith("خارج شده (") || text.startsWith("در حال بازرسی (") || text.startsWith("معلق / توقیف (")) {
        button.dataset.gateFilter = text.startsWith("خارج شده") ? "completed" : text.startsWith("در حال بازرسی") ? "inspection" : text.startsWith("معلق / توقیف") ? "held" : "all";
        const count = button.dataset.gateFilter === "all" ? all.length :
          all.filter(function (x) { return button.dataset.gateFilter === "completed" ? x.status === "completed" || x.status === "approved" : x.status === button.dataset.gateFilter; }).length;
        button.textContent = button.textContent.replace(/\(\s*[^)]*\)/, "(" + appFaNumber(count) + ")");
      }
    });
  }

  function init() {
    gateItems = database.items.filter(function (item) { return item.stock > 0; }).slice(0, 5).map(function (item, index) {
      return { itemCode:item.code, quantity:Math.min(item.stock, 1 + index % 3), gateCount:Math.min(item.stock, 1 + index % 3), sealVerified:false };
    });
    renderGateItems(); renderLog();
    document.querySelectorAll("input[type=checkbox]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        const code = checkbox.dataset.sealVerified;
        if (code) {
          const row = gateItems.find(function (entry) { return entry.itemCode === code; });
          if (row) row.sealVerified = checkbox.checked;
          const label = checkbox.closest("label");
          const span = label && label.querySelector("span");
          if (span) span.textContent = checkbox.checked ? "تأیید شد" : "تأیید پلمپ";
        }
      });
    });
    document.addEventListener("click", function (event) {
      const filterButton = event.target.closest("[data-gate-filter]");
      if (filterButton) { activeLogFilter = filterButton.dataset.gateFilter; renderLog(); return; }
      const viewButton = event.target.closest("[data-view-gate]");
      if (viewButton) {
        const transaction = database.transactions.find(function (entry) { return entry.id === viewButton.dataset.viewGate; });
        if (transaction) showAppNotice("جزئیات برگه خروج", "مجوز " + (transaction.gatePassNo || "بدون شماره") + "، سند " + transaction.documentNo + "، وضعیت: " + statusText(transaction.status) + "، مقصد: " + transaction.destination);
        return;
      }
      const copyButton = event.target.closest("[data-copy-code]");
      if (copyButton) {
        const code = copyButton.dataset.copyCode;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { showAppNotice("کپی شد", code); }).catch(function () { showAppNotice("کد کالا", code); });
        else showAppNotice("کد کالا", code);
        return;
      }
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.innerText.replace(/\s+/g," ").trim();
      if (text.includes("ثبت و تایید نهایی خروج")) {
        const checkboxes = Array.from(document.querySelectorAll("input[type=checkbox]")).filter(function (box) { return !box.dataset.sealVerified; });
        if (checkboxes.some(function (box) { return !box.checked; })) return showAppNotice("چک‌لیست ناقص است", "هر سه مورد اصلی بازرسی را پیش از تأیید خروج علامت بزنید.", "error");
        if (gateItems.some(function (entry) { const count = itemBody.querySelector("[data-gate-count=\"" + CSS.escape(entry.itemCode) + "\"]"); return !entry.sealVerified || !count || Number(count.value) !== Number(entry.quantity); })) return showAppNotice("مغایرت گیت وجود دارد", "شمارش گیت باید با حواله برابر و پلمپ تمام ردیف‌ها تأیید شده باشد.", "error");
        const no = "GP-1405-07-" + String(database.transactions.length + 4400).padStart(4,"0");
        gateItems.forEach(function (entry) {
          const item = database.items.find(function (product) { return product.code === entry.itemCode; });
          if (!item) return;
          item.stock = Math.max(0, item.stock - entry.quantity);
          item.status = item.stock <= 0 ? "out_of_stock" : item.stock <= item.minStock ? "low_stock" : "active";
          appAddTransaction(database, item, "gatePass", entry.quantity, "خروج از درب شرکت", {gatePassNo:no,status:"completed",note:"تأیید شمارش و پلمپ گیت"});
        });
        saveAppDatabase(database); renderLog();
        showAppNotice("خروج تأیید شد", "برگه " + no + " ثبت و موجودی اقلام در داده‌های محلی به‌روزرسانی شد.");
      } else if (text.includes("گزارش مغایرت") || text.includes("توقف بار")) {
        const reason = window.prompt("شرح مغایرت یا علت توقف بار را وارد کنید:");
        if (!reason) return;
        const entry = gateItems[0]; const item = entry && database.items.find(function (x) { return x.code === entry.itemCode; });
        if (item) appAddTransaction(database, item, "gatePass", entry.quantity, "توقیف گیت", {gatePassNo:"GP-HOLD-" + Date.now(),status:"held",note:reason});
        saveAppDatabase(database); activeLogFilter = "held"; renderLog();
        showAppNotice("مغایرت ثبت شد", "گزارش توقف بار به سوابق نمونه اضافه شد.", "error");
      } else if (text.includes("filter_list")) {
        const query = window.prompt("کد یا نام کالا را برای فیلتر وارد کنید؛ برای حذف فیلتر کادر را خالی بگذارید:");
        if (query === null) return;
        const normalized = query.trim().toLocaleLowerCase("fa");
        itemBody.querySelectorAll("tr").forEach(function (row) {
          row.style.display = !normalized || row.innerText.toLocaleLowerCase("fa").includes(normalized) ? "" : "none";
        });
        showAppNotice("فیلتر اقلام گیت", normalized ? "فهرست بر اساس عبارت جست‌وجو محدود شد." : "فیلتر اقلام پاک شد.");
      } else if (text.includes("چاپ")) {
        window.print();
      }
    });
    if (itemBody) itemBody.addEventListener("input", function (event) {
      const input = event.target.closest("[data-gate-count]");
      if (!input) return;
      const entry = gateItems.find(function (row) { return row.itemCode === input.dataset.gateCount; });
      const tr = input.closest("tr");
      if (entry) entry.gateCount = Math.max(0, Number(input.value || 0));
      const mismatch = entry && Number(entry.gateCount) !== Number(entry.quantity);
      if (tr) tr.classList.toggle("gate-app-row-mismatch", Boolean(mismatch));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAppDatabase().then(function (loaded) { database = loaded; init(); }).catch(function (error) {
      console.error(error);
      showAppNotice("خطا در بارگذاری داده‌ها", "برای خواندن database.json از IIS یا وب‌سرور محلی استفاده کنید.", "error");
    });
  });
})();
