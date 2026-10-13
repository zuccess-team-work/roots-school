(() => {
  const languageButton = document.getElementById('language');
  const translated = document.querySelectorAll('[data-ar][data-en]');
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.getElementById('main-navigation');
  function closeMenu() {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
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
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    translated.forEach(element => { element.textContent = element.dataset[lang]; });
    navigation.setAttribute('aria-label', lang === 'ar' ? 'القائمة الرئيسية' : 'Main navigation');
    document.querySelector('.mobile-actions').setAttribute('aria-label', lang === 'ar' ? 'التسجيل والتواصل' : 'Admissions and contact');
    languageButton.textContent = lang === 'ar' ? 'EN ↗' : 'AR ↗';
    languageButton.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    document.title = lang === 'ar' ? 'Roots | مدرسة روتس الخاصة' : 'Roots | Private School';
    meta.content = lang === 'ar' ? 'Roots — مكان نتعلّم فيه، نكتشف، وننمو.' : 'Roots Private School — A place to learn, discover, and grow.';
    try { localStorage.setItem('roots-language', lang); } catch (_) {}
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
      entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting));
    }, { threshold: 0.65 });
    document.querySelectorAll('.journey-step').forEach(step => observer.observe(step));
  }
})();
