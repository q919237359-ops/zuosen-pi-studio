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

  async function create(invoice, {title = 'Proforma Invoice', onProgress = () => {}} = {}) {
    // Snapshot before asynchronous work: changes made during export belong to the next file.
    const source = invoice.cloneNode(true);
    const sourceTable = source.querySelector('.source-table');
    if (!sourceTable) throw new Error('当前单据没有可保存的内容');
    await Promise.all([
      loadScript('vendor/html2canvas-1.4.1.min.js', () => typeof window.html2canvas === 'function'),
      loadScript('vendor/jspdf-4.2.1.min.js', () => typeof window.jspdf?.jsPDF === 'function'),
      document.fonts?.ready || Promise.resolve()
    ]);
    const stage = document.createElement('div');
    stage.dataset.pdfExport = 'true';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;pointer-events:none;z-index:-1';
    document.body.append(stage);
    try {
      const rows = [...sourceTable.tBodies[0].rows];
      const repeated = rows.filter(row => row.querySelector('.source-heading,.source-title') || row.classList.contains('source-column-head'));
      const pages = [];
      function newPage(repeatHeader) {
        const paper = document.createElement('div');
        paper.className = 'invoice-paper';
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
          onclone:doc => { const copy=doc.querySelector('[data-pdf-export]');if(copy){copy.style.left='0';copy.style.position='absolute';} }
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
