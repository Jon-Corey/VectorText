// Elements

const themeToggle = document.getElementById('theme-toggle');

const textInput = document.getElementById('text-input');

const fontSelect = document.getElementById('font-select');
const fontVariantSelect = document.getElementById('font-variant-select');

const fillColorInput = document.getElementById('fill-color-input');
const fillColorText = document.getElementById('fill-color-text');

const kerningCheckbox = document.getElementById('kerning-checkbox');
const ligaturesCheckbox = document.getElementById('ligatures-checkbox');

const wrapCheckbox = document.getElementById('wrap-checkbox');
const wrapWidthInput = document.getElementById('wrap-width-input');

const output = document.getElementById('output');
const outputSvg = document.querySelector('#output svg');
const outputCode = document.getElementById('output-code');
const codeOutputContainer = document.getElementById('code-output-container');

const downloadButton = document.getElementById('download-button');
const copyButton = document.getElementById('copy-button');
const viewSourceButton = document.getElementById('view-source-button');

// Initialize Form From Local Storage Values

textInput.value = localStorage.getItem('text') || '';
fillColorInput.value = localStorage.getItem('fillColor') || '#000000';
if (fillColorText) {
    fillColorText.innerText = fillColorInput.value;
}
kerningCheckbox.checked = localStorage.getItem('kerning') || 'true' === 'true';
ligaturesCheckbox.checked = localStorage.getItem('ligatures') || 'true' === 'true';
wrapCheckbox.checked = localStorage.getItem('wrap') || 'false' === 'true';
wrapWidthInput.value = localStorage.getItem('wrapWidth') || 50;

const showSource = localStorage.getItem('showSource') || 'false' === 'true';
showSourceCode(showSource);

// Handle Theme

function getTheme() {
    let theme = localStorage.getItem('SelectedTheme')?.replaceAll('"', '')?.trim()?.toLowerCase() ?? '';

    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return theme;
}

