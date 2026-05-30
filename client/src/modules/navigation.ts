export function initNavigation(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const nav = document.querySelector<HTMLElement>('#site-nav');
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link');

  if (!toggle || !nav) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
  });

  links.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  const header = document.querySelector<HTMLElement>('.header');
  if (header) {
    window.addEventListener(
      'scroll',
      () => {
        header.classList.toggle('header--scrolled', window.scrollY > 8);
      },
      { passive: true },
    );
  }
}
