(() => {
  'use strict';

  const CART_STORAGE_KEY = 'foodRasoiCartV1';
  const cart = new Map();

  // Restore the bag when navigating between Food Rasoi pages.
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (Array.isArray(savedCart)) {
      savedCart.forEach(entry => {
        if (!Array.isArray(entry) || entry.length !== 2) return;
        const [key, item] = entry;
        const price = Number(item?.price);
        const quantity = Number(item?.quantity);
        if (
          typeof key === 'string' &&
          typeof item?.name === 'string' &&
          Number.isFinite(price) && price >= 0 &&
          Number.isInteger(quantity) && quantity > 0
        ) {
          cart.set(key, { name: item.name, price, quantity });
        }
      });
    }
  } catch (error) {
    // Storage may be unavailable in restrictive browser modes; the page still works.
  }

  function persistCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...cart]));
    } catch (error) {
      // Keep the in-memory bag functional if browser storage is blocked.
    }
  }

  const money = value => `₹${Number(value).toLocaleString('en-IN')}`;
  const cartCount = document.getElementById('cartCount');
  const drawerCount = document.getElementById('drawerCount');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartDrawer = document.querySelector('.cart-drawer');
  const drawerBackdrop = document.querySelector('.drawer-backdrop');
  const cartItems = document.querySelector('.cart-items');
  const toast = document.querySelector('.toast-message');
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function getTotals() {
    let quantity = 0;
    let subtotal = 0;
    cart.forEach(item => {
      quantity += item.quantity;
      subtotal += item.price * item.quantity;
    });
    return { quantity, subtotal };
  }

  function renderCart() {
    persistCart();
    const { quantity, subtotal } = getTotals();
    cartCount.textContent = quantity;
    drawerCount.textContent = `(${quantity})`;
    cartSubtotal.textContent = money(subtotal);

    if (!cart.size) {
      cartItems.innerHTML = '<p class="empty-cart">Your bag is looking a little hungry.<br><span>Add a favourite from the menu to get started.</span></p>';
      return;
    }

    cartItems.innerHTML = '';
    cart.forEach((item, key) => {
      const row = document.createElement('article');
      row.className = 'cart-line';
      row.innerHTML = `
        <div><strong></strong><small>${money(item.price)} each</small></div>
        <div class="cart-line-right"><b>${money(item.price * item.quantity)}</b>
          <div class="quantity-control">
            <button type="button" data-cart-action="decrease" data-key="${escapeAttribute(key)}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" data-key="${escapeAttribute(key)}" aria-label="Increase quantity">+</button>
          </div>
        </div>`;
      row.querySelector('strong').textContent = item.name;
      cartItems.appendChild(row);
    });
  }

  function escapeAttribute(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  function addToCart(name, price) {
    const key = `${name}|${price}`;
    if (cart.has(key)) {
      cart.get(key).quantity += 1;
    } else {
      cart.set(key, { name, price: Number(price), quantity: 1 });
    }
    renderCart();
    showToast(`${name} added to your bag`);
  }

  function openCart() {
    cartDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    document.querySelector('.cart-close')?.focus();
  }

  function closeCart() {
    cartDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
  }

  document.addEventListener('click', event => {
    const addButton = event.target.closest('.add-button');
    if (addButton) {
      const { name, price } = addButton.dataset;
      if (name && price) addToCart(name, price);
      return;
    }

    const cartAction = event.target.closest('[data-cart-action]');
    if (cartAction) {
      const item = cart.get(cartAction.dataset.key);
      if (!item) return;
      if (cartAction.dataset.cartAction === 'increase') item.quantity += 1;
      if (cartAction.dataset.cartAction === 'decrease') item.quantity -= 1;
      if (item.quantity <= 0) cart.delete(cartAction.dataset.key);
      renderCart();
    }
  });

  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.querySelector('.cart-close')?.addEventListener('click', closeCart);
  drawerBackdrop?.addEventListener('click', closeCart);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCart();
  });

  document.getElementById('checkoutButton')?.addEventListener('click', () => {
    if (!cart.size) {
      showToast('Your bag is empty — add a favourite first.');
      return;
    }
    showToast('This demo is ready for a real checkout integration.');
  });

  // Menu filters
  const filterButtons = [...document.querySelectorAll('.filter-btn')];
  const menuItems = [...document.querySelectorAll('.menu-item')];
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn === button);
        btn.setAttribute('aria-pressed', String(btn === button));
      });
      menuItems.forEach((item, index) => {
        const visible = filter === 'all' || item.dataset.category === filter;
        item.classList.toggle('hidden', !visible);
        if (visible && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          gsap.fromTo(item, { opacity: 0, y: 9 }, { opacity: 1, y: 0, duration: .35, delay: index * .035, clearProps: 'transform' });
        }
      });
    });
  });

  document.getElementById('viewAllMenu')?.addEventListener('click', () => {
    const allButton = filterButtons.find(button => button.dataset.filter === 'all');
    allButton?.click();
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Showing all of our current favourites.');
  });

  // Compact mobile navigation
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const topNav = document.querySelector('.top-nav');
  menuToggle?.addEventListener('click', () => {
    const open = topNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  });
  topNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    topNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
  }));

  // Elegant, restrained scroll motion inspired by the reference layout.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.gsap && window.ScrollTrigger && !reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero-copy > *', { opacity: 0, y: 24, duration: .8, stagger: .1, ease: 'power2.out', delay: .1 });
    gsap.from('.hero-photo', { opacity: 0, scale: 1.06, duration: 1.25, ease: 'power2.out' });

    gsap.utils.toArray('.content-section, .right-intro, .reviews-section, .feast-section, .right-cta, .right-footer').forEach(section => {
      gsap.from(section, {
        opacity: 0,
        y: 22,
        duration: .7,
        ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 88%', once: true }
      });
    });

    gsap.utils.toArray('.orbit-image').forEach((image, index) => {
      gsap.to(image, {
        y: index % 2 === 0 ? -5 : 5,
        duration: 2.4 + index * .18,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: index * .1
      });
    });
  } else {
    document.documentElement.classList.add('no-motion');
  }

  // Make the primary navigation state meaningful for assistive technology.
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
  renderCart();
})();

