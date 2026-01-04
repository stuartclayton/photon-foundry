# Photon Foundry Website

A single-page website for **Photon Foundry**, the software development company behind [Raygun Laser](https://raygun-laser.com).

## Overview

This repository hosts the official Photon Foundry company website, deployed via **GitHub Pages**. The site serves as a simple, professional landing page showcasing our flagship product and company information.

## Deployment

This site is hosted using **GitHub Pages** and is automatically deployed from the repository.

### GitHub Pages Setup

1. **Repository Settings**:

   - Navigate to repository Settings → Pages
   - Source: Deploy from `main` branch
   - Folder: `/` (root)
   - Custom domain (optional): Configure if desired

2. **Deployment**:

   - Any push to the `main` branch triggers automatic deployment
   - Site typically updates within 1-2 minutes
   - Check deployment status in the "Actions" tab

3. **Access**:
   - Custom domain: `https://photon-foundry.com`
   - GitHub Pages URL: `https://[username].github.io/photon-foundry-website/`

### Local Development

To preview the site locally:

```bash
# Simple Python server (Python 3)
python -m http.server 8000

# Or with Node.js (if http-server is installed)
npx http-server

# Then open http://localhost:8000 in your browser
```

## Structure

```
photon-foundry-website/
├── index.html          # Main landing page
├── assets/             # Images, logos, and media
│   ├── logo.svg
│   └── screenshots/
├── styles.css          # Stylesheet (if separate from inline)
└── README.md          # This file
```

## Company Information

**Photon Foundry** develops professional creative tools for laser light show design and visual production.

### Products

- **Raygun Laser**: Cross-platform laser show design software
  - Hardware-agnostic (works with any DAC)
  - Modern, streamlined workflow
  - Beat-matching and advanced timing
  - SVG-based graphics for hardware independence

## Content Guidelines

### Brand Voice

- Professional yet approachable
- Technical credibility without jargon overload
- Focus on innovation and accessibility
- Clear communication of cutting-edge capabilities

### Visual Identity

- Clean, professional design aesthetic
- Modern, corporate look suitable for a software development company
- Blue color scheme (#2563eb primary)
- Minimal, uncluttered layout
- Professional typography and spacing
- Photon Foundry logo and brand colors

**Note:** The synthwave aesthetic (neon grids, retro-futuristic styling) is reserved exclusively for Raygun Laser product branding. Photon Foundry's company website maintains a professional, business-focused design.

## Maintenance

- Update product information as features are released
- Keep links to Raygun Laser marketing site current
- Ensure contact information is accurate
- Test responsive design on mobile/tablet periodically

## Related Resources

- Main marketing workspace: `/Users/Stu/Development/Raygun/design-marketing`
- Raygun Laser app repo: `/Users/Stu/Development/Raygun/raygun-laser`
- Brand assets: `../photon foundry/` and `../web ready assets/`

## License

© 2026 Photon Foundry. All rights reserved.
