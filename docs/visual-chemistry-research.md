# Instant Film Visual/Chemistry Research Notes

This note records source material used to guide realism improvements in the renderer.

## Selection criteria

- Prefer technical sources from manufacturers, standards references, or established photo-chemistry literature.
- Include implementation-oriented references where possible.
- Avoid low-signal social media references.

## Sources consulted

1. **Wikipedia: Instant film**  
   https://en.wikipedia.org/wiki/Instant_film  
   Used for process-level context: integral film, reagent pod mechanics, and development spread patterns.

2. **Wikipedia: Dye diffusion transfer**  
   https://en.wikipedia.org/wiki/Dye_diffusion_transfer  
   Used for the chemistry model in which dyes diffuse during development and can produce non-uniform artifacts.

3. **Fujifilm Instax product/technology pages**  
   https://www.fujifilm.com/products/instant_photo/  
   Used for product-family characteristics and practical differences between Instax look and classic Polaroid rendering assumptions.

4. **Polaroid support and film behavior documentation**  
   https://support.polaroid.com/hc/en-us/categories/115000179728-Polaroid-Film  
   Used for practical behavior notes around temperature sensitivity, development behavior, and artifact tendencies.

5. **Kodak technical imaging references**  
   https://www.kodak.com/en/motion/page/technical-information/  
   Used for general film imaging guidance on highlight behavior, color response, and halation-like visual characteristics.

## Practical takeaways applied in code

- **Halation should be highlight-driven and warm-tinted** (red-dominant response).
- **Chromatic aberration should be radial**, not a fixed uniform shift, increasing toward edges.
- **Chemistry artifacts should not be purely symmetric edge noise**; they should include directional/development-flow behavior and variability.
- **Paper/frame rendering should reflect stock differences** (already introduced in style profiles).
- **Randomness must be controllable** for reproducibility and testability (seeded pipeline).

## Existing implementation references (code-level inspiration)

- Open-source film emulation/shader communities commonly model:
  - thresholded highlight masks + blur for halation,
  - luma-dependent grain,
  - radial lens/channel offsets.
- This repository uses those established techniques in a conservative, deterministic CPU implementation.


## High-quality implementation references reviewed

1. **darktable** (open-source RAW processor with physically informed filmic tone tools and robust color pipeline)  
   https://github.com/darktable-org/darktable

2. **RawTherapee** (open-source image pipeline with advanced demosaicing, tone curves, and film-like processing primitives)  
   https://github.com/RawTherapee/RawTherapee

3. **GIMP GMIC / film emulation communities** (practical reference implementations for halation/grain/optical effects in production workflows)  
   https://gmic.eu/

These were used as implementation-pattern references (masking strategy, tone mapping layout, and channel/edge artifacts), while chemistry assumptions were grounded in manufacturer and process references above.
