/* Offline-friendly icon fallback. The original icon text is retained for accessibility and button handlers. */
(function () {
  "use strict";
  const glyphs = {
    account_circle:"●", account_tree:"♧", add:"+", add_box:"⊞", add_circle:"⊕",
    add_location_alt:"⌖", add_shopping_cart:"🛒", admin_panel_settings:"⚙", analytics:"▥",
    anchor:"⚓", apartment:"▤", archive:"▱", arrow_back:"←", arrow_drop_down:"⌄",
    assignment_add:"▤+", assignment_return:"↩", assignment_turned_in:"✓", auto_fix_high:"✦",
    backup:"⤓", badge:"▣", bar_chart:"▥", barcode_scanner:"▦", build:"🔧",
    calculate:"∑", calendar_month:"▦", calendar_today:"◷", cancel:"×", category:"▤",
    check_circle:"✓", checklist:"☷", chevron_left:"‹", chevron_right:"›", close:"×",
    cloud_download:"⤓", cloud_sync:"↻", compare_arrows:"⇄", content_copy:"▢",
    corporate_fare:"▤", database:"▦", date_range:"▦", delete:"×", distance:"↔",
    domain:"▤", done:"✓", done_all:"✓✓", draw:"✎", edit:"✎", edit_note:"✎",
    error_outline:"!", expand_more:"⌄", fact_check:"✓", filter_alt:"▽", filter_list:"☷",
    fingerprint:"◎", first_page:"«", format_list_bulleted_add:"☷+", format_list_numbered_rtl:"≡",
    gpp_good:"✓", health_and_safety:"+", history:"↺", history_edu:"↺", home:"⌂",
    how_to_reg:"✓", hub:"⊙", info:"i", input:"↧", inventory:"▦", inventory_2:"▣",
    last_page:"»", local_gas_station:"⛽", local_shipping:"🚚", lock:"▣", monetization_on:"$",
    move_to_inbox:"↙", notifications:"🔔", open_in_new:"↗", outbox:"↗", output:"↗",
    payments:"$", person:"●", person_check:"●✓", picture_as_pdf:"PDF", pie_chart:"◔",
    pin_drop:"⌖", post_add:"▤+", precision_manufacturing:"⚙", print:"⎙", priority_high:"!",
    published_with_changes:"↻", qr_code_2:"▦", qr_code_scanner:"▦", query_stats:"▥",
    radio_button_unchecked:"○", receipt_long:"▤", refresh:"↻", replay:"↶", report:"▤",
    restart_alt:"↻", rule_settings:"☷", save:"▣", scale:"⚖", schedule:"◷", search:"⌕",
    security:"✓", sensors:"◉", settings:"⚙", shield_person:"⛨", store:"▤",
    straighten:"↔", swap_horiz:"⇄", sync:"↻", table_view:"▦", terminal:">_",
    timelapse:"◴", train:"🚆", trending_up:"↗", tune:"☷", unarchive:"↗", verified:"✓",
    verified_user:"✓", view_column:"▥", view_timeline:"↦", visibility:"◉",
    warehouse:"▦", warning:"!", work:"▣"
  };

  function applyFallback() {
    const fontAvailable = document.fonts && document.fonts.check('24px "Material Symbols Outlined"');
    if (fontAvailable) return;
    const icons = document.querySelectorAll(".material-symbols-outlined");
    icons.forEach(function (icon) {
      if (icon.dataset.iconGlyph) return;
      const name = (icon.textContent || "").trim().split(/\s+/)[0];
      if (!name) return;
      const computedSize = window.getComputedStyle(icon).fontSize || "1rem";
      icon.dataset.iconName = name;
      icon.dataset.iconGlyph = glyphs[name] || "•";
      icon.style.setProperty("--icon-fallback-size", computedSize);
    });
    document.documentElement.classList.add("icons-fallback");
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applyFallback).catch(applyFallback);
  } else {
    applyFallback();
  }
  window.addEventListener("offline", applyFallback);
})();
