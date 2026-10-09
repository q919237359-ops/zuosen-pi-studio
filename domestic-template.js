/* Domestic supply-contract layout, based on the supplied one-page Chinese PDF. */
(() => {
  'use strict';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const printableDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').map(Number).join('/') : String(value || '');
  const unlabel = (value, labels) => String(value || '').replace(new RegExp(`^(?:${labels.join('|')})[：:]\\s*`), '').trim();

  function render(state, result, options = {}) {
    const esc = options.esc || escape;
    const number = options.number || ((value, places = 2) => Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits:0, maximumFractionDigits:places}));
    const meta = state.meta || {}, domestic = state.domestic || {};
    const seller = state.seller || {}, buyer = state.buyer || {}, bank = state.bank || {};
    const items = Array.isArray(state.items) ? state.items : [];
    const date = printableDate(meta.date);
    const logo = state.logoId === 'none' ? '' : state.logoDataUrl || (state.logoId === 'domestic' ? './assets/zuosen-domestic-logo.jpg' : './assets/zuosen-logo.jpeg');
    const detail = (label, value, extraClass = '') => `<div class="domestic-party-line ${extraClass}"><span>${label}</span><div>${esc(value)}</div></div>`;
    const party = (party, side, fax = '') => `${detail(side === 'seller' ? '供　方：' : '需　方：', party.name, 'domestic-party-company')}${detail('联系人：', party.contact)}${detail('电　话：', party.phone)}${detail('地　址：', party.address, 'domestic-party-address')}${fax ? detail('传　真：', fax) : ''}${side === 'buyer' && party.email ? detail('邮　箱：', party.email) : ''}`;
    const lines = result.lines || [];
    let rowIndex = 0;
    const rows = items.map((item, index) => {
      const line = lines.find((value, lineIndex) => (value.index ?? lineIndex) === index);
      const extraDescription = item.model && item.description && item.description !== item.model ? `<div class="domestic-item-detail">${esc(item.description)}</div>` : '';
      const model = item.model || item.description;
      return `<tr class="domestic-item-row"><td>${++rowIndex}</td><td class="domestic-model">${esc(model)}${extraDescription}${item.specification ? `<div class="domestic-item-detail">${esc(item.specification)}</div>` : ''}</td><td>${esc(item.unit)}</td><td>${esc(item.quantity)}</td><td>${esc(number(item.unitPrice, 4))}</td><td>${esc(number(line?.amount))}</td><td>${esc(item.marks)}</td></tr>`;
    }).join('');
    let blankRows = '';
    while (rowIndex < 3) blankRows += `<tr class="domestic-item-row domestic-blank-row"><td>${++rowIndex}</td><td>${rowIndex === items.length + 1 ? '以下空白' : ''}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    const charge = (label, amount) => `<tr class="domestic-item-row domestic-charge-row"><td>${++rowIndex}</td><td colspan="4">${label}</td><td>${esc(number(amount))}</td><td></td></tr>`;
    const charges = (result.shipping ? charge('运费', result.shipping) : '') + (result.other ? charge('其他费用', result.other) : '') + (result.discount ? charge('优惠金额', -result.discount) : '');
    const quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const taxAndShipping = [domestic.taxNote, domestic.shipping].filter(value => String(value || '').trim()).map(value => String(value).trim().replace(/[，,。；;]+$/, '')).join('，');
    const terms = [
      taxAndShipping,
      `货期：${unlabel(meta.leadTime, ['货期'])}`,
      `付款方式：${unlabel(meta.paymentTerms, ['付款方式'])}`,
      domestic.responsibility ? `验货：${unlabel(domestic.responsibility, ['验货', '验收', '验收约定'])}` : '',
      domestic.quality,
      domestic.dispute
    ].filter(value => String(value || '').trim());
    const termRows = terms.map((term, index) => `<tr class="domestic-term-row"><td colspan="7"><div>${index + 1}.${esc(String(term).replace(/[。]+$/, ''))}。</div></td></tr>`).join('');
    const uppercase = window.PIUtils?.amountInChinese ? window.PIUtils.amountInChinese(result.total) : '';
    const seal = options.sealSrc ? `<img width="153" height="153" class="domestic-company-seal" src="${esc(options.sealSrc)}" alt="${esc(seller.name)}公章">` : '';
    const signature = (name, contact, side) => `${detail(side === 'seller' ? '供　方：' : '需　方：', name ? `${name}(公章)` : '')}${detail('经手人：', contact)}${detail('日　期：', date)}`;

    return `<table class="source-table domestic-table" aria-label="国内供货合同"><colgroup><col style="width:10.5%"><col style="width:29%"><col style="width:7.5%"><col style="width:10.5%"><col style="width:11.1%"><col style="width:14.8%"><col style="width:16.6%"></colgroup><tbody>
      <tr><td colspan="7" class="source-heading"><div class="domestic-heading ${logo ? '' : 'domestic-no-logo'}">${logo ? `<img width="238" height="49" class="domestic-logo" src="${esc(logo)}" alt="公司标志">` : ''}<strong>${esc(seller.name)}</strong></div><div class="domestic-company-address">公司地址：${esc(seller.address)}</div><div class="domestic-company-email">邮箱：${esc(seller.email)}</div></td></tr>
      <tr><td colspan="7" class="source-title">供货合同</td></tr>
      <tr><td colspan="7" class="domestic-contract-number">合同编号：${esc(meta.number)}</td></tr>
      <tr><td colspan="7" class="domestic-parties-cell"><div class="domestic-parties"><div>${party(seller, 'seller', domestic.sellerFax)}</div><div>${party(buyer, 'buyer', domestic.buyerFax)}</div></div></td></tr>
      <tr><td colspan="7" class="domestic-currency">单位：人民币/元</td></tr>
      <tr class="source-column-head domestic-column-head"><th scope="col">序号</th><th scope="col">型号</th><th scope="col">单位</th><th scope="col">数量</th><th scope="col">单价</th><th scope="col">金额</th><th scope="col">备注</th></tr>
      ${rows}${blankRows}${charges}
      <tr class="domestic-total"><td>${++rowIndex}</td><td>合计</td><td></td><td>${esc(number(quantity, 3))}</td><td></td><td class="domestic-total-amount">¥${esc(Number(result.total || 0).toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2}))}</td><td></td></tr>
      ${uppercase ? `<tr class="domestic-capital"><td colspan="7">人民币大写：${esc(uppercase)}</td></tr>` : ''}
      <tr><td colspan="7" class="domestic-terms-heading">条款：</td></tr>
      ${termRows}
      ${state.notes ? `<tr class="domestic-note-row"><td colspan="7"><div>补充约定：${esc(state.notes)}</div></td></tr>` : ''}
      <tr><td colspan="7" class="domestic-signatures-cell"><div class="domestic-signatures"><div class="domestic-seller-signature">${seal}<div class="domestic-signature-text">${signature(seller.name, seller.contact, 'seller')}</div></div><div>${signature(buyer.name, domestic.buyerAgent, 'buyer')}</div></div>${domestic.signingPlace ? `<div class="domestic-signing-place">签订地点：${esc(domestic.signingPlace)}</div>` : ''}<div class="domestic-greeting">祝<br>商祺！</div><div class="domestic-bank"><div>公司增值税账户如下：</div><div>账户名称：${esc(bank.beneficiary)}</div><div>税　　号：${esc(domestic.taxId)}</div><div>账户号码：${esc(bank.account)}</div><div>开户银行：${esc(bank.bankName)}</div></div></td></tr>
    </tbody></table>`;
  }

  window.DomesticTemplate = Object.freeze({render});
})();
