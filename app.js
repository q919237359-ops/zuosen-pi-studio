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
  const DOMESTIC_DEFAULTS = {taxNote:'以上价格含税13%。',shipping:'含普通物流运费。',responsibility:'货到需方15天内提出书面异议，否则视为认同处理。',quality:'整泵正常使用保用一年，维修泵更换配件保用叁个月，人为和不可抗因素除外。（因系统故障引起的如油污染，尖物压迫磨损等情况除外，另客户保质期内自行拆装也不予保修），散配件不保用。',dispute:'本合同传真件有同等效力。',signingPlace:'',taxId:'',sellerFax:'',buyerFax:'',buyerAgent:''};
  // Supplier and VAT account verified against the supplied ZSYC26100913 contract.
  // The email follows the operator's updated instruction, rather than the old PDF.
  const DOMESTIC_EMAIL = 'sales@cnzuosen.com';
  const ZHUOXIN_REFERENCE = {
    seller:{name:'广东卓信液压科技有限公司',address:'广东省佛山市南海区丹灶镇上安管理区郭家村工业区竹脚北二路13号',contact:'张俊彦',phone:'18665326168',email:DOMESTIC_EMAIL},
    bank:{beneficiary:'广东卓信液压科技有限公司',bankName:'中国建设银行佛山小塘支行',account:'4405 0166 7237 0000 0863'},
    taxId:'91441900MA53KK803N'
  };
  const domesticFields = [['taxNote','价税约定','textarea',true],['shipping','运费约定','textarea',true],['responsibility','验收约定','textarea',true],['quality','质保约定','textarea',true],['dispute','合同效力 / 其他约定','textarea',true],['signingPlace','签订地点'],['taxId','供方统一社会信用代码'],['sellerFax','供方传真'],['buyerFax','需方传真'],['buyerAgent','需方经手人']];
  const ICONS = {"editor": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M14 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9zM14 3v6h6M8 13h8M8 17h5\"/></svg>", "customers": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2\"/></svg>", "products": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9M7 5.8l9 5\"/></svg>", "history": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v5l3 2\"/></svg>", "settings": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3z\"/></svg>"};
  const SEALS = {international:{name:'外贸原版椭圆章',src:'./assets/zuosen-company-seal.png'},'zuosen-cn':{name:'深圳市佐森科技有限公司',src:'./assets/zuosen-cn-seal.png'},'zhuoxin-cn':{name:'广东卓信液压科技有限公司',src:'./assets/zhuoxin-cn-seal.png'},none:{name:'不盖章',src:''}};
  let currentView = 'editor', panel = 'order', editContext = null, confirmResolver = null, importMode = 'invoice';
  let settingsProfileId = '', settingsDirty = false;
  let timer, toastTimer, storageOK = true, previewExpanded = false, previewZoomed = false, pdfBusy = false;
  const mobileQuery=window.matchMedia('(max-width:767px), (pointer:coarse) and (max-width:1024px) and (max-height:550px)');
  const isMobile=()=>mobileQuery.matches;

  function emptyParty() { return {name:'',address:'',contact:'',phone:'',email:''}; }
  function emptyBank() { return {beneficiary:'',bankName:'',account:'',swift:'',country:'',address:'',paypal:''}; }
  function emptyItem() { return {description:'',model:'',specification:'',quantity:'1',unit:'PCS',unitPrice:'0',marks:''}; }
  function hasDomesticReference(record) {
    return (record?.meta?.market||record?.market)==='domestic'&&record.seller?.name?.trim()===ZHUOXIN_REFERENCE.seller.name;
  }
  function fixedSellerFields(record) {
    if(hasDomesticReference(record))return true;
    return (record?.meta?.market||record?.market)==='domestic'&&record.seller?.name?.trim()==='深圳市佐森科技有限公司'?['email']:false;
  }
  function applyDomesticReference(record) {
    if(hasDomesticReference(record)){
      record.seller={...record.seller,...ZHUOXIN_REFERENCE.seller};
      record.bank={...emptyBank(),...ZHUOXIN_REFERENCE.bank};
      record.domestic={...record.domestic,taxId:ZHUOXIN_REFERENCE.taxId};
    }else if(fixedSellerFields(record))record.seller.email=DOMESTIC_EMAIL;
    return record;
  }
  function profileFor(market='international',id='') {return db.companyProfiles?.find(x=>x.id===id&&x.market===market)||db.companyProfiles?.find(x=>x.id===db.defaultProfileIds?.[market]&&x.market===market)||db.companyProfiles?.find(x=>x.market===market);}
  function sealSource(record) {return record.sealId==='none'?'':safeSeal(record.sealDataUrl)||(SEALS[record.sealId]||SEALS.international).src;}
  function blankInvoice(market='international',profileId='') {
    const date = today();
    const prefix = `${market==='domestic'?'ZSHT':'ZSDP'}${date.slice(2).replaceAll('-','')}`;
    const used = (db?.history || []).map(x => x.invoice.meta.number).concat(db?.draft?.meta?.number || '',...Object.values(db.marketDrafts||{}).map(x=>x?.meta?.number||''));
    let sequence = 1;
    while (used.includes(prefix + String(sequence).padStart(2,'0'))) sequence++;
    const settings = profileFor(market,profileId)||db?.settings||{};
    const item=emptyItem();if(market==='domestic')item.unit='件';
    return {meta:{market,profileId:settings.id||'',number:prefix+String(sequence).padStart(2,'0'),date,validUntil:'',currency:market==='domestic'?'CNY':settings.currency||'USD',incoterm:settings.incoterm || '',port:'',leadTime:settings.leadTime || '',paymentTerms:settings.paymentTerms || ''},seller:clone(settings.seller || emptyParty()),buyer:emptyParty(),bank:clone(settings.bank || emptyBank()),domestic:clone(settings.domestic||DOMESTIC_DEFAULTS),items:[item],adjustments:{discount:'0',shipping:'0',other:'0',depositPercent:settings.depositPercent??'30'},notes:settings.notes || '',logoDataUrl:settings.logoDataUrl || '',logoId:settings.logoId||'international',sealId:settings.sealId||'international',sealDataUrl:settings.sealDataUrl||''};
  }
  function safeLogo(value) { return typeof value === 'string' && value.length <= 450000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : ''; }
  function safeSeal(value) {return typeof value==='string'&&value.length<=650000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
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
  function cleanProfile(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('抬头资料格式不正确');
    const market=raw.market==='domestic'?'domestic':'international',invoice=cleanInvoice({meta:{...raw,market},seller:raw.seller,bank:raw.bank,domestic:raw.domestic,logoId:raw.logoId,sealId:raw.sealId,sealDataUrl:raw.sealDataUrl,adjustments:{depositPercent:raw.depositPercent},notes:raw.notes,logoDataUrl:raw.logoDataUrl});
    return {...invoice.meta,id:/^[A-Za-z0-9_-]{1,100}$/.test(raw.id||'')?raw.id:uid(),market,seller:invoice.seller,bank:invoice.bank,domestic:invoice.domestic,depositPercent:invoice.adjustments.depositPercent||'0',notes:invoice.notes,logoDataUrl:invoice.logoDataUrl,logoId:invoice.logoId,sealId:invoice.sealId,sealDataUrl:safeSeal(raw.sealDataUrl)};
  }
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
    if(raw.companyProfiles!=null&&(!Array.isArray(raw.companyProfiles)||raw.companyProfiles.length>20))throw new Error('公司抬头最多支持20个');
    result.companyProfiles=(raw.companyProfiles||[]).map(cleanProfile);
    if(result.companyProfiles.length===20&&['domestic','international'].some(market=>!result.companyProfiles.some(p=>p.market===market)))throw new Error('抬头需要同时保留国内与外贸类型');
    if(new Set(result.companyProfiles.map(x=>x.id)).size!==result.companyProfiles.length)throw new Error('抬头编号重复，请检查备份');
    result.defaultProfileIds={international:String(raw.defaultProfileIds?.international||'').slice(0,100),domestic:String(raw.defaultProfileIds?.domestic||'').slice(0,100)};
    result.marketDrafts={};for(const market of ['domestic','international']){if(raw.marketDrafts?.[market]){const draft=cleanInvoice(raw.marketDrafts[market]);if(draft.meta.market!==market)throw new Error('国内/外贸草稿类型不匹配');result.marketDrafts[market]=draft;}}
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
  function ensureProfiles() {
    db.companyProfiles=db.companyProfiles||[];db.defaultProfileIds=db.defaultProfileIds||{};
    if(!db.companyProfiles.length){
    const international={...clone(db.settings),id:'profile-international',market:'international',logoId:'international',sealId:'international',sealDataUrl:'',domestic:clone(DOMESTIC_DEFAULTS)};
    const domestic=(id,name,sealId,extra={})=>({id,market:'domestic',seller:{...emptyParty(),name,...extra},bank:emptyBank(),currency:'CNY',depositPercent:'100',incoterm:'',leadTime:'现货',paymentTerms:'款到发货。',notes:'',logoDataUrl:'',logoId:id==='profile-zhuoxin'?'domestic':'international',sealId,sealDataUrl:'',domestic:clone(DOMESTIC_DEFAULTS)});
    db.companyProfiles=[international,domestic('profile-zhuoxin','广东卓信液压科技有限公司','zhuoxin-cn',{address:'广东省佛山市南海区丹灶镇上安管理区郭家村工业区竹脚北二路13号'}),domestic('profile-zuosen','深圳市佐森科技有限公司','zuosen-cn')];
    db.defaultProfileIds={international:international.id,domestic:'profile-zhuoxin'};
  }
    for(const market of ['domestic','international']){
      if(!db.companyProfiles.some(p=>p.market===market)){
        const profile=market==='international'?{...clone(db.settings),id:uid(),market,seller:clone(db.settings.seller||TEMPLATE_SELLER),sealId:'international',logoId:'international',domestic:clone(DOMESTIC_DEFAULTS)}:{id:uid(),market,seller:{...emptyParty(),name:'深圳市佐森科技有限公司'},bank:emptyBank(),currency:'CNY',depositPercent:'100',sealId:'zuosen-cn',logoId:'international',domestic:clone(DOMESTIC_DEFAULTS),leadTime:'现货',paymentTerms:'款到发货。'};
        db.companyProfiles.push(cleanProfile(profile));
      }
      if(!db.companyProfiles.some(p=>p.id===db.defaultProfileIds[market]&&p.market===market))db.defaultProfileIds[market]=db.companyProfiles.find(p=>p.market===market).id;
    }
    db.marketDrafts=db.marketDrafts||{};
    db.companyProfiles.forEach(applyDomesticReference);
    Object.values(db.marketDrafts).forEach(applyDomesticReference);
    if(db.draft)applyDomesticReference(db.draft);
  }
  ensureProfiles();
  let state = db.draft || blankInvoice();
  if(!state.meta.profileId)state.meta.profileId=profileFor(state.meta.market)?.id||'';
  settingsProfileId=profileFor(state.meta.market,state.meta.profileId)?.id||db.companyProfiles[0].id;

  function toast(message, error = false, undo = null, actionLabel = '撤销') {
    clearTimeout(toastTimer);
    const node = $('#toast'); node.textContent = message; node.classList.toggle('error',error); node.hidden = false;
    if(undo){const button=document.createElement('button');button.type='button';button.className='toast-undo';button.textContent=actionLabel;button.addEventListener('click',()=>{clearTimeout(toastTimer);node.hidden=true;undo();});node.append(button);}
    toastTimer = setTimeout(() => { node.hidden = true; }, error || undo ? 6500 : 3500);
  }
  function persist() {
    clearTimeout(timer);timer=null;
    if(loadWarning){$('#save-status').textContent='原资料读取失败，修改暂存内存';return false;}
    try { db.draft=cleanInvoice(state); db.marketDrafts[state.meta.market||'international']=db.draft;localStorage.setItem(STORE,JSON.stringify(db)); storageOK = true; $('#save-status').innerHTML = '<span class="status-dot"></span>已保存到此浏览器'; $('#save-status').classList.remove('storage-warning'); $('#mobile-header-status').textContent='草稿已保存在本机'; return true; }
    catch (err) { storageOK = false; $('#save-status').textContent = '本地存储不可用，请导出备份'; $('#save-status').classList.add('storage-warning'); $('#mobile-header-status').textContent='暂未保存，请导出备份'; return false; }
  }
  function scheduleSave() { $('#save-status').textContent = loadWarning?'原资料读取失败，修改暂存内存':'正在保存…'; clearTimeout(timer); timer = setTimeout(persist,450); }
  function getPath(object,path) { return path.split('.').reduce((obj,key) => obj?.[key],object); }
  function setPath(object,path,value) {
    const keys = path.split('.'); let cursor=object;
    keys.slice(0,-1).forEach(key => { if (!cursor[key]) cursor[key]={}; cursor=cursor[key]; }); cursor[keys.at(-1)]=value;
  }
  function formFields(definitions,prefix,source={},fixed=false) {
    const limits={name:200,address:2000,contact:200,phone:80,email:254,beneficiary:300,bankName:300,account:200,swift:100,country:200,paypal:1000,description:3000,model:200,unit:50,specification:3000,unitPrice:64,marks:1000,taxNote:2000,shipping:2000,responsibility:3000,quality:3000,dispute:3000,taxId:100,sellerFax:80,buyerFax:80};
    return definitions.map(([key,label,type='text',wide=false]) => {
      const attrs=fixed===true||Array.isArray(fixed)&&fixed.includes(key)?' readonly title="固定资料，自动带入，无需修改"':'';
      return `<label class="${wide?'span-2':''}">${esc(label)}${type==='textarea'?`<textarea rows="2" data-field="${esc(prefix+key)}" maxlength="${limits[key]||200}"${attrs}>${esc(source[key])}</textarea>`:`<input data-field="${esc(prefix+key)}" type="${type}" ${type==='number'?'min="0" step="0.0001" inputmode="decimal"':''} maxlength="${limits[key]||200}" value="${esc(source[key])}"${attrs}>`}</label>`;
    }).join('');
  }
  function populateFields(root = document) { $$('[data-field]',root).forEach(node => { if (getPath(state,node.dataset.field) != null) node.value=getPath(state,node.dataset.field); }); }
  function prepareFormControls(root=document) {
    $$('input:not([type=file]),select,textarea',root).forEach(node=>{
      if(!node.name)node.name=node.dataset.field||node.dataset.itemField&&`item-${node.dataset.index}-${node.dataset.itemField}`||node.id||'field';
      if(!node.id)node.id='control-'+(node.closest('.view,dialog')?.id||'page')+'-'+node.name.replace(/[^A-Za-z0-9_-]/g,'-');
      if(!node.autocomplete)node.autocomplete='off';
      if(node.type==='email'||/number|account|swift|model|taxId/.test(node.name))node.spellcheck=false;
    });
  }
  function syncSelectors() {
    $('#customer-select').innerHTML = '<option value="">选择已保存客户…</option>'+db.customers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    $('#product-select').innerHTML = '<option value="">选择已保存产品…</option>'+db.products.map(x=>`<option value="${esc(x.id)}">${esc(x.model?x.model+' · ':'')}${esc(x.description)}</option>`).join('');
    $('#customer-select').parentElement.classList.toggle('empty-library',!db.customers.length);$('#product-select').parentElement.classList.toggle('empty-library',!db.products.length);
    $('#customer-count').textContent=db.customers.length; $('#product-count').textContent=db.products.length; $('#history-count').textContent=db.history.length;
    syncDocumentContext();
  }
  function sealOptions(record) {
    return (safeSeal(record.sealDataUrl)?'<option value="custom">已上传的自定义公章</option>':'')+Object.entries(SEALS).map(([id,value])=>`<option value="${id}">${esc(value.name)}</option>`).join('');
  }
  function syncDocumentContext() {
    const domestic=state.meta.market==='domestic',profiles=db.companyProfiles.filter(x=>x.market===(domestic?'domestic':'international'));
    $$('[data-market]').forEach(button=>{const active=button.dataset.market===state.meta.market;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});
    const selected=profiles.some(x=>x.id===state.meta.profileId);
    $('#company-profile-select').innerHTML=(selected?'':`<option value="">当前单据 · ${esc(state.seller.name||'自定义抬头')}</option>`)+profiles.map(x=>`<option value="${esc(x.id)}">${esc(x.seller.name||'未命名抬头')}</option>`).join('');
    $('#company-profile-select').value=selected?state.meta.profileId:'';
    const sealName=state.sealId==='none'?'不盖章':safeSeal(state.sealDataUrl)?'自定义公章':(SEALS[state.sealId]||SEALS.international).name;
    $('#company-context-note').textContent=`${domestic?'中文供货合同 · 人民币':'英文形式发票'} · ${sealName}。国内与外贸草稿分别保存。`;
    const currency=$('[data-field="meta.currency"]');currency.disabled=domestic;currency.title=domestic?'国内合同以人民币开具':'';
    $('#domestic-terms-details').hidden=!domestic;
    $('#invoice-seal-select').innerHTML=sealOptions(state);$('#invoice-seal-select').value=state.sealId==='none'?'none':safeSeal(state.sealDataUrl)?'custom':state.sealId;
    const src=sealSource(state);$('#invoice-seal-summary').innerHTML=src?`<img width="64" height="64" src="${esc(src)}" alt="本单公章预览">`:'<span>本单不显示公章</span>';
    $('.preview-size').textContent=domestic?'A4 · 中文供货合同':'A4 · 外贸原表模板';
    $('#invoice').classList.toggle('domestic-invoice',domestic);$('#invoice').lang=domestic?'zh-CN':'en';
    $('#invoice').setAttribute('aria-label',domestic?'国内供货合同':'Proforma invoice');
    $('.doc-badge').textContent=domestic?'合同':'PI';
    if(currentView==='editor')$('#breadcrumb-current').textContent=domestic?'制作合同':'制作 PI';
    updateMobileDock();
    $('#panel-order [data-field="buyer.name"]').placeholder=domestic?'例：示例客户有限公司…':"Buyer's company name…";
  }
  function applyProfile(profile,includeTerms=false) {
    state.meta.profileId=profile.id;state.seller=clone(profile.seller);state.bank=clone(profile.bank);
    for(const key of ['logoDataUrl','logoId','sealId','sealDataUrl'])state[key]=profile[key]|| (key==='logoId'?'international':key==='sealId'?'none':'');
    state.domestic={...state.domestic,taxId:profile.domestic?.taxId||'',sellerFax:profile.domestic?.sellerFax||''};
    if(includeTerms){for(const key of ['incoterm','leadTime','paymentTerms'])state.meta[key]=profile[key]||'';state.domestic=clone(profile.domestic||DOMESTIC_DEFAULTS);state.notes=profile.notes||'';state.adjustments.depositPercent=profile.depositPercent;}
    syncAll();persist();
  }
  function switchMarket(market) {
    if(!['domestic','international'].includes(market)||market===state.meta.market)return;
    db.marketDrafts[state.meta.market]=cleanInvoice(state);
    state=db.marketDrafts[market]?cleanInvoice(db.marketDrafts[market]):blankInvoice(market);
    syncAll();setPanel('order');persist();toast(market==='domestic'?'已切换国内合同，外贸草稿已保留':'已切换外贸 PI，国内草稿已保留');
  }
  function money(value) { return U.formatMoney(Number.isFinite(value)?value:0,state.meta.currency); }
  function renderItems() {
    $('#items-editor').innerHTML=state.items.map((item,index)=>`<div class="item-card" data-item="${index}"><div class="item-card-heading"><span class="item-index">产品 ${String(index+1).padStart(2,'0')}</span><div class="item-card-actions"><button data-item-action="save" data-index="${index}">存入产品库</button><button data-item-action="duplicate" data-index="${index}">复制</button><button data-item-action="remove" data-index="${index}" aria-label="删除产品 ${index+1}">删除 ×</button></div></div><div class="form-grid"><label class="span-2">产品名称 / Description *<input data-item-field="description" data-index="${index}" value="${esc(item.description)}" placeholder="产品名称（建议英文）" maxlength="2000"></label><label>型号 / Model No.<input data-item-field="model" data-index="${index}" value="${esc(item.model)}" placeholder="型号" maxlength="200"></label><label>MARKS / 备注<input data-item-field="marks" data-index="${index}" value="${esc(item.marks)}" placeholder="唛头、颜色等" maxlength="1000"></label><label class="span-2">规格说明<textarea rows="2" data-item-field="specification" data-index="${index}" placeholder="尺寸、材质、包装等" maxlength="3000">${esc(item.specification)}</textarea></label><div class="quantity-grid"><label>数量 *<input type="number" min="0.001" step="0.001" inputmode="decimal" data-item-field="quantity" data-index="${index}" value="${esc(item.quantity)}"></label><label>单位<input data-item-field="unit" data-index="${index}" value="${esc(item.unit)}" placeholder="PCS" maxlength="50"></label><label>单价 (${esc(state.meta.currency)}) *<input type="number" min="0" step="0.0001" inputmode="decimal" data-item-field="unitPrice" data-index="${index}" value="${esc(item.unitPrice)}"></label></div></div><div class="line-total"><span>此项金额</span><strong data-line-total="${index}">${money(0)}</strong></div></div>`).join('');
    updateTotals();prepareFormControls($('#items-editor'));
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
    if(m.market==='domestic'){
      $('#invoice').innerHTML=window.DomesticTemplate.render(state,result,{sealSrc:sealSource(state),esc,number});
      $('#document-number').textContent=m.number||'新建供货合同';$('#document-subtitle').textContent=`国内 · ${state.buyer.name||'未命名客户'} · CNY`;
      requestAnimationFrame(resizePreview);return;
    }
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
      <tr><td colspan="7" class="source-heading"><div class="source-brand">${state.logoId==='none'?'':`<img width="99" height="36" class="source-logo" src="${esc(state.logoDataUrl||(state.logoId==='domestic'?'./assets/zuosen-domestic-logo.jpg':'./assets/zuosen-logo.jpeg'))}" alt="公司 Logo">`}<strong>${esc(state.seller.name.replace(/\.$/,''))}</strong><img width="51" height="53" class="source-iso" src="./assets/zuosen-iso9001.png" alt="ISO 9001:2015 certified company"></div></td></tr>
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
      <tr><td colspan="7" class="source-bank"><div class="source-bank-content"><div class="source-bank-text">${esc(bankLines)}</div><div class="source-stamps">${state.sealId==='international'&&!state.sealDataUrl?'<img width="139" height="40" class="source-signature" src="./assets/zuosen-authorized-signature.png" alt="Authorized signature">':''}${sealSource(state)?`<img width="128" height="88" class="source-seal ${state.sealId==='international'&&!state.sealDataUrl?'':'custom-source-seal'}" src="${esc(sealSource(state))}" alt="本单选用公章">`:''}</div></div></td></tr>
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
    applyDomesticReference(state);
    const fixed=hasDomesticReference(state);
    $('#invoice-seller-fields').innerHTML=formFields(sellerFields,'seller.',state.seller,fixedSellerFields(state)); $('#invoice-bank-fields').innerHTML=formFields(bankFields,'bank.',state.bank,fixed);
    $('#invoice-domestic-fields').innerHTML=formFields(domesticFields,'domestic.',state.domestic,fixed?['taxId']:false);
    $('.bank-details summary span').textContent=fixed?'原合同资料 · 自动带入':'点击展开编辑';
    populateFields($('#view-editor')); syncSelectors(); renderItems(); renderInvoice(); $('#validation').hidden=true;
    prepareFormControls($('#view-editor'));
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
  function emptyState(title,description,action='') { return `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">${ICONS.editor}</div><h2>${title}</h2><p>${description}</p>${action}</div>`; }
  function renderLibrary(type) {
    const customer=type==='customers', list=db[type], name=customer?'客户':'产品';
    const button=`<button class="button primary" data-library-action="new" data-type="${type}">＋ 添加${name}</button>`;
    $(`#view-${type}`).innerHTML=heading(`${name}资料`,customer?'常用客户保存一次，下一次开单直接选择。':'把常用产品整理好，报价开单更快一步。',button)+(list.length?`<input class="library-search" data-search="${type}" placeholder="搜索${customer?'公司名称、联系人':'产品名称、型号'}…" aria-label="搜索${name}"><div class="library-grid">${list.map(item=>`<article class="library-card" data-search-text="${esc((customer?[item.name,item.contact]:[item.description,item.model]).join(' ').toLowerCase())}"><span class="card-badge" aria-hidden="true">${customer?ICONS.customers:ICONS.products}</span><h2>${esc(customer?item.name:item.description)}</h2><p>${esc(customer?(item.contact||'未填写联系人'):(item.model||'未填写型号'))}</p><p>${esc(customer?(item.email||item.address||''):(item.specification||''))}</p>${customer?'':`<div class="card-meta"><span>参考单价 · 不自动换汇</span><strong>${esc(item.unitPrice)} / ${esc(item.unit)}</strong></div>`}<div class="card-actions"><button class="text-button" data-library-action="use" data-type="${type}" data-id="${esc(item.id)}">用于当前 PI ↗</button><button class="text-button" data-library-action="edit" data-type="${type}" data-id="${esc(item.id)}">编辑</button><button class="text-button delete-button" data-library-action="delete" data-type="${type}" data-id="${esc(item.id)}">删除</button></div></article>`).join('')}</div><p class="small-help" data-no-results hidden>没有找到匹配的资料。</p>`:emptyState(`还没有保存${name}`,customer?'在制作 PI 时保存买方资料，也可以在这里添加。':'保存产品名称、型号、规格和参考单价。',button));
  }
  function renderHistory() {
    $('#view-history').innerHTML=heading('历史单据','保存成交记录，复制一份即可开始下一笔订单。')+(db.history.length?`<input class="library-search" data-search="history" placeholder="搜索 PI 编号或客户…" aria-label="搜索历史单据"><div class="library-grid">${db.history.map(record=>{const inv=record.invoice,result=U.calculate(inv);return `<article class="library-card" data-search-text="${esc((inv.meta.number+' '+inv.buyer.name).toLowerCase())}"><span class="card-badge">PI</span><h2>${esc(inv.meta.number)}</h2><p>${esc(inv.buyer.name||'未命名客户')}</p><p>${esc(inv.meta.date)} · ${inv.items.length} 项产品</p><div class="card-meta"><span>${esc(inv.meta.incoterm||'形式发票')}</span><strong>${esc(U.formatMoney(result.total,inv.meta.currency))}</strong></div><div class="card-actions"><button class="text-button" data-history-action="open" data-id="${esc(record.id)}">打开 ↗</button><button class="text-button" data-history-action="copy" data-id="${esc(record.id)}">复制新单</button><button class="text-button delete-button" data-history-action="delete" data-id="${esc(record.id)}">删除</button></div></article>`;}).join('')}</div><p class="small-help" data-no-results hidden>没有找到匹配的单据。</p>`:emptyState('第一份 PI，等你完成','在制作页面点击「保存到历史」，单据就会出现在这里。','<button class="button primary" data-view="editor">去制作 PI →</button>'));
  }
  function renderSettings() {
    const s=db.companyProfiles.find(x=>x.id===settingsProfileId)||profileFor(state.meta.market,state.meta.profileId);
    settingsProfileId=s.id;settingsDirty=false;applyDomesticReference(s);
    const fixed=hasDomesticReference(s);
    const domestic=s.market==='domestic',logoSrc=s.logoDataUrl||(s.logoId==='domestic'?'./assets/zuosen-domestic-logo.jpg':'./assets/zuosen-logo.jpeg'),sealSrc=sealSource(s);
    $('#view-settings').innerHTML=heading('抬头与公章','每个公司独立保存资料、收款账户和公章。')+`<div class="profile-manager-toolbar" id="profile-manager-toolbar"><label for="settings-profile-select">选择要修改的抬头<select id="settings-profile-select" name="settingsProfile">${db.companyProfiles.map(p=>`<option value="${esc(p.id)}">${p.market==='domestic'?'国内':'外贸'} · ${esc(p.seller.name||'未命名抬头')}</option>`).join('')}</select></label><div><button type="button" class="button secondary" id="new-company-profile">＋ 新增抬头</button><button type="button" class="text-button delete-button" id="delete-company-profile">删除抬头</button></div></div><form id="settings-form"><section class="settings-card company-profile-card"><div class="profile-card-heading"><div><span class="profile-kind">${domestic?'国内 · 中文供货合同':'外贸 · 英文 PI'}</span><h2>公司抬头</h2></div><label class="default-profile-choice"><input type="checkbox" name="makeDefault" ${db.defaultProfileIds[s.market]===s.id?'checked':''}>设为${domestic?'国内':'外贸'}默认抬头</label></div><p>${fixed?'供方资料按原合同固定带入，无需修改；公章仍可选择或替换。':'公司名称与公章需要相符；修改后可用于新单，也可应用到当前单据。'}</p><div class="form-grid">${formFields(sellerFields,'seller.',s.seller,fixedSellerFields(s))}</div><div class="logo-upload"><div class="logo-preview">${s.logoId==='none'&&!s.logoDataUrl?'无 Logo':`<img width="120" height="50" src="${esc(logoSrc)}" alt="当前公司 Logo">`}</div><div class="logo-actions"><button class="button small secondary" type="button" id="upload-logo">上传 Logo</button> <button class="text-button" type="button" id="remove-logo">恢复预设 Logo</button><p>图片仅保存在此浏览器；建议使用横版 PNG / JPG。</p></div></div></section><section class="settings-card"><h2>对应公章</h2><p>选择提供的章图，或上传此公司的公章。历史单据保留保存时的公章。</p><label class="full-label" for="profile-seal-select">公章图片<select id="profile-seal-select" name="profileSeal">${sealOptions(s)}</select></label><div class="seal-upload"><div class="seal-preview">${sealSrc?`<img width="160" height="160" src="${esc(sealSrc)}" alt="${esc(s.seller.name||'当前公司')}公章预览">`:'<span>此抬头不盖章</span>'}</div><div class="seal-actions"><button type="button" class="button secondary" id="upload-seal">上传 / 替换公章</button><button type="button" class="text-button" id="remove-seal">设为不盖章</button><p>PNG / JPG / WebP，最大 5 MB。章图按原比例显示，仅保存在本机。</p></div></div></section><section class="settings-card"><h2>${domestic?'国内收款资料':'收款银行'}</h2><p>${fixed?'增值税账户与税号按原合同固定带入，无需修改。':domestic?'填写本公司的人民币账户。国内抬头不会带入外贸账户。':'填写此抬头确认过的收款资料。'}</p><div class="form-grid">${formFields(domestic?bankFields.filter(x=>!['swift','country','paypal'].includes(x[0])):bankFields,'bank.',s.bank,fixed)}</div>${domestic?`<div class="form-grid">${formFields([['taxId','统一社会信用代码'],['sellerFax','公司传真']],'domestic.',s.domestic,fixed?['taxId']:false)}</div>`:''}</section><section class="settings-card"><h2>新单默认约定</h2><p>新建此公司的单据时自动带入，每单仍可修改。</p><div class="form-grid"><label>默认币种<select name="currency" ${domestic?'disabled':''}><option>USD</option><option>EUR</option><option>CNY</option><option>GBP</option></select></label><label>默认订金比例（%）<input name="depositPercent" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${esc(s.depositPercent??'30')}"></label><label ${domestic?'hidden':''}>默认贸易条款<select name="incoterm"><option value="">请选择</option>${['EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP','FAS'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>默认交货期<input name="leadTime" maxlength="200" value="${esc(s.leadTime)}" placeholder="${domestic?'例：收到货款后 5 天…':'Within 25 days after deposit…'}"></label><label class="span-2">默认付款条款<textarea name="paymentTerms" rows="3" maxlength="2000">${esc(s.paymentTerms)}</textarea></label><label class="span-2">默认备注<textarea name="notes" rows="3" maxlength="8000">${esc(s.notes)}</textarea></label></div>${domestic?`<div class="form-grid domestic-settings-fields">${formFields(domesticFields.filter(x=>!['taxId','sellerFax','buyerFax','buyerAgent'].includes(x[0])),'domestic.',s.domestic)}</div>`:''}<div class="settings-footer"><button class="button primary" type="submit">保存此抬头</button><button class="button secondary" type="button" id="apply-settings">保存并用于当前单据</button><button class="button ghost" type="button" data-view="editor">回到制作页面 <span aria-hidden="true">→</span></button></div></section></form><p class="small-help">抬头、章图和收款资料保存在本机。备份全部资料后，可在另一台设备恢复。</p>`;
    $('#settings-profile-select').value=s.id;$('#settings-form [name=currency]').value=s.currency||'USD';$('#settings-form [name=incoterm]').value=s.incoterm||'';
    $('#profile-seal-select').value=s.sealId==='none'?'none':safeSeal(s.sealDataUrl)?'custom':s.sealId;
    prepareFormControls($('#view-settings'));
  }
  async function leaveSettings() {
    if(!settingsDirty||currentView!=='settings')return true;
    if(!await confirm('保存抬头修改后继续？','当前抬头有未保存的修改。保存后再切换，或点取消继续编辑。'))return false;
    return saveSettings(false,true);
  }
  function openProfileSettings() {settingsProfileId=profileFor(state.meta.market,state.meta.profileId)?.id||db.companyProfiles[0].id;showView('settings');}
  function showView(view) {
    if (!['editor','customers','products','history','settings'].includes(view)) return;
    if (previewExpanded) togglePreview();
    currentView=view; $$('.view').forEach(node=>{const active=node.id===`view-${view}`;node.classList.toggle('active',active);node.hidden=!active;});
    $$('.nav-item[data-view],.mobile-nav-item[data-view]').forEach(node=>{const active=node.dataset.view===view;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
    $('#breadcrumb-current').textContent=({editor:state.meta.market==='domestic'?'制作合同':'制作 PI',customers:'客户资料',products:'产品资料',history:'历史单据',settings:'公司与收款设置'})[view];
    if (view==='customers'||view==='products') renderLibrary(view); else if(view==='history') renderHistory(); else if(view==='settings') renderSettings(); else requestAnimationFrame(resizePreview);
    $('#mobile-header-title').textContent=view==='editor'?'开单工作台':({customers:'客户资料',products:'产品资料',history:'历史单据',settings:'公司设置'})[view];
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
    state=blankInvoice(state.meta.market,state.meta.profileId);syncAll();setPanel('order');showView('editor');persist();toast('新单据已准备好');
  }
  function clearFieldError(node) {
    if(!node)return;node.removeAttribute('aria-invalid');
    const id=node.dataset.errorId;if(id){document.getElementById(id)?.remove();node.setAttribute('aria-describedby',(node.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&x!==id).join(' '));delete node.dataset.errorId;}
  }
  function fieldError(node,message) {
    if(!node)return;clearFieldError(node);prepareFormControls(node.parentElement);
    const error=document.createElement('span');error.className='field-error';error.id=node.id+'-error';error.textContent=message;node.after(error);node.dataset.errorId=error.id;node.setAttribute('aria-invalid','true');node.setAttribute('aria-describedby',error.id);
  }
  function focusInvoiceField(node) {
    if(!node)return;const section=node.closest('.tab-panel');if(section)setPanel(section.id.replace('panel-',''));
    for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    node.focus({preventScroll:true});node.scrollIntoView({block:'center',behavior:'auto'});
  }
  function validate() {
    const root=$('#view-editor');$$('[aria-invalid]',root).forEach(clearFieldError);
    const errors=[...U.calculate(state).errors];
    if (!state.meta.number.trim()) errors.unshift('请填写单据编号');
    if (!state.meta.date) errors.push('请选择开单日期');
    if (!state.seller.name.trim()) errors.push('请填写卖方公司名称');
    if (!state.buyer.name.trim()) errors.push('请填写买方公司名称');
    if (!state.items.length||!state.items.some(x=>x.description.trim()||x.model.trim())) errors.push('请至少添加一项产品');
    state.items.forEach((item,index)=>{if(!item.description.trim()) errors.push(`产品 ${index+1}：请填写产品名称`);});
    if(state.meta.validUntil&&state.meta.validUntil<state.meta.date) errors.push('有效期不能早于开单日期');
    const target=message=>{
      const line=/第\s*(\d+)\s*行/.exec(message)||/产品\s*(\d+)/.exec(message);
      if(line){const key=message.includes('数量')?'quantity':message.includes('单价')?'unitPrice':'description';return $(`[data-item-field="${key}"][data-index="${Number(line[1])-1}"]`,root);}
      const field=message.includes('编号')?'meta.number':message.includes('有效期')?'meta.validUntil':message.includes('日期')?'meta.date':message.includes('卖方')?'seller.name':message.includes('买方')?'buyer.name':message.includes('产品')?'item':message.includes('订金')?'adjustments.depositPercent':message.includes('折扣')?'adjustments.discount':message.includes('运费')?'adjustments.shipping':message.includes('费用')?'adjustments.other':null;
      return field==='item'?$('[data-item-field="description"]',root):field?$(`[data-field="${field}"]`,root):null;
    };
    const unique=[...new Set(errors)],targets=unique.map(target);unique.forEach((message,i)=>fieldError(targets[i],message));
    const node=$('#validation');node.hidden=!unique.length;node.innerHTML=unique.length?`<strong>还有 ${unique.length} 项需要确认</strong><ul>${unique.map((message,i)=>`<li>${targets[i]?`<button type="button" class="inline-button" data-focus-error="${esc(targets[i].id)}">${esc(message)}</button>`:esc(message)}</li>`).join('')}</ul>`:'';
    if(unique.length){focusInvoiceField(targets.find(Boolean));toast('请完成标出的资料后再保存',true);return false;}return true;
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
    prepareFormControls($('#dialog-fields'));$('#edit-dialog').showModal();setTimeout(()=>$('#dialog-fields input')?.focus(),0);
  }
  function saveLibraryItem(type,raw) {
    const item=type==='customers'?cleanParty(raw):cleanProduct(raw);
    const name=type==='customers'?item.name:item.description;
    const errorField=key=>$('#edit-dialog').open?$(`#dialog-fields [data-field="dialog.${key}"]`):type==='customers'?$('[data-field="buyer.name"]'):$(`[data-item-field="${key}"][data-index="${Math.max(0,state.items.indexOf(raw))}"]`);
    const showError=(key,message)=>{const field=errorField(key);fieldError(field,message);if($('#edit-dialog').open)field?.focus();else focusInvoiceField(field);toast(message,true);return false;};
    if(!name.trim())return showError(type==='customers'?'name':'description',type==='customers'?'请填写公司名称':'请填写产品名称');
    if(type==='products'){const checked=U.calculate({...state,items:[item],adjustments:{discount:0,shipping:0,other:0,depositPercent:0}});if(checked.errors.length)return showError(checked.errors[0].includes('数量')?'quantity':'unitPrice',checked.errors[0]);}
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
  function saveSettings(apply=false,quiet=false) {
    const form=$('#settings-form'),profile=db.companyProfiles.find(x=>x.id===settingsProfileId);
    if(!form||!profile)return false;
    const raw=clone(profile);
    $$('[data-field]',form).forEach(node=>setPath(raw,node.dataset.field,node.value));
    for(const name of ['currency','incoterm','leadTime','paymentTerms','notes','depositPercent'])raw[name]=$(`[name="${name}"]`,form).value;
    if(!raw.seller.name.trim()){const field=$('[data-field="seller.name"]',form);fieldError(field,'请填写公司抬头名称');field.focus();toast('请填写公司抬头名称',true);return false;}
    const check=U.calculate({...state,adjustments:{discount:0,shipping:0,other:0,depositPercent:raw.depositPercent}});
    if(check.errors.some(x=>x.includes('订金'))){fieldError($('[name=depositPercent]',form),'请输入 0 到 100 之间的订金比例');$('[name=depositPercent]',form).focus();toast('订金比例应在 0 到 100 之间',true);return false;}
    const sealChoice=$('#profile-seal-select').value;
    if(sealChoice!=='custom'){raw.sealId=sealChoice;raw.sealDataUrl='';}
    const next=cleanProfile(applyDomesticReference(raw));Object.assign(profile,next);
    if($('[name=makeDefault]',form).checked)db.defaultProfileIds[profile.market]=profile.id;
    if(profile.market==='international'&&db.defaultProfileIds.international===profile.id)db.settings=clone(profile);
    settingsDirty=false;$$('[aria-invalid]',form).forEach(clearFieldError);
    if(apply){
      if(state.meta.market!==profile.market){db.marketDrafts[state.meta.market]=cleanInvoice(state);state=db.marketDrafts[profile.market]?cleanInvoice(db.marketDrafts[profile.market]):blankInvoice(profile.market,profile.id);}
      applyProfile(profile,true);
    }
    const saved=persist();syncDocumentContext();
    if(!quiet)toast(saved?(apply?'抬头、公章与约定已应用到当前单据':'此抬头已保存，新单会自动带入'):'资料暂存内存，请导出备份',!saved);
    return true;
  }
  async function uploadProfileImage(kind) {
    if(!saveSettings(false,true))return;
    const profile=db.companyProfiles.find(x=>x.id===settingsProfileId),input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';
    input.onchange=async()=>{
      const file=input.files[0];if(!file)return;
      if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('请选择 5 MB 以内的 PNG、JPG 或 WebP 图片',true);return;}
      try{
        const bitmap=await createImageBitmap(file),limit=kind==='seal'?650000:450000;let data='';
        for(const max of [900,650,450,300]){const canvas=document.createElement('canvas'),scale=Math.min(1,max/bitmap.width,max/bitmap.height);canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/png');if(data.length<=limit)break;}
        bitmap.close();if(data.length>limit)throw new Error('图片过大');
        if(kind==='seal'){profile.sealDataUrl=safeSeal(data);if(profile.sealId==='none')profile.sealId=profile.market==='domestic'?'zuosen-cn':'international';}else profile.logoDataUrl=safeLogo(data);
        persist();renderSettings();toast(kind==='seal'?'公章已保存到此抬头，应用后显示在当前单据':'Logo 已保存到此抬头');
      }catch(err){toast('无法读取图片，请换一张 PNG 或 JPG 重试',true);}
    };input.click();
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
    const buttons={order:'下一步：产品',items:'下一步：条款',terms:state.meta.market==='domestic'?'预览合同':'查看 PI',preview:'保存到本地'};
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
    const node=event.target;clearFieldError(node);
    if(node.closest('#settings-form')){settingsDirty=true;return;}
    if(node.matches('[data-search]')){let count=0;const query=node.value.trim().toLowerCase();$$('[data-search-text]',node.parentElement).forEach(card=>{const match=card.dataset.searchText.includes(query);card.hidden=!match;if(match)count++;});$('[data-no-results]',node.parentElement).hidden=count>0;return;}
    if(!node.closest('#view-editor'))return;
    if(node.dataset.field){setPath(state,node.dataset.field,node.value);if(node.dataset.field==='seller.name'&&fixedSellerFields(state)){const profile=db.companyProfiles.find(p=>p.market===state.meta.market&&p.seller.name===state.seller.name);if(profile)state.meta.profileId=profile.id;syncAll();}if(node.dataset.field==='meta.currency')renderItems();update();}
    if(node.dataset.itemField){state.items[Number(node.dataset.index)][node.dataset.itemField]=node.value;update();}
  });
  document.addEventListener('change',event=>{
    const node=event.target;
    if(node.id==='customer-select'&&node.value){state.buyer=cleanParty(db.customers.find(x=>x.id===node.value));populateFields($('#panel-order'));update();toast('客户资料已带入');}
    if(node.id==='product-select'&&node.value){const product=db.products.find(x=>x.id===node.value);if(product){addItem({...product,quantity:'1'});node.value='';toast('产品已添加，请确认当前币种与价格');}}
    if(node.id==='company-profile-select'&&node.value){const profile=profileFor(state.meta.market,node.value);applyProfile(profile);toast('抬头、收款资料与对应公章已带入');}
    if(node.id==='invoice-seal-select'){if(node.value!=='custom'){state.sealId=node.value;state.sealDataUrl='';}syncDocumentContext();update();}
    if(node.id==='settings-profile-select'){const next=node.value;leaveSettings().then(allowed=>{if(allowed){settingsProfileId=next;renderSettings();}else node.value=settingsProfileId;});}
    if(node.id==='profile-seal-select'){settingsDirty=true;const profile=db.companyProfiles.find(x=>x.id===settingsProfileId),src=sealSource({...profile,sealId:node.value==='custom'?profile.sealId:node.value,sealDataUrl:node.value==='custom'?profile.sealDataUrl:''});$('.seal-preview').innerHTML=src?`<img width="160" height="160" src="${esc(src)}" alt="选中公章预览">`:'<span>此抬头不盖章</span>';}
    if(node.closest('#settings-form'))settingsDirty=true;
  });
  document.addEventListener('click',async event=>{
    const node=event.target.closest('button,a[data-view]');if(!node)return;if(node.tagName==='A')event.preventDefault();
    if(node.dataset.focusError){focusInvoiceField(document.getElementById(node.dataset.focusError));return;}
    if(node.dataset.market){switchMarket(node.dataset.market);return;}
    if(node.dataset.mobileAction){$('#mobile-sheet').close();const action=node.dataset.mobileAction;const route={local:'save-local',print:'print-invoice',excel:'export-excel',save:'save-invoice',new:'new-invoice',demo:'load-demo',backup:'backup-all',restore:'restore-all',import:'import-invoice','invoice-backup':'export-json'};if(action==='share')await shareInvoice();else if(route[action]){if(['local','print','excel','save'].includes(action)&&currentView!=='editor')showView('editor');$(`#${route[action]}`).click();}return;}
    if(node.dataset.view){if(await leaveSettings())showView(node.dataset.view);return;}
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
      if(action==='open'||action==='copy'){if(!await confirm(action==='copy'?'复制为一份新 PI？':'打开这份 PI？','当前草稿将被替换。需要保留的草稿，请先保存到历史或导出备份。'))return;const fresh=blankInvoice(record.invoice.meta.market,record.invoice.meta.profileId);state=cleanInvoice(record.invoice);if(action==='copy'){state.meta.number=fresh.meta.number;state.meta.date=today();state.meta.validUntil='';}syncAll();setPanel('order');showView('editor');persist();toast(action==='copy'?'已复制，新单号已生成':'历史单据已打开');}return;
    }
    const actions={
      'new-invoice':newInvoice,'save-invoice':saveHistory,'add-item':()=>{addItem(emptyItem());},'add-item-bottom':()=>{addItem(emptyItem());},
      'save-customer':()=>{editContext=null;saveLibraryItem('customers',state.buyer);},
      'export-json':()=>{downloadJSON({app:'pi-studio',version:1,type:'invoice',invoice:state},`${state.meta.number||'PI'}.json`);toast('单据备份已导出');},
      'export-excel':()=>{if(validate()){try{U.downloadXlsx(state);toast('Excel 文件已导出');}catch(err){toast(err.message,true);}}},
      'save-local':saveLocalInvoice,'print-invoice':printInvoice,'finish-invoice':saveLocalInvoice,'expand-preview':togglePreview,
      'manage-company-profiles':openProfileSettings,'manage-invoice-seal':openProfileSettings,
      'new-company-profile':async()=>{if(!await leaveSettings())return;if(db.companyProfiles.length>=20){toast('最多保存20个抬头，请先整理资料',true);return;}const base=db.companyProfiles.find(x=>x.id===settingsProfileId),profile=cleanProfile({id:uid(),market:base.market,seller:emptyParty(),bank:emptyBank(),domestic:clone(DOMESTIC_DEFAULTS),currency:base.market==='domestic'?'CNY':'USD',depositPercent:'100',leadTime:'',paymentTerms:'',sealId:'none',logoId:base.market==='domestic'?'domestic':'international'});db.companyProfiles.push(profile);settingsProfileId=profile.id;persist();renderSettings();$('[data-field="seller.name"]',$('#settings-form')).focus();},
      'delete-company-profile':async()=>{const profile=db.companyProfiles.find(x=>x.id===settingsProfileId);if(db.companyProfiles.filter(x=>x.market===profile.market).length<=1){toast('国内和外贸各需保留至少一个抬头',true);return;}if(!await confirm('删除这个抬头？','已保存的合同保留原抬头和公章，仅从常用抬头中移除。'))return;db.companyProfiles=db.companyProfiles.filter(x=>x.id!==profile.id);if(db.defaultProfileIds[profile.market]===profile.id)db.defaultProfileIds[profile.market]=db.companyProfiles.find(x=>x.market===profile.market).id;settingsProfileId=db.defaultProfileIds[profile.market];settingsDirty=false;persist();renderSettings();syncDocumentContext();},
      'upload-seal':()=>uploadProfileImage('seal'),
      'remove-seal':()=>{$('#profile-seal-select').value='none';$('#profile-seal-select').dispatchEvent(new Event('change',{bubbles:true}));},
      'mobile-more':()=>openMobileSheet(),'close-mobile-sheet':()=>$('#mobile-sheet').close(),'mobile-next':mobileNext,
      'mobile-preview-btn':()=>{setPanel(panel==='preview'?'order':'preview');window.scrollTo({top:0,behavior:'instant'});},
      'preview-zoom':()=>{previewZoomed=!previewZoomed;$('.preview-panel').classList.toggle('preview-zoomed',previewZoomed);$('#preview-zoom').textContent=previewZoomed?'适合屏幕':'100% 阅读';$('#preview-zoom').setAttribute('aria-pressed',String(previewZoomed));$('#preview-hint').textContent=previewZoomed?'当前为原尺寸，左右滑动查看完整单据。':'点「100% 阅读」查看细节，左右滑动单据。';resizePreview();},
      'backup-all':()=>{if(loadWarning&&originalStorage){try{downloadJSON({app:'pi-studio',version:1,type:'backup',data:JSON.parse(originalStorage)},`PI-Studio-recovery-${today()}.json`);}catch(err){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([originalStorage],{type:'application/json'}));a.href=url;a.download=`PI-Studio-recovery-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}toast('原始浏览器资料已导出，请保留以便恢复');return;}downloadJSON({app:'pi-studio',version:1,type:'backup',data:{...db,draft:state}},`PI-Studio-backup-${today()}.json`);toast('全部资料备份已导出');},
      'restore-all':()=>{importMode='backup';$('#json-file').value='';$('#json-file').click();},
      'import-invoice':()=>{importMode='invoice';$('#json-file').value='';$('#json-file').click();},
      'close-dialog':()=>$('#edit-dialog').close(),'cancel-dialog':()=>$('#edit-dialog').close(),
      'confirm-cancel':()=>finishConfirm(false),'confirm-ok':()=>finishConfirm(true),
      'apply-settings':()=>saveSettings(true),
      'upload-logo':()=>uploadProfileImage('logo'),
      'remove-logo':()=>{if(!saveSettings(false,true))return;const profile=db.companyProfiles.find(x=>x.id===settingsProfileId);profile.logoDataUrl='';persist();renderSettings();toast('已恢复此抬头预设 Logo');},
      'load-demo':async()=>{if(!await confirm('填入演示示例？','将替换当前草稿，使用虚构客户和图册中的 ARL1 柱塞泵演示开单；产品价格待确认。抬头、公章和资料库保持不变。'))return;const domestic=state.meta.market==='domestic';state=blankInvoice(state.meta.market,state.meta.profileId);state.buyer=domestic?{name:'示例客户有限公司（演示）',address:'示例市示例路1号',contact:'演示联系人',email:'buyer@example.com',phone:''}:clone(DEMO_CUSTOMER);state.items=[domestic?{...clone(DEMO_PRODUCT),description:'ARL1 系列变量柱塞泵',unit:'件',marks:'图册示例，单价待确认'}:clone(DEMO_PRODUCT)];if(!domestic){state.meta.incoterm='DAP';state.meta.port='Berlin, Germany';state.meta.leadTime='Within 25 days after receipt of deposit.';state.meta.paymentTerms='30% T/T deposit, 70% balance before shipment.';state.adjustments.depositPercent='30';}state.notes=domestic?'演示单据：买方为虚构信息，产品参考 ZUOSEN 图册，价格待确认。':'DEMONSTRATION ONLY — Buyer and buyer contact details are fictional.\nProduct specifications reference the ZUOSEN catalog (C01/C02). Price is not quoted; enter the confirmed unit price before use.';syncAll();persist();toast('已填入图册产品示例，请填写确认后的单价');}

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
        loadWarning='';originalStorage='';db=next;ensureProfiles();state=db.draft||blankInvoice();syncAll();showView('editor');persist();toast(storageOK?'全部资料已恢复':'资料已导入内存，但本地存储不足，请保留备份',!storageOK);
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
  window.addEventListener('beforeunload',event=>{if(settingsDirty||(!storageOK&&(state.buyer.name||state.items.some(x=>x.description)))){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{if(timer&&!loadWarning)persist();});
  if(window.ResizeObserver){new ResizeObserver(resizePreview).observe($('#preview-stage'));new ResizeObserver(resizePreview).observe($('#invoice'));}
  prepareFormControls();syncAll();setPanel('order');syncMobileContext();
  if(loadWarning){toast(loadWarning,true);$('#save-status').textContent='原资料读取失败，请保留原备份';}else persist();
})();
