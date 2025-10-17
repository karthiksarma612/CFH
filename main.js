// main.js - cleaned and safe DOM-ready scripts
document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS if available
  if (typeof AOS !== 'undefined' && AOS && typeof AOS.init === 'function') {
    try {
      AOS.init({
        duration: 1000,
        once: true,
        offset: 100
      });
    } catch (err) {
      // fail silently if AOS init errors
      // console.warn('AOS init failed:', err);
    }
  }

  const nav = document.querySelector('.nav-container');
  const navLinks = document.querySelectorAll('.nav-links a');
  const sections = Array.from(document.querySelectorAll('section[id]'));

  // mark nav as loaded to trigger desktop stagger animations
  if (nav) {
    // small timeout to allow initial paint
    window.requestAnimationFrame(() => setTimeout(() => nav.classList.add('nav-loaded'), 60));
  }

  // Single scroll handler to manage nav style and active link
  const onScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset;

    // Toggle nav scrolled class
    if (nav) {
      if (scrollY > 50) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }

    // Active navigation highlighting
    if (sections.length > 0 && navLinks.length > 0) {
      let current = '';
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const rect = section.getBoundingClientRect();
        const top = rect.top + scrollY; // section.offsetTop could be used but getBoundingClientRect is safer
        if (scrollY >= top - 200) {
          current = section.getAttribute('id') || '';
        }
      }

      navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${current}`) link.classList.add('active');
      });
    }
  };

  // Throttle scroll events for performance
  let isTicking = false;
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        onScroll();
        isTicking = false;
      });
      isTicking = true;
    }
  }, { passive: true });

  // Smooth scroll for navigation links
  if (navLinks.length > 0) {
    navLinks.forEach(anchor => {
      // Only handle in-page anchors
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('#')) {
        anchor.addEventListener('click', function (e) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            // account for fixed header height
            const headerOffset = (document.querySelector('.navbar')?.offsetHeight) || 80;
            const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - headerOffset - 8; // small gap
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            // Update URL hash without jumping
            history.pushState(null, '', href);
          }
        });
      }
    });
  }

  // Mobile menu toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinksContainer = document.querySelector('.nav-links');
  const navBackdrop = document.querySelector('.nav-backdrop');
  const focusableSelectors = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let lastFocusedElement = null;
  if (navToggle && navLinksContainer) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinksContainer.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      // animate hamburger into X when open
      navToggle.classList.toggle('open', isOpen);
      document.body.classList.toggle('menu-open', isOpen);
      if (navBackdrop) navBackdrop.classList.toggle('show', isOpen);

      if (isOpen) {
        // set per-item stagger index for nicer animation
        const items = Array.from(navLinksContainer.querySelectorAll('a'));
        items.forEach((el, i) => {
          el.style.setProperty('--i', i.toString());
          el.setAttribute('data-stagger', '');
        });

        // trap focus inside menu
        lastFocusedElement = document.activeElement;
        const mainContent = document.querySelector('main') || document.querySelector('body');
        if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
        const focusable = navLinksContainer.querySelectorAll(focusableSelectors);
        if (focusable.length) focusable[0].focus();
        document.addEventListener('keydown', trapFocus);
        document.addEventListener('keydown', handleEsc);
        // clicking outside will be handled via backdrop
      } else {
        // remove per-item stagger settings
        const items = Array.from(navLinksContainer.querySelectorAll('a'));
        items.forEach((el) => {
          el.style.removeProperty('--i');
          el.removeAttribute('data-stagger');
        });

        const mainContent = document.querySelector('main') || document.querySelector('body');
        if (mainContent) mainContent.removeAttribute('aria-hidden');
        document.body.classList.remove('menu-open');
        document.removeEventListener('keydown', trapFocus);
        document.removeEventListener('keydown', handleEsc);
        if (lastFocusedElement) lastFocusedElement.focus();
      }
    });
  }

  // Close menu helpers
  function closeMenu() {
    if (navLinksContainer && navLinksContainer.classList.contains('show')) {
      navLinksContainer.classList.remove('show');
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.classList.remove('open');
      document.body.classList.remove('menu-open');
      navBackdrop?.classList.remove('show');
      document.removeEventListener('keydown', trapFocus);
      document.removeEventListener('keydown', handleEsc);
      if (lastFocusedElement) lastFocusedElement.focus();
    }
  }

  // Backdrop click should close menu
  if (navBackdrop) {
    navBackdrop.addEventListener('click', () => closeMenu());
  }

  // Click outside menu: if click not inside nav-container, close
  document.addEventListener('click', (e) => {
    if (!navLinksContainer || !navToggle) return;
    const target = e.target;
    const insideNav = target.closest && target.closest('.nav-container');
    if (!insideNav && navLinksContainer.classList.contains('show')) closeMenu();
  });

  // ESC to close
  function handleEsc(e) { if (e.key === 'Escape' || e.key === 'Esc') closeMenu(); }

  // Basic focus trap implementation
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    // re-query because DOM can change
    const focusable = Array.from(navLinksContainer.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) { // shift + tab
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else { // tab
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Run initial onScroll to set correct state on load
  onScroll();
});

// IntersectionObserver fallback for elements with data-aos when AOS isn't available
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS === 'undefined' || !AOS) {
    const aosElements = document.querySelectorAll('[data-aos]');
    if ('IntersectionObserver' in window && aosElements.length > 0) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add('aos-animate');
            // if you don't want repeated animations, unobserve
            io.unobserve(el);
          }
        });
      }, { threshold: 0.15 });

      aosElements.forEach(el => io.observe(el));
    } else {
      // As a last resort, apply aos-animate after a short timeout
      aosElements.forEach((el, i) => setTimeout(() => el.classList.add('aos-animate'), 100 + i * 80));
    }
  }
});