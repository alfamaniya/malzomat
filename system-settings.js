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
    } catch (error) { console.warn("داده محلی نامعتبر است.", error); localStorage.removeItem(APP_DB_STORAGE_KEY); }
  }
  window.appDatabase = base; return base;
}
function saveAppDatabase(database) {
  window.appDatabase = database; localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new CustomEvent("malzomat:database-updated"));
}
function appEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char];
  });
}
function appLatinDigits(value) {
  const persian = "۰۱۲۳۴۵۶۷۸۹", arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value == null ? "" : value).replace(/[۰-۹]/g,function(d){return String(persian.indexOf(d));}).replace(/[٠-٩]/g,function(d){return String(arabic.indexOf(d));});
}
function appFaNumber(value) { return new Intl.NumberFormat("fa-IR").format(Number(value || 0)); }
function showAppNotice(title, message, type) {
  let toast = document.getElementById("appToast");
  if (!toast) { toast=document.createElement("div");toast.id="appToast";toast.className="app-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");document.body.appendChild(toast); }
  toast.style.background = type==="error" ? "#93000a" : "#0b1c30";
  toast.innerHTML="<strong>"+appEscape(title)+"</strong><p>"+appEscape(message)+"</p>";
  clearTimeout(window.appToastTimer);window.appToastTimer=setTimeout(function(){if(toast&&toast.isConnected)toast.remove();},4200);
}
function openAppDialog(title, fields, onSubmit) {
  const overlay=document.createElement("div");overlay.className="app-modal-overlay";
  const content=fields.map(function(field){
    const req=field.required===false?"":" required";let control="";
    if(field.type==="select"){
      control="<select name=\""+appEscape(field.name)+"\""+req+">"+(field.options||[]).map(function(opt){return "<option value=\""+appEscape(opt.value)+"\""+(String(opt.value)===String(field.value)?" selected":"")+">"+appEscape(opt.label)+"</option>";}).join("")+"</select>";
    }else{
      control="<input name=\""+appEscape(field.name)+"\" type=\""+appEscape(field.type||"text")+"\" value=\""+appEscape(field.value==null?"":field.value)+"\""+(field.min!=null?" min=\""+appEscape(field.min)+"\"":"")+(field.step!=null?" step=\""+appEscape(field.step)+"\"":"")+req+">";
    }
    return "<label>"+appEscape(field.label)+control+"</label>";
  }).join("");
  overlay.innerHTML="<div class=\"app-dialog\" role=\"dialog\" aria-modal=\"true\"><h2>"+appEscape(title)+"</h2><form>"+content+"<div class=\"dialog-actions\"><button type=\"button\" class=\"secondary-action\" data-dialog-cancel>انصراف</button><button type=\"submit\" class=\"primary-action\">ثبت اطلاعات</button></div></form></div>";
  document.body.appendChild(overlay);const form=overlay.querySelector("form");
  overlay.querySelector("[data-dialog-cancel]").addEventListener("click",function(){overlay.remove();});
  overlay.addEventListener("click",function(e){if(e.target===overlay)overlay.remove();});
  form.addEventListener("submit",function(e){e.preventDefault();const values={};fields.forEach(function(f){const el=form.elements.namedItem(f.name);values[f.name]=el?el.value.trim():"";});overlay.remove();onSubmit(values);});
  const first=form.querySelector("input,select");if(first)first.focus();
}
function downloadAppFile(filename, content, mimeType) {
  const blob=new Blob([content],{type:mimeType||"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}

(function () {
  let database=null;
  let filteredItems=[];
  let currentPage=1;
  let pageSize=25;
  let categoryFilter=null;
  let statusFilter=null;
  let pageSizeSelect=null;
  let searchInput=null;
  let catalogBody=null;
  let catalogTable=null;
  let catalogPager=null;
  let generatedPanels=null;
  const statusNames={active:"فعال",low_stock:"زیر نقطه سفارش",out_of_stock:"اتمام موجودی",reserved:"محدود به پروژه",blocked:"غیرفعال موقت",deprecated:"از رده خارج"};

  function findFormParts() {
    const form=document.getElementById("itemCatalogForm");
    if(!form)return null;
    const inputs=Array.from(form.querySelectorAll("input:not([type=checkbox])"));
    const selects=Array.from(form.querySelectorAll("select"));
    return {form:form,inputs:inputs,selects:selects};
  }
  function setupFormOptions() {
    const parts=findFormParts();if(!parts)return;
    const categorySelect=parts.selects[0],unitSelect=parts.selects[1],statusSelect=parts.selects[2];
    if(categorySelect){
      categorySelect.innerHTML=database.categories.map(function(c){return "<option value=\""+appEscape(c.id)+"\">"+appEscape(c.name)+"</option>";}).join("");
      categorySelect.value=(database.categories.find(function(c){return c.id==="facilities";})||database.categories[0]).id;
    }
    if(unitSelect){
      const units=database.units||[{id:"pcs",name:"عدد"},{id:"pack",name:"بسته"}];
      unitSelect.innerHTML=units.map(function(unit){return "<option value=\""+appEscape(unit.name)+"\">"+appEscape(unit.name)+"</option>";}).join("");
      unitSelect.value="عدد";
    }
    if(statusSelect)statusSelect.innerHTML="<option value=\"active\">فعال و قابل درخواست حواله</option><option value=\"reserved\">محدود به پروژه‌های مشخص</option><option value=\"blocked\">غیرفعال موقت</option><option value=\"deprecated\">از رده خارج</option>";
    const allSelects=Array.from(document.querySelectorAll("#content-tab-coding select"));
    if(allSelects.length>=6){
      categoryFilter=allSelects[allSelects.length-3];
      statusFilter=allSelects[allSelects.length-2];
      pageSizeSelect=allSelects[allSelects.length-1];
    }
    if(categoryFilter){
      categoryFilter.innerHTML="<option value=\"\">همه گروه‌های کالا</option>"+database.categories.map(function(c){return "<option value=\""+appEscape(c.name)+"\">"+appEscape(c.name)+"</option>";}).join("");
    }
    if(statusFilter)statusFilter.innerHTML="<option value=\"\">همه وضعیت‌ها</option><option value=\"active\">فقط اقلام فعال</option><option value=\"low_stock\">اقلام زیر حداقل موجودی</option><option value=\"out_of_stock\">اقلام بدون موجودی</option><option value=\"blocked\">اقلام غیرفعال</option>";
    if(pageSizeSelect){
      pageSizeSelect.innerHTML="<option value=\"10\">۱۰</option><option value=\"25\" selected>۲۵</option><option value=\"50\">۵۰</option><option value=\"100\">۱۰۰</option>";
      if(!pageSizeSelect.dataset.settingsBound){pageSizeSelect.addEventListener("change",function(){pageSize=Number(pageSizeSelect.value)||25;currentPage=1;renderCatalog();});pageSizeSelect.dataset.settingsBound="true";}
    }
    searchInput=document.querySelector("#content-tab-coding input[placeholder^=\"جستجوی کد\"]");
    if(searchInput&&!searchInput.dataset.settingsBound){searchInput.addEventListener("input",function(){currentPage=1;renderCatalog();});searchInput.dataset.settingsBound="true";}
    if(categoryFilter&&!categoryFilter.dataset.settingsBound){categoryFilter.addEventListener("change",function(){currentPage=1;renderCatalog();});categoryFilter.dataset.settingsBound="true";}
    if(statusFilter&&!statusFilter.dataset.settingsBound){statusFilter.addEventListener("change",function(){currentPage=1;renderCatalog();});statusFilter.dataset.settingsBound="true";}
  }

  function getCatalogItems() {
    const query=(searchInput?searchInput.value:"").toLocaleLowerCase("fa").trim();
    const category=categoryFilter?categoryFilter.value:"";
    const status=statusFilter?statusFilter.value:"";
    return database.items.filter(function(item){
      const searchable=[item.code,item.name,item.latinName,item.category,item.location,item.barcode,item.supplier].join(" ").toLocaleLowerCase("fa");
      const categoryOk=!category||item.category===category;
      const statusOk=!status||(status==="low_stock"?item.stock>0&&item.stock<=item.minStock:status==="out_of_stock"?item.stock<=0:status==="active"?item.status==="active":item.status===status);
      return searchable.includes(query)&&categoryOk&&statusOk;
    });
  }
  function setupCatalogPager() {
    if(catalogPager||!catalogTable)return;
    catalogPager=document.createElement("div");catalogPager.className="report-app-pager";catalogPager.id="settingsCatalogPagination";
    const holder=catalogTable.closest(".overflow-x-auto")||catalogTable.parentElement;
    holder.insertAdjacentElement("afterend",catalogPager);
  }
  function renderCatalog() {
    if(!database||!catalogBody)return;
    filteredItems=getCatalogItems();
    const pages=Math.max(1,Math.ceil(filteredItems.length/pageSize));
    if(currentPage>pages)currentPage=1;
    const begin=(currentPage-1)*pageSize;
    catalogBody.innerHTML=filteredItems.slice(begin,begin+pageSize).map(function(item){
      const status=item.status||(item.stock===0?"out_of_stock":item.stock<=item.minStock?"low_stock":"active");
      const badge=status==="active"?"bg-tertiary-fixed text-on-tertiary-fixed":status==="low_stock"?"bg-[#fff1c2] text-[#7a4d00]":"bg-error-container text-on-error-container";
      return "<tr class=\"h-11 bg-surface-container-lowest hover:bg-surface-container-low transition-colors\" data-catalog-code=\""+appEscape(item.code)+"\">"+
        "<td class=\"px-space-md py-space-xs\"><div class=\"flex items-center gap-space-xs\"><button type=\"button\" data-copy-code=\""+appEscape(item.code)+"\" class=\"bg-surface-container-high px-space-xs py-0.5 rounded font-tabular-data text-tabular-data font-bold text-primary dir-ltr\">"+appEscape(item.code)+"</button></div></td>"+
        "<td class=\"px-space-md py-space-xs\"><div class=\"flex flex-col\"><span class=\"font-semibold\">"+appEscape(item.name)+"</span><span class=\"text-label-sm text-on-surface-variant\">"+appEscape(item.latinName||"")+"</span></div></td>"+
        "<td class=\"px-space-md py-space-xs\">"+appEscape(item.category)+"</td><td class=\"px-space-md py-space-xs text-center\">"+appEscape(item.unit)+"</td>"+
        "<td class=\"px-space-md py-space-xs text-center font-bold\">"+appFaNumber(item.stock)+"</td><td class=\"px-space-md py-space-xs text-center\">"+appFaNumber(item.minStock)+"</td>"+
        "<td class=\"px-space-md py-space-xs\">"+appEscape(item.location||"—")+"</td>"+
        "<td class=\"px-space-md py-space-xs text-center\"><span class=\"rounded-full px-2 py-1 text-label-sm "+badge+"\">"+appEscape(statusNames[status]||status)+"</span></td>"+
        "<td class=\"px-space-md py-space-xs text-center whitespace-nowrap\"><button type=\"button\" data-edit-code=\""+appEscape(item.code)+"\" title=\"ویرایش کالا\" class=\"p-1 text-primary\"><span class=\"material-symbols-outlined text-[18px]\">edit</span></button> <button type=\"button\" data-delete-code=\""+appEscape(item.code)+"\" title=\"حذف کالا\" class=\"p-1 text-error\"><span class=\"material-symbols-outlined text-[18px]\">delete</span></button></td></tr>";
    }).join("")||"<tr><td colspan=\"9\" class=\"p-8 text-center text-on-surface-variant\">قلم کالایی با این فیلتر پیدا نشد.</td></tr>";
    const counter=Array.from(document.querySelectorAll("#content-tab-coding span")).find(function(span){return (span.textContent||"").includes("نمایش")&&(span.textContent||"").includes("ردیف");});
    if(counter)counter.textContent="نمایش "+appFaNumber(Math.min(pageSize,filteredItems.length))+" از "+appFaNumber(filteredItems.length)+" ردیف";
    setupCatalogPager();
    if(catalogPager){
      const start=filteredItems.length?begin+1:0,end=Math.min(begin+pageSize,filteredItems.length);
      let links="";
      for(let p=Math.max(1,currentPage-2);p<=Math.min(pages,Math.max(1,currentPage-2)+4);p++)links+="<button type=\"button\" data-settings-page=\""+p+"\""+(p===currentPage?" aria-current=\"page\"":"")+">"+appFaNumber(p)+"</button>";
      catalogPager.innerHTML="<span>نمایش "+appFaNumber(start)+" تا "+appFaNumber(end)+" از "+appFaNumber(filteredItems.length)+" قلم کالا</span><div class=\"pager-actions\"><button type=\"button\" data-settings-page=\""+(currentPage-1)+"\""+(currentPage<=1?" disabled":"")+">قبلی</button>"+links+"<button type=\"button\" data-settings-page=\""+(currentPage+1)+"\""+(currentPage>=pages?" disabled":"")+">بعدی</button></div>";
    }
  }
  function updateCategorySelects() {
    const parts=findFormParts();
    if(parts&&parts.selects[0])parts.selects[0].innerHTML=database.categories.map(function(c){return "<option value=\""+appEscape(c.id)+"\">"+appEscape(c.name)+"</option>";}).join("");
    if(categoryFilter){
      const current=categoryFilter.value;
      categoryFilter.innerHTML="<option value=\"\">همه گروه‌های کالا</option>"+database.categories.map(function(c){return "<option value=\""+appEscape(c.name)+"\">"+appEscape(c.name)+"</option>";}).join("");
      categoryFilter.value=current;
    }
  }

  function saveItemToDb() {
    const parts=findFormParts();
    if(!parts||!database)return;
    const inputs=parts.inputs,selects=parts.selects;
    const code=(inputs[0]&&inputs[0].value.trim().toUpperCase())||"";
    const name=(inputs[2]&&inputs[2].value.trim())||"";
    if(!code||!name)return showAppNotice("اطلاعات ناقص است","کد تدارکاتی و نام کالا را وارد کنید.","error");
    const category=database.categories.find(function(c){return c.id===(selects[0]&&selects[0].value);})||database.categories[0];
    const existing=database.items.find(function(item){return item.code===code;});
    const number=database.items.length+1;
    const stock=existing?Number(existing.stock||0):0;
    const unit=(selects[1]&&selects[1].value)||"عدد";
    const minStock=Number(inputs[4]&&inputs[4].value||0);
    const status=(selects[2]&&selects[2].value)||"active";
    const item={
      id:existing?existing.id:"ITEM-"+String(number).padStart(4,"0"),code:code,name:name,
      latinName:(inputs[3]&&inputs[3].value.trim())||"",category:category.name,categoryId:category.id,unit:unit,
      stock:stock,reserved:existing?Number(existing.reserved||0):0,minStock:minStock,
      maxStock:Number(inputs[5]&&inputs[5].value||100),unitPrice:existing?Number(existing.unitPrice||0):0,
      location:(inputs[6]&&inputs[6].value.trim())||"قفسه جدید",warehouseId:existing?existing.warehouseId:((database.warehouses[0]||{}).id||"WH-001"),
      barcode:existing?existing.barcode:"626"+String(1000000000+number),supplier:existing?existing.supplier:"تأمین‌کننده جدید",
      status:status==="active"?(stock===0?"out_of_stock":stock<=minStock?"low_stock":"active"):status,
      description:(inputs[3]&&inputs[3].value.trim())||""
    };
    if(existing)Object.assign(existing,item);else database.items.push(item);
    database.settings.nextSkuNumber=Math.max(Number(database.settings.nextSkuNumber||101),database.items.length+1);
    saveAppDatabase(database);renderCatalog();showAppNotice("کالا ذخیره شد",item.name+" در تغییرات محلی مرورگر ثبت شد.");
  }
  window.saveItemToDb=saveItemToDb;

  function autoFillCode() {
    const form=findFormParts();if(!form||!database)return;
    const input=form.inputs[0];if(!input)return;
    const next=Math.max(Number(database.settings.nextSkuNumber||101),database.items.length+1);
    input.value="MLZ-"+String(next).padStart(4,"0");
  }
  window.autoFillCode=autoFillCode;

  function triggerDbBackup() {
    if(!database)return;
    downloadAppFile("malzomat-backup.json",JSON.stringify(database,null,2),"application/json;charset=utf-8");
    showAppNotice("نسخه پشتیبان آماده شد","فایل JSON شامل کاتالوگ، گردش‌ها، مقصدها و تنظیمات دانلود شد.");
  }
  window.triggerDbBackup=triggerDbBackup;

  function printBarcodeLabel() {
    const modal=document.getElementById("barcodeModal");
    if(modal){modal.classList.remove("hidden");modal.style.display="";}
    else window.print();
  }
  window.printBarcodeLabel=printBarcodeLabel;
  function closeBarcodeModal() {
    const modal=document.getElementById("barcodeModal");
    if(modal){modal.classList.add("hidden");modal.style.display="none";}
  }
  window.closeBarcodeModal=closeBarcodeModal;

  function panelContent(key) {
    if(key==="tab-categories"){
      return "<div class=\"settings-panel-toolbar\"><div><h2>گروه‌بندی کالاها</h2><p>دسته‌بندی مستقیم از database.json خوانده می‌شود.</p></div><button class=\"settings-panel-action\" data-add-category>افزودن گروه</button></div><div class=\"overflow-x-auto\"><table><thead><tr><th>شناسه</th><th>نام گروه</th><th>تعداد قلم</th><th>عملیات</th></tr></thead><tbody>"+database.categories.map(function(c){return "<tr><td>"+appEscape(c.id)+"</td><td>"+appEscape(c.name)+"</td><td>"+appFaNumber(database.items.filter(function(i){return i.categoryId===c.id||i.category===c.name;}).length)+"</td><td><button class=\"settings-panel-action secondary\" data-rename-category=\""+appEscape(c.id)+"\">تغییر نام</button></td></tr>";}).join("")+"</tbody></table></div>";
    }
    if(key==="tab-units"){
      return "<div class=\"settings-panel-toolbar\"><div><h2>واحدهای شمارش</h2><p>واحدها برای ثبت کالا و حواله استفاده می‌شوند.</p></div><button class=\"settings-panel-action\" data-add-unit>افزودن واحد</button></div><div class=\"overflow-x-auto\"><table><thead><tr><th>شناسه</th><th>عنوان واحد</th><th>قلم‌های دارای این واحد</th><th>عملیات</th></tr></thead><tbody>"+(database.units||[]).map(function(u){return "<tr><td>"+appEscape(u.id)+"</td><td>"+appEscape(u.name)+"</td><td>"+appFaNumber(database.items.filter(function(i){return i.unit===u.name;}).length)+"</td><td><button class=\"settings-panel-action secondary\" data-rename-unit=\""+appEscape(u.id)+"\">تغییر نام</button></td></tr>";}).join("")+"</tbody></table></div>";
    }
    if(key==="tab-destinations"){
      return "<div class=\"settings-panel-toolbar\"><div><h2>مقصدها و محل‌های تحویل</h2><p>مقصدهای استفاده‌شده در حواله مصرف و برگه خروج.</p></div><button class=\"settings-panel-action\" data-add-destination>تعریف مقصد جدید</button></div><div class=\"overflow-x-auto\"><table><thead><tr><th>کد مقصد</th><th>عنوان مقصد</th><th>مسئول تحویل</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>"+(database.destinations||[]).map(function(d){return "<tr><td>"+appEscape(d.id)+"</td><td>"+appEscape(d.name)+"</td><td>"+appEscape(d.manager||"—")+"</td><td><span class=\"settings-status-badge\">"+(d.status==="active"?"فعال":"غیرفعال")+"</span></td><td><button class=\"settings-panel-action secondary\" data-edit-destination=\""+appEscape(d.id)+"\">ویرایش</button> <button class=\"settings-panel-action secondary\" data-delete-destination=\""+appEscape(d.id)+"\">حذف</button></td></tr>";}).join("")+"</tbody></table></div>";
    }
    if(key==="tab-approvals"){
      return "<h2>گردش کار و سطوح تأیید</h2><p>قواعد زیر برای رفتار نمونه صفحات استفاده می‌شوند.</p><div class=\"grid grid-cols-1 md:grid-cols-2 gap-space-md\"><label><span>تأیید مدیر برای حواله مصرف الزامی باشد</span><input type=\"checkbox\" data-setting-approval "+(database.settings.approvalRequired?"checked":"")+"></label><label><span>هشدار نقطه سفارش فعال باشد</span><input type=\"checkbox\" data-setting-lowstock "+(database.settings.lowStockAlerts?"checked":"")+"></label></div><button class=\"settings-panel-action\" data-save-approvals>ذخیره قوانین</button>";
    }
    if(key==="tab-numbering"){
      return "<h2>قالب شماره‌گذاری اسناد</h2><p>پیشوند و شماره بعدی سند برای ایجاد ردیف‌های آزمایشی ذخیره می‌شود.</p><div class=\"grid grid-cols-1 md:grid-cols-3 gap-space-md\"><label>پیشوند حواله<input type=\"text\" data-numbering=\"transactionPrefix\" value=\""+appEscape(database.settings.transactionPrefix||"HW")+"\"></label><label>پیشوند خروج گیت<input type=\"text\" data-numbering=\"gatePassPrefix\" value=\""+appEscape(database.settings.gatePassPrefix||"GP")+"\"></label><label>شماره بعدی کد کالا<input type=\"number\" min=\"1\" data-numbering=\"nextSkuNumber\" value=\""+Number(database.settings.nextSkuNumber||101)+"\"></label></div><button class=\"settings-panel-action\" data-save-numbering>ذخیره قالب‌ها</button>";
    }
    return "<div class=\"settings-panel-toolbar\"><div><h2>سطوح دسترسی و کاربران</h2><p>کاربران نمونه سامانه و وضعیت حساب کاربری.</p></div><button class=\"settings-panel-action\" data-add-user>افزودن کاربر</button></div><div class=\"overflow-x-auto\"><table><thead><tr><th>نام کاربر</th><th>سمت</th><th>واحد</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>"+(database.users||[]).map(function(u){return "<tr><td>"+appEscape(u.name)+"</td><td>"+appEscape(u.role)+"</td><td>"+appEscape(u.department||"—")+"</td><td><span class=\"settings-status-badge\">"+(u.status==="active"?"فعال":"غیرفعال")+"</span></td><td><button class=\"settings-panel-action secondary\" data-toggle-user=\""+appEscape(u.id)+"\">"+(u.status==="active"?"غیرفعال‌کردن":"فعال‌کردن")+"</button></td></tr>";}).join("")+"</tbody></table></div>";
  }

  function setupGeneratedPanels() {
    const coding=document.getElementById("content-tab-coding");
    if(!coding)return;
    generatedPanels=document.getElementById("settings-generated-panels");
    if(!generatedPanels){
      generatedPanels=document.createElement("div");generatedPanels.id="settings-generated-panels";
      coding.insertAdjacentElement("afterend",generatedPanels);
    }
    generatedPanels.innerHTML=["tab-categories","tab-units","tab-destinations","tab-approvals","tab-numbering","tab-security"].map(function(key){
      return "<section class=\"settings-dynamic-panel\" id=\"content-"+key+"\" data-settings-panel=\""+key+"\" style=\"display:none\">"+panelContent(key)+"</section>";
    }).join("");
    Array.from(document.querySelectorAll(".admin-tab-btn")).forEach(function(button){button.setAttribute("aria-controls","content-"+button.id.replace("btn-",""));});
  }

  function renderSettingsPanels() {
    if(!generatedPanels)return;
    const activeButton=document.querySelector(".admin-tab-btn.bg-primary");
    const activeKey=activeButton?activeButton.id.replace("btn-",""):"tab-coding";
    generatedPanels.innerHTML=["tab-categories","tab-units","tab-destinations","tab-approvals","tab-numbering","tab-security"].map(function(key){
      return "<section class=\"settings-dynamic-panel\" id=\"content-"+key+"\" data-settings-panel=\""+key+"\" style=\"display:"+(key===activeKey?"flex":"none")+"\">"+panelContent(key)+"</section>";
    }).join("");
  }

  function switchAdminTab(tabKey) {
    const key=tabKey||"tab-coding";
    document.querySelectorAll(".admin-tab-btn").forEach(function(btn){
      btn.classList.remove("bg-primary","text-on-primary","font-bold","shadow-sm");
      btn.classList.add("text-on-surface-variant");
      btn.setAttribute("aria-selected","false");
    });
    const active=document.getElementById("btn-"+key);
    if(active){active.classList.add("bg-primary","text-on-primary","font-bold","shadow-sm");active.classList.remove("text-on-surface-variant");active.setAttribute("aria-selected","true");}
    const coding=document.getElementById("content-tab-coding");
    if(coding)coding.style.display=key==="tab-coding"?"":"none";
    if(generatedPanels)generatedPanels.style.display=key==="tab-coding"?"none":"";
    if(key!=="tab-coding"&&generatedPanels){
      const all=generatedPanels.querySelectorAll("[data-settings-panel]");
      all.forEach(function(panel){panel.style.display=panel.dataset.settingsPanel===key?"flex":"none";});
      if(!generatedPanels.querySelector("[data-settings-panel='"+key+"']"))renderSettingsPanels();
    }
    if(key==="tab-coding")renderCatalog();
  }
  window.switchAdminTab=switchAdminTab;

  function editCatalogItem(code) {
    const item=database.items.find(function(row){return row.code===code;});
    const parts=findFormParts();if(!item||!parts)return;
    const inputs=parts.inputs,selects=parts.selects;
    if(inputs[0])inputs[0].value=item.code;
    if(inputs[1])inputs[1].value="";
    if(inputs[2])inputs[2].value=item.name;
    if(inputs[3])inputs[3].value=item.latinName||"";
    if(inputs[4])inputs[4].value=item.minStock;
    if(inputs[5])inputs[5].value=item.maxStock;
    if(inputs[6])inputs[6].value=item.location||"";
    if(selects[0])selects[0].value=item.categoryId||(database.categories.find(function(c){return c.name===item.category;})||{}).id;
    if(selects[1])selects[1].value=item.unit;
    if(selects[2])selects[2].value=item.status||"active";
    document.getElementById("itemCatalogForm").scrollIntoView({behavior:"smooth",block:"start"});
    showAppNotice("ویرایش کالا","اطلاعات "+item.code+" در فرم بارگذاری شد؛ پس از تغییر روی ثبت کالا بزنید.");
  }

  function addCategory() {
    openAppDialog("افزودن گروه کالا",[{name:"name",label:"نام گروه جدید",type:"text"}],function(v){
      if(database.categories.some(function(c){return c.name.toLocaleLowerCase("fa")===v.name.toLocaleLowerCase("fa");}))return showAppNotice("گروه تکراری است","نام گروه باید یکتا باشد.","error");
      const slug="custom-"+Date.now();
      database.categories.push({id:slug,name:v.name,slug:slug,icon:"category"});
      saveAppDatabase(database);updateCategorySelects();renderCatalog();renderSettingsPanels();showAppNotice("گروه اضافه شد",v.name+" به فهرست گروه‌ها افزوده شد.");
    });
  }
  function addUnit() {
    openAppDialog("افزودن واحد سنجش",[{name:"name",label:"عنوان واحد",type:"text"}],function(v){
      if(database.units.some(function(u){return u.name===v.name;}))return showAppNotice("واحد تکراری است","این واحد قبلاً ثبت شده است.","error");
      database.units.push({id:"unit-"+Date.now(),name:v.name});saveAppDatabase(database);setupFormOptions();renderSettingsPanels();showAppNotice("واحد اضافه شد",v.name+" در تنظیمات ثبت شد.");
    });
  }
  function addDestination() {
    openAppDialog("تعریف مقصد جدید",[{name:"name",label:"عنوان مقصد",type:"text"},{name:"manager",label:"مسئول تحویل",type:"text"},{name:"status",label:"وضعیت",type:"select",options:[{value:"active",label:"فعال"},{value:"inactive",label:"غیرفعال"}]}],function(v){
      database.destinations.push({id:"DST-"+String(database.destinations.length+1).padStart(3,"0"),name:v.name,manager:v.manager,status:v.status});
      saveAppDatabase(database);renderSettingsPanels();showAppNotice("مقصد ثبت شد",v.name+" به مقاصد مجاز اضافه شد.");
    });
  }
  function addUser() {
    openAppDialog("افزودن کاربر سامانه",[{name:"name",label:"نام و نام خانوادگی",type:"text"},{name:"role",label:"سمت سازمانی",type:"text"},{name:"department",label:"واحد سازمانی",type:"text"},{name:"status",label:"وضعیت حساب",type:"select",options:[{value:"active",label:"فعال"},{value:"inactive",label:"غیرفعال"}]}],function(v){
      database.users.push({id:"USR-"+String(database.users.length+1).padStart(3,"0"),name:v.name,role:v.role,department:v.department,status:v.status});
      saveAppDatabase(database);renderSettingsPanels();showAppNotice("کاربر ثبت شد",v.name+" به فهرست کاربران نمونه اضافه شد.");
    });
  }


  async function resetDatabaseSeed() {
    if (!window.confirm("تمام تغییرات آزمایشی ذخیره‌شده در این مرورگر پاک و داده‌های اولیه database.json جایگزین شوند؟")) return;
    try {
      const response = await fetch(new URL("database.json", window.location.href), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const seed = await response.json();
      localStorage.setItem(APP_DB_STORAGE_KEY, JSON.stringify(seed));
      localStorage.removeItem("malzomat.voucher.draft.v1");
      showAppNotice("داده‌های نمونه بازگردانی شد", "صفحه برای بارگذاری دوباره به‌روزرسانی می‌شود.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      showAppNotice("بازگردانی ناموفق بود", "اجرای صفحه را از طریق IIS یا وب‌سرور محلی بررسی کنید.", "error");
    }
  }

  function init() {
    catalogTable=document.querySelector("#content-tab-coding table");
    catalogBody=catalogTable?catalogTable.querySelector("tbody"):null;
    setupFormOptions();setupGeneratedPanels();
    renderCatalog();renderSettingsPanels();
    document.querySelectorAll(".admin-tab-btn").forEach(function(btn){
      btn.addEventListener("click",function(){switchAdminTab(btn.id.replace("btn-",""));});
    });
    const form=document.getElementById("itemCatalogForm");
    if(form){
      form.addEventListener("submit",function(event){event.preventDefault();saveItemToDb();});
      const parts=findFormParts();
      if(parts&&parts.inputs[0]&&database.items.some(function(item){return item.code===parts.inputs[0].value;}))editCatalogItem(parts.inputs[0].value);
      else if(parts&&parts.inputs[0])parts.inputs[0].value="MLZ-"+String(Math.max(Number(database.settings.nextSkuNumber||101),database.items.length+1)).padStart(4,"0");
    }
    const resetSeedButton=document.getElementById("btn-reset-sample-db");
    if(resetSeedButton)resetSeedButton.addEventListener("click",resetDatabaseSeed);
    document.addEventListener("click",function(event){
      const pageButton=event.target.closest("[data-settings-page]");
      if(pageButton&&!pageButton.disabled){currentPage=Number(pageButton.dataset.settingsPage)||1;renderCatalog();return;}
      const edit=event.target.closest("[data-edit-code]");
      if(edit){editCatalogItem(edit.dataset.editCode);return;}
      const del=event.target.closest("[data-delete-code]");
      if(del){
        if(!window.confirm("قلم "+del.dataset.deleteCode+" از فهرست نمونه حذف شود؟"))return;
        database.items=database.items.filter(function(item){return item.code!==del.dataset.deleteCode;});
        saveAppDatabase(database);renderCatalog();renderSettingsPanels();showAppNotice("قلم حذف شد","کالا از داده‌های محلی مرورگر حذف شد.");return;
      }
      const copy=event.target.closest("[data-copy-code]");
      if(copy){
        const code=copy.dataset.copyCode;
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code).then(function(){showAppNotice("کپی شد",code);}).catch(function(){showAppNotice("کد کالا",code);});
        else showAppNotice("کد کالا",code);
        return;
      }
      const button=event.target.closest("button");if(!button)return;
      const text=button.innerText.replace(/\s+/g," ").trim();
      if(button.hasAttribute("data-auto-fill-code")){autoFillCode();return;}
      else if(button.hasAttribute("data-copy-code-input")){
        const input=document.getElementById(button.dataset.copyCodeInput);
        if(input&&navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(input.value).then(function(){showAppNotice("کپی شد",input.value);}).catch(function(){showAppNotice("کد کالا",input.value);});
        else if(input)showAppNotice("کد کالا",input.value);
        return;
      } else if(button.hasAttribute("data-close-barcode")){closeBarcodeModal();return;}
      else if(button.hasAttribute("data-print-barcode")){window.print();return;}
      else if(text.includes("view_column")){if(catalogTable)catalogTable.classList.toggle("catalog-compact");showAppNotice("نمایش جدول",catalogTable&&catalogTable.classList.contains("catalog-compact")?"نمایش فشرده فعال شد.":"نمایش استاندارد فعال شد.");return;}
      else if(button.hasAttribute("data-add-category"))addCategory();
      else if(button.hasAttribute("data-add-unit"))addUnit();
      else if(button.hasAttribute("data-add-destination"))addDestination();
      else if(button.hasAttribute("data-add-user"))addUser();
      else if(text.includes("تعریف مقصد جدید"))addDestination();
      else if(button.hasAttribute("data-rename-category")){
        const cat=database.categories.find(function(c){return c.id===button.dataset.renameCategory;});if(!cat)return;
        openAppDialog("تغییر نام گروه",[{name:"name",label:"نام جدید",type:"text",value:cat.name}],function(v){
          const oldName=cat.name;cat.name=v.name;
          database.items.forEach(function(item){if(item.categoryId===cat.id||item.category===oldName){item.category=cat.name;item.categoryId=cat.id;}});
          saveAppDatabase(database);updateCategorySelects();renderCatalog();renderSettingsPanels();showAppNotice("گروه اصلاح شد","نام گروه و کالاهای وابسته به‌روزرسانی شدند.");
        });
      } else if(button.hasAttribute("data-rename-unit")){
        const unit=database.units.find(function(u){return u.id===button.dataset.renameUnit;});if(!unit)return;
        openAppDialog("تغییر نام واحد",[{name:"name",label:"نام جدید واحد",type:"text",value:unit.name}],function(v){
          const old=unit.name;unit.name=v.name;database.items.forEach(function(item){if(item.unit===old)item.unit=v.name;});
          saveAppDatabase(database);setupFormOptions();renderCatalog();renderSettingsPanels();showAppNotice("واحد تغییر کرد","نام واحد در کاتالوگ نیز به‌روزرسانی شد.");
        });
      } else if(button.hasAttribute("data-edit-destination")){
        const d=database.destinations.find(function(entry){return entry.id===button.dataset.editDestination;});if(!d)return;
        openAppDialog("ویرایش مقصد",[{name:"name",label:"عنوان مقصد",type:"text",value:d.name},{name:"manager",label:"مسئول تحویل",type:"text",value:d.manager},{name:"status",label:"وضعیت",type:"select",value:d.status,options:[{value:"active",label:"فعال"},{value:"inactive",label:"غیرفعال"}]}],function(v){Object.assign(d,v);saveAppDatabase(database);renderSettingsPanels();showAppNotice("مقصد ذخیره شد",d.name);});
      } else if(button.hasAttribute("data-delete-destination")){
        if(!window.confirm("این مقصد حذف شود؟"))return;
        database.destinations=database.destinations.filter(function(d){return d.id!==button.dataset.deleteDestination;});saveAppDatabase(database);renderSettingsPanels();showAppNotice("مقصد حذف شد","فهرست مقاصد به‌روزرسانی شد.");
      } else if(button.hasAttribute("data-toggle-user")){
        const u=database.users.find(function(x){return x.id===button.dataset.toggleUser;});if(!u)return;u.status=u.status==="active"?"inactive":"active";saveAppDatabase(database);renderSettingsPanels();showAppNotice("دسترسی کاربر تغییر کرد",u.name+" اکنون "+(u.status==="active"?"فعال":"غیرفعال")+" است.");
      } else if(button.hasAttribute("data-save-approvals")){
        const panel=button.closest("[data-settings-panel]");
        database.settings.approvalRequired=Boolean(panel.querySelector("[data-setting-approval]").checked);
        database.settings.lowStockAlerts=Boolean(panel.querySelector("[data-setting-lowstock]").checked);
        saveAppDatabase(database);showAppNotice("قوانین ذخیره شد","تنظیمات تأیید و هشدار در مرورگر ذخیره شدند.");
      } else if(button.hasAttribute("data-save-numbering")){
        const panel=button.closest("[data-settings-panel]");
        panel.querySelectorAll("[data-numbering]").forEach(function(input){database.settings[input.dataset.numbering]=input.dataset.numbering==="nextSkuNumber"?Number(input.value):input.value.trim();});
        saveAppDatabase(database);showAppNotice("قالب شماره‌گذاری ذخیره شد","قالب سندها و شمارنده کالاها به‌روزرسانی شد.");
      } else if(text.includes("بک‌آپ")||text.includes("نسخه پشتیبان"))triggerDbBackup();
      else if(text==="download"||text.includes("download")||text.includes("دانلود")){
        const rows=[["کد کالا","نام کالا","گروه","واحد","موجودی","حداقل موجودی","محل نگهداری"]].concat(filteredItems.map(function(item){return [item.code,item.name,item.category,item.unit,item.stock,item.minStock,item.location];}));
        const csv="\\uFEFF"+rows.map(function(row){return row.map(function(value){return "\\\""+String(value==null?"":value).replace(/\\\"/g,"\\\"\\\"")+"\\\"";}).join(",");}).join("\\r\\n");
        downloadAppFile("malzomat-catalog.csv",csv,"text/csv;charset=utf-8");showAppNotice("خروجی کاتالوگ آماده شد",appFaNumber(filteredItems.length)+" قلم کالا در CSV صادر شد.");
      }
      else if(text.includes("ذخیره تغییرات پیکربندی")){saveAppDatabase(database);showAppNotice("تنظیمات ذخیره شد","داده‌های قابل تغییر در حافظه محلی مرورگر نگهداری شدند.");}
      else if(text.includes("بروزرسانی رجیستر")){renderCatalog();showAppNotice("رجیستر به‌روزرسانی شد",appFaNumber(database.items.length)+" قلم از پایگاه نمونه بارگذاری شد.");}
      else if(text.includes("تعریف گروه جدید"))addCategory();
      else if(text.includes("چاپ"))printBarcodeLabel();
    });
    document.addEventListener("change",function(event){
      if(event.target.matches("[data-setting-approval],[data-setting-lowstock]")){
        showAppNotice("تغییر ثبت نشده","برای ذخیره این تنظیمات، دکمه «ذخیره قوانین» را بزنید.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded",function(){
    loadAppDatabase().then(function(loaded){database=loaded;init();}).catch(function(error){
      console.error(error);showAppNotice("خطا در بارگذاری داده‌ها","برای بارگذاری database.json از IIS یا وب‌سرور محلی استفاده کنید.","error");
    });
  });
})();
