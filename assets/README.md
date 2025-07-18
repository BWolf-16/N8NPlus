# Assets Folder

This folder contains application assets, primarily the application icon.

## Icon Requirements

N8NPlus looks for icon files in this order:

1. **icon.ico** (Windows) - 256x256 or multiple sizes
2. **icon.png** (Cross-platform) - 256x256 or 512x512 recommended
3. **icon.svg** (Fallback) - Vector format, scalable
4. **Electron default** (Final fallback) - If no custom icon is found

## Icon Formats by Platform

### Windows (.ico)
- Recommended: 16x16, 32x32, 48x48, 256x256 in a single .ico file
- Can be created from PNG using online converters or tools like GIMP

### macOS (.icns)
- Recommended: 512x512, 256x256, 128x128, 64x64, 32x32, 16x16
- Can be created from PNG using `iconutil` on macOS

### Linux (.png)
- Recommended: 512x512 or 256x256 PNG
- Should be placed in standard icon directories when building

## Creating Icons

You can create platform-specific icons from the provided SVG:

1. **From SVG to PNG**: Use Inkscape, GIMP, or online converters
2. **From PNG to ICO**: Use online converters or ImageMagick
3. **From PNG to ICNS**: Use `iconutil` on macOS or online converters

### Quick Commands (if you have the tools):

```bash
# Convert SVG to PNG (requires Inkscape)
inkscape --export-type=png --export-width=256 --export-height=256 icon.svg -o icon.png

# Convert PNG to ICO (requires ImageMagick)
magick icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Convert PNG to ICNS on macOS
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

## Current Icon

The current icon (`icon.svg`) features:
- Docker whale with container blocks (representing Docker container management)
- N8N+ text branding
- Blue color scheme matching the application theme
- Water waves for the Docker whale theme

Feel free to replace with your own custom icon following the naming conventions above!
