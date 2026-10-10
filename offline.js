/* Static app caching only. Customer, company, and invoice data stay in localStorage. */
(() => {
  'use strict';
  if (window.PIOffline) return;
  const BUILD = '20261010-1';
  const APP = new URL('./', document.currentScript?.src || location.href);
  const WORKER = new URL('sw.js', APP).href;
  const supported = location.protocol !== 'file:' && window.isSecureContext && 'serviceWorker' in navigator;
  let registration, readyPromise, finish, deadline, pending = false, generation = 0;
  let state = Object.freeze({status:'installing', ready:false, version:BUILD, online:navigator.onLine, updateAvailable:false, error:''});
  const watched = new WeakSet();

  function publish(patch) {
    const previous = state;
    state = Object.freeze({...state, ...patch, online:navigator.onLine});
    window.dispatchEvent(new CustomEvent('offline-status', {detail:state}));
    if (state.ready && (!previous.ready || previous.version !== state.version)) window.dispatchEvent(new CustomEvent('offline-ready', {detail:state}));
    if (state.ready || state.status === 'unsupported' || state.status === 'error') {
      clearTimeout(deadline);
      pending = false;
      if (finish) { const resolve = finish; finish = null; resolve(state); }
    }
    return state;
  }

  function workerStatus(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {channel.port1.close(); reject(new Error('离线组件响应超时'));}, 5000);
      channel.port1.onmessage = event => {clearTimeout(timer);channel.port1.close();resolve(event.data);};
      try {worker.postMessage({type:'PI_OFFLINE_STATUS'}, [channel.port2]);}
      catch (error) {clearTimeout(timer);channel.port1.close();reject(error);}
    });
  }

  async function probe() {
    const worker = navigator.serviceWorker?.controller;
    if (!registration || !worker || new URL(worker.scriptURL).pathname !== new URL(WORKER).pathname) return;
    try {
      const result = await workerStatus(worker);
      const updateAvailable = Boolean(registration.waiting);
      if (!result?.ready) return publish({status:'error', ready:false, updateAvailable, error:'离线资源尚未完整保存，请联网后重试。'});
      publish({status:updateAvailable ? 'update-available' : 'ready', ready:true, version:result.version || BUILD, updateAvailable, error:''});
    } catch (error) {
      publish({status:'error', ready:false, error:error.message || '离线准备失败，请联网后重试。'});
    }
  }

  function watch(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant' && !registration?.active) publish({status:'error', ready:false, error:'离线资源保存失败，请联网后重试。'});
      if (worker.state === 'installed' || worker.state === 'activated') setTimeout(probe, 0);
    });
  }

  function start() {
    if (pending) return readyPromise;
    const attempt = ++generation;
    pending = true;
    readyPromise = new Promise(resolve => {finish = resolve;});
    if (!supported) {
      publish({status:'unsupported', ready:false, error:location.protocol === 'file:' ? '本地文件模式不使用离线缓存。' : '当前浏览器环境不支持离线缓存。'});
      return readyPromise;
    }
    publish({status:'installing', ready:false, error:''});
    // A stalled network must not leave callers waiting forever. A late successful
    // installation still updates state and emits offline-ready normally.
    deadline = setTimeout(() => {
      if (attempt === generation) publish({status:'error', ready:false, error:'离线准备超时，请保持联网后重试。'});
    }, 45000);
    (async () => {
      try {
        const next = await navigator.serviceWorker.register(WORKER, {scope:APP.href, updateViaCache:'none'});
        if (attempt !== generation) return;
        registration = next;
        watch(registration.installing);
        registration.addEventListener('updatefound', () => watch(registration.installing));
        await probe();
      } catch (error) {
        if (attempt !== generation) return;
        publish({status:'error', ready:false, error:error.message || '离线准备失败，请联网后重试。'});
      }
    })();
    return readyPromise;
  }

  window.PIOffline = Object.freeze({
    get state() {return state;},
    get status() {return state.status;},
    get isReady() {return state.ready;},
    get version() {return state.version;},
    get updateAvailable() {return state.updateAvailable;},
    get ready() {return readyPromise;},
    retry:start
  });
  if (supported) navigator.serviceWorker.addEventListener('controllerchange', probe);
  window.addEventListener('online', () => publish({}));
  window.addEventListener('offline', () => publish({}));
  start();
})();