function toggleTheme() {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('SelectedTheme', newTheme);
    document.documentElement.classList.remove(currentTheme);
    document.documentElement.classList.add(newTheme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Handle SlimSelect Dropdowns

let fontData = null;
const loadingData = [
    {
        text: 'Loading...',
        value: '',
    }
]

let fontVariantSelectSlim = null;
if (fontVariantSelect) {
    fontVariantSelectSlim = new SlimSelect({
        select: fontVariantSelect,
        showSearch: true,
        data: loadingData,
    });
}

if (fontSelect) {
    const fontSelectSlim = new SlimSelect({
        select: fontSelect,
        showSearch: true,
        data: loadingData,
        events: {
            afterChange: (newValue) => {
                const files = fontData.items.find(font => font.family === newValue[0].value)?.files || [];
                updateFontVariantSelect(files);
            }
        }
    });

    // Fetch fonts data and populate the dropdown
    fetch('/data/fonts.json')
        .then(response => response.json())
        .then(data => {
            fontData = data;

            // Transform data to match SlimSelect format
            const transformedData = data.items.map(font => ({
                text: font.family,
                value: font.family
            }));

            const storedFont = localStorage.getItem('font');

            fontSelectSlim.setData(transformedData);

            // If preference is in localStorage, select it
            let defaultFont = transformedData.find(item => item.value === storedFont);
            if (defaultFont) {
                fontSelectSlim.setSelected(defaultFont.value);
            }
            else {
                // If Montserrat is available, select it by default
                defaultFont = transformedData.find(item => item.text === 'Montserrat');
                if (defaultFont) {
                    fontSelectSlim.setSelected(defaultFont.value);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching fonts:', error);
            fontSelectSlim.setData([{ text: 'Error loading fonts', value: '' }]);
        });
}

function updateFontVariantSelect(files) {
    if (fontVariantSelectSlim) {
        const transformedData = Object.entries(files)
            .map(([key, value]) => {
                // Split key into number and style parts
                const match = key.match(/^(\d+)?([a-zA-Z]+)?$/);
                let text = '';
                let num = '';
                let style = '';
                if (match) {
                    [, num, style] = match;
                    if (num && style) {
                        // e.g. "100italic" -> "100 Italic"
                        text = `${num} ${style.charAt(0).toUpperCase()}${style.slice(1)}`;
                    } else if (num) {
                        // e.g. "100" -> "100 Regular"
                        text = `${num} Regular`;
                        style = 'Regular';
                    } else if (style) {
                        // e.g. "regular" -> "400 Regular"
                        text = `400 ${style.charAt(0).toUpperCase()}${style.slice(1)}`;
                        num = '400';
                    }
                } else {
                    text = key;
                }
                return {
                    text,
                    value,
                    num: num ? parseInt(num, 10) : 0,
                    style: style ? style.toLowerCase() : ''
                };
            })
            .sort((a, b) => {
                if (a.style < b.style) return 1;
                if (a.style > b.style) return -1;
                return a.num - b.num;
            })
            .map(({ text, value }) => ({ text, value }));

        let storedFontVariant = localStorage.getItem('fontVariant');

        fontVariantSelectSlim.setData(transformedData);

        // If preference is in localStorage, select it
        let defaultVariant = transformedData.find(item => item.value === storedFontVariant);
        if (defaultVariant) {
            fontVariantSelectSlim.setSelected(defaultVariant.value);
        }
        else {
            // If transformedData contains "400 Regular", select it by default
            defaultVariant = transformedData.find(item => item.text === '400 Regular');
            if (defaultVariant) {
                fontVariantSelectSlim.setSelected(defaultVariant.value);
            }
        }
    }
}

// Handle Form Input

if (textInput) {
    textInput.addEventListener('input', () => {
        //console.log('Text input changed:', textInput.value);
        localStorage.setItem('text', textInput.value);

        updateSVG();
    });
}

if (fontSelect) {
    fontSelect.addEventListener('change', () => {
        //console.log('Font select changed:', fontSelect.value);
        localStorage.setItem('font', fontSelect.value);

        updateSVG();
    });
}

if (fontVariantSelect) {
    fontVariantSelect.addEventListener('change', () => {
        //console.log('Font variant select changed:', fontVariantSelectSlim.getSelected()[0]);
        localStorage.setItem('fontVariant', fontVariantSelectSlim.getSelected()[0]);

        // Delay to prevent race condition with SlimSelect
        setTimeout(() => {
            updateSVG();
        }, timeout = 50);
    });
}

if (fillColorInput) {
    fillColorInput.addEventListener('input', () => {
        if (fillColorText) {
            fillColorText.innerText = fillColorInput.value;
        }

        //console.log('Fill color input changed:', fillColorInput.value);
        localStorage.setItem('fillColor', fillColorInput.value);

        updateSVG();
    });
}

if (kerningCheckbox) {
    kerningCheckbox.addEventListener('change', () => {
        //console.log('Kerning checkbox changed:', kerningCheckbox.checked);
        localStorage.setItem('kerning', kerningCheckbox.checked);
        
        updateSVG();
    });
}

if (ligaturesCheckbox) {
    ligaturesCheckbox.addEventListener('change', () => {
        //console.log('Ligatures checkbox changed:', ligaturesCheckbox.checked);
        localStorage.setItem('ligatures', ligaturesCheckbox.checked);

        updateSVG();
    });
}

if (wrapCheckbox) {
    wrapCheckbox.addEventListener('change', () => {
        //console.log('Wrap checkbox changed:', wrapCheckbox.checked);
        localStorage.setItem('wrap', wrapCheckbox.checked);

        updateSVG();
    });
}

if (wrapWidthInput) {
    wrapWidthInput.addEventListener('input', () => {
        //console.log('Wrap width input changed:', wrapWidthInput.value);
        localStorage.setItem('wrapWidth', wrapWidthInput.value);

        updateSVG();
    });
}

// Handle SVG Updates

async function updateSVG() {
    const text = textInput.value.trim();
    const fontUrl = fontVariantSelectSlim.getSelected()[0];
    const fillColor = fillColorInput.value;
    const kerning = kerningCheckbox.checked;
    const ligatures = ligaturesCheckbox.checked;
    const wrap = wrapCheckbox.checked;
    let wrapWidth = parseInt(wrapWidthInput.value, 10) || 1000;

    if (wrapWidth < 1 || wrapWidth > 1000) {
        wrapWidth = 1000; // Default to a large width if invalid
    }

    // Apply dark/light class based on fill color
    if (getRelativeLuminance(fillColor) > 0.179) {
        output.classList.add('dark');
        output.classList.remove('light');
    } else {
        output.classList.remove('dark');
        output.classList.add('light');
    }

    if (!text || !fontUrl) {
        downloadButton.disabled = true;
        copyButton.disabled = true;
        viewSourceButton.disabled = true;

        outputSvg.innerHTML = '';
        outputCode.textContent = '';
        Prism.highlightAll();
        return;
    }
    downloadButton.disabled = false;
    copyButton.disabled = false;
    viewSourceButton.disabled = false;

    // Use opentype.js to create SVG
    const buffer = fetch(fontUrl).then(response => response.arrayBuffer());
    const font = opentype.parse(await buffer);

    // Split lines by newline characters
    let lines = text.split(/\r?\n/);

    // Split lines if they exceed the maximum width
    if (wrap) {
        lines = lines.flatMap(line => {
            if (line.length <= wrapWidth) {
                return line; // Return the line as is
            }
            const chunks = [];
            let start = 0;
            while (start < line.length) {
                // Try to find the last space within wrapWidth
                let end = start + wrapWidth;
                if (end >= line.length) {
                    chunks.push(line.slice(start));
                    break;
                }
                let spaceIdx = line.lastIndexOf(' ', end);
                if (spaceIdx > start) {
                    chunks.push(line.slice(start, spaceIdx));
                    start = spaceIdx + 1;
                } else {
                    // No space found, hard split
                    chunks.push(line.slice(start, end));
                    start = end;
                }
            }
            return chunks;
        });
    }

    // Create a new path for each line
    let xOffset = 0;
    let yOffset = 0;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let paths = [];
    lines.forEach((line) => {
        const path = font.getPath(line.trim(), xOffset, yOffset, 72, {
            kerning: kerning,
            features: { liga: ligatures }
        });

        path.fill = fillColor;

        const boundingBox = path.getBoundingBox();

        if (boundingBox.x1 < minX || minX === 0) minX = boundingBox.x1;
        if (boundingBox.x2 > maxX) maxX = boundingBox.x2;
        if (boundingBox.y1 < minY || minY === 0) minY = boundingBox.y1;
        if (boundingBox.y2 > maxY) maxY = boundingBox.y2;

        const height = boundingBox.y2 - boundingBox.y1;
        yOffset += height + 10;

        if (line.trim() == '') {
            // Add extra space for empty lines since the text isn't adding any height
            yOffset += 30;
        }

        paths.push(path);
    });

    // Add the paths to the SVG output
    outputSvg.innerHTML = paths.map(path => path.toSVG()).join('');
    outputSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    outputSvg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    outputSvg.setAttribute('width', maxX - minX);
    outputSvg.setAttribute('height', maxY - minY);

    // Update the output code
    outputCode.textContent = outputSvg.outerHTML;
    Prism.highlightAll();
}

// Handle Download Button

if (downloadButton) {
    downloadButton.addEventListener('click', () => {
        const svgData = outputCode.textContent;
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'output.svg';
        link.click();
        URL.revokeObjectURL(url);

        downloadButton.classList.add('alternate');
        setTimeout(() => {
            downloadButton.classList.remove('alternate');
        }, 2000);
    });
}

// Handle Copy Button

if (copyButton) {
    copyButton.addEventListener('click', () => {
        const svgData = outputCode.textContent;
        navigator.clipboard.writeText(svgData).then(() => {
            copyButton.classList.add('alternate');
            setTimeout(() => {
                copyButton.classList.remove('alternate');
            }, 2000);
        });
    });
}

// Handle View Source Button

if (viewSourceButton) {
    viewSourceButton.addEventListener('click', () => {
        const isChecked = viewSourceButton.getAttribute('aria-checked') === 'true';
        showSourceCode(!isChecked);

        localStorage.setItem('showSource', !isChecked);
    });
}

// Helper Functions

function hexToRgb(hex) {
    // Remove the hash if present
    hex = hex.replace(/^#/, '');

    // Parse the hex string into RGB components
    let bigint = parseInt(hex, 16);
    if (hex.length === 6) {
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    } else if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16)
        };
    }
    throw new Error("Invalid HEX color.");
}

function getRelativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);

    // Convert RGB to sRGB
    const srgb = [r, g, b].map(value => {
        const normalized = value / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    // Calculate relative luminance
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function showSourceCode(show) {
    const boolValue = show === 'true' || show === true;
    codeOutputContainer.classList.toggle('hidden', !boolValue);
    viewSourceButton.setAttribute('aria-checked', boolValue);
    viewSourceButton.classList.toggle('alternate', boolValue);
}
