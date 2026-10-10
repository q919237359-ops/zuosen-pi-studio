/* Browser-only PDF export. Vendored libraries are loaded only on first use. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const loads = new Map();
  const WIDTH = 720, HEIGHT = WIDTH * 297 / 210;
  const TOP = 33.9, BOTTOM = 35, CONTENT_HEIGHT = HEIGHT - TOP - BOTTOM;

  function loadScript(path, ready) {
    if (ready()) return Promise.resolve();
    if (loads.has(path)) return loads.get(path);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(path, base).href;
      script.onload = () => ready() ? resolve() : reject(new Error('PDF 组件未能加载'));
      script.onerror = () => { script.remove(); loads.delete(path); reject(new Error('PDF 组件未能加载，请稍后重试')); };
      document.head.append(script);
    });
    loads.set(path, promise);
    return promise;
  }

  // A rowspan and the rows it spans must remain on the same page.
  function rowGroups(rows) {
    const groups = [];
    for (let start = 0; start < rows.length;) {
      let end = start;
      for (let i = start; i <= end; i++) {
        for (const cell of rows[i].cells) end = Math.max(end, Math.min(rows.length - 1, i + cell.rowSpan - 1));
      }
      groups.push(rows.slice(start, end + 1));
      start = end + 1;
    }
    return groups;
  }

  function snapshotStyles() {
    // The renderer's about:blank document cannot rely on our service worker.
    // Preserve the loaded cascade and media queries without re-fetching CSS.
    return [...document.styleSheets].filter(sheet => !sheet.disabled).map(sheet => {
      if (sheet.href && new URL(sheet.href, document.baseURI).origin !== location.origin) return '';
      let rules;
      try { rules = [...sheet.cssRules].map(rule => rule.cssText).join('\n'); }
      catch (_) { throw new Error('单据样式未能读取，请刷新后再保存'); }
      const media = sheet.media.mediaText;
      return media && media !== 'all' ? `@media ${media} {\n${rules}\n}` : rules;
    }).join('\n');
  }

  function blobDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('单据图片未能读取'));
      reader.readAsDataURL(blob);
    });
  }

  async function embeddedImage({image, src}) {
    if (src.startsWith('data:image/')) return src;
    // Reuse the decoded pixels when possible, including an offline reload.
    if (image.complete && image.naturalWidth && (image.currentSrc || image.src) === src) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;canvas.height = image.naturalHeight;
      try {
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.toDataURL('image/png');
      } catch (_) {
        // The main document can still fetch same-origin assets through its SW.
      } finally { canvas.width = 0;canvas.height = 0; }
    }
    const url = new URL(src, document.baseURI);
    if (url.origin !== location.origin || !['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('单据图片未能读取');
    const response = await fetch(url.href, {credentials:'same-origin'});
    if (!response.ok) throw new Error('单据图片未能加载，请刷新后再保存');
    return blobDataURL(await response.blob());
  }

  async function embedImages(source, snapshots) {
    const images = new Map();
    await Promise.all([...source.querySelectorAll('img')].map(async (image, index) => {
      const snapshot = snapshots[index];
      if (!images.has(snapshot.src)) images.set(snapshot.src, embeddedImage(snapshot));
      image.removeAttribute('srcset');image.removeAttribute('sizes');
      image.loading = 'eager';image.src = await images.get(snapshot.src);
    }));
  }

  async function create(invoice, {title = 'Proforma Invoice', onProgress = () => {}} = {}) {
    // Snapshot before asynchronous work: changes made during export belong to the next file.
    const source = invoice.cloneNode(true);
    const sourceTable = source.querySelector('.source-table');
    if (!sourceTable) throw new Error('当前单据没有可保存的内容');
    const css = snapshotStyles();
    const images = [...invoice.querySelectorAll('img')].map(image => ({image, src:image.currentSrc || image.src}));
    await Promise.all([
      loadScript('vendor/html2canvas-1.4.1.min.js', () => typeof window.html2canvas === 'function'),
      loadScript('vendor/jspdf-4.2.1.min.js', () => typeof window.jspdf?.jsPDF === 'function'),
      document.fonts?.ready || Promise.resolve()
    ]);
    await embedImages(source, images);
    const stage = document.createElement('div');
    stage.dataset.pdfExport = 'true';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;pointer-events:none;z-index:-1';
    document.body.append(stage);
    try {
      const rows = [...sourceTable.tBodies[0].rows];
      const repeated = rows.filter(row => row.querySelector('.source-heading,.source-title,.domestic-contract-number') || row.classList.contains('source-column-head'));
      const pages = [];
      function newPage(repeatHeader) {
        const paper = document.createElement('div');
        paper.className = source.className;
        paper.lang = source.lang;
        paper.style.cssText = `display:block!important;width:${WIDTH}px!important;height:${HEIGHT}px!important;min-height:0!important;max-height:none!important;transform:none!important;padding:${TOP}px 19.2px ${BOTTOM}px!important;margin:0!important;box-shadow:none!important;overflow:hidden!important;background:#fff!important`;
        const table = sourceTable.cloneNode(false);
        const columns = sourceTable.querySelector('colgroup');
        if (columns) table.append(columns.cloneNode(true));
        const body = document.createElement('tbody');
        table.append(body);paper.append(table);stage.append(paper);
        if (repeatHeader) for (const row of repeated) body.append(row.cloneNode(true));
        const page = {paper, table, body, contentGroups:0, sealed:false};
        pages.push(page);
        return page;
      }
      let page = newPage(false);
      for (const group of rowGroups(rows)) {
        if (page.sealed) page = newPage(true);
        let nodes = group.map(row => row.cloneNode(true));
        nodes.forEach(row => page.body.append(row));
        if (page.table.getBoundingClientRect().height > CONTENT_HEIGHT && page.contentGroups > 0) {
          nodes.forEach(row => row.remove());
          page = newPage(true);
          nodes = group.map(row => row.cloneNode(true));
          nodes.forEach(row => page.body.append(row));
        }
        page.contentGroups++;
        const height = page.table.getBoundingClientRect().height;
        // Exceptionally long single rows are fitted whole rather than cut off.
        if (height > CONTENT_HEIGHT) {
          page.table.style.transformOrigin = 'top left';
          page.table.style.transform = `scale(${CONTENT_HEIGHT / height})`;
          page.sealed = true;
        }
      }
      await Promise.all([...stage.querySelectorAll('img')].map(async img => {
        if (!img.complete) await new Promise((resolve, reject) => { img.onload=resolve;img.onerror=reject; });
        if (!img.naturalWidth) throw new Error('单据图片未能加载，请刷新后再保存');
        if (img.decode) await img.decode();
      }));
      const pdf = new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      pdf.setProperties({title:String(title),subject:'Proforma Invoice',creator:'PI Studio'});
      for (let i = 0; i < pages.length; i++) {
        onProgress(i + 1, pages.length);
        // Render one A4 canvas at a time, staying below mobile canvas-size limits.
        const canvas = await window.html2canvas(pages[i].paper, {
          width:WIDTH,height:HEIGHT,scale:2,backgroundColor:'#fff',logging:false,
          scrollX:0,scrollY:0,imageTimeout:15000,
          // Only the clone receives the captured CSS; the live page stays untouched.
          ignoreElements:node => node.tagName === 'STYLE' || node.tagName === 'LINK' && node.relList.contains('stylesheet') || node.tagName === 'IMG' && !node.closest('[data-pdf-export]'),
          onclone:doc => {
            const style = doc.createElement('style');style.textContent = css;doc.head.append(style);
            const copy = doc.querySelector('[data-pdf-export]');
            if (copy) {copy.style.left='0';copy.style.position='absolute';}
          }
        });
        if (i) pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,0,210,297,undefined,'FAST');
        canvas.width=0;canvas.height=0;
      }
      return pdf.output('blob');
    } finally { stage.remove(); }
  }
  window.PIPdf = Object.freeze({create});
})();
