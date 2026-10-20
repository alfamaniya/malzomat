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
  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;
  let pageSize = 10;
  let activeView = "all";
  const table = document.getElementById("auditTable");
  const body = document.getElementById("tableBody");
  const categoryFilter = document.getElementById("filterCategory");
  const locationFilter = document.getElementById("filterLocation");
  const codeFilter = document.getElementById("filterPrCode");
  const rowsPerPage = document.getElementById("rowsPerPageSelect");
  const executeButton = document.getElementById("btnExecuteFilter");
  const refreshButton = document.getElementById("btnRefresh");
  const excelButton = document.getElementById("btnExcel");
  const pdfButton = document.getElementById("btnPdf");
  const inputs = Array.from(document.querySelectorAll("input[type=text]"));
  const dateInputs = inputs.filter(function (input) { return (input.placeholder || "").includes("۱۴۰۳/۰۱/۰۱") || (input.placeholder || "").includes("1403/01/01"); }).slice(0,2);
  const documentFilter = inputs.find(function (input) { return (input.placeholder || "").includes("HW-1403-9042"); });
  const gateFilter = inputs.find(function (input) { return (input.placeholder || "").includes("GP-1403-4412"); });
  const selects = Array.from(document.querySelectorAll("select"));
  const shiftFilter = selects.find(function (select) { return Array.from(select.options).some(function (option) { return option.value === "shift1"; }); });
  const unitFilter = selects.find(function (select) { return Array.from(select.options).some(function (option) { return (option.textContent || "").includes("تمام واحدهای شمارش"); }); });
  const typeFilter = selects.find(function (select) { return Array.from(select.options).some(function (option) { return option.value === "transfer"; }); });
  let pager = null;
  let summary = null;

  function statusLabel(status) {
    const labels = {completed:"خارج شده",approved:"تأیید شده",posted:"ثبت شده",held:"معلق / توقیف",inspection:"در حال بازرسی"};
    return labels[status] || status || "ثبت شده";
  }
  function getProduct(transaction) {
    return database.items.find(function (item) { return item.code === transaction.itemCode; });
  }
  function rowMatchesView(transaction) {
    if (activeView === "issues") return transaction.type === "issue" || transaction.type === "gatePass";
    if (activeView === "slow") return Number(transaction.quantity) <= 2;
    if (activeView === "low-stock") {
      const item = getProduct(transaction);
      return item && item.stock <= item.minStock;
    }
    if (activeView === "destinations") return transaction.type === "transfer" || transaction.type === "gatePass";
    return true;
  }
  function readFilters() {
    const values = {
      start: dateInputs[0] ? appLatinDigits(dateInputs[0].value.trim()) : "",
      end: dateInputs[1] ? appLatinDigits(dateInputs[1].value.trim()) : "",
      code: codeFilter ? codeFilter.value.trim().toLocaleLowerCase("fa") : "",
      doc: documentFilter ? documentFilter.value.trim().toLocaleLowerCase("fa") : "",
      gate: gateFilter ? gateFilter.value.trim().toLocaleLowerCase("fa") : "",
      category: categoryFilter ? categoryFilter.value : "",
      location: locationFilter ? locationFilter.value : "",
      shift: shiftFilter ? shiftFilter.value : "all",
      unit: unitFilter ? unitFilter.value : "",
      type: typeFilter ? typeFilter.value : "all"
    };
    return values;
  }
  function applyFilters() {
    const f = readFilters();
    filteredRows = allRows.filter(function (transaction) {
      const code = String(transaction.itemCode || "").toLocaleLowerCase("fa");
      const doc = String(transaction.documentNo || "").toLocaleLowerCase("fa");
      const gate = String(transaction.gatePassNo || "").toLocaleLowerCase("fa");
      const date = appLatinDigits(transaction.date || "");
      const start = appLatinDigits(f.start || "");
      const end = appLatinDigits(f.end || "");
      const typeAllowed = !f.type || f.type === "all" || (f.type === "in" && transaction.type === "receipt") || (f.type === "out" && (transaction.type === "issue" || transaction.type === "gatePass")) || (f.type === "transfer" && transaction.type === "transfer");
      return rowMatchesView(transaction) && (!f.start || date >= start) && (!f.end || date <= end) &&
        (!f.code || code.includes(f.code)) && (!f.doc || doc.includes(f.doc)) && (!f.gate || gate.includes(f.gate)) &&
        (!f.category || transaction.category === f.category) && (!f.location || transaction.destination === f.location) &&
        (!f.shift || f.shift === "all" || transaction.shift === f.shift) &&
        (!f.unit || transaction.unit === f.unit) && typeAllowed;
    });
    currentPage = 1;
    renderTable();
  }
  function ensurePager() {
    if (pager || !table) return;
    pager = document.createElement("div"); pager.className = "report-app-pager"; pager.id = "reportAppPagination";
    const holder = table.closest(".overflow-x-auto") || table.parentElement;
    holder.insertAdjacentElement("afterend", pager);
  }
  function ensureSummary() {
    if (summary || !table) return;
    summary = document.createElement("div"); summary.className = "report-app-status"; summary.id = "reportAppSummary";
    const holder = table.closest(".overflow-x-auto") || table.parentElement;
    holder.insertAdjacentElement("beforebegin", summary);
  }
  function renderTable() {
    if (!body) return;
    if (currentPage > Math.max(1,Math.ceil(filteredRows.length/pageSize))) currentPage = 1;
    const begin = (currentPage-1)*pageSize;
    const visible = filteredRows.slice(begin, begin+pageSize);
    body.innerHTML = visible.map(function (transaction, index) {
      const item = getProduct(transaction) || {};
      const qtyColor = transaction.type === "receipt" ? "text-tertiary-container" : "text-on-surface";
      return "<tr class=\"hover:bg-surface-container-low transition-colors\">" +
        "<td class=\"py-space-md px-space-md text-center\">" + appFaNumber(begin+index+1) + "</td>" +
        "<td class=\"py-space-md px-space-md whitespace-nowrap\"><div class=\"flex flex-col\"><span class=\"font-semibold\">" + appEscape(transaction.date) + "</span><span class=\"text-label-sm text-outline\">" + appEscape(transaction.time) + "</span></div></td>" +
        "<td class=\"py-space-md px-space-md dir-ltr text-right font-bold\">" + appEscape(transaction.documentNo) + "</td>" +
        "<td class=\"py-space-md px-space-md dir-ltr text-right\">" + appEscape(transaction.gatePassNo || "—") + "</td>" +
        "<td class=\"py-space-md px-space-md dir-ltr text-right text-primary font-semibold\">" + appEscape(transaction.itemCode) + "</td>" +
        "<td class=\"py-space-md px-space-md\"><div class=\"flex flex-col\"><span class=\"font-semibold\">" + appEscape(transaction.itemName) + "</span><span class=\"text-label-sm text-outline\">" + appEscape(item.latinName || "") + "</span></div></td>" +
        "<td class=\"py-space-md px-space-md\">" + appEscape(transaction.category) + "</td>" +
        "<td class=\"py-space-md px-space-md text-center\">" + appEscape(transaction.unit) + "</td>" +
        "<td class=\"py-space-md px-space-md text-center " + qtyColor + " font-bold\">" + appFaNumber(transaction.quantity) + "</td>" +
        "<td class=\"py-space-md px-space-md\">" + appEscape(transaction.destination) + "</td>" +
        "<td class=\"py-space-md px-space-md text-center\"><span class=\"rounded-full px-2 py-1 bg-surface-container text-label-sm\">" + appEscape(statusLabel(transaction.status)) + "</span></td>" +
        "<td class=\"py-space-md px-space-md\">" + appEscape(transaction.operator || "کاربر نمونه") + "</td></tr>";
    }).join("") || "<tr><td colspan=\"12\" class=\"p-8 text-center text-on-surface-variant\">برای فیلترهای انتخاب‌شده موردی پیدا نشد.</td></tr>";
    ensureSummary(); ensurePager();
    if (summary) {
      const units = filteredRows.reduce(function (sum, row) { return sum + Number(row.quantity || 0); }, 0);
      summary.textContent = "تعداد اسناد مطابق فیلتر: " + appFaNumber(filteredRows.length) + " | جمع تعداد ثبت‌شده: " + appFaNumber(units) + " | منبع: داده نمونه ملزومات";
    }
    if (pager) {
      const pages = Math.max(1,Math.ceil(filteredRows.length/pageSize));
      const start = filteredRows.length ? begin+1 : 0;
      const end = Math.min(begin+pageSize,filteredRows.length);
      let pageButtons = "";
      for (let p=Math.max(1,currentPage-2); p<=Math.min(pages,Math.max(1,currentPage-2)+4); p++) {
        pageButtons += "<button type=\"button\" data-report-page=\"" + p + "\"" + (p===currentPage ? " aria-current=\"page\"" : "") + ">" + appFaNumber(p) + "</button>";
      }
      pager.innerHTML = "<span>نمایش " + appFaNumber(start) + " تا " + appFaNumber(end) + " از " + appFaNumber(filteredRows.length) + " سند</span><div class=\"pager-actions\"><button type=\"button\" data-report-page=\"" + (currentPage-1) + "\"" + (currentPage<=1 ? " disabled" : "") + ">قبلی</button>" + pageButtons + "<button type=\"button\" data-report-page=\"" + (currentPage+1) + "\"" + (currentPage>=pages ? " disabled" : "") + ">بعدی</button></div>";
    }
  }
  function setView(button) {
    const text = button.innerText.replace(/\s+/g," ").trim();
    activeView = text.includes("حواله‌های مصرف") ? "issues" : text.includes("راکد") ? "slow" : text.includes("زیر نقطه سفارش") ? "low-stock" : text.includes("عملکرد واحدها") ? "destinations" : "all";
    document.querySelectorAll(".tab-btn").forEach(function (tab) {
      tab.classList.remove("bg-surface-container-lowest","text-on-surface","shadow-sm");
      tab.classList.add("text-on-surface-variant");
      tab.setAttribute("aria-pressed","false");
    });
    button.classList.add("bg-surface-container-lowest","text-on-surface","shadow-sm");
    button.classList.remove("text-on-surface-variant");
    button.setAttribute("aria-pressed","true");
    applyFilters();
  }
  function exportCsv() {
    const headers = ["تاریخ","ساعت","شماره سند","شماره گیت‌پاس","کد کالا","نام کالا","گروه","واحد","تعداد","مقصد","وضعیت","کاربر"];
    const rows = filteredRows.map(function (row) { return [row.date,row.time,row.documentNo,row.gatePassNo,row.itemCode,row.itemName,row.category,row.unit,row.quantity,row.destination,statusLabel(row.status),row.operator]; });
    const csv = "\uFEFF" + [headers].concat(rows).map(function (row) {
      return row.map(function (value) { return "\"" + String(value == null ? "" : value).replace(/"/g,'""') + "\""; }).join(",");
    }).join("\r\n");
    downloadAppFile("malzomat-warehouse-report.csv",csv,"text/csv;charset=utf-8");
    showAppNotice("خروجی گزارش ساخته شد","فایل CSV با کدگذاری UTF-8 دانلود شد و در Excel باز می‌شود.");
  }

  function init() {
    allRows = database.transactions.slice().reverse();
    if (categoryFilter) {
      categoryFilter.innerHTML = "<option value=\"\">تمام گروه‌ها</option>" + database.categories.map(function (item) { return "<option value=\"" + appEscape(item.name) + "\">" + appEscape(item.name) + "</option>"; }).join("");
    }
    if (locationFilter) {
      const places = Array.from(new Set(database.transactions.map(function (row) { return row.destination; })));
      locationFilter.innerHTML = "<option value=\"\">تمام مقصدها</option>" + places.map(function (place) { return "<option value=\"" + appEscape(place) + "\">" + appEscape(place) + "</option>"; }).join("");
    }
    if (dateInputs[0]) dateInputs[0].value = "1405/07/01";
    if (dateInputs[1]) dateInputs[1].value = "1405/07/30";
    if (unitFilter) {
      const units = Array.from(new Set(database.items.map(function (item) { return item.unit; })));
      unitFilter.innerHTML = "<option value=\"\">تمام واحدها</option>" + units.map(function (unit) { return "<option value=\"" + appEscape(unit) + "\">" + appEscape(unit) + "</option>"; }).join("");
      unitFilter.dataset.reportRole = "unit";
    }
    if (shiftFilter) shiftFilter.dataset.reportRole = "shift";
    if (typeFilter) typeFilter.dataset.reportRole = "type";
    if (rowsPerPage) {
      rowsPerPage.addEventListener("change",function () { pageSize=Number(rowsPerPage.value)||10; currentPage=1; renderTable(); });
    }
    if (executeButton) executeButton.addEventListener("click",function () {
      applyFilters(); showAppNotice("فیلتر گزارش اجرا شد", appFaNumber(filteredRows.length) + " سند با شرایط انتخاب‌شده منطبق است.");
    });
    if (refreshButton) refreshButton.addEventListener("click",function () {
      if (categoryFilter) categoryFilter.value="";
      if (locationFilter) locationFilter.value="";
      if (codeFilter) codeFilter.value="";
      if (documentFilter) documentFilter.value="";
      if (gateFilter) gateFilter.value="";
      dateInputs.forEach(function (input) { input.value=""; });
      if (shiftFilter) shiftFilter.selectedIndex=0;
      if (typeFilter) typeFilter.value="all";
      if (unitFilter) unitFilter.selectedIndex=0;
      activeView="all"; currentPage=1; applyFilters();
      showAppNotice("فیلترها پاک شدند","گزارش با همه اسناد نمونه بازسازی شد.");
    });
    if (excelButton) excelButton.addEventListener("click",exportCsv);
    if (pdfButton) pdfButton.addEventListener("click",function () { window.print(); });
    document.querySelectorAll(".tab-btn").forEach(function (button) { button.addEventListener("click",function () { setView(button); }); });
    document.addEventListener("click",function (event) {
      const printButton=event.target.closest("button");
      if(printButton&&printButton.innerText.includes("چاپ")){window.print();return;}
      if(printButton&&printButton.innerText.includes("notifications")){showAppNotice("اعلان‌های نمونه","در این نسخه اعلان‌های سرور واقعی متصل نیستند.");return;}
      const pageButton=event.target.closest("[data-report-page]");
      if (pageButton && !pageButton.disabled) { currentPage=Number(pageButton.dataset.reportPage)||1; renderTable(); }
    });
    applyFilters();
  }
  document.addEventListener("DOMContentLoaded",function () {
    loadAppDatabase().then(function (loaded) { database=loaded; init(); }).catch(function (error) {
      console.error(error);
      showAppNotice("خطا در بارگذاری داده‌ها","برای خواندن database.json صفحه را از طریق IIS یا یک وب‌سرور محلی اجرا کنید.","error");
    });
  });
})();
