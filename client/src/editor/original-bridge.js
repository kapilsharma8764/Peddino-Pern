(function (options) {
  var selected = null;
  var hovered = null;
  var editingText = null;
  var originalText = "";
  var attr = 'data-builder-node';
  function send(type, data) { parent.postMessage(Object.assign({ type: type, key: options.key }, data), '*'); }
  function locate(id) { return /^n\d+$/.test(id || '') ? document.querySelector('[' + attr + '="' + id + '"]') : null; }
  function bounds() {
    if (!selected || !selected.isConnected) return send('visual-bounds', {box:null});
    var r = selected.getBoundingClientRect();
    send('visual-bounds', {box:{x:r.x,y:r.y,width:r.width,height:r.height}});
  }
  window.addEventListener('scroll', bounds, true);
  window.addEventListener('resize', bounds);
  function select(el, scroll) {
    if (!el) return;
    if (selected) selected.removeAttribute('data-builder-selected');
    selected = el;
    el.setAttribute('data-builder-selected', 'true');
    if (scroll) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    bounds();
    var style = getComputedStyle(el);
    send('visual-select', { id: el.getAttribute(attr), color: style.color, background: style.backgroundColor, backgroundImage: style.backgroundImage, fontSize: style.fontSize, align: style.textAlign });
  }
  window.addEventListener('message', function (event) {
    if (event.source !== parent || !event.data || event.data.key !== options.key) return;
    if (event.data.type === 'visual-focus') select(locate(event.data.id), true);
    if (event.data.type === 'pt-page-colors') {
      var pageStyle = document.getElementById('pt-page-colors');
      if (pageStyle) pageStyle.textContent = event.data.css || '';
    }
    if (event.data.type === 'pt-theme') {
      var themeStyle = document.getElementById('pt-theme');
      if (!themeStyle) { themeStyle = document.createElement('style'); themeStyle.id = 'pt-theme'; document.head.appendChild(themeStyle); }
      themeStyle.textContent = String(event.data.css || '');
      (event.data.inline || []).forEach(function (item) { var el = locate(item.id); if (el) el.setAttribute('style', item.style); });
      bounds();
    }
  });
  document.addEventListener('click', function (event) {
    if (editingText && editingText.contains(event.target)) return;
    var target = event.target.closest('[' + attr + ']');
    if (options.editing) {
      event.preventDefault(); event.stopImmediatePropagation();
      // Clicking the text inside a menu link should expose both its label and destination.
      if (target && target.tagName !== 'IMG') target = target.closest('a[' + attr + '],button[' + attr + ']') || target;
      select(target, false);
    } else {
      var link = event.target.closest('a[href],button[href]');
      if (link && !link.getAttribute('href').startsWith('#')) {
        event.preventDefault();
        send('visual-link', { url: link.href || link.getAttribute('href') });
      }
    }
  }, true);
  document.addEventListener('pointerover', function(event) {
    if (!options.editing || editingText) return;
    if (hovered) hovered.removeAttribute('data-builder-hover');
    hovered = event.target.closest('[' + attr + ']');
    if (hovered) hovered.setAttribute('data-builder-hover', 'true');
  }, true);
  document.addEventListener('pointerout', function(event) {
    if (!event.relatedTarget && hovered) { hovered.removeAttribute('data-builder-hover'); hovered = null; }
  }, true);
  document.addEventListener('dblclick', function(event) {
    if (!options.editing) return;
    var el = event.target.closest('h1,h2,h3,h4,h5,h6,p,span,a,button,label,li');
    // Structured text stays in the inspector; inline editing preserves leaf nodes only.
    if (!el || !el.hasAttribute(attr) || el.children.length || !el.textContent.trim()) return;
    event.preventDefault(); event.stopImmediatePropagation();
    select(el, false);
    editingText = el; originalText = el.textContent;
    el.contentEditable = 'plaintext-only'; el.focus();
    var range = document.createRange(); range.selectNodeContents(el);
    var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }, true);
  document.addEventListener('focusout', function(event) {
    if (!editingText || event.target !== editingText) return;
    var el = editingText; editingText = null; el.removeAttribute('contenteditable');
    if (el.textContent !== originalText) send('visual-text', {id:el.getAttribute(attr),text:el.textContent});
  }, true);
  document.addEventListener('submit', function (event) { event.preventDefault(); }, true);
  document.addEventListener('keydown', function (event) {
    if (!options.editing) return;
    if (editingText) {
      if (event.key === 'Escape') { editingText.textContent = originalText; editingText.blur(); event.preventDefault(); }
      else if (event.key === 'Enter' && !event.shiftKey) { editingText.blur(); event.preventDefault(); }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); send(event.shiftKey ? 'visual-redo' : 'visual-undo', {});
    }
  }, true);
  if (options.editing) {
    // Keep animated templates still while selecting and editing. In particular,
    // Swiper's long autoplay transitions can leave two half-slides on the canvas.
    // This bridge is preview-only: saved HTML and the live preview keep autoplay.
    var pausedSliders = new WeakSet();
    function pauseSliders() {
      document.querySelectorAll('.swiper-container,.swiper').forEach(function (el) {
        var slider = el.swiper;
        if (!slider || pausedSliders.has(slider)) return;
        pausedSliders.add(slider);
        if (slider.autoplay && typeof slider.autoplay.stop === 'function') slider.autoplay.stop();
        if (typeof slider.stopAutoplay === 'function') slider.stopAutoplay();
        if (typeof slider.slideTo === 'function') slider.slideTo(slider.activeIndex || 0, 0, false);
      });
    }
    var sliderObserver = new MutationObserver(pauseSliders);
    sliderObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', pauseSliders);
    window.addEventListener('load', pauseSliders);
    // Many downloaded templates ship a fullscreen preloader overlay (dark div
    // with a spinner) that waits for jQuery's $(window).on('load') to fade out.
    // Inside the editor's sandboxed srcDoc iframe that callback often never
    // fires, leaving the user staring at a black screen. Hide every known
    // preloader pattern with CSS and remove the elements from the DOM outright
    // so inline styles or high-specificity rules cannot fight back.
    var preloaderSelectors = '#preloader,#preloader-wrapper,#preload,#loading,#loader,#ftco-loader,#world-load,.preloader,.preloader-wrapper,.preloader-body,.pre-loader,.preload,.preload-content,.page-loader,.page-loader-wrapper,.animationload,.cssload-container,.spinner-wrapper,.loading-overlay,.se-pre-con,.pageloader,.pace,.pace-running,.fullscreen-loader,.load-screen,.loader,.loader-bg,.loader-inner,.gtco-loader,.colorlib-loader,.fh5co-loader,section.preloader,.line-scale-pulse-out,.ball-pulse,.ball-clip-rotate-pulse';
    function removePreloaders() {
      document.querySelectorAll(preloaderSelectors).forEach(function (el) { el.remove(); });
      if (document.body) {
        document.body.style.opacity = '';
        document.body.style.visibility = '';
        document.body.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload');
      }
      if (document.documentElement) {
        document.documentElement.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload', 'no-js');
        document.documentElement.classList.add('js', 'ss-loaded');
      }
    }
    removePreloaders();
    document.addEventListener('DOMContentLoaded', removePreloaders);
    window.addEventListener('load', removePreloaders);
    try {
      var pObs = new MutationObserver(removePreloaders);
      pObs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    var preloaderStyle = document.createElement('style');
    preloaderStyle.textContent = preloaderSelectors + '{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important}html,body{opacity:1!important;visibility:visible!important}html.ss-preload .home-content__main,.home-content__main{opacity:1!important;visibility:visible!important}';
    document.head.appendChild(preloaderStyle);

    var style = document.createElement('style');
    style.textContent = '[data-builder-node]{cursor:pointer!important}[data-builder-hover]{outline:1px dashed #7c3aed!important;outline-offset:-1px}[data-builder-selected]{outline:2px solid #7c3aed!important;outline-offset:2px!important}[contenteditable]{cursor:text!important;box-shadow:0 0 0 5px #7c3aed22!important}';
    document.head.appendChild(style);
    select(locate(options.selected), false);
  } else {
    var preloaderSelectors = '#preloader,#preloader-wrapper,#preload,#loading,#loader,#ftco-loader,#world-load,.preloader,.preloader-wrapper,.preloader-body,.pre-loader,.preload,.preload-content,.page-loader,.page-loader-wrapper,.animationload,.cssload-container,.spinner-wrapper,.loading-overlay,.se-pre-con,.pageloader,.pace,.pace-running,.fullscreen-loader,.load-screen,.loader,.loader-bg,.loader-inner,.gtco-loader,.colorlib-loader,.fh5co-loader,section.preloader,.line-scale-pulse-out,.ball-pulse,.ball-clip-rotate-pulse';
    function removePreloaders() {
      document.querySelectorAll(preloaderSelectors).forEach(function (el) { el.remove(); });
      if (document.body) {
        document.body.style.opacity = '';
        document.body.style.visibility = '';
        document.body.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload');
      }
      if (document.documentElement) {
        document.documentElement.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload', 'no-js');
        document.documentElement.classList.add('js', 'ss-loaded');
      }
    }
    removePreloaders();
    document.addEventListener('DOMContentLoaded', removePreloaders);
    window.addEventListener('load', removePreloaders);
    try {
      var pObs = new MutationObserver(removePreloaders);
      pObs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    var preloaderStyle = document.createElement('style');
    preloaderStyle.textContent = preloaderSelectors + '{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important}html,body{opacity:1!important;visibility:visible!important}html.ss-preload .home-content__main,.home-content__main{opacity:1!important;visibility:visible!important}';
    document.head.appendChild(preloaderStyle);
  }
  document.addEventListener('DOMContentLoaded', function () { send('visual-ready', {}); });
  if (document.readyState !== 'loading') send('visual-ready', {});
})