/* Food Rasoi carousel controls: mouse drag, trackpad/touch scroll and arrows. */
(() => {
  'use strict';

  function wireHorizontalSlider(viewport, arrowsSelector, directionAttribute) {
    if (!viewport) return;
    const buttons = [...document.querySelectorAll(arrowsSelector)];
    const getStep = () => {
      const item = viewport.querySelector('.menu-item:not(.hidden), .pick-card');
      if (!item) return Math.max(220, viewport.clientWidth * 0.8);
      const styles = getComputedStyle(viewport);
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
      return item.getBoundingClientRect().width + gap;
    };

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const direction = button.dataset[directionAttribute];
        viewport.scrollBy({ left: getStep() * (direction === 'prev' ? -1 : 1), behavior: 'smooth' });
      });
    });

    let pointerDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.target.closest('button, a, input, select, textarea')) return;
      pointerDown = true;
      moved = false;
      startX = event.clientX;
      startScroll = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', event => {
      if (!pointerDown) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;
      viewport.scrollLeft = startScroll - delta;
    });
    const stopDrag = () => {
      if (!pointerDown) return;
      pointerDown = false;
      viewport.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    viewport.addEventListener('click', event => {
      if (moved && !event.target.closest('button, a')) {
        event.preventDefault();
        event.stopPropagation();
      }
      moved = false;
    }, true);
    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        viewport.scrollBy({ left: getStep() * (event.key === 'ArrowLeft' ? -1 : 1), behavior: 'smooth' });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireHorizontalSlider(document.querySelector('.menu-grid'), '[data-slider]', 'slider');
    wireHorizontalSlider(document.querySelector('.food-picks-viewport'), '[data-food-slider]', 'foodSlider');
  });

  // Demo forms stay front-end only but provide a clear confirmation message.
  document.querySelectorAll('form[data-demo-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = form.querySelector('[name="name"]')?.value.trim();
      const message = name ? `Thanks, ${name}! Your details are ready for the Food Rasoi team in this demo.` : 'Thanks! Your details are ready for the Food Rasoi team in this demo.';
      const toast = document.querySelector('.toast-message');
      if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        window.setTimeout(() => toast.classList.remove('show'), 3400);
      } else {
        window.alert(message);
      }
      form.reset();
    });
  });
})();
