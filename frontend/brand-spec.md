# WEAA preview brand and art direction

Mode: redesign-overhaul of the React preview. Public routes, CMS fields, forms,
authentication, and integrations remain unchanged. The Flutter site is untouched.

Visual thesis: a calm Arabic editorial storefront for logistics, inspired by the
reference's spacious hierarchy and category-to-detail pacing, not its brand or UI.

- Logo: `public/images/weaa-logo.jpeg`, supplied by the client and copied from
  `../assets/brand/weaa-logo-ornate.jpeg`.
- Hero: `public/images/weaa-logistics-hero.webp`, original generated image of a
  Saudi logistics hub with a freight truck. No real location or fleet is claimed.
- Category photographs: `public/images/freight.webp`, `delivery.webp`,
  `yard.webp`, and `market.webp`, cropped from one original generated photo sheet.
  These are illustrative, not photos of WEAA-owned assets or client projects.
- Service photographs: `public/images/sedan.webp`, `bus.webp`,
  `motorcycle.webp`, and `contract.webp`, cropped from a second original
  generated photo sheet. They are illustrative of service categories.
- Additional homepage photographs: `parcel.webp`, `feasibility.webp`,
  `courier-fleet.webp`, `licensing.webp`, `heavy-truck.webp`, `light-truck.webp`,
  `box-truck.webp`, `executive-sedan.webp`, `company-sale.webp`,
  `company-buy.webp`, `opportunities.webp`, `local-courier.webp`,
  `international-courier.webp`, `careers.webp`, `parcels.webp`, and
  `network.webp`. These are crops from four original generated photo sheets
  made for this project. Each homepage card gets a distinct image; the scenes
  are illustrative and do not depict actual WEAA assets or clients.
- Typography: Tajawal Regular, Medium, Bold, Black in `src/fonts/`, copied from
  the existing project's bundled font assets under `../assets/fonts/` (OFL
  license there).
- Color: quiet off-white and charcoal surfaces with WEAA's gold as the sole accent.
- Motion: GSAP intro and section reveals, Lenis as the only public smooth-scroll
  engine; no WebGL/Three.js. Admin uses native scrolling.
- Sections: photo-led hero, four-category navigation, existing CMS-managed
  homepage sections, final contact band. Missing CMS media receives only an
  illustrative editorial fallback and never fabricated client proof.
