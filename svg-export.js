// svg-export.js - SVG export with edge detection and smoothing

class SVGExporter {
    constructor() {
        this.marchingSquaresLookup = this.createMarchingSquaresLookup();
    }

    /**
     * Create lookup table for marching squares algorithm
     * @returns {Object} Lookup table
     */
    createMarchingSquaresLookup() {
        return {
            0: [],
            1: [[0, 0.5], [0.5, 1]],
            2: [[0.5, 1], [1, 0.5]],
            3: [[0, 0.5], [1, 0.5]],
            4: [[1, 0.5], [0.5, 0]],
            5: [[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1]],
            6: [[0.5, 1], [0.5, 0]],
            7: [[0, 0.5], [0.5, 0]],
            8: [[0.5, 0], [0, 0.5]],
            9: [[0.5, 0], [0.5, 1]],
            10: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
            11: [[0.5, 0], [1, 0.5]],
            12: [[1, 0.5], [0, 0.5]],
            13: [[1, 0.5], [0.5, 1]],
            14: [[0.5, 1], [0, 0.5]],
            15: []
        };
    }

    /**
     * Export posterized image as SVG
     * @param {ImageData} imageData - Posterized image data
     * @param {Array} palette - Color palette
     * @param {boolean} simple - Use simple mode (more smoothing)
     * @returns {string} SVG string
     */
    exportSVG(imageData, palette, simple = true) {
        const width = imageData.width;
        const height = imageData.height;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;

        // Create a layer for each color
        for (const color of palette) {
            const mask = this.createColorMask(imageData, color);
            const paths = this.tracePaths(mask, width, height, simple);

            if (paths.length > 0) {
                const hexColor = this.rgbToHex(color);
                svg += `<g fill="${hexColor}">`;

                for (const path of paths) {
                    svg += `<path d="${path}" />`;
                }

                svg += `</g>`;
            }
        }

        svg += `</svg>`;
        return svg;
    }

    /**
     * Create binary mask for specific color
     * @param {ImageData} imageData - Image data
     * @param {Array} targetColor - RGB array
     * @returns {Array} 2D binary array
     */
    createColorMask(imageData, targetColor) {
        const width = imageData.width;
        const height = imageData.height;
        const mask = [];

        for (let y = 0; y < height; y++) {
            mask[y] = [];
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                const a = imageData.data[i + 3];

                // Check if pixel matches target color (with small tolerance)
                const matches = a > 128 &&
                    Math.abs(r - targetColor[0]) < 5 &&
                    Math.abs(g - targetColor[1]) < 5 &&
                    Math.abs(b - targetColor[2]) < 5;

                mask[y][x] = matches ? 1 : 0;
            }
        }

