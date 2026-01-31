// posterize.js - Image posterization algorithms

class Posterizer {
    constructor() {
        this.palette = [];
    }

    /**
     * Extract dominant colors from image using k-means clustering
     * @param {ImageData} imageData - Canvas image data
     * @param {number} k - Number of colors to extract
     * @returns {Array} Array of RGB color arrays
     */
    extractColors(imageData, k) {
        const pixels = [];
        const data = imageData.data;

        // Sample pixels (use every 4th pixel for performance on large images)
        const step = Math.max(1, Math.floor(data.length / (4 * 10000)));

        for (let i = 0; i < data.length; i += 4 * step) {
            // Skip transparent pixels
            if (data[i + 3] < 128) continue;

            pixels.push([data[i], data[i + 1], data[i + 2]]);
        }

        if (pixels.length === 0) {
            // Return default colors if no pixels found
            return this.generateDefaultPalette(k);
        }

        // Run k-means clustering
        const palette = this.kMeans(pixels, k);
        this.palette = palette;
        return palette;
    }

    /**
     * K-means clustering algorithm for color quantization
     * @param {Array} pixels - Array of RGB arrays
     * @param {number} k - Number of clusters
     * @returns {Array} Array of centroid colors
     */
    kMeans(pixels, k) {
        if (pixels.length < k) {
            return this.generateDefaultPalette(k);
        }

        // Initialize centroids using k-means++
        let centroids = this.initializeCentroidsKMeansPlusPlus(pixels, k);

        const maxIterations = 50;
        let iterations = 0;
        let hasConverged = false;

        while (!hasConverged && iterations < maxIterations) {
            // Assign pixels to nearest centroid
            const clusters = Array(k).fill(null).map(() => []);

            for (const pixel of pixels) {
                const nearestIndex = this.findNearestCentroid(pixel, centroids);
                clusters[nearestIndex].push(pixel);
            }

            // Calculate new centroids
            const newCentroids = clusters.map(cluster => {
                if (cluster.length === 0) {
                    // Keep old centroid if cluster is empty
                    return centroids[clusters.indexOf(cluster)];
                }
                return this.calculateMean(cluster);
            });

            // Check for convergence
            hasConverged = this.centroidsEqual(centroids, newCentroids);
            centroids = newCentroids;
            iterations++;
        }

        return centroids.map(c => c.map(Math.round));
    }

    /**
     * Initialize centroids using k-means++ algorithm
     * @param {Array} pixels - Array of RGB arrays
     * @param {number} k - Number of centroids
     * @returns {Array} Initial centroids
     */
    initializeCentroidsKMeansPlusPlus(pixels, k) {
        const centroids = [];

        // Choose first centroid randomly
        centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

        // Choose remaining centroids
        for (let i = 1; i < k; i++) {
            const distances = pixels.map(pixel => {
                const minDist = Math.min(...centroids.map(c => this.colorDistance(pixel, c)));
                return minDist * minDist;
            });

            const totalDist = distances.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalDist;

            for (let j = 0; j < pixels.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    centroids.push(pixels[j]);
                    break;
                }
            }
        }

