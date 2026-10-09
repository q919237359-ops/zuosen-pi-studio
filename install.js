/* Home-screen installation; the browser or OS always confirms the final action. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const dialog = $('#install-help');
  if (!dialog) return;
  const base = new URL('.', document.currentScript.src);
  const pageURL = /^https?:$/.test(base.protocol) && !['127.0.0.1','localhost','[::1]'].includes(base.hostname) ? base.href : 'https://q919237359-ops.github.io/zuosen-pi-studio/';
  const ua = navigator.userAgent;
  const wechat = /MicroMessenger/i.test(ua);
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone = matchMedia('(display-mode: standalone)');
  let promptEvent = null, installed = standalone.matches || navigator.standalone === true;
  let trigger = null;
  const runningAsApp = () => standalone.matches || navigator.standalone === true;

  function sync() {
    $('#install-card').hidden = installed;
    document.querySelectorAll('[data-install-app]').forEach(button => {
      const label = button.querySelector('[data-install-label]');
      if (label) label.textContent = installed ? (runningAsApp() ? '桌面版已打开' : '已添加桌面入口') : '添加到手机桌面';
    });
    $('#install-native').hidden = !promptEvent || installed || wechat || ios;
    updateOffline();
  }
  function updateOffline() {
    const state = window.PIOffline?.state || {};
    const ready = state.ready || state.status === 'ready' || state.status === 'update-available';
    $('#install-offline-state').textContent = ready ? (runningAsApp() ? '离线资源已准备好，可以断网开单、保存 PDF 和 Excel。' : '此浏览器的离线资源已准备好。添加后请先联网打开桌面图标一次，等待离线准备完成。') : state.status === 'error' ? '离线资源暂未准备好；仍可添加桌面入口，联网后再打开一次。' : state.status === 'unsupported' ? '添加后可从桌面打开，离线使用取决于此浏览器支持。' : '正在准备离线资源，请保持联网片刻。';
    $('#install-offline-state').dataset.ready = String(Boolean(ready));
    const indicator = $('#offline-readiness');
    indicator.hidden = ready && navigator.onLine && !runningAsApp();
    indicator.dataset.ready = String(Boolean(ready));
    indicator.textContent = ready ? (navigator.onLine ? '离线资源已准备好 · 可以断网开单' : '离线模式 · 开单与文件导出可用') : state.status === 'unsupported' ? '此浏览器暂不支持离线使用，请联网开单。' : state.status === 'error' || !navigator.onLine ? '离线资源尚未准备好，请联网打开一次。' : '正在准备离线资源，请保持联网片刻…';
  }
  function help() {
    let title = '添加到手机桌面', note = '桌面图标使用 ZUOSEN Logo，名称为「ZUOSEN PI」。', steps;
    if (installed) {
      title = runningAsApp() ? '已从桌面打开' : '已添加到桌面';
      steps = runningAsApp() ? ['这个窗口已在桌面应用模式中运行。', '等待离线资源准备完成后，即可断网开单。'] : ['点击桌面的「ZUOSEN PI」图标打开工作台。', '首次打开请保持联网，等待离线资源准备完成。'];
    } else if (wechat) {
      title = '先在手机浏览器中打开';
      note = '微信内置浏览器无法弹出桌面安装窗口。';
      steps = ['点击微信右上角「···」，选择「在浏览器打开」；没有此选项时，复制下方链接到 Safari / Chrome。', ios ? '在 Safari 中点击分享按钮（方框向上箭头），选择「添加到主屏幕」。' : '在手机浏览器菜单中选择「添加到主屏幕」或「安装应用」。', '确认名称后，点击「添加」或「安装」。'];
    } else if (ios) {
      steps = ['在 Safari 中打开此网站，点击分享按钮（方框向上箭头）。', '向下滑动分享菜单，选择「添加到主屏幕」。', '如显示「作为网页 App 打开」，将它开启，再点击「添加」。'];
      note = 'iPhone 需要通过浏览器的分享菜单添加，网页无法替你完成系统确认。';
    } else if (android) {
      steps = ['点击浏览器右上角菜单「⋮」或底部菜单。', '选择「安装并创建快捷方式」→「安装」；旧版本可选择「安装应用」或「添加到主屏幕」。', '确认名称后点击「安装」或「添加」。'];
      note = promptEvent ? '也可点击下方按钮，打开系统安装窗口。' : '若菜单没有此选项，请复制链接到 Chrome 或手机自带浏览器打开。';
    } else {
      title = '添加桌面入口';
      steps = ['手机上打开下方网站链接。', 'iPhone：Safari 分享菜单 → 添加到主屏幕。', '安卓：浏览器菜单 → 安装应用 / 添加到主屏幕。'];
      note = promptEvent ? '此电脑也支持安装，可点击下方按钮。' : '电脑可使用浏览器地址栏中的安装图标；Safari 可使用「文件 → 添加到程序坞」。';
    }
    $('#install-title').textContent = title;
    $('#install-description').textContent = note;
    const list = $('#install-steps');list.replaceChildren();
    steps.forEach(text => {const item = document.createElement('li');item.textContent = text;list.append(item);});
    $('#install-url').value = pageURL;
    $('#install-copy').textContent = '复制网站链接';
    $('#install-copy-status').textContent = '';
    sync();
    if (!dialog.open) dialog.showModal();
  }
  async function install() {
    if (!promptEvent || installed || wechat || ios) { help();return; }
    const event = promptEvent;promptEvent = null;sync();
    try {
      // Invoke immediately within the click gesture, before any asynchronous work.
      await event.prompt();
      const choice = await event.userChoice;
      if (choice?.outcome === 'accepted' && dialog.open) dialog.close();
    } catch { help(); }
  }
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault();promptEvent = event;sync();});
  window.addEventListener('appinstalled', () => {installed = true;promptEvent = null;sync();if(dialog.open)help();});
  standalone.addEventListener?.('change', () => {installed = standalone.matches || navigator.standalone === true;sync();});
  window.addEventListener('offline-ready', updateOffline);
  window.addEventListener('offline-status', updateOffline);
  window.addEventListener('online', updateOffline);
  window.addEventListener('offline', updateOffline);
  window.PIOffline?.ready?.then(updateOffline);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-install-app]');
    if (!button) return;
    trigger = button;
    const sheet = $('#mobile-sheet');if(sheet?.open)sheet.close();
    if (promptEvent && !wechat && !ios && !installed) install();else help();
  });
  $('#install-native').addEventListener('click', install);
  $('#install-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {if(trigger?.isConnected)trigger.focus({preventScroll:true});});
  $('#install-copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(pageURL);
      $('#install-copy').textContent = '已复制';
      $('#install-copy-status').textContent = '链接已复制，可粘贴到手机浏览器。';
    } catch {
      $('#install-url').focus();$('#install-url').select();
      $('#install-copy-status').textContent = '请长按上方链接，选择复制。';
    }
  });
  sync();
})();
