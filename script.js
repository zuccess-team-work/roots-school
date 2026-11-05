(() => {
  const languageButton = document.getElementById('language');
  const translated = document.querySelectorAll('[data-ar][data-en]');
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('main-navigation');
  function closeMenu() {
    navigation.classList.remove('is-open');
    document.body.classList.remove('menu-is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label',document.documentElement.lang==='ar'?'فتح القائمة الرئيسية':'Open main menu');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label',open?(document.documentElement.lang==='ar'?'إغلاق القائمة الرئيسية':'Close main menu'):(document.documentElement.lang==='ar'?'فتح القائمة الرئيسية':'Open main menu'));
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(max-width: 800px)').addEventListener('change', closeMenu);
  const meta = document.querySelector('meta[name="description"]');
  function setLanguage(lang) {
    closeMenu();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    translated.forEach(element => { element.textContent = element.dataset[lang]; });
    document.querySelectorAll('[data-alt-ar][data-alt-en]').forEach(element => { element.alt = element.dataset[lang === 'ar' ? 'altAr' : 'altEn']; });
    document.querySelectorAll('[data-label-ar][data-label-en]').forEach(element => { element.setAttribute('aria-label', element.dataset[lang === 'ar' ? 'labelAr' : 'labelEn']); });
    menuButton.setAttribute('aria-label',lang==='ar'?'فتح القائمة الرئيسية':'Open main menu');
    navigation.setAttribute('aria-label', lang === 'ar' ? 'القائمة الرئيسية' : 'Main navigation');
    document.querySelector('.mobile-actions').setAttribute('aria-label', lang === 'ar' ? 'التسجيل والتواصل' : 'Admissions and contact');
    languageButton.textContent = 'AR / EN';
    languageButton.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    document.title = lang === 'ar' ? 'Roots | مدرسة روتس الخاصة' : 'Roots | Private School';
    meta.content = lang === 'ar' ? 'Roots — مكان نتعلّم فيه، نكتشف، وننمو.' : 'Roots Private School — A place to learn, discover, and grow.';
    try { localStorage.setItem('roots-language', lang); } catch (_) {}
    document.dispatchEvent(new CustomEvent('roots:languagechange'));
  }
  let saved = 'ar';
  try { saved = localStorage.getItem('roots-language') || 'ar'; } catch (_) {}
  setLanguage(saved === 'en' ? 'en' : 'ar');
  languageButton.addEventListener('click', () => setLanguage(document.documentElement.lang === 'ar' ? 'en' : 'ar'));
  const welcome = document.getElementById('welcome-dialog');
  welcome.showModal();
  document.getElementById('other-entry').addEventListener('click', () => {
    const button = document.getElementById('other-entry');
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById('other-roles').hidden = !open;
  });
  document.getElementById('guest-entry').addEventListener('click', () => {
    welcome.close();
    document.querySelector('.brand').focus();
  });
  document.getElementById('welcome-language').addEventListener('click', () => setLanguage(document.documentElement.lang === 'ar' ? 'en' : 'ar'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { const threshold = entry.boundingClientRect.height > window.innerHeight * .8 ? .25 : .65; entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio >= threshold); });
    }, { threshold: [0, .25, .65] });
    document.querySelectorAll('.journey-step').forEach(step => observer.observe(step));
  }
})();
