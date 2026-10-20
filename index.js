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
    operator: (database.users && database.users[0] && database.users[0].name) || "—",
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

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const database = await loadAppDatabase();
    const header = document.querySelector("main > header");
    if (!header) return;
    const lowStock = database.items.filter(function (item) { return item.stock <= item.minStock; }).length;
    const overview = document.createElement("section");
    overview.className = "profile-data-overview";
    overview.setAttribute("aria-label", "خلاصه پایگاه داده");
    overview.innerHTML =
      "<div class=\"profile-data-stat\"><span class=\"stat-icon material-symbols-outlined\">inventory_2</span><div><strong>" + appFaNumber(database.items.length) + "</strong><span>قلم کالا</span></div></div>" +
      "<div class=\"profile-data-stat\"><span class=\"stat-icon material-symbols-outlined\">category</span><div><strong>" + appFaNumber(database.categories.length) + "</strong><span>گروه کالایی</span></div></div>" +
      "<div class=\"profile-data-stat\"><span class=\"stat-icon material-symbols-outlined\">warning</span><div><strong>" + appFaNumber(lowStock) + "</strong><span>قلم زیر نقطه سفارش</span></div></div>" +
      "<div class=\"profile-data-stat\"><span class=\"stat-icon material-symbols-outlined\">sync_alt</span><div><strong>" + appFaNumber(database.transactions.length) + "</strong><span>سابقه گردش کالا</span><div class=\"profile-db-status\">فایل JSON بارگذاری شد</div></div></div>";
    header.insertAdjacentElement("afterend", overview);
    overview.addEventListener("dblclick", function () {
      showAppNotice("پایگاه داده", "اطلاعات از database.json خوانده می‌شود؛ تغییرات محلی در همین مرورگر ذخیره می‌شوند.");
    });
  } catch (error) {
    console.error(error);
    showAppNotice("بارگذاری داده‌ها انجام نشد", "برای خواندن database.json صفحه را از طریق IIS یا یک وب‌سرور محلی اجرا کنید؛ باز کردن مستقیم فایل با file:// اجازه fetch نمی‌دهد.", "error");
  }
});
