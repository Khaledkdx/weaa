# WEAA preview brand and art direction

Mode: preserve and polish the React website. Public routes, CMS content,
authentication, and request integrations retain their existing contracts.
Customer submission forms live exclusively under `/join-us`.

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
  engine; no WebGL/Three.js. Admin and individual form pages use native scrolling.
  Reduced-motion preference changes are respected without reloading.
- Sections: photo-led hero, four-category navigation, existing CMS-managed
  homepage sections, final contact band. Missing CMS media receives only an
  illustrative editorial fallback and never fabricated client proof.

## Site-wide UI polish

- Keep the existing charcoal, gold, neutral light palette and Tajawal typography.
- Display the homepage photographs in responsive grids, with stable image ratios
  and readable text below each image.
- Use 44px minimum navigation targets and 48px primary actions; form inputs use
  16px text, clear focus rings, and larger labels on both themes.
- Keep contact numbers and email addresses left-to-right within the Arabic layout.
- Package the selected Solar icons by 480 Design locally from
  `@iconify-json/solar` (CC BY 4.0, see `public/third-party-notices.txt`).
  `scripts/generate-icons.mjs` keeps the subset synchronized with source usage.
- Preserve saved CMS and legacy links; direct service inquiries to Join Us.
