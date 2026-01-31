# Image Posterizer

Transform your images into posterized art with custom color palettes. A powerful, client-side image processing tool that runs entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Image Upload**: Support for PNG, JPG, GIF, and WebP formats
- **Dual Preview**: See your original image and posterized output side-by-side
- **Custom Color Palettes**: Choose 2-16 colors for posterization
- **Smart Color Extraction**: Uses k-means clustering to find dominant colors
- **Interactive Color Editing**: Click any color to customize it
- **Eye Dropper Tool**: Pick colors directly from your original image
- **Two Posterization Modes**:
  - Replace Colors: Standard posterization
  - Closest Match: Map each pixel to the nearest palette color
- **Multiple Export Formats**:
  - PNG: Lossless raster export
  - JPG: Compressed raster export
  - SVG: Vector export with smoothing options
- **SVG Complexity Control**: Toggle between simple (more smoothing) and complex (less smoothing) SVG output
- **Mobile Responsive**: Works on desktop and mobile devices
- **Privacy First**: All processing happens in your browser - images never leave your device

## Live Demo

Visit the live app: [https://yourusername.github.io/Posterize-Image/](https://yourusername.github.io/Posterize-Image/)

## How to Use

1. **Upload an Image**: Click "Choose Image" and select your image file
2. **Adjust Colors**: Use the slider to set the number of colors (2-16)
3. **Customize Palette**: Click any color box to change it using the color picker or eye dropper
4. **Choose Mode**: Select between "Replace Colors" or "Closest Match" mode
5. **Export**: Save your posterized image as PNG, JPG, or SVG

### Tips for Best Results

- **For Logos/Clip Art**: Use 3-8 colors and export as SVG with simple mode
- **For Photos**: Use 8-16 colors for more detail
- **SVG Simple Mode**: Best for clean, minimalist vector graphics
- **SVG Complex Mode**: Preserves more detail but creates larger files

## Technical Details

### Algorithms

- **Color Quantization**: K-means++ clustering for intelligent color extraction
- **Posterization**: Euclidean color space distance mapping
- **SVG Generation**: Marching squares edge detection with Bezier curve smoothing
- **Path Simplification**: Ramer-Douglas-Peucker algorithm

### Security

- Client-side processing only (no server uploads)
- File type validation (images only)
- File size limit (10MB)
- Content Security Policy headers
- No use of eval() or unsafe innerHTML
- Input sanitization

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires HTML5 Canvas support

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/Posterize-Image.git

# Navigate to the directory
cd Posterize-Image

# Open index.html in your browser
# Or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

## Project Structure

```
Posterize-Image/
├── index.html          # Main HTML structure
├── style.css           # Responsive CSS styling
├── app.js              # Main application logic
├── posterize.js        # Posterization algorithms
├── svg-export.js       # SVG export functionality
├── README.md           # This file
├── CLAUDE.md           # Development notes
├── LICENSE.md          # MIT License
└── .github/
    └── workflows/
        └── pages.yml   # GitHub Pages deployment
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- K-means clustering for color quantization
- Marching squares algorithm for edge detection
- Ramer-Douglas-Peucker algorithm for path simplification

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/Posterize-Image/issues) on GitHub.
