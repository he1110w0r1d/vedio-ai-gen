---
name: Cinematic Precision
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#faf7f6'
  on-tertiary: '#303030'
  tertiary-container: '#dddada'
  on-tertiary-container: '#605f5f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  chinese-adjust:
    lineHeight: '1.7'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  margin: 32px
  container-max: 1440px
---

## Brand & Style

The design system establishes a premium, high-performance atmosphere tailored for digital creators and AI engineers. It prioritizes "Modern Creator Productivity"—a philosophy that balances aesthetic cinematic flair with the rigorous utility of a professional SaaS environment. 

The visual direction leans heavily into **Minimalism** and **Glassmorphism**. By utilizing deep charcoal foundations and translucent layers, the UI recedes into the background, allowing the AI-generated visual assets to remain the focal point. The emotional response should be one of "effortless power"—a futuristic tool that feels sophisticated, stable, and deeply professional, avoiding the chaotic visual noise often associated with early-stage crypto or experimental AI labs.

## Colors

This design system is built on a "Dark Mode First" architecture. The palette is dominated by **Pure Black (#000000)** for deep depth and **Deep Charcoal (#0a0a0c)** for structural surfaces. 

**Neon Cyan (#00f2ff)** serves as the functional primary accent, used for high-visibility actions and state indicators. **Subtle Violet (#8b5cf6)** provides a sophisticated secondary tone, often utilized in gradients to soften the clinical feel of the cyan. Borders are kept intentionally thin and muted using **#262626** to maintain a clean, "wireframe-chic" aesthetic that doesn't distract the user's eye from the content.

## Typography

The design system utilizes **Inter** for its neutral, systematic clarity. Given the primary language is Simplified Chinese, the typography settings prioritize legibility and vertical balance. 

Headlines use a tighter letter-spacing and heavier weights to create a "cinematic" impact. For Chinese body text, line heights are slightly increased (1.7x) compared to standard Latin defaults to accommodate the density of glyphs. Labels and metadata should use the `label-caps` style for a technical, structured appearance.

## Layout & Spacing

The system employs a **12-column Fluid Grid** with a maximum container width of 1440px for desktop. It relies on an 8px rhythmic scale (derived from a 4px base unit) to ensure consistent alignment across dense productivity modules.

Margins are generous (32px+) to provide breathing room, while gutters are kept tighter (20px) to maintain a sense of connection between related tools. Panels and sidebars should utilize fixed widths (e.g., 280px or 320px) while the central "Canvas" or "Studio" area remains fluid.

## Elevation & Depth

Hierarchy is achieved through **Glassmorphism** and **Tonal Layers** rather than traditional heavy shadows. 

1.  **Base Layer:** Pure Black (#000000) for the main workspace background.
2.  **Surface Layer:** Deep Charcoal (#0a0a0c) for sidebars and top navigation.
3.  **Floating Layer:** Semi-transparent surfaces (80% opacity) with a `backdrop-blur` of 12px-20px. 
4.  **Interaction Depth:** Elements that are "active" or "hovered" receive a subtle inner glow or a thin 1px border of #262626. 

Avoid high-contrast drop shadows. If a shadow is required for a floating modal, use an extra-diffused black shadow with 40% opacity and a 30px blur radius to create a soft "ambient" lift.

## Shapes

The shape language is defined by modern, generous curves that soften the technical nature of the studio. Main component containers (Cards, Modals, Image Previews) use a **2xl radius (16px to 24px)**. 

Interactive elements like buttons and input fields follow a standard **0.5rem (8px)** rounding to maintain a professional, sharp look, while large "Hero Cards" or decorative banners can push the limits of the `rounded-xl` scale to emphasize the premium feel.

## Components

-   **Buttons:** Primary buttons use the `gradient_primary` with white text. Secondary buttons are ghost-style with a thin #262626 border and Cyan text on hover.
-   **Cards:** Use `rounded-2xl`, a background of #0a0a0c, and a 1px solid border of #262626. Inside, use a soft backdrop-blur if the card overlays content.
-   **Inputs:** Minimalist fields with #000000 backgrounds and #262626 borders. On focus, the border transitions to Neon Cyan with a subtle 2px outer glow.
-   **Chips/Tags:** Small, pill-shaped elements with low-opacity violet or cyan backgrounds (15% opacity) to denote AI model types or asset categories.
-   **Icons:** Thin-stroke (1.5px) icons. Use a consistent set like Lucide or Phosphor (Thin/Light weights).
-   **Progress Bars/Status:** Utilize the Neon Cyan for "active" or "processing" states to create a high-tech pulse effect.
-   **Asset Previews:** Large-radius rounded corners with a subtle inner-stroke border to ensure light-colored assets don't bleed into the dark UI.