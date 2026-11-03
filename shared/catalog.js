/**
 * Bathroom Vision Board catalog — single source of truth.
 * Loaded by the browser (served at /js/catalog.js) and by the server
 * (require) so that server-side validation accepts only real option ids.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CATALOG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const img = (step, id) => `images/options/${step}-${id}.svg`;
  const opt = (step, id, name, desc, badge) => ({ id, name, desc, badge: badge || null, image: img(step, id) });

  const POPULAR = 'popular';
  const DESIGNER = 'designer';

  const steps = [
    {
      key: 'showerTub', label: 'Shower / Tub Style', short: 'Shower / Tub', icon: 'shower',
      options: [
        opt('showerTub', 'walk-in-shower', 'Walk-In Shower', 'Barrier-free option, open entry', POPULAR),
        opt('showerTub', 'neo-angle-shower', 'Neo-Angle Shower', 'Corner-fitting diamond shape'),
        opt('showerTub', 'tub-to-shower', 'Tub-to-Shower Conversion', 'Remove old tub, install modern shower', POPULAR),
        opt('showerTub', 'shower-to-tub', 'Shower-to-Tub Conversion', 'Replace shower with a relaxing tub'),
        opt('showerTub', 'replacement-bathtub', 'Replacement Bathtub', 'Alcove soaker - fresh new tub'),
        opt('showerTub', 'tub-shower-combo', 'Tub-Shower Combo', 'Versatile tub with overhead shower'),
        opt('showerTub', 'walk-in-tub', 'Walk-In Tub', 'Low step-in door, built-in seat'),
      ],
    },
    {
      key: 'wallPattern', label: 'Wall Pattern', short: 'Wall Pattern', icon: 'grid',
      variant: {
        key: 'etch', label: 'Panel Etch Design',
        options: [
          { id: 'othello', name: 'Othello', desc: 'Dark etch lines' },
          { id: 'grayline', name: 'Grayline', desc: 'Gray etch lines' },
        ],
      },
      options: [
        opt('wallPattern', 'subway-3x6', '3×6″ Subway', 'Classic brick-bond Puro Stone panel', POPULAR),
        opt('wallPattern', 'subway-4x12', '4×12″ Subway', 'Elongated Puro Stone panel, modern look'),
        opt('wallPattern', 'hexagonal-6', '6″ Hexagonal', 'Honeycomb geometric polymer panel'),
        opt('wallPattern', 'marazzi-12x12', '12×12″ Marazzi', 'Classic square-grid non-porous panel'),
        opt('wallPattern', 'fairfield-24x6', '24×6″ Fairfield', 'Long plank-look Puro Stone panel'),
        opt('wallPattern', 'chevron', 'Chevron', 'V-shaped zigzag polymer panel pattern', DESIGNER),
        opt('wallPattern', 'roman-block-12x24', '12×24″ Roman Block', 'Large staggered block panel'),
        opt('wallPattern', 'milano-6x24', '6×24″ Milano', 'Vertical stacked plank panel'),
        opt('wallPattern', 'smooth-seamless', 'Smooth Seamless', 'No grout lines, easy to clean'),
      ],
    },
    {
      key: 'wallColor', label: 'Wall Color', short: 'Wall Color', icon: 'palette',
      options: [
        opt('wallColor', 'white', 'White', 'Bright, clean classic'),
        opt('wallColor', 'biscuit', 'Biscuit', 'Warm off-white cream'),
        opt('wallColor', 'almond', 'Almond', 'Soft warm neutral'),
        opt('wallColor', 'calcutta-marble', 'Calcutta Marble', 'White with gray veining', POPULAR),
        opt('wallColor', 'pompeii-marble', 'Pompeii Marble', 'Warm marble with brown veining'),
        opt('wallColor', 'bianco-travertine', 'Bianco Travertine', 'Natural stone look, warm tones'),
        opt('wallColor', 'classic-concrete', 'Classic Concrete', 'Industrial matte gray'),
        opt('wallColor', 'galena', 'Galena', 'Soft stone gray'),
        opt('wallColor', 'tuscany', 'Tuscany', 'Warm golden travertine'),
      ],
    },
    {
      key: 'flooring', label: 'Flooring', short: 'Flooring', icon: 'layers',
      options: [
        opt('flooring', 'porcelain-marble', 'Porcelain Marble-Look', 'Elegant veined tile, durable', POPULAR),
        opt('flooring', 'porcelain-wood', 'Porcelain Wood-Look Plank', 'Warm wood grain, waterproof'),
        opt('flooring', 'porcelain-concrete', 'Porcelain Concrete/Stone-Look', 'Modern industrial matte finish'),
        opt('flooring', 'lvp-gray-driftwood', 'LVP Gray Driftwood', 'Cool gray weathered wood look'),
        opt('flooring', 'hexagon-mosaic', 'Hexagon Mosaic', 'Classic hex tile, timeless charm', DESIGNER),
        opt('flooring', 'slate-matte', 'Slate-Look Matte', 'Dark textured stone, non-slip'),
      ],
    },
    {
      key: 'vanity', label: 'Vanity', short: 'Vanity', icon: 'cabinet',
      options: [
        opt('vanity', 'shaker-white', 'Shaker White', 'Clean, classic shaker-door cabinet', POPULAR),
        opt('vanity', 'shaker-navy', 'Shaker Navy', 'Bold navy, brass hardware pop', DESIGNER),
        opt('vanity', 'flat-panel-white', 'Flat-Panel White', 'Modern slab front, minimalist'),
        opt('vanity', 'flat-panel-wood', 'Flat-Panel Wood-Tone', 'Natural wood grain, warm modern'),
        opt('vanity', 'espresso-traditional', 'Espresso Traditional', 'Rich dark wood, raised panels'),
        opt('vanity', 'floating-wall-mounted', 'Floating Wall-Mounted', 'Wall-mounted, open floor below'),
      ],
    },
    {
      key: 'countertop', label: 'Countertop', short: 'Countertop', icon: 'diamond',
      options: [
        opt('countertop', 'quartz-white', 'Quartz White / Marble-Look', 'Bright engineered stone, veined', POPULAR),
        opt('countertop', 'quartz-gray', 'Quartz Gray', 'Cool gray engineered stone'),
        opt('countertop', 'quartz-black', 'Quartz Black', 'Dramatic contrast, sleek finish'),
        opt('countertop', 'granite-speckled', 'Granite Speckled Neutral', 'Natural stone, unique every slab'),
        opt('countertop', 'cultured-marble', 'Cultured Marble', 'Molded one-piece vanity top'),
        opt('countertop', 'butcher-block', 'Butcher Block', 'Warm hardwood, rustic charm'),
      ],
    },
    {
      key: 'showerDoor', label: 'Shower Door', short: 'Shower Door', icon: 'door',
      variants: [
        {
          key: 'glass', label: 'Glass Type',
          options: [
            { id: 'clear', name: 'Clear', desc: 'Crystal-clear view' },
            { id: 'rain', name: 'Rain', desc: 'Textured vertical ripples' },
            { id: 'frost', name: 'Frost', desc: 'Frosted privacy finish' },
            { id: 'corrugated', name: 'Corrugated', desc: 'Ribbed/fluted texture' },
          ],
        },
        {
          key: 'vgroove', label: 'V-Groove Pattern (Optional)',
          options: [
            { id: 'none', name: 'None' },
            { id: 'arrow', name: 'Arrow' },
            { id: 'hopscotch', name: 'Hopscotch' },
            { id: 'roman-block', name: 'Roman Block' },
            { id: 'vertical-block', name: 'Vertical Block' },
          ],
        },
      ],
      options: [
        opt('showerDoor', 'frameless', 'Frameless', 'Crystal-clear, minimal hardware', POPULAR),
        opt('showerDoor', 'semi-frameless', 'Semi-Frameless', 'Glass with slim metal accents'),
        opt('showerDoor', 'sliding-bypass', 'Sliding / Bypass', 'Space-saving bypass panels'),
        opt('showerDoor', 'barn-door', 'Barn-Door', 'Sliding barn-door style track', DESIGNER),
        opt('showerDoor', 'pivot-hinged', 'Pivot / Hinged', 'Dramatic swing-open entry'),
        opt('showerDoor', 'framed', 'Framed', 'Classic full metal frame'),
      ],
    },
    {
      key: 'finish', label: 'Faucet & Hardware Finish', short: 'Faucet & Hardware Finish', icon: 'faucet',
      note: 'This finish applies to your door frame, faucet, accessories & mirror - keeping everything coordinated.',
      options: [
        opt('finish', 'chrome', 'Chrome', 'Bright mirror finish, always classic', POPULAR),
        opt('finish', 'brushed-nickel', 'Brushed Nickel', 'Warm satin silver - hides water spots'),
        opt('finish', 'matte-black', 'Matte Black', 'Bold, modern, fingerprint-resistant', DESIGNER),
        opt('finish', 'oil-rubbed-bronze', 'Oil-Rubbed Bronze', 'Rich dark bronze, old-world warmth'),
        opt('finish', 'brushed-gold', 'Brushed / Bronzed Gold', 'Warm luxe gold, statement finish'),
      ],
    },
    {
      key: 'mirror', label: 'Mirror', short: 'Mirror', icon: 'mirror',
      options: [
        opt('mirror', 'framed-rectangle', 'Framed Rectangle', 'Classic framed mirror'),
        opt('mirror', 'frameless-rectangle', 'Frameless Rectangle', 'Clean edge-to-edge modern look', POPULAR),
        opt('mirror', 'round-pill', 'Round / Pill', 'Organic shape, on-trend'),
        opt('mirror', 'arched', 'Arched', 'Arch-top silhouette, statement piece'),
      ],
    },
    {
      key: 'accessories', label: 'Accessories', short: 'Accessories', icon: 'sparkle', multi: true,
      subtitle: 'Pick as many as you like, then tap Next.',
      note: 'Accessories use your Hardware Finish selection. Pick all you need!',
      options: [
        opt('accessories', 'corner-shelf', 'Corner Shelf', 'Acrylic corner shelf for storage'),
        opt('accessories', 'soap-dish', 'Soap Dish', 'Recessed or wall-mount holder'),
        opt('accessories', 'shower-seat', 'Built-in / Folding Shower Seat', 'Fold-down bench for comfort'),
        opt('accessories', 'grab-bars', 'Grab Bars', 'Safety bars for support', POPULAR),
        opt('accessories', 'shower-rod', 'Shower Rod', 'Curved or straight curtain rod'),
        opt('accessories', 'hand-held-wand', 'Hand-Held Wand', 'Flexible spray on slide bar'),
        opt('accessories', 'recessed-niche', 'Recessed Niche', 'Built-in shampoo shelf', DESIGNER),
        opt('accessories', 'rainfall-head', 'Rainfall Head', 'Overhead spa-style shower'),
      ],
    },
  ];

  /** Quick-start presets: one tap preloads the whole board. */
  const styles = [
    {
      id: 'spa-retreat', name: 'Spa Retreat', desc: 'Frameless glass, marble walls, hotel-spa calm', badge: 'Most Popular', badgeType: POPULAR,
      image: 'images/styles/spa-retreat.svg',
      picks: {
        showerTub: 'walk-in-shower', wallPattern: 'roman-block-12x24', wallColor: 'calcutta-marble', flooring: 'porcelain-marble',
        vanity: 'floating-wall-mounted', countertop: 'quartz-white', showerDoor: 'frameless', finish: 'brushed-nickel',
        mirror: 'frameless-rectangle', accessories: ['recessed-niche'],
      },
    },
    {
      id: 'timeless-classic', name: 'Timeless Classic', desc: 'Crisp Puro Stone subway panels + a deep soaking tub',
      image: 'images/styles/timeless-classic.svg',
      picks: {
        showerTub: 'replacement-bathtub', wallPattern: 'subway-3x6', wallColor: 'white', flooring: 'hexagon-mosaic',
        vanity: 'shaker-white', countertop: 'quartz-white', showerDoor: 'sliding-bypass', finish: 'chrome',
        mirror: 'framed-rectangle', accessories: ['corner-shelf', 'soap-dish'],
      },
    },
    {
      id: 'modern-luxe', name: 'Modern Luxe', desc: 'Bold black hardware, clean lines, concrete tones', badge: "Designer's Pick", badgeType: DESIGNER,
      image: 'images/styles/modern-luxe.svg',
      picks: {
        showerTub: 'walk-in-shower', wallPattern: 'subway-4x12', wallColor: 'classic-concrete', flooring: 'slate-matte',
        vanity: 'flat-panel-wood', countertop: 'quartz-black', showerDoor: 'barn-door', finish: 'matte-black',
        mirror: 'round-pill', accessories: ['rainfall-head', 'recessed-niche'],
      },
    },
    {
      id: 'accessible-comfort', name: 'Accessible Comfort', desc: 'Walk-in tub, grab bars, non-slip - safety with style',
      image: 'images/styles/accessible-comfort.svg',
      picks: {
        showerTub: 'walk-in-tub', wallPattern: 'smooth-seamless', wallColor: 'almond', flooring: 'slate-matte',
        vanity: 'shaker-white', countertop: 'cultured-marble', showerDoor: 'pivot-hinged', finish: 'chrome',
        mirror: 'framed-rectangle', accessories: ['grab-bars', 'shower-seat', 'hand-held-wand'],
      },
    },
  ];

  /** "Make it Accessible" toggle overrides. */
  const accessible = {
    showerTub: 'walk-in-tub',
    flooring: 'slate-matte',
    accessories: ['grab-bars', 'shower-seat', 'hand-held-wand'],
  };

  const bestTimes = ['No preference', 'Morning (8am - 12pm)', 'Afternoon (12pm - 4pm)', 'Evening (4pm - 7pm)'];

  const SKIP = 'skip';

  function findStep(key) { return steps.find((s) => s.key === key) || null; }
  function findOption(stepKey, id) {
    const s = findStep(stepKey);
    return s ? s.options.find((o) => o.id === id) || null : null;
  }

  return { steps, styles, accessible, bestTimes, SKIP, findStep, findOption };
});