        return mask;
    }

    /**
     * Trace paths using marching squares algorithm
     * @param {Array} mask - Binary mask
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {boolean} simple - Use simple mode (more smoothing)
     * @returns {Array} Array of SVG path strings
     */
    tracePaths(mask, width, height, simple) {
        const paths = [];
        const visited = Array(height).fill(null).map(() => Array(width).fill(false));

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                if (!visited[y][x] && mask[y][x] === 1) {
                    const contour = this.traceContour(mask, x, y, width, height, visited);

                    if (contour.length > 2) {
                        const simplified = simple ?
                            this.simplifyPath(contour, 2.0) :
                            this.simplifyPath(contour, 0.5);

                        const smoothed = this.smoothPath(simplified);
                        paths.push(smoothed);
                    }
                }
            }
        }

        return paths;
    }

    /**
     * Trace single contour using marching squares
     * @param {Array} mask - Binary mask
     * @param {number} startX - Starting x coordinate
     * @param {number} startY - Starting y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {Array} visited - Visited pixels array
     * @returns {Array} Contour points
     */
    traceContour(mask, startX, startY, width, height, visited) {
        const contour = [];
        let x = startX;
        let y = startY;
        let prevDir = -1;
        const maxSteps = width * height;
        let steps = 0;

        do {
            visited[y][x] = true;

            const cellValue = this.getCellValue(mask, x, y, width, height);
            const edges = this.marchingSquaresLookup[cellValue];

            if (edges.length > 0) {
                for (let i = 0; i < edges.length; i += 2) {
                    const p1 = edges[i];
                    const p2 = edges[i + 1];

                    contour.push([x + p1[0], y + p1[1]]);
                    contour.push([x + p2[0], y + p2[1]]);
                }
            }

            // Move to next cell
            const next = this.getNextCell(mask, x, y, prevDir, width, height);
            if (!next) break;

            prevDir = next.dir;
            x = next.x;
            y = next.y;

            steps++;
        } while ((x !== startX || y !== startY) && steps < maxSteps);

        return contour;
    }

    /**
     * Get marching squares cell value
     * @param {Array} mask - Binary mask
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {number} Cell value (0-15)
     */
    getCellValue(mask, x, y, width, height) {
        const tl = this.getMaskValue(mask, x, y, width, height);
        const tr = this.getMaskValue(mask, x + 1, y, width, height);
        const br = this.getMaskValue(mask, x + 1, y + 1, width, height);
        const bl = this.getMaskValue(mask, x, y + 1, width, height);

        return tl * 8 + tr * 4 + br * 2 + bl * 1;
    }

    /**
     * Get mask value with bounds checking
     * @param {Array} mask - Binary mask
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {number} Mask value (0 or 1)
     */
    getMaskValue(mask, x, y, width, height) {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return mask[y][x];
    }

    /**
     * Get next cell in contour
     * @param {Array} mask - Binary mask
     * @param {number} x - Current x
     * @param {number} y - Current y
     * @param {number} prevDir - Previous direction
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Object} Next cell coordinates and direction
     */
    getNextCell(mask, x, y, prevDir, width, height) {
        const dirs = [
            { dx: 1, dy: 0, dir: 0 },
            { dx: 0, dy: 1, dir: 1 },
            { dx: -1, dy: 0, dir: 2 },
            { dx: 0, dy: -1, dir: 3 }
        ];

        for (const d of dirs) {
            if (d.dir === prevDir) continue;

            const nx = x + d.dx;
            const ny = y + d.dy;

            if (nx >= 0 && nx < width - 1 && ny >= 0 && ny < height - 1) {
                if (this.getMaskValue(mask, nx, ny, width, height) === 1) {
                    return { x: nx, y: ny, dir: d.dir };
                }
            }
        }

        return null;
    }

    /**
     * Simplify path using Ramer-Douglas-Peucker algorithm
     * @param {Array} points - Array of points
     * @param {number} tolerance - Simplification tolerance
     * @returns {Array} Simplified points
     */
    simplifyPath(points, tolerance) {
        if (points.length <= 2) return points;

        let maxDist = 0;
        let maxIndex = 0;

        const first = points[0];
        const last = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.perpendicularDistance(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }

        if (maxDist > tolerance) {
            const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPath(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        }

        return [first, last];
    }

    /**
     * Calculate perpendicular distance from point to line
     * @param {Array} point - Point [x, y]
     * @param {Array} lineStart - Line start [x, y]
     * @param {Array} lineEnd - Line end [x, y]
     * @returns {number} Distance
     */
    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd[0] - lineStart[0];
        const dy = lineEnd[1] - lineStart[1];

        const numerator = Math.abs(
            dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]
        );
        const denominator = Math.sqrt(dx * dx + dy * dy);

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Smooth path using quadratic Bezier curves
     * @param {Array} points - Array of points
     * @returns {string} SVG path string
     */
    smoothPath(points) {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

        let path = `M ${points[0][0]} ${points[0][1]}`;

        for (let i = 1; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const controlX = current[0];
            const controlY = current[1];
            const endX = (current[0] + next[0]) / 2;
            const endY = (current[1] + next[1]) / 2;

            path += ` Q ${controlX} ${controlY}, ${endX} ${endY}`;
        }

        // Add last point
        const last = points[points.length - 1];
        path += ` L ${last[0]} ${last[1]}`;

        // Close path
        path += ' Z';

        return path;
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
}
