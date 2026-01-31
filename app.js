// app.js - Main application logic

class PosterizeApp {
    constructor() {
        this.posterizer = new Posterizer();
        this.svgExporter = new SVGExporter();

        this.originalCanvas = document.getElementById('originalCanvas');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d', { willReadFrequently: true });
        this.outputCtx = this.outputCanvas.getContext('2d', { willReadFrequently: true });

        this.originalImage = null;
        this.originalImageData = null;
        this.posterizedImageData = null;
        this.originalPosterizedImageData = null; // Save original before transparency
        this.currentPalette = [];
        this.currentColorCount = 5;
        this.currentMode = 'replace';
        this.selectedColorIndex = -1;
        this.smoothing = false; // Anti-aliasing option

        // Transparency tool state
        this.transparencyToolActive = false;
        this.transparencyMethod = 'area';
        this.hasTransparency = false;

        // File size limit: 10MB
        this.maxFileSize = 10 * 1024 * 1024;

        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Image upload
        const imageInput = document.getElementById('imageInput');
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        // Color count slider
        const colorCount = document.getElementById('colorCount');
        colorCount.addEventListener('input', (e) => {
            this.currentColorCount = parseInt(e.target.value);
            document.getElementById('colorCountValue').textContent = this.currentColorCount;
            if (this.originalImageData) {
                this.processImage();
            }
        });

        // Posterization mode
        const modeRadios = document.querySelectorAll('input[name="mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentMode = e.target.value;
                if (this.originalImageData) {
                    this.applyPosterization();
                }
            });
        });

        // Smoothing checkbox
        document.getElementById('smoothingCheckbox').addEventListener('change', (e) => {
            this.smoothing = e.target.checked;
            if (this.originalImageData) {
                this.applyPosterization();
            }
        });

        // Export buttons
        document.getElementById('exportPng').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('exportJpg').addEventListener('click', () => this.exportImage('jpg'));
        document.getElementById('exportSvg').addEventListener('click', () => this.exportImage('svg'));

        // Color picker modal
        document.querySelector('.close').addEventListener('click', () => this.closeColorPicker());
        document.getElementById('applyColorBtn').addEventListener('click', () => this.applyColorChange());
        document.getElementById('eyeDropperBtn').addEventListener('click', () => this.activateEyeDropper());

        // Close modal on outside click
        document.getElementById('colorPickerModal').addEventListener('click', (e) => {
            if (e.target.id === 'colorPickerModal') {
                this.closeColorPicker();
            }
        });

        // Eye dropper overlay
        document.getElementById('eyeDropperCanvas').addEventListener('click', (e) => this.handleEyeDropperClick(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.deactivateEyeDropper();
                this.deactivateTransparencyTool();
            }
        });

        // Transparency tool
        document.getElementById('enableTransparencyTool').addEventListener('click', () => this.toggleTransparencyTool());
        document.getElementById('resetToOriginal').addEventListener('click', () => this.resetToOriginalPosterization());
        document.getElementById('clearTransparency').addEventListener('click', () => this.clearTransparency());

        // Transparency method selection
        const transparencyMethodRadios = document.querySelectorAll('input[name="transparencyMethod"]');
        transparencyMethodRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.transparencyMethod = e.target.value;
            });
        });

        // Output canvas click for transparency tool
        this.outputCanvas.addEventListener('click', (e) => this.handleOutputCanvasClick(e));
    }

    /**
     * Handle image upload with security validation
     * @param {Event} e - Change event
     */
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (PNG, JPG, GIF, or WebP)');
            e.target.value = '';
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            alert('File size exceeds 10MB limit. Please choose a smaller image.');
            e.target.value = '';
            return;
        }

        // Display file name
        document.getElementById('fileName').textContent = file.name;

        // Load image
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.loadImage(img);
            };
            img.onerror = () => {
                alert('Failed to load image. Please try another file.');
                e.target.value = '';
            };
            // Use data URL for security (no external URLs)
            img.src = event.target.result;
        };
        reader.onerror = () => {
            alert('Failed to read file. Please try again.');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Load image onto canvas
     * @param {Image} img - Image element
     */
    loadImage(img) {
        // Calculate canvas size (max 1200px to maintain performance)
        const maxSize = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        // Set canvas sizes
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.outputCanvas.width = width;
        this.outputCanvas.height = height;

        // Draw original image
        this.originalCtx.drawImage(img, 0, 0, width, height);

        // Get image data
        this.originalImageData = this.originalCtx.getImageData(0, 0, width, height);

        // Process image
        this.processImage();

        // Enable export buttons
        document.getElementById('exportPng').disabled = false;
        document.getElementById('exportJpg').disabled = false;
        document.getElementById('exportSvg').disabled = false;

        // Enable transparency tool
        document.getElementById('enableTransparencyTool').disabled = false;
    }

    /**
     * Process image: extract colors and apply posterization
     */
    processImage() {
        if (!this.originalImageData) return;

        // Extract color palette
        this.currentPalette = this.posterizer.extractColors(
            this.originalImageData,
            this.currentColorCount
        );

        // Display palette
        this.displayPalette();

        // Apply posterization
        this.applyPosterization();
    }

    /**
     * Apply posterization based on current mode
     */
    applyPosterization() {
        if (!this.originalImageData) return;

        // Apply smoothing if enabled
        let sourceData = this.originalImageData;
        if (this.smoothing) {
            sourceData = this.posterizer.applySmoothFilter(this.originalImageData);
        }

        if (this.currentMode === 'replace') {
            this.posterizedImageData = this.posterizer.posterizeReplace(
                sourceData,
                this.currentPalette
            );
        } else {
            this.posterizedImageData = this.posterizer.posterizeClosest(
                sourceData,
                this.currentPalette
            );
        }

        // Save original posterized state (before transparency)
        this.originalPosterizedImageData = new ImageData(
            new Uint8ClampedArray(this.posterizedImageData.data),
            this.posterizedImageData.width,
            this.posterizedImageData.height
        );

        // Clear transparency state since we're re-posterizing
        this.hasTransparency = false;
        this.outputCanvas.classList.remove('has-transparency');
        document.getElementById('clearTransparency').disabled = true;

        // Display posterized image
        this.outputCtx.putImageData(this.posterizedImageData, 0, 0);
    }

    /**
     * Display color palette
     */
    displayPalette() {
        const paletteDiv = document.getElementById('colorPalette');
        paletteDiv.innerHTML = '';

        this.currentPalette.forEach((color, index) => {
            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            const hexColor = this.posterizer.rgbToHex(color);
            colorBox.style.backgroundColor = hexColor;
            colorBox.setAttribute('data-hex', hexColor);
            colorBox.addEventListener('click', () => this.openColorPicker(index));
            paletteDiv.appendChild(colorBox);
        });
    }

    /**
     * Open color picker for specific color
     * @param {number} index - Color index in palette
     */
    openColorPicker(index) {
        this.selectedColorIndex = index;
        const color = this.currentPalette[index];
        const hexColor = this.posterizer.rgbToHex(color);

        document.getElementById('colorPicker').value = hexColor;
        document.getElementById('colorPickerModal').classList.add('active');
    }

    /**
     * Close color picker modal
     */
    closeColorPicker() {
        document.getElementById('colorPickerModal').classList.remove('active');
        this.selectedColorIndex = -1;
    }

    /**
     * Apply color change from picker
     */
    applyColorChange() {
        if (this.selectedColorIndex === -1) return;

        const hexColor = document.getElementById('colorPicker').value;
        const rgbColor = this.posterizer.hexToRgb(hexColor);

        this.currentPalette[this.selectedColorIndex] = rgbColor;
        this.displayPalette();
        this.applyPosterization();
        this.closeColorPicker();
    }

    /**
     * Activate eye dropper tool
     */
    activateEyeDropper() {
        if (!this.originalImage) return;

        const overlay = document.getElementById('eyeDropperOverlay');
        const canvas = document.getElementById('eyeDropperCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Set canvas size
        canvas.width = this.originalCanvas.width;
        canvas.height = this.originalCanvas.height;

        // Draw original image
        ctx.drawImage(this.originalCanvas, 0, 0);

        // Show overlay
        overlay.style.display = 'flex';
    }

    /**
     * Handle eye dropper click
     * @param {Event} e - Click event
     */
    handleEyeDropperClick(e) {
        const canvas = document.getElementById('eyeDropperCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const rect = canvas.getBoundingClientRect();

        // Calculate click position relative to canvas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        // Get pixel color
        const imageData = ctx.getImageData(x, y, 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];

        // Update color picker
        const hexColor = this.posterizer.rgbToHex([r, g, b]);
        document.getElementById('colorPicker').value = hexColor;

        // Deactivate eye dropper
        this.deactivateEyeDropper();
    }

    /**
     * Deactivate eye dropper tool
     */
    deactivateEyeDropper() {
        document.getElementById('eyeDropperOverlay').style.display = 'none';
    }

    /**
     * Export image in specified format
     * @param {string} format - Export format (png, jpg, svg)
     */
    exportImage(format) {
        if (!this.posterizedImageData) return;

        if (format === 'svg') {
            this.exportSVG();
        } else {
            this.exportRaster(format);
        }
    }

    /**
     * Export as raster image (PNG or JPG)
     * @param {string} format - Image format
     */
    exportRaster(format) {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpg' ? 0.95 : undefined;

        let canvas = this.outputCanvas;

        // For JPG with transparency, create a composite with white background
        if (format === 'jpg' && this.hasTransparency) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.outputCanvas.width;
            tempCanvas.height = this.outputCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Fill with white background
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Draw posterized image on top
            tempCtx.drawImage(this.outputCanvas, 0, 0);

            canvas = tempCanvas;
        }

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `posterized.${format}`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    }

    /**
     * Export as SVG
     */
    exportSVG() {
        // Show SVG options
        document.getElementById('svgOptions').style.display = 'block';

        // Get complexity setting
        const complexityRadios = document.querySelectorAll('input[name="svgComplexity"]');
        let simple = true;
        complexityRadios.forEach(radio => {
            if (radio.checked) {
                simple = radio.value === 'simple';
            }
        });

        // Generate SVG
        const svgString = this.svgExporter.exportSVG(
            this.posterizedImageData,
            this.currentPalette,
            simple
        );

        // Create blob and download
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'posterized.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Toggle transparency tool on/off
     */
    toggleTransparencyTool() {
        this.transparencyToolActive = !this.transparencyToolActive;

        const button = document.getElementById('enableTransparencyTool');
        const info = document.getElementById('transparencyInfo');
        const canvas = this.outputCanvas;

        if (this.transparencyToolActive) {
            button.textContent = 'Disable Transparency Tool';
            button.classList.add('primary');
            info.style.display = 'block';
            canvas.classList.add('transparency-active');
        } else {
            button.textContent = 'Enable Transparency Tool';
            button.classList.remove('primary');
            info.style.display = 'none';
            canvas.classList.remove('transparency-active');
        }
    }

    /**
     * Deactivate transparency tool
     */
    deactivateTransparencyTool() {
        if (this.transparencyToolActive) {
            this.toggleTransparencyTool();
        }
    }

    /**
     * Handle click on output canvas for transparency tool
     * @param {Event} e - Click event
     */
    handleOutputCanvasClick(e) {
        if (!this.transparencyToolActive || !this.posterizedImageData) return;

        const rect = this.outputCanvas.getBoundingClientRect();
        const scaleX = this.outputCanvas.width / rect.width;
        const scaleY = this.outputCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        // Get pixel color at click position
        const idx = (y * this.outputCanvas.width + x) * 4;
        const clickedColor = [
            this.posterizedImageData.data[idx],
            this.posterizedImageData.data[idx + 1],
            this.posterizedImageData.data[idx + 2]
        ];

        if (this.transparencyMethod === 'area') {
            // Use flood fill to make region transparent
            this.posterizedImageData = this.posterizer.makeRegionTransparent(
                this.posterizedImageData,
                x,
                y,
                30
            );
        } else {
            // Make all instances of this color transparent
            this.posterizedImageData = this.posterizer.makeColorTransparent(
                this.posterizedImageData,
                clickedColor,
                10
            );
        }

        // Update display
        this.hasTransparency = true;
        this.outputCanvas.classList.add('has-transparency');
        this.outputCtx.putImageData(this.posterizedImageData, 0, 0);

        // Enable reset and clear buttons
        document.getElementById('resetToOriginal').disabled = false;
        document.getElementById('clearTransparency').disabled = false;
    }

    /**
     * Reset to original posterization (before transparency was applied)
     */
    resetToOriginalPosterization() {
        if (!this.originalPosterizedImageData) return;

        // Restore original posterized state
        this.posterizedImageData = new ImageData(
            new Uint8ClampedArray(this.originalPosterizedImageData.data),
            this.originalPosterizedImageData.width,
            this.originalPosterizedImageData.height
        );

        // Clear transparency state
        this.hasTransparency = false;
        this.outputCanvas.classList.remove('has-transparency');

        // Update display
        this.outputCtx.putImageData(this.posterizedImageData, 0, 0);

        // Disable buttons
        document.getElementById('resetToOriginal').disabled = true;
        document.getElementById('clearTransparency').disabled = true;
    }

    /**
     * Clear all transparency and reapply posterization
     */
    clearTransparency() {
        this.hasTransparency = false;
        this.outputCanvas.classList.remove('has-transparency');
        this.applyPosterization();
        document.getElementById('resetToOriginal').disabled = true;
        document.getElementById('clearTransparency').disabled = true;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PosterizeApp();
});
