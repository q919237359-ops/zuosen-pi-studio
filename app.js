(() => {
  'use strict';
  const U = window.PIUtils;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const STORE = 'pi-studio:v1';
  const TEMPLATE_SELLER = {name:'Shenzhen Zuosen Technology Co., Ltd.',address:'Register ADD: A311-E9, Rongchao Economic and Trade Center, Lianhua Street, Futian District, Shenzhen\nFactory ADD: No. 13 Zhujiao North 2nd Road, Guojiacun Industrial Zone, Danzao Town, Nanhai District, Foshan City, China',contact:'',phone:'',email:'sales@cnzuosen.com'};
  const TEMPLATE_BANK = {beneficiary:'Shenzhen Zuosen Technology Co., Ltd.',bankName:'JPMorgan Chase Bank N.A. Hong Kong Branch',account:'63001388763',swift:'CHASHKHH (CHASHKHHXXX if 11 characters are required)',country:'HONG KONG, CHINA',address:'CHATER HOUSE, 8 CONNAUGHT ROAD, CENTRAL, HONG KONG',paypal:'584611532@qq.com (4.7% charges from PayPal)'};
  const TEMPLATE_TERMS = '100% in advance, pls cover bank charges';
  const TEMPLATE_LEAD = "Within 5 days after receiving the buyer's T/T, 100% in advance";
  const DEMO_CUSTOMER = {name:'ATLAS HOME SUPPLIES (DEMO)',address:'24 Example Avenue, Berlin, Germany',contact:'Alex Morgan',email:'purchasing@example.com',phone:'+49 000 000000'};
  // Catalog p. 25 (printed C01/C02): the ordering example and specifications.
  const DEMO_PRODUCT = {model:'ARL1-16-FR01S-10',description:'ARL1-series Variable Displacement Piston Pump',specification:'Displacement: 16.3 cm³/rev\nPressure: up to 7 MPa · Speed: up to 1800 r/min\nFlange mounting · Clockwise rotation\nPressure compensator control · Right-side suction port',quantity:'1',unit:'PCS',unitPrice:'0',marks:'Catalog sample; price to be confirmed'};
  const sellerFields = [['name','公司名称','text',true],['address','公司地址','textarea',true],['contact','联系人'],['phone','电话','tel'],['email','邮箱','email',true]];
  const bankFields = [['beneficiary','收款人 / Beneficiary','text',true],['bankName','收款银行 / Bank name','text',true],['account','银行账号 / Account No.'],['swift','SWIFT / BIC'],['country','银行所在国家 / Country','text',true],['address','银行地址 / Bank address','textarea',true],['paypal','PayPal / 支付说明','textarea',true]];
  const productFields = [['description','产品名称 / Description','text',true],['model','型号 / Model No.'],['unit','单位'],['specification','规格说明','textarea',true],['unitPrice','默认单价','number'],['marks','MARKS / 唛头与备注']];
  let currentView = 'editor', panel = 'order', editContext = null, confirmResolver = null, importMode = 'invoice';
  let timer, toastTimer, storageOK = true, previewExpanded = false, previewZoomed = false, pdfBusy = false;
  const mobileQuery=window.matchMedia('(max-width:767px), (pointer:coarse) and (max-width:1024px) and (max-height:550px)');
  const isMobile=()=>mobileQuery.matches;

  function emptyParty() { return {name:'',address:'',contact:'',phone:'',email:''}; }
  function emptyBank() { return {beneficiary:'',bankName:'',account:'',swift:'',country:'',address:'',paypal:''}; }
  function emptyItem() { return {description:'',model:'',specification:'',quantity:'1',unit:'PCS',unitPrice:'0',marks:''}; }
  function blankInvoice() {
    const date = today();
    const prefix = `ZSDP${date.slice(2).replaceAll('-','')}`;
    const used = (db?.history || []).map(x => x.invoice.meta.number).concat(db?.draft?.meta?.number || '');
    let sequence = 1;
    while (used.includes(prefix + String(sequence).padStart(2,'0'))) sequence++;
    const settings = db?.settings || {};
    return {meta:{number:prefix+String(sequence).padStart(2,'0'),date,validUntil:'',currency:settings.currency || 'USD',incoterm:settings.incoterm || '',port:'',leadTime:settings.leadTime || '',paymentTerms:settings.paymentTerms || ''},seller:clone(settings.seller || emptyParty()),buyer:emptyParty(),bank:clone(settings.bank || emptyBank()),items:[emptyItem()],adjustments:{discount:'0',shipping:'0',other:'0',depositPercent:settings.depositPercent || '30'},notes:settings.notes || '',logoDataUrl:settings.logoDataUrl || ''};
  }
  function safeLogo(value) { return typeof value === 'string' && value.length <= 450000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : ''; }
  async function excelCompatibleLogo(value) {
    if(!value.startsWith('data:image/webp;'))return value;
    const image=new Image();image.src=value;await image.decode();
    const canvas=document.createElement('canvas'),scale=Math.min(1,600/image.naturalWidth,300/image.naturalHeight);
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/png');
  }
  function cleanInvoice(raw) {
    const result = U.normalizeState(raw);
    result.logoDataUrl = safeLogo(raw.logoDataUrl);
    return result;
  }
  function cleanParty(raw) { return cleanInvoice({seller:raw || {}}).seller; }
  function cleanProduct(raw) { return cleanInvoice({items:[{...raw,quantity:raw.quantity || '1'}]}).items[0]; }
  function cleanDatabase(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('备份格式不正确');
    const result = {version:1,settings:{},customers:[],products:[],history:[],draft:null,demoCustomerAdded:raw.demoCustomerAdded===true,demoProductAdded:raw.demoProductAdded===true,sourceTemplateApplied:raw.sourceTemplateApplied===true};
    const settings = raw.settings || {};
    result.settings = {...cleanInvoice({seller:settings.seller,bank:settings.bank}).meta,seller:cleanParty(settings.seller),bank:cleanInvoice({bank:settings.bank}).bank,logoDataUrl:safeLogo(settings.logoDataUrl)};
    for (const [key, max] of [['customers',500],['products',500],['history',100]]) {
      if (raw[key] != null && (!Array.isArray(raw[key]) || raw[key].length > max)) throw new Error(`${key} 数据数量超出限制或格式错误`);
    }
    result.customers = (raw.customers || []).map(x => ({...cleanParty(x),id:uid()}));
    result.products = (raw.products || []).map(x => ({...cleanProduct(x),id:uid()}));
    result.history = (raw.history || []).map(x => ({id:uid(),savedAt:String(x.savedAt || '').slice(0,100),invoice:cleanInvoice(x.invoice)}));
    const s = cleanInvoice({meta:{currency:settings.currency,incoterm:settings.incoterm,leadTime:settings.leadTime,paymentTerms:settings.paymentTerms},notes:settings.notes,adjustments:{depositPercent:settings.depositPercent}});
    Object.assign(result.settings,{currency:s.meta.currency,incoterm:s.meta.incoterm,leadTime:s.meta.leadTime,paymentTerms:s.meta.paymentTerms,notes:s.notes,depositPercent:s.adjustments.depositPercent});
    result.draft = raw.draft ? cleanInvoice(raw.draft) : null;
    return result;
  }
  let db = {version:1,settings:{seller:emptyParty(),bank:emptyBank(),currency:'USD',depositPercent:'30',logoDataUrl:''},customers:[],products:[],history:[],draft:null};
  let loadWarning = '', originalStorage = '';
  try {
    const saved = localStorage.getItem(STORE); originalStorage=saved||'';
    if (saved) db = cleanDatabase(JSON.parse(saved));
  } catch (err) { storageOK = false; loadWarning = '本地资料未能读取。现有浏览器数据没有被覆盖，可先导出备份。'; }
  if(!loadWarning&&!db.demoCustomerAdded&&db.customers.length<500){
    if(!db.customers.some(customer=>customer.name===DEMO_CUSTOMER.name&&customer.email===DEMO_CUSTOMER.email))db.customers.push({...DEMO_CUSTOMER,id:uid()});
    db.demoCustomerAdded=true;
  }
  if(!loadWarning&&!db.demoProductAdded&&db.products.length<500){
    if(!db.products.some(product=>product.model===DEMO_PRODUCT.model&&product.description===DEMO_PRODUCT.description))db.products.push({...DEMO_PRODUCT,id:uid()});
    db.demoProductAdded=true;
  }
  // Apply the supplied company's template once; keep any operator-entered data.
  if(!loadWarning&&!db.sourceTemplateApplied){
    const empty = record => !Object.values(record||{}).some(value=>String(value||'').trim());
    if(empty(db.settings.seller)){
      db.settings.seller=clone(TEMPLATE_SELLER);
      if(empty(db.settings.bank))db.settings.bank=clone(TEMPLATE_BANK);
      if(!db.settings.paymentTerms){db.settings.paymentTerms=TEMPLATE_TERMS;db.settings.depositPercent='100';}
      if(!db.settings.leadTime)db.settings.leadTime=TEMPLATE_LEAD;
      if(!db.settings.incoterm)db.settings.incoterm='DAP';
    }
    if(db.draft&&(empty(db.draft.seller)||(db.draft.seller.name==='NORTHLINE TRADING CO., LTD.'&&db.draft.seller.email==='sales@example.com'))){
      db.draft.seller=clone(TEMPLATE_SELLER);
      if(empty(db.draft.bank))db.draft.bank=clone(TEMPLATE_BANK);
      if(!db.draft.meta.paymentTerms){db.draft.meta.paymentTerms=TEMPLATE_TERMS;db.draft.adjustments.depositPercent='100';}
      if(!db.draft.meta.leadTime)db.draft.meta.leadTime=TEMPLATE_LEAD;
    }
    db.sourceTemplateApplied=true;
  }
  let state = db.draft || blankInvoice();

  function toast(message, error = false, undo = null, actionLabel = '撤销') {
    clearTimeout(toastTimer);
    const node = $('#toast'); node.textContent = message; node.classList.toggle('error',error); node.hidden = false;
    if(undo){const button=document.createElement('button');button.type='button';button.className='toast-undo';button.textContent=actionLabel;button.addEventListener('click',()=>{clearTimeout(toastTimer);node.hidden=true;undo();});node.append(button);}
    toastTimer = setTimeout(() => { node.hidden = true; }, error || undo ? 6500 : 3500);
  }
  function persist() {
    clearTimeout(timer);timer=null;
    if(loadWarning){$('#save-status').textContent='原资料读取失败，修改暂存内存';return false;}
    try { db.draft=cleanInvoice(state); localStorage.setItem(STORE,JSON.stringify(db)); storageOK = true; $('#save-status').innerHTML = '<span class="status-dot"></span>已保存到此浏览器'; $('#save-status').classList.remove('storage-warning'); $('#mobile-header-status').textContent='草稿已保存在本机'; return true; }
    catch (err) { storageOK = false; $('#save-status').textContent = '本地存储不可用，请导出备份'; $('#save-status').classList.add('storage-warning'); $('#mobile-header-status').textContent='暂未保存，请导出备份'; return false; }
  }
  function scheduleSave() { $('#save-status').textContent = loadWarning?'原资料读取失败，修改暂存内存':'正在保存…'; clearTimeout(timer); timer = setTimeout(persist,450); }
  function getPath(object,path) { return path.split('.').reduce((obj,key) => obj?.[key],object); }
  function setPath(object,path,value) {
    const keys = path.split('.'); let cursor=object;
    keys.slice(0,-1).forEach(key => { if (!cursor[key]) cursor[key]={}; cursor=cursor[key]; }); cursor[keys.at(-1)]=value;
  }
  function formFields(definitions,prefix,source={}) {
    const limits={name:200,address:2000,contact:200,phone:80,email:254,beneficiary:300,bankName:300,account:200,swift:100,country:200,paypal:1000,description:3000,model:200,unit:50,specification:3000,unitPrice:64,marks:1000};
    return definitions.map(([key,label,type='text',wide=false]) => `<label class="${wide?'span-2':''}">${esc(label)}${type==='textarea'?`<textarea rows="2" data-field="${esc(prefix+key)}" maxlength="${limits[key]||200}">${esc(source[key])}</textarea>`:`<input data-field="${esc(prefix+key)}" type="${type}" ${type==='number'?'min="0" step="0.0001" inputmode="decimal"':''} maxlength="${limits[key]||200}" value="${esc(source[key])}">`}</label>`).join('');
  }
  function populateFields(root = document) { $$('[data-field]',root).forEach(node => { if (getPath(state,node.dataset.field) != null) node.value=getPath(state,node.dataset.field); }); }
  function syncSelectors() {
    $('#customer-select').innerHTML = '<option value="">选择已保存客户…</option>'+db.customers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    $('#product-select').innerHTML = '<option value="">选择已保存产品…</option>'+db.products.map(x=>`<option value="${esc(x.id)}">${esc(x.model?x.model+' · ':'')}${esc(x.description)}</option>`).join('');
    $('#customer-select').parentElement.classList.toggle('empty-library',!db.customers.length);$('#product-select').parentElement.classList.toggle('empty-library',!db.products.length);
    $('#customer-count').textContent=db.customers.length; $('#product-count').textContent=db.products.length; $('#history-count').textContent=db.history.length;
  }
  function money(value) { return U.formatMoney(Number.isFinite(value)?value:0,state.meta.currency); }
  function renderItems() {
    $('#items-editor').innerHTML=state.items.map((item,index)=>`<div class="item-card" data-item="${index}"><div class="item-card-heading"><span class="item-index">产品 ${String(index+1).padStart(2,'0')}</span><div class="item-card-actions"><button data-item-action="save" data-index="${index}">存入产品库</button><button data-item-action="duplicate" data-index="${index}">复制</button><button data-item-action="remove" data-index="${index}" aria-label="删除产品 ${index+1}">删除 ×</button></div></div><div class="form-grid"><label class="span-2">产品名称 / Description *<input data-item-field="description" data-index="${index}" value="${esc(item.description)}" placeholder="产品名称（建议英文）" maxlength="2000"></label><label>型号 / Model No.<input data-item-field="model" data-index="${index}" value="${esc(item.model)}" placeholder="型号" maxlength="200"></label><label>MARKS / 备注<input data-item-field="marks" data-index="${index}" value="${esc(item.marks)}" placeholder="唛头、颜色等" maxlength="1000"></label><label class="span-2">规格说明<textarea rows="2" data-item-field="specification" data-index="${index}" placeholder="尺寸、材质、包装等" maxlength="3000">${esc(item.specification)}</textarea></label><div class="quantity-grid"><label>数量 *<input type="number" min="0.001" step="0.001" inputmode="decimal" data-item-field="quantity" data-index="${index}" value="${esc(item.quantity)}"></label><label>单位<input data-item-field="unit" data-index="${index}" value="${esc(item.unit)}" placeholder="PCS" maxlength="50"></label><label>单价 (${esc(state.meta.currency)}) *<input type="number" min="0" step="0.0001" inputmode="decimal" data-item-field="unitPrice" data-index="${index}" value="${esc(item.unitPrice)}"></label></div></div><div class="line-total"><span>此项金额</span><strong data-line-total="${index}">${money(0)}</strong></div></div>`).join('');
    updateTotals();
  }
  function updateTotals() {
    const result=U.calculate(state);
    $('#items-count').textContent=`${state.items.filter(x=>x.description.trim()||x.model.trim()).length} 项`;
    $('#items-subtotal').textContent=money(result.subtotal);
    $('#total-display').textContent=money(result.total); $('#deposit-display').textContent=money(result.deposit); $('#balance-display').textContent=money(result.balance);
    $('#mobile-total').textContent=money(result.total);
    $$('[data-line-total]').forEach(node=>{ const line=result.lines.find((x,i)=>(x.index ?? i)===Number(node.dataset.lineTotal)); node.textContent=money(line?.amount || 0); });
    return result;
  }
  function renderInvoice() {
    const result=updateTotals(), m=state.meta;
    const number=(value,places=2)=>Number(value||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:places});
    const sellerLines=['Supplier:',state.seller.name,state.seller.address,state.seller.contact?`Attn: ${state.seller.contact}`:'',state.seller.phone?`Tel: ${state.seller.phone}`:'',state.seller.email?`Email:${state.seller.email}`:''].filter(Boolean).join('\n');
    const buyerLines=['Bill to :',state.buyer.name,state.buyer.contact?`Attn: ${state.buyer.contact}`:'',state.buyer.address?`Address: ${state.buyer.address}`:'',state.buyer.phone?`Work Mob: ${state.buyer.phone}`:'',state.buyer.email?`Email: ${state.buyer.email}`:''].filter(Boolean).join('\n');
    const remarks=[m.incoterm,m.port].filter(Boolean).join(' ');
    const date=m.date?m.date.split('-').reverse().map((v,i)=>i<2?Number(v):v.slice(-2)).join('-'):'';
    let rowIndex=state.items.length;
    const rows=state.items.map((item,index)=>{
      const line=result.lines.find((x,i)=>(x.index??i)===index);
      return `<tr class="source-product-row"><td>${index+1}</td><td>${esc(item.model)}</td><td class="source-description">${esc(item.description)}${item.specification?`<div class="source-spec">${esc(item.specification)}</div>`:''}</td><td>${esc(item.quantity)}${item.unit&&item.unit!=='PCS'?`<br>${esc(item.unit)}`:''}</td><td>${esc(number(item.unitPrice,4))}</td><td>${esc(number(line?.amount))}</td><td>${esc(item.marks)}</td></tr>`;
    }).join('');
    const charge=(label,value)=>`<tr class="source-charge-row"><td>${++rowIndex}</td><td colspan="4">${label}</td><td>${esc(number(value))}</td><td></td></tr>`;
    const chargeRows=(result.shipping?charge('Shipping Cost by express',result.shipping):'')+(result.other?charge('Other charges',result.other):'')+(result.discount?charge('Discount',-result.discount):'');
    const quantity=state.items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
    const bankLines=[`Payment Account:(${m.currency} ONLY pls cover all bank charges )`,state.bank.account?`Account Number: ${state.bank.account}`:'',state.bank.beneficiary?`Holder Name: ${state.bank.beneficiary}`:'',state.bank.bankName?`Bank Name: ${state.bank.bankName}`:'',state.bank.country?`Country: ${state.bank.country}`:'',state.bank.address?`Bank Address: ${state.bank.address}`:'',state.bank.swift?`Swift/BIC: ${state.bank.swift}`:''].filter(Boolean).join('\n');
    const words=U.amountInWords?U.amountInWords(result.total,m.currency):`${m.currency} ${number(result.total)}`;
    $('#invoice').innerHTML=`<table class="source-table" aria-label="ZUOSEN proforma invoice"><colgroup><col style="width:3.5947%"><col style="width:35.5313%"><col style="width:21.3889%"><col style="width:7.6276%"><col style="width:10.7929%"><col style="width:13.9366%"><col style="width:7.1280%"></colgroup><tbody>
      <tr><td colspan="7" class="source-heading"><div class="source-brand"><img class="source-logo" src="${esc(state.logoDataUrl||'./assets/zuosen-logo.jpeg')}" alt="ZUOSEN Hydraulic"><strong>${esc(state.seller.name.replace(/\.$/,''))}</strong><img class="source-iso" src="./assets/zuosen-iso9001.png" alt="ISO 9001:2015 certified company"></div></td></tr>
      <tr><td colspan="7" class="source-title">PROFORMA INVOICE</td></tr>
      <tr><td colspan="4" rowspan="2" class="source-supplier">${esc(sellerLines)}</td><td colspan="3" class="source-order-number"><b>ORDER NO.</b><span>${esc(m.number)}</span></td></tr>
      <tr><td colspan="3" class="source-order-date"><b>ORDER DATE:</b><span>${esc(date)}</span>${m.validUntil?`<small>Valid until: ${esc(m.validUntil)}</small>`:''}</td></tr>
      <tr><td colspan="4" rowspan="2" class="source-buyer">${esc(buyerLines)}</td><td colspan="3" class="source-delivery"><b>Delivery before</b><div>${esc(m.leadTime)}</div></td></tr>
      <tr><td colspan="3" class="source-remarks"><b>Remarks :</b><div>${esc(remarks)}</div></td></tr>
      <tr><td colspan="7" class="source-payment">Payment Terms ( ${esc(m.paymentTerms)} )</td></tr>
      <tr class="source-column-head"><th>NO</th><th>Model No.</th><th>Description</th><th>Qty</th><th>U/P(${esc(m.currency)})</th><th>Amount(${esc(m.currency)})</th><th>MARKS</th></tr>
      ${rows}${chargeRows}
      <tr class="source-total"><td colspan="3">Total Value:</td><td>${esc(number(quantity,3))}</td><td>/</td><td>${esc(number(result.total))}</td><td>/</td></tr>
      <tr><td colspan="7" class="source-words">${esc(words)}</td></tr>
      <tr><td colspan="7" class="source-paypal">PayPal: ${esc(state.bank.paypal||'')}</td></tr>
      <tr><td colspan="7" class="source-bank"><div class="source-bank-content"><div class="source-bank-text">${esc(bankLines)}</div><div class="source-stamps"><img class="source-signature" src="./assets/zuosen-authorized-signature.png" alt="Authorized signature"><img class="source-seal" src="./assets/zuosen-company-seal.png" alt="Shenzhen Zuosen Technology Co., Ltd. company seal"></div></div></td></tr>
      <tr><td colspan="7" class="source-bottom">${state.notes?`<div>${esc(state.notes)}</div>`:''}</td></tr>
    </tbody></table>`;
    $('#document-number').textContent=m.number||'新建形式发票';$('#document-subtitle').textContent=`${state.buyer.name||'未命名客户'} · ${m.currency}`;
    requestAnimationFrame(resizePreview);
  }
  function resizePreview() {
    const stage=$('#preview-stage'), invoice=$('#invoice'), viewport=$('#invoice-viewport');
    if (!stage.clientWidth || currentView!=='editor') return;
    const style=getComputedStyle(stage), width=Math.min(720,stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
    const actualWidth=isMobile()&&previewZoomed?720:width;
    const scale=actualWidth/720; invoice.style.transform=`scale(${scale})`; viewport.style.width=`${actualWidth}px`; viewport.style.height=`${invoice.scrollHeight*scale}px`;
  }
  function update() { renderInvoice(); scheduleSave(); $('#validation').hidden=true; }
  function syncAll() {
    $('#invoice-seller-fields').innerHTML=formFields(sellerFields,'seller.',state.seller); $('#invoice-bank-fields').innerHTML=formFields(bankFields,'bank.',state.bank);
    populateFields($('#view-editor')); syncSelectors(); renderItems(); renderInvoice(); $('#validation').hidden=true;
  }
  function setPanel(name) {
    panel=name;
    $$('.editor-tab').forEach(node=>{const active=node.dataset.panel===name;node.classList.toggle('active',active);node.setAttribute('aria-selected',String(active));node.tabIndex=active?0:-1;});
    $$('.tab-panel').forEach(node=>{const active=node.id===`panel-${name}`;node.classList.toggle('active',active);node.hidden=!active;});
    document.body.classList.toggle('mobile-show-preview',name==='preview');
    $('#tab-preview').setAttribute('aria-selected',String(name==='preview'));
    updateMobileDock();
    requestAnimationFrame(resizePreview);
  }
  function heading(title,sub,action='') { return `<div class="page-heading"><div><div class="eyebrow">YOUR BUSINESS, ORGANIZED</div><h1>${title}<span>.</span></h1><p>${sub}</p></div>${action}</div>`; }
  function emptyState(title,description,action='') { return `<div class="empty-state"><div class="empty-symbol">▤</div><h2>${title}</h2><p>${description}</p>${action}</div>`; }
  function renderLibrary(type) {
    const customer=type==='customers', list=db[type], name=customer?'客户':'产品';
    const button=`<button class="button primary" data-library-action="new" data-type="${type}">＋ 添加${name}</button>`;
    $(`#view-${type}`).innerHTML=heading(`${name}资料`,customer?'常用客户保存一次，下一次开单直接选择。':'把常用产品整理好，报价开单更快一步。',button)+(list.length?`<input class="library-search" data-search="${type}" placeholder="搜索${customer?'公司名称、联系人':'产品名称、型号'}…" aria-label="搜索${name}"><div class="library-grid">${list.map(item=>`<article class="library-card" data-search-text="${esc((customer?[item.name,item.contact]:[item.description,item.model]).join(' ').toLowerCase())}"><span class="card-badge">${customer?'♧':'▦'}</span><h2>${esc(customer?item.name:item.description)}</h2><p>${esc(customer?(item.contact||'未填写联系人'):(item.model||'未填写型号'))}</p><p>${esc(customer?(item.email||item.address||''):(item.specification||''))}</p>${customer?'':`<div class="card-meta"><span>参考单价 · 不自动换汇</span><strong>${esc(item.unitPrice)} / ${esc(item.unit)}</strong></div>`}<div class="card-actions"><button class="text-button" data-library-action="use" data-type="${type}" data-id="${esc(item.id)}">用于当前 PI ↗</button><button class="text-button" data-library-action="edit" data-type="${type}" data-id="${esc(item.id)}">编辑</button><button class="text-button delete-button" data-library-action="delete" data-type="${type}" data-id="${esc(item.id)}">删除</button></div></article>`).join('')}</div><p class="small-help" data-no-results hidden>没有找到匹配的资料。</p>`:emptyState(`还没有保存${name}`,customer?'在制作 PI 时保存买方资料，也可以在这里添加。':'保存产品名称、型号、规格和参考单价。',button));
  }
  function renderHistory() {
    $('#view-history').innerHTML=heading('历史单据','保存成交记录，复制一份即可开始下一笔订单。')+(db.history.length?`<input class="library-search" data-search="history" placeholder="搜索 PI 编号或客户…" aria-label="搜索历史单据"><div class="library-grid">${db.history.map(record=>{const inv=record.invoice,result=U.calculate(inv);return `<article class="library-card" data-search-text="${esc((inv.meta.number+' '+inv.buyer.name).toLowerCase())}"><span class="card-badge">PI</span><h2>${esc(inv.meta.number)}</h2><p>${esc(inv.buyer.name||'未命名客户')}</p><p>${esc(inv.meta.date)} · ${inv.items.length} 项产品</p><div class="card-meta"><span>${esc(inv.meta.incoterm||'形式发票')}</span><strong>${esc(U.formatMoney(result.total,inv.meta.currency))}</strong></div><div class="card-actions"><button class="text-button" data-history-action="open" data-id="${esc(record.id)}">打开 ↗</button><button class="text-button" data-history-action="copy" data-id="${esc(record.id)}">复制新单</button><button class="text-button delete-button" data-history-action="delete" data-id="${esc(record.id)}">删除</button></div></article>`;}).join('')}</div><p class="small-help" data-no-results hidden>没有找到匹配的单据。</p>`:emptyState('第一份 PI，等你完成','在制作页面点击「保存到历史」，单据就会出现在这里。','<button class="button primary" data-view="editor">去制作 PI →</button>'));
  }
  function renderSettings() {
    const s=db.settings;
    $('#view-settings').innerHTML=heading('公司与收款设置','保存你的开单模板，新建 PI 时自动带入。')+`<form id="settings-form"><div class="settings-card"><h2>卖方公司</h2><p>填写对外展示的英文资料，显示在 PI 顶部。</p><div class="form-grid">${formFields(sellerFields,'seller.',s.seller)}</div><div class="logo-upload"><div class="logo-preview"><img src="${esc(s.logoDataUrl||'./assets/zuosen-logo.jpeg')}" alt="公司 Logo"></div><div class="logo-actions"><button class="button small secondary" type="button" id="upload-logo">上传 Logo</button> <button class="text-button" type="button" id="remove-logo">移除</button><p>PNG / JPG / WebP，最大 300 KB；仅保存在本机。</p></div></div></div><div class="settings-card"><h2>收款银行</h2><p>仅填写你确认的收款资料，导出单据时会完整显示。</p><div class="form-grid">${formFields(bankFields,'bank.',s.bank)}</div></div><div class="settings-card"><h2>默认开单约定</h2><p>作为新单默认值，每份 PI 都可以单独调整。</p><div class="form-grid"><label>默认币种<select name="currency"><option>USD</option><option>EUR</option><option>CNY</option><option>GBP</option></select></label><label>默认订金比例（%）<input name="depositPercent" type="number" min="0" max="100" step="0.01" value="${esc(s.depositPercent||'30')}"></label><label>默认贸易条款<select name="incoterm"><option value="">请选择</option>${['EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP','FAS'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>默认交货期<input name="leadTime" maxlength="200" value="${esc(s.leadTime)}" placeholder="Within 25 days after deposit"></label><label class="span-2">默认付款条款<textarea name="paymentTerms" rows="3" maxlength="2000">${esc(s.paymentTerms)}</textarea></label><label class="span-2">默认备注<textarea name="notes" rows="3" maxlength="8000">${esc(s.notes)}</textarea></label></div><div class="settings-footer"><button class="button primary" type="submit">保存设置</button><button class="button secondary" type="button" id="apply-settings">保存并用于当前 PI</button><button class="button ghost" type="button" data-view="editor">回到制作页面 →</button></div></div></form><p class="small-help">本站没有云端同步。备份全部资料后，可以在另一台设备恢复。</p>`;
    $('#settings-form [name=currency]').value=s.currency||'USD'; $('#settings-form [name=incoterm]').value=s.incoterm||'';
  }
  function showView(view) {
    if (!['editor','customers','products','history','settings'].includes(view)) return;
    if (previewExpanded) togglePreview();
    currentView=view; $$('.view').forEach(node=>{const active=node.id===`view-${view}`;node.classList.toggle('active',active);node.hidden=!active;});
    $$('.nav-item[data-view],.mobile-nav-item[data-view]').forEach(node=>{const active=node.dataset.view===view;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
    $('#breadcrumb-current').textContent=({editor:'制作 PI',customers:'客户资料',products:'产品资料',history:'历史单据',settings:'公司与收款设置'})[view];
    if (view==='customers'||view==='products') renderLibrary(view); else if(view==='history') renderHistory(); else if(view==='settings') renderSettings(); else requestAnimationFrame(resizePreview);
    $('#mobile-header-title').textContent=view==='editor'?'PI Studio':({customers:'客户资料',products:'产品资料',history:'历史单据',settings:'公司设置'})[view];
    document.body.classList.toggle('mobile-library-view',view!=='editor');updateMobileDock();
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function confirm(title,message) {
    if (confirmResolver) confirmResolver(false);
    $('#confirm-title').textContent=title; $('#confirm-message').textContent=message; $('#confirm-dialog').showModal();
    return new Promise(resolve=>{confirmResolver=resolve;});
  }
  function finishConfirm(value) { $('#confirm-dialog').close(); if(confirmResolver){confirmResolver(value);confirmResolver=null;} }
  async function newInvoice() {
    if ((state.buyer.name||state.items.some(x=>x.description||x.model)) && !await confirm('新建一份 PI？','当前草稿将被替换。需要保留的单据，请先保存到历史或导出单据备份。')) return;
    state=blankInvoice();syncAll();setPanel('order');showView('editor');persist();toast('新 PI 已准备好');
  }
  function validate() {
    const errors=[...U.calculate(state).errors];
    if (!state.meta.number.trim()) errors.unshift('请填写 PI 编号');
    if (!state.meta.date) errors.push('请选择开单日期');
    if (!state.seller.name.trim()) errors.push('请在公司设置或本单卖方资料中填写卖方公司名称');
    if (!state.buyer.name.trim()) errors.push('请填写买方公司名称');
    if (!state.items.length||!state.items.some(x=>x.description.trim()||x.model.trim())) errors.push('请至少添加一项产品');
    state.items.forEach((item,index)=>{if(!item.description.trim()) errors.push(`产品 ${index+1}：请填写产品名称 / Description`);});
    if(state.meta.validUntil&&state.meta.validUntil<state.meta.date) errors.push('有效期不能早于开单日期');
    const node=$('#validation');node.hidden=!errors.length;node.innerHTML=errors.length?`<strong>还有 ${errors.length} 项需要确认</strong><ul>${[...new Set(errors)].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
    if(errors.length){if(isMobile()&&panel==='preview')setPanel(!state.buyer.name.trim()||!state.seller.name.trim()||!state.meta.number.trim()?'order':errors.some(x=>x.includes('产品')||x.includes('行'))?'items':'terms');node.scrollIntoView({block:'center',behavior:'auto'});toast('请先完成必填资料并检查金额',true);return false;}return true;
  }
  function saveHistory() {
    if(!validate())return;
    const existing=db.history.find(x=>x.invoice.meta.number===state.meta.number);
    if(existing){existing.invoice=clone(state);existing.savedAt=new Date().toISOString();db.history=db.history.filter(x=>x!==existing);db.history.unshift(existing);}
    else{if(db.history.length>=100){toast('历史最多保存 100 份，请先备份并整理旧单据',true);return;}db.history.unshift({id:uid(),savedAt:new Date().toISOString(),invoice:clone(state)});}
    syncSelectors();const saved=persist();toast(saved?'已保存到历史单据':'单据暂存内存，请立即备份资料',!saved);
  }
  function openEditor(type,item={}) {
    editContext={type,id:item.id||null};$('#dialog-title').textContent=`${item.id?'编辑':'添加'}${type==='customers'?'客户':'产品'}`;
    $('#dialog-fields').innerHTML=formFields(type==='customers'?sellerFields:productFields,'dialog.',item);
    if(type==='products'&&!item.id){$('#dialog-fields [data-field="dialog.unit"]').value='PCS';$('#dialog-fields [data-field="dialog.unitPrice"]').value='0';}
    $('#edit-dialog').showModal();setTimeout(()=>$('#dialog-fields input')?.focus(),0);
  }
  function saveLibraryItem(type,raw) {
    const item=type==='customers'?cleanParty(raw):cleanProduct(raw);
    const name=type==='customers'?item.name:item.description;
    if(!name.trim()){toast(type==='customers'?'请填写公司名称':'请填写产品名称',true);return false;}
    if(type==='products'){const checked=U.calculate({...state,items:[item],adjustments:{discount:0,shipping:0,other:0,depositPercent:0}});if(checked.errors.length){toast(checked.errors[0],true);return false;}}
    if(db[type].length>=500&&!editContext?.id){toast('资料库最多保存 500 条，请先整理',true);return false;}
    const id=editContext?.type===type?editContext.id:null,index=id?db[type].findIndex(x=>x.id===id):-1;
    const record={...item,id:id||uid()};if(index>=0)db[type][index]=record;else db[type].unshift(record);
    syncSelectors();const saved=persist();if(currentView===type)renderLibrary(type);toast(saved?'资料已保存':'资料暂存内存，请导出备份',!saved);return true;
  }
  function addItem(item=emptyItem()) {
    if(state.items.length>=200){toast('每份 PI 最多 200 项产品',true);return;}
    if(state.items.length===1&&!state.items[0].description&&!state.items[0].model)state.items[0]=clone(item);else state.items.push(clone(item));
    renderItems();update();
  }
  function saveSettings(apply=false) {
    const form=$('#settings-form'), seller={},bank={};
    $$('[data-field]',form).forEach(node=>{const [area,key]=node.dataset.field.split('.');(area==='seller'?seller:bank)[key]=node.value;});
    const s={...db.settings,seller,bank};for(const name of ['currency','incoterm','leadTime','paymentTerms','notes','depositPercent'])s[name]=$(`[name="${name}"]`,form).value;
    const check=U.calculate({...state,adjustments:{discount:0,shipping:0,other:0,depositPercent:s.depositPercent}});
    if(check.errors.some(x=>x.includes('订金'))){toast('订金比例应在 0 到 100 之间',true);return;}
    db.settings=s;
    if(apply){state.seller=clone(seller);state.bank=clone(bank);state.logoDataUrl=s.logoDataUrl;state.meta.incoterm=s.incoterm;state.meta.leadTime=s.leadTime;state.meta.paymentTerms=s.paymentTerms;state.notes=s.notes;state.adjustments.depositPercent=s.depositPercent;syncAll();}
    const saved=persist();toast(saved?(apply?'设置已保存并应用于当前 PI':'设置已保存，新建 PI 时自动带入'):'设置暂存内存，请导出备份',!saved);
  }
  function downloadJSON(payload,filename) {
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function togglePreview() {
    previewExpanded=!previewExpanded;$('.preview-panel').classList.toggle('preview-expanded',previewExpanded);$('#expand-preview').textContent=previewExpanded?'× 关闭放大':'⤢ 放大';$('#expand-preview').setAttribute('aria-expanded',String(previewExpanded));
    if(previewExpanded){const backdrop=document.createElement('div');backdrop.className='preview-backdrop no-print';backdrop.addEventListener('click',togglePreview);document.body.append(backdrop);$('.preview-panel').setAttribute('role','dialog');$('.preview-panel').setAttribute('aria-modal','true');document.body.style.overflow='hidden';$('#expand-preview').focus();}else{$('.preview-backdrop')?.remove();$('.preview-panel').removeAttribute('role');$('.preview-panel').removeAttribute('aria-modal');document.body.style.overflow='';$('#expand-preview').focus();}
    requestAnimationFrame(resizePreview);
  }
  function printInvoice() {if(!validate())return;persist();const old=document.title;document.title=state.meta.number+' - Proforma Invoice';window.print();setTimeout(()=>document.title=old,1000);}
  function downloadFile(file) {
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;link.download=file.name;link.hidden=true;document.body.append(link);link.click();link.remove();
    // Safari may read the blob after handing it to the download UI.
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function saveLocalInvoice() {
    if(pdfBusy)return;
    if(currentView!=='editor')showView('editor');
    if(!validate())return;
    persist();renderInvoice();
    const number=state.meta.number||'PI',filename=number.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')+'.pdf';
    const buttons=[$('#save-local'),$('[data-mobile-action="local"]')];
    pdfBusy=true;buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true');});
    if(panel==='preview')$('#mobile-next').disabled=true;
    try {
      const blob=await window.PIPdf.create($('#invoice'),{title:number+' - Proforma Invoice',onProgress:(page,total)=>toast(`正在生成 PDF · ${page} / ${total} 页…`)});
      const file=new File([blob],filename,{type:'application/pdf'});
      downloadFile(file);
      if(navigator.share&&navigator.canShare?.({files:[file]})) {
        toast('PDF 已下载，也可存到手机「文件」',false,async()=>{
          try{await navigator.share({files:[file],title:number+' · Proforma Invoice'});}
          catch(err){if(err.name!=='AbortError'){downloadFile(file);toast('系统分享不可用，PDF 已下载');}}
        },'分享 / 存到文件');
      } else toast('PDF 已下载，请在浏览器下载记录中查看');
    } catch(err) { toast('PDF 保存未完成，请重试或使用「打印」保存',true); }
    finally {
      pdfBusy=false;buttons.forEach(button=>{button.disabled=false;button.removeAttribute('aria-busy');});
      $('#mobile-next').disabled=false;
    }
  }
  function updateMobileDock(){
    const buttons={order:'下一步：产品',items:'下一步：条款',terms:'查看 PI',preview:'保存到本地'};
    $('#mobile-next').textContent=buttons[panel]||buttons.order;
    $('#mobile-preview-btn').textContent=panel==='preview'?'返回编辑':'预览';
  }
  function mobileNext(){
    if(panel==='preview'){saveLocalInvoice();return;}
    setPanel(({order:'items',items:'terms',terms:'preview'})[panel]);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function openMobileSheet(mode='all'){
    const sheet=$('#mobile-sheet');sheet.dataset.mode=mode;$('#mobile-sheet-title').textContent=mode==='export'?'这份 PI，准备发送':'单据与资料';
    $$('.sheet-action',sheet).forEach(node=>{node.hidden=mode==='export'&&!['local','print','share','excel','save'].includes(node.dataset.mobileAction);});
    $('.sheet-divider',sheet).hidden=mode==='export';sheet.showModal();
  }
  async function shareInvoice(){
    if(currentView!=='editor')showView('editor');
    if(!validate())return;
    try{const filename=(state.meta.number||'PI').replace(/[\\/:*?"<>|]/g,'_')+'.xlsx',file=new File([U.buildXlsx(state)],filename,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:state.meta.number+' · Proforma Invoice'});}
      else{U.downloadXlsx(state);toast('此浏览器不支持直接分享，Excel 已下载');}
    }catch(err){if(err.name!=='AbortError'){try{U.downloadXlsx(state);toast('系统分享不可用，Excel 已下载');}catch(downloadError){toast('分享未完成，请使用下载 Excel 或打印 PDF',true);}}}
  }
  function syncMobileContext(){
    const mobile=isMobile();if(!mobile&&panel==='preview')setPanel('order');
    $('#buyer-details').open=!mobile;$('#meta-extra-details').open=!mobile;
    if(!mobile)document.body.classList.remove('keyboard-open');
    resizePreview();
  }
  let viewportBase=window.visualViewport?.height||window.innerHeight, viewportWidth=window.innerWidth;
  function syncKeyboard(){
    const viewport=window.visualViewport;
    if(Math.abs(window.innerWidth-viewportWidth)>80){viewportBase=viewport?.height||window.innerHeight;viewportWidth=window.innerWidth;}
    const height=viewport?.height||window.innerHeight;viewportBase=Math.max(viewportBase,height);
    const focused=document.activeElement?.matches('textarea,input:not([type=file]):not([type=date])');
    const open=isMobile()&&focused&&(viewport?(window.innerHeight-height>120||viewportBase-height>180):true);
    document.body.classList.toggle('keyboard-open',Boolean(open));
  }

  document.addEventListener('input',event=>{
    const node=event.target;
    if(node.matches('[data-search]')){let count=0;const query=node.value.trim().toLowerCase();$$('[data-search-text]',node.parentElement).forEach(card=>{const match=card.dataset.searchText.includes(query);card.hidden=!match;if(match)count++;});$('[data-no-results]',node.parentElement).hidden=count>0;return;}
    if(!node.closest('#view-editor'))return;
    if(node.dataset.field){setPath(state,node.dataset.field,node.value);if(node.dataset.field==='meta.currency')renderItems();update();}
    if(node.dataset.itemField){state.items[Number(node.dataset.index)][node.dataset.itemField]=node.value;update();}
  });
  document.addEventListener('change',event=>{
    const node=event.target;
    if(node.id==='customer-select'&&node.value){state.buyer=cleanParty(db.customers.find(x=>x.id===node.value));populateFields($('#panel-order'));update();toast('客户资料已带入');}
    if(node.id==='product-select'&&node.value){const product=db.products.find(x=>x.id===node.value);if(product){addItem({...product,quantity:'1'});node.value='';toast('产品已添加，请确认当前币种与价格');}}
  });
  document.addEventListener('click',async event=>{
    const node=event.target.closest('button');if(!node)return;
    if(node.dataset.mobileAction){$('#mobile-sheet').close();const action=node.dataset.mobileAction;const route={local:'save-local',print:'print-invoice',excel:'export-excel',save:'save-invoice',new:'new-invoice',demo:'load-demo',backup:'backup-all',restore:'restore-all',import:'import-invoice','invoice-backup':'export-json'};if(action==='share')await shareInvoice();else if(route[action]){if(['local','print','excel','save'].includes(action)&&currentView!=='editor')showView('editor');$(`#${route[action]}`).click();}return;}
    if(node.dataset.view){showView(node.dataset.view);return;}
    if(node.dataset.panel){setPanel(node.dataset.panel);return;}
    if(node.dataset.next){setPanel(node.dataset.next);$('.editor-tabs').scrollIntoView({block:'start',behavior:'auto'});return;}
    if(node.dataset.itemAction){const index=Number(node.dataset.index),action=node.dataset.itemAction;
      if(action==='remove'){const removed=clone(state.items[index]),wasLast=state.items.length===1;if(wasLast)state.items=[emptyItem()];else state.items.splice(index,1);renderItems();update();toast('产品已删除',false,()=>{if(wasLast&&state.items.length===1&&!state.items[0].description&&!state.items[0].model)state.items[0]=removed;else state.items.splice(Math.min(index,state.items.length),0,removed);renderItems();update();setPanel('items');$(`[data-item-field="description"][data-index="${Math.min(index,state.items.length-1)}"]`)?.focus();toast('产品已恢复');});}
      if(action==='duplicate')addItem(state.items[index]);
      if(action==='save'){editContext=null;saveLibraryItem('products',state.items[index]);}return;
    }
    if(node.dataset.libraryAction){const type=node.dataset.type,record=db[type].find(x=>x.id===node.dataset.id),action=node.dataset.libraryAction;
      if(action==='new')openEditor(type);if(action==='edit')openEditor(type,record);
      if(action==='delete'&&await confirm('删除这条资料？','只会从资料库移除，已保存的 PI 不受影响。')){db[type]=db[type].filter(x=>x.id!==record.id);syncSelectors();persist();renderLibrary(type);toast('资料已删除');}
      if(action==='use'){if(type==='customers'){state.buyer=cleanParty(record);setPanel('order');}else{addItem({...record,quantity:'1'});setPanel('items');}syncAll();showView('editor');persist();toast(type==='customers'?'客户资料已带入':'产品已添加，请确认当前币种与价格');}return;
    }
    if(node.dataset.historyAction){const record=db.history.find(x=>x.id===node.dataset.id),action=node.dataset.historyAction;
      if(action==='delete'&&await confirm('删除这份历史单据？','此操作会移除历史记录，当前正在编辑的草稿不受影响。')){db.history=db.history.filter(x=>x.id!==record.id);syncSelectors();persist();renderHistory();toast('历史记录已删除');}
      if(action==='open'||action==='copy'){if(!await confirm(action==='copy'?'复制为一份新 PI？':'打开这份 PI？','当前草稿将被替换。需要保留的草稿，请先保存到历史或导出备份。'))return;const fresh=blankInvoice();state=clone(record.invoice);if(action==='copy'){state.meta.number=fresh.meta.number;state.meta.date=today();state.meta.validUntil='';}syncAll();setPanel('order');showView('editor');persist();toast(action==='copy'?'已复制，新单号已生成':'历史单据已打开');}return;
    }
    const actions={
      'new-invoice':newInvoice,'save-invoice':saveHistory,'add-item':()=>{addItem(emptyItem());},'add-item-bottom':()=>{addItem(emptyItem());},
      'save-customer':()=>{editContext=null;saveLibraryItem('customers',state.buyer);},
      'export-json':()=>{downloadJSON({app:'pi-studio',version:1,type:'invoice',invoice:state},`${state.meta.number||'PI'}.json`);toast('单据备份已导出');},
      'export-excel':()=>{if(validate()){try{U.downloadXlsx(state);toast('Excel 文件已导出');}catch(err){toast(err.message,true);}}},
      'save-local':saveLocalInvoice,'print-invoice':printInvoice,'finish-invoice':printInvoice,'expand-preview':togglePreview,
      'mobile-more':()=>openMobileSheet(),'close-mobile-sheet':()=>$('#mobile-sheet').close(),'mobile-next':mobileNext,
      'mobile-preview-btn':()=>{setPanel(panel==='preview'?'order':'preview');window.scrollTo({top:0,behavior:'instant'});},
      'preview-zoom':()=>{previewZoomed=!previewZoomed;$('.preview-panel').classList.toggle('preview-zoomed',previewZoomed);$('#preview-zoom').textContent=previewZoomed?'适合屏幕':'100% 阅读';$('#preview-zoom').setAttribute('aria-pressed',String(previewZoomed));$('#preview-hint').textContent=previewZoomed?'当前为原尺寸，左右滑动查看完整单据。':'点「100% 阅读」查看细节，左右滑动单据。';resizePreview();},
      'backup-all':()=>{if(loadWarning&&originalStorage){try{downloadJSON({app:'pi-studio',version:1,type:'backup',data:JSON.parse(originalStorage)},`PI-Studio-recovery-${today()}.json`);}catch(err){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([originalStorage],{type:'application/json'}));a.href=url;a.download=`PI-Studio-recovery-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}toast('原始浏览器资料已导出，请保留以便恢复');return;}downloadJSON({app:'pi-studio',version:1,type:'backup',data:{...db,draft:state}},`PI-Studio-backup-${today()}.json`);toast('全部资料备份已导出');},
      'restore-all':()=>{importMode='backup';$('#json-file').value='';$('#json-file').click();},
      'import-invoice':()=>{importMode='invoice';$('#json-file').value='';$('#json-file').click();},
      'close-dialog':()=>$('#edit-dialog').close(),'cancel-dialog':()=>$('#edit-dialog').close(),
      'confirm-cancel':()=>finishConfirm(false),'confirm-ok':()=>finishConfirm(true),
      'apply-settings':()=>saveSettings(true),
      'upload-logo':()=>{const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.onchange=async()=>{const file=input.files[0];if(!file)return;if(file.size>300*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('请选择 300 KB 以内的 PNG、JPG 或 WebP 图片',true);return;}const reader=new FileReader();reader.onload=async()=>{try{const value=safeLogo(await excelCompatibleLogo(String(reader.result)));if(!value){toast('图片转换后过大，请使用较小的 Logo',true);return;}db.settings.logoDataUrl=value;persist();$('.logo-preview').innerHTML=`<img src="${esc(value)}" alt="公司 Logo">`;toast('Logo 已保存，应用到当前 PI 后显示');}catch(err){toast('无法识别这张图片',true);}};reader.readAsDataURL(file);};input.click();},
      'remove-logo':()=>{db.settings.logoDataUrl='';persist();$('.logo-preview').innerHTML='<img src="./assets/zuosen-logo.jpeg" alt="ZUOSEN Logo">';toast('已恢复原表 ZUOSEN Logo');},
      'load-demo':async()=>{if(!await confirm('填入演示示例？','将替换当前草稿，使用虚构客户和图册中的 ARL1 柱塞泵演示开单；产品价格待确认。你的公司设置和资料库保持不变。'))return;state=blankInvoice();state.buyer={name:'ATLAS HOME SUPPLIES',address:'24 Example Avenue, Berlin, Germany',contact:'Alex Morgan',email:'purchasing@example.com',phone:'+49 000 000000'};state.items=[clone(DEMO_PRODUCT)];state.meta.incoterm='DAP';state.meta.port='Berlin, Germany';state.meta.leadTime='Within 25 days after receipt of deposit.';state.meta.paymentTerms='30% T/T deposit, 70% balance before shipment.';state.adjustments={discount:'0',shipping:'0',other:'0',depositPercent:'30'};state.notes='DEMONSTRATION ONLY — Buyer and buyer contact details are fictional.\nProduct specifications reference the ZUOSEN catalog (C01/C02). Price is not quoted; enter the confirmed unit price before use.\nPlease confirm specifications and delivery details before payment.';syncAll();persist();toast('已填入图册产品示例，请填写确认后的单价');}
    };
    if(actions[node.id])await actions[node.id]();
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='settings-form'){event.preventDefault();saveSettings();}
    if(event.target.id==='dialog-form'){event.preventDefault();const raw={};$$('[data-field]',$('#dialog-fields')).forEach(node=>raw[node.dataset.field.split('.')[1]]=node.value);try{if(saveLibraryItem(editContext.type,raw))$('#edit-dialog').close();}catch(err){toast(err.message,true);}}
  });
  $('#json-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>12*1024*1024)throw new Error('JSON 文件过大，最大 12 MB');
      const payload=JSON.parse(await file.text());
      if(payload.app!=='pi-studio'||payload.version!==1)throw new Error('请选择 PI Studio 导出的版本 1 JSON 备份');
      if(importMode==='backup'){
        if(payload.type!=='backup')throw new Error('这是单据文件，请在页面底部使用「导入单据 JSON」');
        const next=cleanDatabase(payload.data);
        if(!await confirm('恢复全部资料？','将替换此浏览器中的公司设置、客户、产品、历史和草稿。建议先导出当前资料备份。'))return;
        loadWarning='';originalStorage='';db=next;state=db.draft||blankInvoice();syncAll();showView('editor');persist();toast(storageOK?'全部资料已恢复':'资料已导入内存，但本地存储不足，请保留备份',!storageOK);
      }else{
        if(payload.type!=='invoice')throw new Error('这是全部资料备份，请使用顶部「恢复备份」');
        const next=cleanInvoice(payload.invoice);
        if(!await confirm('导入这份 PI？','导入后会替换当前草稿，公司设置和资料库不受影响。'))return;
        state=next;syncAll();showView('editor');persist();toast('PI 已导入');
      }
    }catch(err){toast(`导入失败：${err.message}`,true);}
  });
  $('#mobile-sheet').addEventListener('click',event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.currentTarget.close();});
  $('#confirm-dialog').addEventListener('cancel',event=>{event.preventDefault();finishConfirm(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&previewExpanded)togglePreview();if(event.key==='Tab'&&previewExpanded){const buttons=$$('button',$('.preview-toolbar')).filter(x=>x.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}if(event.target.matches('.editor-tab')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const list=isMobile()?['order','items','terms','preview']:['order','items','terms'],index=list.indexOf(panel),next=event.key==='Home'?0:event.key==='End'?list.length-1:(index+(event.key==='ArrowRight'?1:list.length-1))%list.length;setPanel(list[next]);$(`#tab-${list[next]}`).focus();}});
  window.addEventListener('resize',resizePreview);
  mobileQuery.addEventListener?.('change',syncMobileContext);
  window.visualViewport?.addEventListener('resize',syncKeyboard);
  document.addEventListener('focusin',syncKeyboard);document.addEventListener('focusout',()=>setTimeout(syncKeyboard,0));
  window.addEventListener('beforeprint',()=>{if(currentView!=='editor')showView('editor');renderInvoice();});
  window.addEventListener('afterprint',()=>requestAnimationFrame(resizePreview));
  window.addEventListener('pagehide',()=>{if(timer&&!loadWarning)persist();});
  if(window.ResizeObserver){new ResizeObserver(resizePreview).observe($('#preview-stage'));new ResizeObserver(resizePreview).observe($('#invoice'));}
  syncAll();setPanel('order');syncMobileContext();
  if(loadWarning){toast(loadWarning,true);$('#save-status').textContent='原资料读取失败，请保留原备份';}else persist();
})();