        return centroids;
    }

    /**
     * Find nearest centroid for a pixel
     * @param {Array} pixel - RGB array
     * @param {Array} centroids - Array of centroid RGB arrays
     * @returns {number} Index of nearest centroid
     */
    findNearestCentroid(pixel, centroids) {
        let minDist = Infinity;
        let nearestIndex = 0;

        for (let i = 0; i < centroids.length; i++) {
            const dist = this.colorDistance(pixel, centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                nearestIndex = i;
            }
        }

        return nearestIndex;
    }

    /**
     * Calculate Euclidean distance between two colors
     * @param {Array} c1 - First RGB array
     * @param {Array} c2 - Second RGB array
     * @returns {number} Distance
     */
    colorDistance(c1, c2) {
        return Math.sqrt(
            Math.pow(c1[0] - c2[0], 2) +
            Math.pow(c1[1] - c2[1], 2) +
            Math.pow(c1[2] - c2[2], 2)
        );
    }

    /**
     * Calculate mean of cluster
     * @param {Array} cluster - Array of RGB arrays
     * @returns {Array} Mean RGB array
     */
    calculateMean(cluster) {
        const sum = cluster.reduce((acc, pixel) => {
            return [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]];
        }, [0, 0, 0]);

        return [
            sum[0] / cluster.length,
            sum[1] / cluster.length,
            sum[2] / cluster.length
        ];
    }

    /**
     * Check if centroids have converged
     * @param {Array} old - Old centroids
     * @param {Array} newC - New centroids
     * @returns {boolean} True if equal
     */
    centroidsEqual(old, newC) {
        const threshold = 1;
        for (let i = 0; i < old.length; i++) {
            if (this.colorDistance(old[i], newC[i]) > threshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * Apply posterization to image with replace mode
     * @param {ImageData} imageData - Canvas image data
     * @param {Array} palette - Color palette
     * @returns {ImageData} Posterized image data
     */
    posterizeReplace(imageData, palette) {
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        for (let i = 0; i < newData.data.length; i += 4) {
            // Skip transparent pixels
            if (newData.data[i + 3] < 128) continue;

            const pixel = [newData.data[i], newData.data[i + 1], newData.data[i + 2]];
            const nearest = this.findNearestColor(pixel, palette);

            newData.data[i] = nearest[0];
            newData.data[i + 1] = nearest[1];
            newData.data[i + 2] = nearest[2];
        }

        return newData;
    }

    /**
     * Apply posterization to image with closest match mode
     * Same as replace mode but explicitly named for clarity
     * @param {ImageData} imageData - Canvas image data
     * @param {Array} palette - Color palette
     * @returns {ImageData} Posterized image data
     */
    posterizeClosest(imageData, palette) {
        return this.posterizeReplace(imageData, palette);
    }

    /**
     * Find nearest color in palette
     * @param {Array} pixel - RGB array
     * @param {Array} palette - Array of RGB arrays
     * @returns {Array} Nearest color RGB array
     */
    findNearestColor(pixel, palette) {
        let minDist = Infinity;
        let nearest = palette[0];

        for (const color of palette) {
            const dist = this.colorDistance(pixel, color);
            if (dist < minDist) {
                minDist = dist;
                nearest = color;
            }
        }

        return nearest;
    }

    /**
     * Generate default palette if extraction fails
     * @param {number} k - Number of colors
     * @returns {Array} Default palette
     */
    generateDefaultPalette(k) {
        const palette = [];
        for (let i = 0; i < k; i++) {
            const hue = (i / k) * 360;
            palette.push(this.hslToRgb(hue, 70, 50));
        }
        return palette;
    }

    /**
     * Convert HSL to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {Array} RGB array
     */
    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r, g, b;

        if (h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    /**
     * Convert RGB to hex
     * @param {Array} rgb - RGB array
     * @returns {string} Hex color string
     */
    rgbToHex(rgb) {
        return '#' + rgb.map(c => {
            const hex = Math.round(c).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Convert hex to RGB
     * @param {string} hex - Hex color string
     * @returns {Array} RGB array
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    /**
     * Flood fill algorithm to find connected region
     * @param {ImageData} imageData - Canvas image data
     * @param {number} x - Starting x coordinate
     * @param {number} y - Starting y coordinate
     * @param {number} tolerance - Color tolerance (0-255)
     * @returns {Array} Array of pixel coordinates [x, y] in the region
     */
    floodFill(imageData, x, y, tolerance = 30) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Get starting pixel color
        const startIdx = (y * width + x) * 4;
        const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2]];

        // Track visited pixels
        const visited = new Set();
        const region = [];
        const queue = [[x, y]];

        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

            visited.add(key);

            const idx = (cy * width + cx) * 4;
            const currentColor = [data[idx], data[idx + 1], data[idx + 2]];

            // Check if color is similar enough
            if (this.colorDistance(currentColor, startColor) <= tolerance) {
                region.push([cx, cy]);

                // Add neighbors to queue
                queue.push([cx + 1, cy]);
                queue.push([cx - 1, cy]);
                queue.push([cx, cy + 1]);
                queue.push([cx, cy - 1]);
            }
        }

        return region;
    }

    /**
     * Make a region transparent by area (flood fill)
     * @param {ImageData} imageData - Canvas image data
     * @param {number} x - Starting x coordinate
     * @param {number} y - Starting y coordinate
     * @param {number} tolerance - Color tolerance
     * @returns {ImageData} Image data with transparency applied
     */
    makeRegionTransparent(imageData, x, y, tolerance = 30) {
        const region = this.floodFill(imageData, x, y, tolerance);
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        // Set alpha to 0 for all pixels in region
        for (const [px, py] of region) {
            const idx = (py * imageData.width + px) * 4;
            newData.data[idx + 3] = 0;
        }

        return newData;
    }

    /**
     * Make all pixels of a specific color transparent
     * @param {ImageData} imageData - Canvas image data
     * @param {Array} targetColor - RGB array of color to make transparent
     * @param {number} tolerance - Color tolerance
     * @returns {ImageData} Image data with transparency applied
     */
    makeColorTransparent(imageData, targetColor, tolerance = 10) {
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        for (let i = 0; i < newData.data.length; i += 4) {
            const pixel = [newData.data[i], newData.data[i + 1], newData.data[i + 2]];

            if (this.colorDistance(pixel, targetColor) <= tolerance) {
                newData.data[i + 3] = 0;
            }
        }

        return newData;
    }

    /**
     * Clean edges to remove anti-aliasing artifacts
     * Fills gaps at color boundaries by expanding solid colors
     * @param {ImageData} imageData - Posterized image data
     * @param {Array} palette - Color palette
     * @returns {ImageData} Cleaned image data
     */
    cleanEdges(imageData, palette) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const newData = new ImageData(
            new Uint8ClampedArray(data),
            width,
            height
        );

        // Apply morphological dilation - expand colors into gaps
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const pixel = [data[idx], data[idx + 1], data[idx + 2]];

                // Check if this pixel is close to any palette color
                let minDist = Infinity;
                for (const color of palette) {
                    const dist = this.colorDistance(pixel, color);
                    if (dist < minDist) {
                        minDist = dist;
                    }
                }

                // If pixel is not close to any palette color (anti-aliased pixel)
                if (minDist > 5) {
                    // Find the most common palette color in the neighborhood
                    const neighborColors = {};

                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;

                            const nIdx = ((y + dy) * width + (x + dx)) * 4;
                            const nPixel = [data[nIdx], data[nIdx + 1], data[nIdx + 2]];

                            // Find closest palette color for this neighbor
                            const closestColor = this.findNearestColor(nPixel, palette);
                            const colorKey = closestColor.join(',');

                            neighborColors[colorKey] = (neighborColors[colorKey] || 0) + 1;
                        }
                    }

                    // Assign to most common neighbor color
                    let maxCount = 0;
                    let bestColor = palette[0];

                    for (const [colorKey, count] of Object.entries(neighborColors)) {
                        if (count > maxCount) {
                            maxCount = count;
                            bestColor = colorKey.split(',').map(Number);
                        }
                    }

                    newData.data[idx] = bestColor[0];
                    newData.data[idx + 1] = bestColor[1];
                    newData.data[idx + 2] = bestColor[2];
                }
            }
        }

        return newData;
    }

    /**
     * Apply smooth filter to reduce pixelation
     * Uses a simple 3x3 box blur kernel
     * @param {ImageData} imageData - Canvas image data
     * @returns {ImageData} Smoothed image data
     */
    applySmoothFilter(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const newData = new ImageData(
            new Uint8ClampedArray(data),
            width,
            height
        );

        // Apply 3x3 box blur
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0, count = 0;

                // Sample 3x3 neighborhood
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        count++;
                    }
                }

                // Average the values
                const outIdx = (y * width + x) * 4;
                newData.data[outIdx] = Math.round(r / count);
                newData.data[outIdx + 1] = Math.round(g / count);
                newData.data[outIdx + 2] = Math.round(b / count);
                // Keep original alpha
                newData.data[outIdx + 3] = data[outIdx + 3];
            }
        }

        return newData;
    }
}
