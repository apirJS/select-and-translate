# Select and Translate

A browser extension that allows you to select any area on your screen, extract text from it, and translate it instantly to your preferred language.

## Demo
![Select and Translate Demo](demo/select-and-translate.gif)

## Features

- **Area Selection**: Select any region of your screen containing text
- **Text Extraction**: Automatically extracts text from the selected area using OCR
- **Instant Translation**: Translates extracted text to your chosen language
- **Multi-language Support**: Supports major world languages including English, Spanish, Chinese, French, German, and many more
- **Theme Adaptation**: Automatically adapts to your browser's light or dark mode
- **Keyboard Shortcuts**: Quick access with customizable keyboard shortcuts (default: Ctrl+Shift+Space)
- **Copy to Clipboard**: Copy both original and translated text with one click
- **Lightweight**: Optimized for performance with minimal resource usage

## Installation

### Chrome and Edge

1. Download the latest release from [GitHub Releases](https://github.com/apirJS/select-and-translate/releases)
2. Open your browser and navigate to `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
3. Enable "Developer mode" in the top right corner
4. Drag and drop the downloaded .zip file into the browser window
5. The extension will be installed and appear in your toolbar

## Usage

### Basic Translation

1. Click the extension icon in your browser toolbar or use the keyboard shortcut (Ctrl+Shift+Space)
2. Click and drag to select the area containing the text you want to translate
3. Wait for the text extraction and translation to complete
4. A modal will display both the original text and the translation
5. Use the copy buttons to copy either text to your clipboard

### Settings

**Change Target Language:**
1. Click the extension icon to open the settings popup
2. Select your preferred target language from the dropdown menu
3. Your selection is automatically saved for future translations

**Customize Keyboard Shortcut:**
1. Click "Change Shortcut" in the extension popup
2. Your browser will open the extension shortcuts management page
3. Find "Select and Translate" and set your preferred key combination

## Privacy and Security

This extension prioritizes user privacy:

- Text processing is handled through secure API endpoints
- No personal data is collected, stored, or transmitted beyond translation requests
- No browsing history or personal information is tracked
- Minimal permissions are requested, only those necessary for core functionality
- All data transmission is encrypted

## Technical Information

**Built with:**
- Manifest V3 browser extension standards
- TypeScript for enhanced code reliability
- Vite build system for optimized performance
- Modern web APIs for cross-browser compatibility

## Troubleshooting

**Keyboard shortcut not working:**
- Verify the shortcut isn't assigned to another extension or browser function
- Set a different shortcut through your browser's extension shortcuts page
- Ensure the extension has necessary permissions

**Text extraction issues:**
- Select areas with clear, readable text
- Ensure adequate contrast between text and background
- Try selecting larger areas that include complete text blocks
- Avoid selecting areas with complex backgrounds or overlapping elements

**Translation problems:**
- Check your internet connection (translation requires online access)
- Verify extension permissions are granted
- Refresh the page and try again
- Clear browser cache if issues persist

## Development

### Contributing

Contributions are welcome. To contribute:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'Add your feature description'`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Submit a pull request

### Building from Source

```bash
# Clone the repository
git clone https://github.com/apirJS/select-and-translate.git

# Install dependencies
npm install

# Build for development
npm run build:dev

# Build for production
npm run build
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built using the WebExtension API
- Powered by Gemini API for translation services
- Developed by Echa (apir)
