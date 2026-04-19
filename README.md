# Mapartcraft

**Mapartcraft** is a standalone web app for Minecraft **map art**: it builds **schematic-style NBT** and **map.dat** data from an image, in the browser. It is based on the well-known project **[MapartCraft](https://github.com/rebane2001/mapartcraft)** by rebane2001 (GPL-3.0 upstream). This repository keeps that lineage and credits the original; see [rebane2001/mapartcraft](https://github.com/rebane2001/mapartcraft) for the classic upstream README, issue tracker, and full history.

**[https://azkich.github.io/mapart/](https://azkich.github.io/mapart/)**
---

## Requirements

- **Node.js** and **npm** (Create React App).
- Optional: **Python 3** for scripts under `tools/` (same idea as upstream).
- Optional: **ImageMagick** if you use tooling that regenerates `src/images/textures.png` (see upstream `tools/` docs).

---

## Building and running locally

```bash
npm install
npm start          # development server
npm run build      # production build in `build/`
```

On Linux you can still use `build.sh` if you deploy behind Apache; it may copy `buildSources/apache/.htaccess` into `build/` when `apache2` is available.

For **local development**, `.env.development` sets `PUBLIC_URL=` so you open **`http://localhost:3000/`** at the site root. **Production** uses **`homepage`** in `package.json` (currently **`https://azkich.github.io/mapart`**) so JS/CSS and Open Graph URLs match GitHub Pages for repo **`azkich/mapart`**. The UI is a **single page** (map art tool only).




---

## What changed compared to [rebane2001/mapartcraft](https://github.com/rebane2001/mapartcraft)

In plain terms, this fork is still the same kind of tool (upload image → pick blocks and options → preview → download), but several areas were adjusted for **this** project:

1. **Language**  
   The interface is oriented toward **English**.

2. **New better colour methods**  
   Names in the “better colour” / distance dropdown were **renamed and clarified** (for example default vs Euclidean “better colour off”, and starred labels for some advanced metrics) so the list is easier to scan.

3. **Export palette improvement**  
   Example: the **export palette** tooltip explains that you **choose a file format** (paint.net, GIMP, Photoshop, etc.) before download, not only Paint.NET.

4. **Performance in the map preview worker**  
   Refactoring and optimization of per-pixel calculations for the CPU has been performed. Redundant operations have been removed, data locality has been improved, and the number of branches has been reduced.

5. **Color scheme**
   With just a few clicks, users can now select their favorite color blocks from the palette and effortlessly generate a stunning image infused with the exact shades and tones of their chosen blocks.

6. **Transparence**
   Now you can create stunning transparent maparts with ease. Simply select your image and fine-tune the transparency threshold to achieve the perfect balance.

If you need behaviour or credits from the **original** MapartCraft, always refer to **[rebane2001/mapartcraft](https://github.com/rebane2001/mapartcraft)**.

---

## Credits / thanks

- **[rebane2001/mapartcraft](https://github.com/rebane2001/mapartcraft)** — original MapartCraft design, features, and community.
- Minecraft for block-related assets as in upstream.
- **KenPixel Mini Square** font (Kenney), **pako**, **jszip**, **OpenMoji** flags, and other acknowledgements as in the upstream project.
- Upstream and fork **contributors**; see the GitHub graphs on the original repo for the full list.

Upstream project page: [https://github.com/rebane2001/mapartcraft](https://github.com/rebane2001/mapartcraft).
