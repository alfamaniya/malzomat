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
      console.warn("داده محلی نامعتبر بود و از فایل JSON دوباره بارگذاری شد.", error);
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
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value == null ? "" : value)
    .replace(/[۰-۹]/g, function (digit) { return String(persian.indexOf(digit)); })
    .replace(/[٠-٩]/g, function (digit) { return String(arabic.indexOf(digit)); });
}

function appFaNumber(value) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

function showAppNotice(title, message, type) {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.style.background = type === "error" ? "#93000a" : "#0b1c30";
  toast.innerHTML = "<strong>" + appEscape(title) + "</strong><p>" + appEscape(message) + "</p>";
  clearTimeout(window.appToastTimer);
  window.appToastTimer = setTimeout(function () {
    if (toast && toast.isConnected) toast.remove();
  }, 4200);
}

function openAppDialog(title, fields, onSubmit) {
  const overlay = document.createElement("div");
  overlay.className = "app-modal-overlay";
  overlay.setAttribute("role", "presentation");
  const fieldMarkup = fields.map(function (field) {
    const required = field.required === false ? "" : " required";
    let control = "";
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
    event.preventDefault();
    const values = {};
    fields.forEach(function (field) {
      const control = form.elements.namedItem(field.name);
      values[field.name] = control ? control.value.trim() : "";
    });
    overlay.remove();
    onSubmit(values);
  });
  const firstControl = form.querySelector("input,select,textarea");
  if (firstControl) firstControl.focus();
}

function downloadAppFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function appAddTransaction(database, item, type, quantity, destination, extra) {
  const options = extra || {};
  const sequence = (database.transactions || []).length + 1;
  const now = new Date();
  const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
  const typeLabels = { receipt: "رسید انبار", issue: "حواله مصرف", transfer: "انتقال انبار", gatePass: "برگه خروج" };
  const transaction = {
    id: "TRX-LOCAL-" + Date.now() + "-" + sequence,
    date: "1405/07/28",
    time: time,
    type: type,
    typeLabel: typeLabels[type] || "تراکنش انبار",
    documentNo: (type === "receipt" ? "RC" : type === "transfer" ? "TF" : "HW") + "-1405-07-" + String(sequence + 9000),
    gatePassNo: options.gatePassNo || "",
    itemId: item.id,
    itemCode: item.code,
    itemName: item.name,
    category: item.category,
    unit: item.unit,
    quantity: Number(quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    destination: destination || "انبار مرکزی قطعات و ملزومات",
    warehouse: item.location || "انبار مرکزی قطعات و ملزومات",
    operator: (database.users && database.users[0] && database.users[0].name) || "کاربر نمونه",
    status: options.status || (type === "gatePass" ? "completed" : "approved"),
    shift: "shift1",
    note: options.note || ""
  };
  database.transactions = database.transactions || [];
  database.transactions.push(transaction);
  return transaction;
}

function appCategoryOptions(database) {
  return (database.categories || []).map(function (category) {
    return { value: category.id, label: category.name };
  });
}

(function () {
  let database = null;
  let currentPage = 1;
  let pageSize = 10;
  let filteredProducts = [];
  let activeStatus = "";
  const productTable = document.querySelectorAll("table")[0];
  const tableBodies = document.querySelectorAll("table tbody");
  const productBody = tableBodies[0] || null;
  const transactionBody = tableBodies[1] || null;
  const searchInput = document.getElementById("table-search");
  const filters = Array.from(document.querySelectorAll("select"));
  const categoryFilter = filters[0] || null;
  const statusFilter = filters[1] || null;
  const pageSizeSelect = filters[2] || null;
  let pager = null;

  function statusLabel(item) {
    if (item.stock <= 0) return "اتمام موجودی";
    if (item.stock <= item.minStock) return "زیر نقطه سفارش";
    return "موجود";
  }

  function buildProductRow(item, index) {
    const freeStock = Math.max(0, Number(item.stock || 0) - Number(item.reserved || 0));
    const badgeClass = item.stock <= 0 ? "bg-error-container text-on-error-container" : item.stock <= item.minStock ? "bg-[#fff1c2] text-[#7a4d00]" : "bg-tertiary-fixed text-on-tertiary-fixed";
    const action = "<button type=\"button\" data-cardex-code=\"" + appEscape(item.code) + "\" class=\"rounded-lg bg-surface-container-low px-2 py-1 text-primary\" title=\"مشاهده کاردکس\"><span class=\"material-symbols-outlined text-[17px]\">receipt_long</span></button>";
    return "<tr class=\"inventory-app-row hover:bg-surface-container-low transition-colors\" data-code=\"" + appEscape(item.code) + "\">" +
      "<td class=\"py-space-sm px-space-md\"><span class=\"dir-ltr font-tabular-data text-tabular-data font-bold text-primary\">" + appEscape(item.code) + "</span></td>" +
      "<td class=\"py-space-sm px-space-md\"><div class=\"flex flex-col\"><span class=\"font-semibold text-on-surface\">" + appEscape(item.name) + "</span><span class=\"text-label-sm text-on-surface-variant\">" + appEscape(item.latinName || item.description || "") + "</span></div></td>" +
      "<td class=\"py-space-sm px-space-md\"><span class=\"inline-flex rounded-full px-2 py-1 text-label-sm " + badgeClass + "\">" + appEscape(item.category) + "</span></td>" +
      "<td class=\"py-space-sm px-space-md text-center\">" + appEscape(item.unit) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center font-bold\">" + appFaNumber(item.stock) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center\">" + appFaNumber(item.reserved || 0) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center font-bold text-primary\">" + appFaNumber(freeStock) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center\">" + appFaNumber(item.minStock) + " / " + appFaNumber(item.maxStock) + "</td>" +
      "<td class=\"py-space-sm px-space-md whitespace-nowrap\">" + appEscape(item.location) + "</td>" +
      "<td class=\"py-space-sm px-space-md text-center\">" + action + "</td></tr>";
  }

  function ensurePager() {
    if (pager || !productTable) return;
    pager = document.createElement("div");
    pager.id = "inventoryAppPagination";
    pager.className = "inventory-app-pager";
    const holder = productTable.closest(".overflow-x-auto") || productTable.parentElement;
    holder.insertAdjacentElement("afterend", pager);
  }

  function renderPager() {
    ensurePager();
    if (!pager) return;
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    if (currentPage > pageCount) currentPage = pageCount;
    const start = filteredProducts.length ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, filteredProducts.length);
    let pages = "";
    const first = Math.max(1, currentPage - 2);
    const last = Math.min(pageCount, first + 4);
    for (let p = first; p <= last; p++) {
      pages += "<button type=\"button\" data-page=\"" + p + "\"" + (p === currentPage ? " aria-current=\"page\"" : "") + ">" + appFaNumber(p) + "</button>";
    }
    pager.innerHTML = "<span>نمایش " + appFaNumber(start) + " تا " + appFaNumber(end) + " از " + appFaNumber(filteredProducts.length) + " قلم کالا</span><div class=\"pager-actions\"><button type=\"button\" data-page=\"" + (currentPage - 1) + "\"" + (currentPage <= 1 ? " disabled" : "") + ">قبلی</button>" + pages + "<button type=\"button\" data-page=\"" + (currentPage + 1) + "\"" + (currentPage >= pageCount ? " disabled" : "") + ">بعدی</button></div>";
  }

  function renderProducts() {
    if (!database || !productBody) return;
    const query = (searchInput ? searchInput.value : "").toLocaleLowerCase("fa").trim();
    const category = categoryFilter ? categoryFilter.value : "";
    const status = statusFilter ? statusFilter.value : activeStatus;
    filteredProducts = database.items.filter(function (item) {
      const searchable = [item.code, item.name, item.latinName, item.category, item.barcode, item.location, item.supplier].join(" ").toLocaleLowerCase("fa");
      const categoryOk = !category || item.category === category;
      const statusOk = !status || (status === "low_stock" ? item.stock > 0 && item.stock <= item.minStock : status === "out_of_stock" ? item.stock <= 0 : status === "active" ? item.stock > item.minStock : true);
      return searchable.includes(query) && categoryOk && statusOk;
    });
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    if (currentPage > pageCount) currentPage = 1;
    const first = (currentPage - 1) * pageSize;
    productBody.innerHTML = filteredProducts.slice(first, first + pageSize).map(buildProductRow).join("") ||
      "<tr><td colspan=\"10\" class=\"p-8 text-center text-on-surface-variant\">کالایی با این فیلتر پیدا نشد.</td></tr>";
    renderPager();
  }

  function renderTransactions() {
    if (!database || !transactionBody) return;
    const rows = database.transactions.slice().reverse().slice(0, 30);
    transactionBody.innerHTML = rows.map(function (transaction, index) {
      const inbound = transaction.type === "receipt";
      const outbound = transaction.type === "issue" || transaction.type === "gatePass";
      return "<tr class=\"hover:bg-surface-container-low/50 transition-colors\">" +
        "<td class=\"py-space-sm px-space-md\">" + appFaNumber(index + 1) + "</td>" +
        "<td class=\"py-space-sm px-space-md\">" + appEscape(transaction.typeLabel || transaction.type) + "</td>" +
        "<td class=\"py-space-sm px-space-md whitespace-nowrap\">" + appEscape(transaction.date) + " <span class=\"text-label-sm text-outline\">" + appEscape(transaction.time) + "</span></td>" +
        "<td class=\"py-space-sm px-space-md dir-ltr text-right\">" + appEscape(transaction.documentNo) + "</td>" +
        "<td class=\"py-space-sm px-space-md\">" + appEscape(transaction.destination) + "</td>" +
        "<td class=\"py-space-sm px-space-md text-center text-tertiary-container\">" + (inbound ? appFaNumber(transaction.quantity) : "—") + "</td>" +
        "<td class=\"py-space-sm px-space-md text-center text-error\">" + (outbound ? appFaNumber(transaction.quantity) : "—") + "</td>" +
        "<td class=\"py-space-sm px-space-md text-center font-bold\">" + appFaNumber(transaction.quantity) + "</td>" +
        "<td class=\"py-space-sm px-space-md\">" + appEscape(transaction.operator || "کاربر نمونه") + "</td>" +
        "<td class=\"py-space-sm px-space-md text-center\"><span class=\"material-symbols-outlined text-[18px] text-primary\">description</span></td></tr>";
    }).join("");
  }

  window.toggleCardex = function (skuCode) {
    if (!database) return;
    const item = database.items.find(function (entry) { return entry.code === skuCode; });
    const badge = document.getElementById("active-sku-badge");
    const desc = document.getElementById("active-sku-desc");
    const panel = document.getElementById("cardex-panel");
    if (badge) badge.textContent = item ? item.code : skuCode;
    if (desc && item) desc.textContent = item.name + " • " + item.category + " • موجودی: " + appFaNumber(item.stock) + " " + item.unit + " • محل: " + item.location;
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      panel.classList.add("ring-2", "ring-primary");
      setTimeout(function () { panel.classList.remove("ring-2", "ring-primary"); }, 1000);
    }
    document.querySelectorAll("[data-code]").forEach(function (row) {
      row.classList.toggle("bg-surface-container-high/40", row.getAttribute("data-code") === skuCode);
    });
  };

  function showAddItemDialog() {
    openAppDialog("تعریف کالای جدید", [
      { name: "name", label: "نام کالا", type: "text" },
      { name: "categoryId", label: "گروه کالا", type: "select", options: appCategoryOptions(database) },
      { name: "unit", label: "واحد شمارش", type: "select", options: (database.units || []).map(function (u) { return { value: u.name, label: u.name }; }) },
      { name: "stock", label: "موجودی اولیه", type: "number", value: "0", min: "0" },
      { name: "unitPrice", label: "قیمت واحد (ریال)", type: "number", value: "0", min: "0" }
    ], function (values) {
      const category = database.categories.find(function (c) { return c.id === values.categoryId; }) || database.categories[0];
      const number = Math.max(Number(database.settings.nextSkuNumber || database.items.length + 1), database.items.length + 1);
      const item = { id: "ITEM-" + String(number).padStart(4, "0"), code: "MLZ-" + String(number).padStart(4, "0"), name: values.name, latinName: "", category: category.name, categoryId: category.id, unit: values.unit || "عدد", stock: Number(values.stock || 0), reserved: 0, minStock: 5, maxStock: 100, unitPrice: Number(values.unitPrice || 0), location: "قفسه جدید", warehouseId: (database.warehouses[0] || {}).id || "WH-001", barcode: "626" + String(1000000000 + number), supplier: "تأمین‌کننده جدید", status: Number(values.stock || 0) <= 5 ? "low_stock" : "active", description: "" };
      database.items.push(item);
      database.settings.nextSkuNumber = number + 1;
      saveAppDatabase(database);
      currentPage = 1;
      renderProducts();
      showAppNotice("کالا اضافه شد", item.name + " در داده‌های محلی مرورگر ذخیره شد.");
    });
  }

  function init() {
    if (categoryFilter) {
      categoryFilter.innerHTML = "<option value=\"\">همه گروه‌ها</option>" + database.categories.map(function (category) { return "<option value=\"" + appEscape(category.name) + "\">" + appEscape(category.name) + "</option>"; }).join("");
      categoryFilter.dataset.inventoryRole = "category";
    }
    if (statusFilter) {
      statusFilter.innerHTML = "<option value=\"\">همه وضعیت‌ها</option><option value=\"active\">موجودی عادی</option><option value=\"low_stock\">زیر نقطه سفارش</option><option value=\"out_of_stock\">اتمام موجودی</option>";
      statusFilter.dataset.inventoryRole = "status";
    }
    if (pageSizeSelect) {
      pageSizeSelect.innerHTML = "<option value=\"5\">۵ ردیف</option><option value=\"10\" selected>۱۰ ردیف</option><option value=\"25\">۲۵ ردیف</option><option value=\"50\">۵۰ ردیف</option><option value=\"100\">۱۰۰ ردیف</option>";
      pageSizeSelect.dataset.inventoryRole = "page-size";
      pageSizeSelect.addEventListener("change", function () { pageSize = Number(pageSizeSelect.value) || 10; currentPage = 1; renderProducts(); });
    }
    if (searchInput) searchInput.addEventListener("input", function () { currentPage = 1; renderProducts(); });
    if (categoryFilter) categoryFilter.addEventListener("change", function () { currentPage = 1; renderProducts(); });
    if (statusFilter) statusFilter.addEventListener("change", function () { currentPage = 1; renderProducts(); });
    document.addEventListener("click", function (event) {
      const pagerButton = event.target.closest("[data-page]");
      if (pagerButton && pagerButton.closest("#inventoryAppPagination")) {
        currentPage = Math.max(1, Number(pagerButton.dataset.page) || 1);
        renderProducts();
        return;
      }
      const cardexButton = event.target.closest("[data-cardex-code]");
      if (cardexButton) { window.toggleCardex(cardexButton.dataset.cardexCode); return; }
      const button = event.target.closest("button");
      if (!button) return;
      const text = button.innerText.replace(/\s+/g, " ").trim();
      if (button.id === "btn-refresh") {
        loadAppDatabase().then(function (loaded) { database = loaded; renderProducts(); renderTransactions(); showAppNotice("داده‌ها تازه شد", "فهرست کالاها و گردش انبار از فایل نمونه و تغییرات محلی دوباره خوانده شدند."); }).catch(function () { showAppNotice("خطا", "امکان بارگذاری دوباره داده‌ها وجود ندارد.", "error"); });
      } else if (text.includes("notifications")) {
        showAppNotice("اعلان‌های نمونه", "در این نسخه اعلان‌ها بر اساس داده‌های نمونه نمایش داده می‌شوند.");
      } else if (text.includes("تعریف کالای جدید")) {
        showAddItemDialog();
      } else if (text.includes("بارکدخوان")) {
        const code = window.prompt("کد کالا یا بارکد را وارد کنید:");
        if (code && searchInput) { searchInput.value = code.trim(); currentPage = 1; renderProducts(); }
      } else if (text.includes("کسری بحرانی")) {
        if (statusFilter) statusFilter.value = "low_stock";
        currentPage = 1; renderProducts();
      } else if (text.includes("راکد")) {
        if (statusFilter) statusFilter.value = "out_of_stock";
        currentPage = 1; renderProducts();
      } else if (text.includes("همه انبارها")) {
        if (statusFilter) statusFilter.value = "";
        if (categoryFilter) categoryFilter.value = "";
        if (searchInput) searchInput.value = "";
        currentPage = 1; renderProducts();
      } else if (text.includes("ثبت تراکنش دستی")) {
        openAppDialog("ثبت تراکنش دستی", [
          { name: "code", label: "کد کالا", type: "select", options: database.items.map(function (item) { return { value: item.code, label: item.code + " — " + item.name }; }) },
          { name: "type", label: "نوع تراکنش", type: "select", options: [{value:"receipt",label:"رسید انبار"},{value:"issue",label:"حواله مصرف"},{value:"transfer",label:"انتقال انبار"}] },
          { name: "quantity", label: "تعداد", type: "number", value: "1", min: "1" },
          { name: "destination", label: "مقصد / طرف حساب", type: "text", value: "انبار مرکزی قطعات و ملزومات" }
        ], function (v) {
          const item = database.items.find(function (x) { return x.code === v.code; });
          const quantity = Number(v.quantity);
          if (!item || quantity < 1) return showAppNotice("اطلاعات نامعتبر", "کالا و مقدار تراکنش را بررسی کنید.", "error");
          if (v.type === "issue" && item.stock < quantity) return showAppNotice("موجودی کافی نیست", "تعداد خروج از موجودی قابل دسترس بیشتر است.", "error");
          if (v.type === "receipt") item.stock += quantity;
          if (v.type === "issue") item.stock -= quantity;
          item.status = item.stock <= 0 ? "out_of_stock" : item.stock <= item.minStock ? "low_stock" : "active";
          appAddTransaction(database, item, v.type, quantity, v.destination);
          saveAppDatabase(database); renderProducts(); renderTransactions(); showAppNotice("تراکنش ثبت شد", "تغییر در مرورگر شما ذخیره شد.");
        });
      } else if (text.includes("چاپ")) {
        window.print();
      } else if (button.title.includes("دریافت فایل اکسل کاردکس")) {
        const rows = [["کد کالا","نام کالا","گروه","واحد","موجودی","رزرو","موجودی آزاد","حداقل موجودی","محل نگهداری"]].concat(filteredProducts.map(function (item) {
          return [item.code,item.name,item.category,item.unit,item.stock,item.reserved || 0,Math.max(0,item.stock-(item.reserved || 0)),item.minStock,item.location];
        }));
        const csv = "\uFEFF" + rows.map(function (row) {
          return row.map(function (value) { return "\"" + String(value == null ? "" : value).replace(/"/g, "\"\"") + "\""; }).join(",");
        }).join("\r\n");
        downloadAppFile("malzomat-cardex.csv", csv, "text/csv;charset=utf-8");
        showAppNotice("خروجی کاردکس آماده شد", appFaNumber(filteredProducts.length) + " قلم در فایل CSV دانلود شد.");
      } else if (button.title.includes("فیلترهای پیشرفته انبارگردانی") || text === "tune") {
        if (categoryFilter) categoryFilter.focus();
        if (categoryFilter) categoryFilter.scrollIntoView({ behavior: "smooth", block: "center" });
        showAppNotice("فیلترهای پیشرفته", "گروه و وضعیت موجودی را از فهرست‌های کنار جست‌وجو انتخاب کنید.");
      } else if (text === "download" || text.includes("دانلود")) {
        downloadAppFile("malzomat-inventory-export.json", JSON.stringify(database, null, 2), "application/json;charset=utf-8");
        showAppNotice("خروجی آماده شد", "فایل JSON داده‌های جاری دانلود شد.");
      }
    });
    document.querySelectorAll("button[title*='کپی'],button[title*='کپی کد']").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        const code = button.closest("tr") && button.closest("tr").querySelector("[dir='ltr']");
        if (!code) return;
        const text = code.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { showAppNotice("کپی شد", text); }).catch(function () { showAppNotice("کد کالا", text); });
        else showAppNotice("کد کالا", text);
      });
    });
    renderProducts();
    renderTransactions();
    showAppNotice("داده‌های کالا آماده است", "۱۰۰ قلم نمونه از database.json بارگذاری شد.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAppDatabase().then(function (loaded) { database = loaded; init(); }).catch(function (error) {
      console.error(error);
      showAppNotice("خطا در بارگذاری پایگاه نمونه", "صفحه را از طریق IIS یا یک وب‌سرور محلی اجرا کنید تا database.json قابل خواندن باشد.", "error");
    });
  });
})();
