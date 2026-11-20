/* Barberie Valdombre — animations (GSAP + ScrollTrigger) et réservation simulée.
   Aucune donnée n'est envoyée : tout reste dans la page. */
(function () {
  'use strict';
  const H = document.documentElement;
  const RM = H.classList.contains('rm');
  const G = window.gsap;
  const ANIM = !RM && !!G && !!window.ScrollTrigger;
  const MOBILE = matchMedia('(max-width: 980px)').matches;
  if (ANIM) { H.classList.add('anim'); G.registerPlugin(ScrollTrigger); }
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // État partagé avec la scène 3D (scene.js le lit à chaque image).
  const S = window.BARB = window.BARB || {};
  Object.assign(S, {
    rm: RM, mobile: MOBILE,
    intro: { t: RM ? 99 : 0, on: !RM },
    razor: { p: RM ? 0.55 : 0 },
    chair: { i: 0, n: 8 },
    clipper: { p: 0 },
    cross: { t: 0 },
  });

  /* ───────── Données ───────── */
  const PRESTATIONS = [
    { id: 'coupe', nom: 'Coupe homme', prix: 25, min: 30, desc: 'Ciseaux et tondeuse, finitions au rasoir.' },
    { id: 'coupe-sh', nom: 'Coupe + shampoing', prix: 30, min: 40, desc: 'Shampoing, massage du cuir chevelu, coiffage.' },
    { id: 'degrade', nom: 'Dégradé précis', prix: 28, min: 40, desc: 'Dégradé fondu (skin fade, taper), contours nets.' },
    { id: 'barbe', nom: 'Taille de barbe', prix: 15, min: 20, desc: 'Taille, contours, huile de soin.' },
    { id: 'rasage', nom: 'Rasage serviette chaude', prix: 25, min: 30, desc: 'Rasoir droit, serviette chaude, après-rasage.' },
    { id: 'coupe-barbe', nom: 'Coupe + barbe', prix: 38, min: 50, desc: 'Notre formule la plus demandée.' },
    { id: 'enfant', nom: 'Coupe enfant (– 12 ans)', prix: 18, min: 30, desc: 'Coupe soignée, en douceur.' },
    { id: 'soin', nom: 'Soin visage express', prix: 20, min: 20, desc: 'Gommage, masque et hydratation.' },
  ];
  S.chair.n = PRESTATIONS.length;
  const eur = (n) => n.toFixed(2).replace('.', ',') + ' €';

  /* ───────── Tarifs ───────── */
  $('#tarifs-liste').innerHTML = PRESTATIONS.map((p, i) => `<li class="tarif${i === 0 ? ' active' : ''}" data-i="${i}" tabindex="0">
    <span class="blade-line" aria-hidden="true"></span>
    <span class="nm"><b>${p.nom}</b><small>${p.desc} · ${p.min} min</small></span>
    <span class="pr"><span class="pr-txt">${eur(p.prix)}</span><span class="trace" aria-hidden="true"></span><span class="head" aria-hidden="true"></span></span>
    <a class="btn btn-sm ghost book" href="#rdv" data-prest="${p.id}" aria-label="Réserver : ${p.nom}"><span>Réserver</span></a></li>`).join('');

  const rows = $$('.tarif');
  const clName = $('.cl-name'), clPrice = $('.cl-price');
  function setChair(i) {
    if (i === S.chair.i && clName.dataset.set) return;
    clName.dataset.set = 1;
    S.chair.i = i;
    rows.forEach((r, k) => r.classList.toggle('active', k === i));
    const p = PRESTATIONS[i];
    if (ANIM) {
      G.to([clName, clPrice], { opacity: 0, y: -8, duration: .15, onComplete: () => {
        clName.textContent = p.nom; clPrice.textContent = `${eur(p.prix)} · ${p.min} min`;
        G.fromTo([clName, clPrice], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .35, stagger: .05, ease: 'power3.out' });
      } });
    } else { clName.textContent = p.nom; clPrice.textContent = `${eur(p.prix)} · ${p.min} min`; }
  }
  setChair(0);
  let lastTouch = 0;
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => setChair(i));
    r.addEventListener('focusin', () => setChair(i));
    r.addEventListener('touchstart', () => { lastTouch = Date.now(); setChair(i); }, { passive: true });
    r.addEventListener('click', () => setChair(i));
  });

  /* ───────── Réservation ───────── */
  const R = { barbier: 'Peu importe', prest: PRESTATIONS[0].id, jour: '', creneau: '' };
  const prestation = () => PRESTATIONS.find((p) => p.id === R.prest) || PRESTATIONS[0];
  $('#prest').innerHTML = PRESTATIONS.map((p) => `<button type="button" class="chip" role="radio" aria-checked="${p.id === R.prest}" data-id="${p.id}">${p.nom}<small>${eur(p.prix)}</small></button>`).join('');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const days = [];
  for (let k = 1; k <= 15; k++) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + k); days.push(d); }
  $('#days').innerHTML = days.map((d) => { const off = d.getDay() === 0 || d.getDay() === 1;
    return `<button type="button" class="day" role="radio" aria-checked="false" data-d="${iso(d)}" ${off ? 'disabled aria-label="Fermé"' : ''}><small>${JOURS[d.getDay()]}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></button>`; }).join('');

  function radio(group, btn) { $$('[role="radio"]', group).forEach((b) => b.setAttribute('aria-checked', String(b === btn))); }
  function majTicket() {
    $('#t-barbier').textContent = R.barbier;
    $('#t-prest').textContent = prestation().nom;
    $('#t-jour').textContent = R.jour ? new Date(R.jour + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—';
    $('#tot').textContent = `${eur(prestation().prix)} · ${prestation().min} min`;
  }
  function majSlots(animate) {
    R.creneau = ''; $('#t-slot').textContent = '—';
    const box = $('#slots');
    if (!R.jour) { box.innerHTML = '<p class="hint">Choisissez d’abord un jour.</p>'; return; }
    const j = new Date(R.jour + 'T12:00').getDay();
    const fin = (j === 6 ? 18 : 19) * 60, out = [];
    for (let m = 9 * 60; m + prestation().min <= fin; m += 30) {
      const h = `${Math.floor(m / 60)} h${m % 60 ? ' 30' : ''}`;
      const pris = [...(R.jour + R.barbier + m)].reduce((a, c) => a + c.charCodeAt(0), 0) % 4 === 0;
      out.push(`<button type="button" class="slot" role="radio" aria-checked="false" ${pris ? 'disabled' : ''} data-h="${h}">${h}</button>`);
    }
    box.innerHTML = out.join('');
    // Les créneaux tombent en place, comme des mèches.
    if (ANIM && animate) G.from($$('.slot', box), { y: -40, rotation: () => G.utils.random(-14, 14), opacity: 0, duration: .9, ease: 'elastic.out(1, .6)', stagger: { each: .025, from: 'random' } });
  }
  majSlots(); majTicket();

  // Mèche qui tombe : le créneau choisi se détache et tombe en se balançant jusqu'au ticket.
  function dropLock(btn) {
    const target = $('#t-slot');
    if (!ANIM) { target.textContent = R.creneau; return; }
    const a = btn.getBoundingClientRect(), b = target.getBoundingClientRect();
    const c = btn.cloneNode(true); c.classList.add('falling'); c.removeAttribute('role');
    Object.assign(c.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(c);
    const bx = b.left + b.width - a.width, by = b.top + (b.height - a.height) / 2;
    const offscreen = by > innerHeight - 20 || by < 0;
    const dx = bx - a.left, dy = offscreen ? innerHeight - a.top + 40 : by - a.top;
    target.style.opacity = 0;
    G.timeline({ onComplete: () => { c.remove(); target.textContent = R.creneau; G.fromTo(target, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .3 }); } })
      .to(c, { duration: 1.15, ease: 'none', keyframes: [
        { x: dx * .25 + 34, y: dy * .22, rotation: 16, ease: 'sine.inOut' },
        { x: dx * .55 - 30, y: dy * .55, rotation: -12, ease: 'sine.inOut' },
        { x: dx * .85 + 14, y: dy * .85, rotation: 7, ease: 'sine.inOut' },
        { x: dx, y: dy, rotation: 0, scale: .8, opacity: offscreen ? 0 : 1, ease: 'sine.out' }] });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.classList.contains('barber')) {
      radio(b.parentNode, b); R.barbier = b.dataset.b; majTicket(); if (R.jour) majSlots(true);
      if (ANIM) G.fromTo(b, { y: 0 }, { y: -10, duration: .25, yoyo: true, repeat: 1, ease: 'power2.out' });
    } else if (b.classList.contains('chip')) {
      radio(b.parentNode, b); R.prest = b.dataset.id; majTicket(); if (R.jour) majSlots(true);
    } else if (b.classList.contains('day')) {
      radio(b.parentNode, b); R.jour = b.dataset.d; majTicket(); majSlots(true);
    } else if (b.classList.contains('slot')) {
      radio(b.parentNode, b); R.creneau = b.dataset.h; dropLock(b);
    } else if (b.classList.contains('gift')) {
      $$('.gift').forEach((g) => g.classList.toggle('on', g === b));
      const amt = $('#gc-amt'); amt.textContent = b.dataset.amt;
      if (ANIM) G.fromTo(amt, { yPercent: -60, opacity: 0, filter: 'blur(6px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: .6, ease: 'power3.out' });
      $('#gift-msg').textContent = `Carte cadeau de ${b.dataset.amt} € choisie. Démo : aucune commande réelle envoyée.`;
    } else if (b.classList.contains('burger')) {
      const o = $('#menu').classList.toggle('open'); b.setAttribute('aria-expanded', o);
    } else if (b.classList.contains('book')) {
      const btn = $(`.chip[data-id="${b.dataset.prest}"]`); if (btn) { radio(btn.parentNode, btn); R.prest = b.dataset.prest; majTicket(); if (R.jour) majSlots(); }
    } else if (b.dataset.abo) {
      $('#rdv-title').textContent = 'Abonnement : premier rendez-vous';
    }
    if (b.classList.contains('btn')) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 160); }
  });
  $('#menu').addEventListener('click', (e) => { if (e.target.closest('a')) { $('#menu').classList.remove('open'); $('.burger').setAttribute('aria-expanded', 'false'); } });

  $('#order').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = $('#msg'), err = (t, el) => { m.textContent = t; if (el) el.focus(); if (ANIM) G.fromTo(m, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1, .3)' }); };
    if (!R.jour) return err('Choisissez un jour.', $('.day:not(:disabled)'));
    if (!R.creneau) return err('Choisissez un créneau disponible.', $('.slot:not(:disabled)'));
    if (!$('#nom').value.trim()) return err('Indiquez votre nom.', $('#nom'));
    if (!$('#tel').value.trim()) return err('Indiquez un téléphone (fictif en démo).', $('#tel'));
    m.textContent = '';
    const d = new Date(R.jour + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    $('#recap-list').innerHTML = [
      ['Nom', esc($('#nom').value.trim())],
      ['Barbier', R.barbier === 'Peu importe' ? 'Le premier barbier libre' : R.barbier],
      ['Prestation', `${prestation().nom} · ${eur(prestation().prix)}`],
      ['Quand', `${d} à ${R.creneau}`],
      ['Règlement', 'En salon, le jour même'],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    showDone();
  });

  function showDone() {
    const form = $('#order'), done = $('#done');
    const show = () => { form.hidden = true; done.hidden = false; S.cross.t = 0; };
    if (!ANIM) { show(); S.cross.t = 1; $('.recap').focus(); return; }
    G.to(form, { opacity: 0, y: 20, duration: .4, ease: 'power2.in', onComplete: () => {
      show(); ScrollTrigger.refresh();
      // Un seul défilement instantané : sur Safari/WebKit, scrollIntoView puis scrollBy s'interrompaient (grand vide noir).
      requestAnimationFrame(() => window.scrollTo({ top: done.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }));
      const tl = G.timeline();
      tl.to(S.cross, { t: 1, duration: 2.2, ease: 'none' }, 0);
      $$('.steam i').forEach((p, k) => {
        const dx = (k - 4) * 22;
        tl.fromTo(p, { opacity: 0, y: 40, x: dx, scale: .5 },
          { keyframes: [{ opacity: .85, y: -30, x: dx + G.utils.random(-15, 15), scale: 1.2, duration: 1.0, ease: 'sine.out' }, { opacity: 0, y: -170, x: dx * 1.6 + G.utils.random(-30, 30), scale: 2.2, duration: 1.4, ease: 'sine.in' }] }, .75 + k * .09);
      });
      tl.from('.recap', { opacity: 0, y: 40, duration: .8, ease: 'power3.out' }, 1.5)
        .from('#recap-list > *', { opacity: 0, x: -14, stagger: .05, duration: .4 }, 1.8)
        .from('.recap-demo', { opacity: 0, duration: .5 }, 2.2)
        .add(() => $('.recap').focus({ preventScroll: true }));
    } });
  }
  $('#again').addEventListener('click', () => {
    $('#done').hidden = true; const f = $('#order'); f.hidden = false; f.reset(); S.cross.t = 0;
    if (ANIM) G.fromTo(f, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5 });
    R.jour = ''; $$('.day').forEach((b) => b.setAttribute('aria-checked', 'false')); majSlots(); majTicket();
    if (ANIM) ScrollTrigger.refresh();
  });

  /* ───────── Horaires : ouvert maintenant ? ───────── */
  (function () {
    const now = new Date(), j = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const open = j >= 2 && j <= 5 ? h >= 9 && h < 19 : j === 6 ? h >= 9 && h < 18 : false;
    const el = $('#open-now'); el.classList.toggle('is-open', open);
    $('span', el).textContent = open ? 'Ouvert en ce moment (horaires d’exemple)' : 'Fermé en ce moment (horaires d’exemple)';
    $$('.hours tr').forEach((tr) => { if (tr.dataset.d.split(',').map(Number).includes(j)) tr.classList.add('today'); });
  })();

  /* ───────── Carte cadeau : reflet métallisé au pointeur ───────── */
  const gcard = $('.gcard');
  if (!RM) {
    const wrap = $('.gcard-wrap');
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      gcard.style.setProperty('--fx', (x * 100).toFixed(1) + '%');
      if (G) G.to(gcard, { rotationY: (x - .5) * 22, rotationX: (.5 - y) * 16, duration: .6, ease: 'power3.out', overwrite: 'auto' });
    });
    wrap.addEventListener('pointerleave', () => { if (G) G.to(gcard, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1, .5)' }); });
  }

  /* ───────── Si animations désactivées : on s'arrête là ───────── */
  if (!ANIM) { window.__ready = true; return; }

  /* Découpage du texte (titres) */
  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true" style="display:inline-block;white-space:nowrap">${[...w].map((c) => `<span class="c" style="display:inline-block">${c}</span>`).join('')}</span>`).join(' ');
    return $$('.c', el);
  }
  function splitLines(el) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => `<span style="display:block;overflow:hidden;padding-bottom:.08em"><span class="l" style="display:inline-block">${p.trim()}</span></span>`).join('');
    return $$('.l', el);
  }

  /* ───────── Ouverture ───────── */
  const intro = $('#intro');
  function heroIn() {
    const tl = G.timeline();
    tl.from('.hero-title .ln > span', { yPercent: 110, rotation: 3, duration: 1.1, ease: 'expo.out', stagger: .1 }, 0)
      .fromTo('.hero-photo', { clipPath: 'inset(100% 0% 0% 0% round 300px 300px 8px 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 300px 300px 8px 8px)', duration: 1.4, ease: 'expo.inOut' }, 0)
      .from('.hero-photo img', { scale: 1.3, duration: 1.8, ease: 'expo.out' }, 0.1)
      .to('.hero [data-a="fade"]', { opacity: 1, duration: .8, stagger: .12 }, .35)
      .from('.hero [data-a="fade"]', { y: 24, duration: .9, ease: 'power3.out', stagger: .12 }, .35)
      .from('.top', { yPercent: -100, opacity: 0, duration: .8, ease: 'power3.out' }, .2);
  }
  function endIntro() {
    H.classList.remove('intro-on'); S.intro.on = false; S.intro.t = 99;
    intro.remove(); ScrollTrigger.refresh();
  }
  if (!S.intro.on) { heroIn(); }
  else {
    H.classList.add('intro-on');
    G.set('.ribbon-half', { scaleX: 0 });
    G.set('.ribbon-half.left', { transformOrigin: '0% 50%' }); G.set('.ribbon-half.right', { transformOrigin: '100% 50%' });
    const tl = G.timeline({ paused: true, onComplete: endIntro });
    S.introTl = tl;
    tl.to(S.intro, { t: 3.8, duration: 3.8, ease: 'none' }, 0)
      .from('.intro-kicker span', { opacity: 0, y: 10, stagger: .06, duration: .6, ease: 'power2.out' }, 0)
      .to('.ribbon-half', { scaleX: 1, duration: .5, ease: 'expo.out' }, 0)
      .to('.intro-skip', { opacity: 1, duration: .4 }, .4)
      // coupe à 1,38 s
      .fromTo('.cut-flash', { opacity: 0, scale: .4 }, { opacity: 1, scale: 1.2, duration: .12, ease: 'power2.out' }, 1.36)
      .to('.cut-flash', { opacity: 0, scale: 1.6, duration: .45 }, 1.48)
      .to('.ribbon-half.left', { keyframes: [{ rotation: 4, x: -14, duration: .18, ease: 'power2.out' }, { rotation: 62, y: '58vh', x: '-6vw', opacity: .0, duration: 1.0, ease: 'power2.in' }] }, 1.38)
      .to('.ribbon-half.right', { keyframes: [{ rotation: -5, x: 14, duration: .18, ease: 'power2.out' }, { rotation: -70, y: '62vh', x: '6vw', opacity: 0, duration: 1.05, ease: 'power2.in' }] }, 1.40)
      .to('.intro-title', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: 'expo.out' }, 1.42)
      .from('.it-l2', { letterSpacing: '0.08em', duration: 1.4, ease: 'expo.out' }, 1.42)
      .from('.it-l1', { y: 20, opacity: 0, duration: .8, ease: 'power3.out' }, 1.6)
      // coup de rasoir : le reflet suit la lame
      .to('.it-l2', { backgroundPosition: '0% 0', duration: 1.0, ease: 'power2.inOut' }, 2.05)
      // sortie : le rideau se lève d'un trait
      .to('.intro-kicker, .intro-skip', { opacity: 0, duration: .3 }, 3.05)
      .to('.intro-title', { y: -30, scale: .96, opacity: 0, duration: .6, ease: 'power2.in' }, 3.15)
      .to(intro, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', duration: .7, ease: 'expo.inOut' }, 3.1)
      .add(heroIn, 3.35);
    G.set(intro, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' });
    $('.intro-skip').addEventListener('click', () => { tl.progress(1); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.intro.on) tl.progress(1); });
    // On attend la scène 3D (max 2,5 s) pour que les ciseaux soient au rendez-vous.
    let started = false;
    // Durée fixe en temps réel, même si l'appareil rame : pas de « lissage » GSAP pendant l'ouverture.
    // On démarre deux images plus tard : l'horloge GSAP est alors à jour (la compilation 3D a pu bloquer le fil).
    const go = () => { if (started) return; started = true;
      requestAnimationFrame(() => requestAnimationFrame(() => { G.ticker.lagSmoothing(0); window.__introStart = performance.now(); tl.play(); })); };
    tl.eventCallback('onComplete', () => { G.ticker.lagSmoothing(500, 33); endIntro(); });
    addEventListener('barb-scene', go, { once: true });
    setTimeout(go, 4000);
  }

  /* ───────── Barre « enseigne » + bandeau qui accélère ───────── */
  const pole = $('.pole');
  const mq = $('.mq-track');
  let mqAnim = null;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => {
    pole.style.setProperty('--p', st.progress.toFixed(4));
    if (!mqAnim && mq.getAnimations) mqAnim = mq.getAnimations()[0];
    if (mqAnim) { const v = Math.min(Math.abs(st.getVelocity()) / 400, 5); mqAnim.playbackRate = 1 + v; G.delayedCall(.25, () => { mqAnim.playbackRate = 1; }); }
  } });
  G.to('.hero-photo img', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ───────── Titres : apparitions variées ───────── */
  $$('[data-a="chars"]').forEach((el) => {
    const c = splitChars(el);
    G.from(c, { yPercent: 70, opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'power3.out', stagger: .018, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('[data-a="lines"]').forEach((el) => {
    const l = splitLines(el);
    G.from(l, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('[data-a="slash"]').forEach((el) => {
    G.fromTo(el, { clipPath: 'polygon(0% 0%, 0% 0%, -12% 100%, -12% 100%)', x: -30 },
      { clipPath: 'polygon(0% 0%, 112% 0%, 100% 100%, -12% 100%)', x: 0, duration: 1.1, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.lead, .kicker').forEach((el) => { if (el.closest('.hero') || el.closest('#intro')) return;
    G.from(el, { opacity: 0, y: 18, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } }); });

  /* ───────── Rituel : rasoir épinglé ───────── */
  const steps = $$('.step'), bar = $('.steps-bar');
  ScrollTrigger.create({
    trigger: '.rituel', start: 'top top', end: () => '+=' + innerHeight * (MOBILE ? 2.2 : 2.6), pin: '.rituel-pin', scrub: true, anticipatePin: 1,
    onUpdate: (st) => {
      S.razor.p = st.progress;
      bar.style.setProperty('--p', st.progress.toFixed(3));
      const k = Math.min(3, Math.floor(st.progress * 4));
      steps.forEach((s, i) => s.classList.toggle('on', i === k));
    },
  });
  G.from('.rituel-text .steps .num, .rituel-text .steps h3', { x: 40, autoAlpha: 0, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.rituel', start: 'top 60%' } });

  /* ───────── Tarifs : coup de lame + passage de tondeuse ───────── */
  rows.forEach((r, i) => {
    const left = i % 2 === 0, line = $('.blade-line', r);
    line.style.setProperty('--ang', (left ? -3 : 3) + 'deg'); line.style.setProperty('--o', left ? 'left' : 'right');
    const tl = G.timeline({ scrollTrigger: { trigger: r, start: 'top 88%' } });
    tl.fromTo(line, { '--s': 0, '--op': 1 }, { '--s': 1, duration: .35, ease: 'power3.in' })
      .fromTo(r, { clipPath: left ? 'polygon(0% 52%, 100% 47%, 100% 47%, 0% 52%)' : 'polygon(0% 47%, 100% 52%, 100% 52%, 0% 47%)' },
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: .7, ease: 'expo.out' }, .3)
      .to(line, { '--op': 0, duration: .3 }, .35)
      .from($('.nm', r), { y: 14, opacity: 0, duration: .6, ease: 'power2.out' }, .4)
      .fromTo($('.pr-txt', r), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .7, ease: 'power1.inOut' }, .55)
      .fromTo($('.head', r), { left: '0%', opacity: 1 }, { left: '100%', duration: .7, ease: 'power1.inOut' }, .55)
      .to($('.head', r), { opacity: 0, duration: .2 }, 1.2)
      .fromTo($('.trace', r), { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power1.inOut' }, .55)
      .from($('.book', r), { opacity: 0, scale: .8, duration: .4, ease: 'back.out(2)' }, .8);
  });
  // Sur écran tactile : le fauteuil suit aussi la ligne au centre de l'écran.
  if (!H.classList.contains('fine')) {
    ScrollTrigger.create({ trigger: '.tarifs', start: 'top center', end: 'bottom center', onUpdate: () => {
      if (Date.now() - lastTouch < 1500) return;
      const mid = innerHeight * .62; let best = 0, bd = 1e9;
      rows.forEach((r, i) => { const b = r.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      setChair(best);
    } });
  }

  /* ───────── Galerie horizontale : passages de tondeuse ───────── */
  const track = $('.gal-track');
  $$('.shot-in').forEach((s) => { const l = document.createElement('span'); l.className = 'lanes'; l.innerHTML = '<i></i>'.repeat(MOBILE ? 5 : 7); s.appendChild(l); });
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const hz = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: {
    trigger: '.galerie', start: 'top top', end: () => '+=' + dist(), pin: '.gal-pin', scrub: MOBILE ? .6 : 1, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: (st) => { S.clipper.p = st.progress; },
  } });
  $$('.shot').forEach((s, k) => {
    const tl = G.timeline({ scrollTrigger: { trigger: s, containerAnimation: hz, start: 'left 92%', end: 'left 40%', scrub: true } });
    tl.fromTo($$('.lanes i', s), { scaleY: 1 }, { scaleY: 0, transformOrigin: k % 2 ? 'bottom' : 'top', ease: 'power2.inOut', stagger: .08, duration: .5 }, 0)
      .fromTo($('img', s), { scale: 1.25 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .from($('figcaption', s), { opacity: 0, y: 12, duration: .3 }, .6);
  });
  $('.galerie').addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) { e.preventDefault(); scrollBy(0, e.deltaX); }
  }, { passive: false });

  /* ───────── Réservation : apparitions ───────── */
  G.from('.barber', { rotationY: -90, opacity: 0, transformOrigin: '0% 50%', duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.barbers', start: 'top 85%' } });
  G.from('.chip', { y: 20, opacity: 0, duration: .5, stagger: .03, ease: 'power2.out', scrollTrigger: { trigger: '#prest', start: 'top 90%' } });
  G.from('.day', { y: -26, opacity: 0, rotation: () => G.utils.random(-10, 10), duration: .8, stagger: .03, ease: 'elastic.out(1, .7)', scrollTrigger: { trigger: '#days', start: 'top 90%' } });
  G.from('.ticket', { y: 60, rotation: 2, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.ticket', start: 'top 92%' } });
  G.from('.fs legend', { x: -20, opacity: 0, duration: .6, stagger: .1, scrollTrigger: { trigger: '#order', start: 'top 80%' } });

  /* ───────── Abonnement : levier du fauteuil ───────── */
  G.from('.plan', { rotationX: -75, y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .14, scrollTrigger: { trigger: '.plans', start: 'top 82%' } });
  $$('.pr-val').forEach((el) => {
    const v = +el.dataset.v, o = { n: 0 };
    G.to(o, { n: v, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = Math.round(o.n) + ' €'; } });
  });

  /* ───────── Carte cadeau : pivote au défilement ───────── */
  G.fromTo('.gcard', { rotationY: -28, rotationZ: -6, y: 60 }, { rotationY: 8, rotationZ: 2, y: -20, ease: 'none', scrollTrigger: { trigger: '.cadeaux', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  G.fromTo('.gc-photo', { yPercent: 18 }, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.cadeaux', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.from('.gift', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)', stagger: .08, scrollTrigger: { trigger: '.gifts', start: 'top 90%' } });

  /* ───────── Avis : la mousse est essuyée d'un coup de rasoir ───────── */
  $$('.rev').forEach((r, k) => {
    G.fromTo($('.foam', r), { '--w': '0%' }, { '--w': '115%', duration: 1.3, ease: 'power2.inOut', delay: k * .15, scrollTrigger: { trigger: r, start: 'top 82%' } });
    G.from(r, { y: 40, duration: 1, ease: 'power3.out', delay: k * .1, scrollTrigger: { trigger: r, start: 'top 92%' } });
  });

  /* ───────── Horaires ───────── */
  G.from('.hours tr', { x: -30, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.hours', start: 'top 88%' } });
  G.from('.open-now', { scale: .8, opacity: 0, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '.open-now', start: 'top 92%' } });
  G.from('.foot-brand', { yPercent: 40, opacity: 0, letterSpacing: '0.1em', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 90%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
  window.__ready = true;
})();
