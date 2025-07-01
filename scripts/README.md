# HomeBake Scripts

This directory contains utility scripts for the HomeBake project.

## Icon Generation

### Current Status
✅ **PWA icons have been generated** - Basic orange PNG icons are created for all required sizes.

### Files Generated
- `icon-72x72.png` through `icon-512x512.png` - PWA manifest icons
- `icon-*.svg` - SVG versions for future use
- `favicon.ico` - Browser favicon

### For Production Use

To create professional-quality icons for production:

1. **Design your icon** in Figma, Adobe Illustrator, or similar tool
2. **Export as SVG** at 512x512 pixels
3. **Use an online PWA icon generator** like:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://favicon.io/favicon-generator/

4. **Or use command-line tools**:
   ```bash
   # Install sharp for high-quality resizing
   npm install sharp --save-dev
   
   # Create a script to resize from SVG/PNG to all required sizes
   # Example with sharp:
   const sharp = require('sharp');
   
   // Resize base icon to all PWA sizes
   const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
   sizes.forEach(size => {
     sharp('icon-base.png')
       .resize(size, size)
       .png()
       .toFile(`public/icons/icon-${size}x${size}.png`);
   });
   ```

### Current Icon Details

The current icons are:
- **Basic orange squares** with HomeBake branding
- **Valid PNG format** (114 bytes each)
- **Functional** for PWA installation
- **Placeholder quality** - suitable for development/testing

### Replacing Icons

To replace the current icons with your own:

1. Create your icon designs
2. Export as PNG files with exact naming: `icon-{size}x{size}.png`
3. Place in `public/icons/` directory
4. Ensure all sizes are provided: 72, 96, 128, 144, 152, 192, 384, 512
5. Test PWA installation in Chrome DevTools

### Testing PWA Icons

1. Open Chrome DevTools → Application tab
2. Check "Manifest" section
3. Verify all icons load without errors
4. Test installation prompt
5. Check installed app icon on home screen/dock