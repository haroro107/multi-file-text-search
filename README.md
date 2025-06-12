# Multi-File Text Search

A browser-based tool for searching through multiple text files simultaneously. This lightweight utility allows you to quickly upload and search through text files without sending any data to a server - everything happens right in your browser.

## Features

- **Upload multiple text files** - Drag and drop or select files to search
- **Three search modes**:
  - **OR search** - Find lines containing any of the search terms
  - **AND search** - Find lines containing all of the search terms
  - **NOT search** - Find lines that don't contain any of the search terms
- **Highlighted results** - Search terms are highlighted in the results
- **Fullscreen mode** - Expand the results area for better visibility
- **Client-side processing** - All operations happen in your browser, no data is sent to any server
- **Responsive design** - Works on desktop and mobile devices
- **Dark theme** - Easy on the eyes for extended use

## How to Use

1. Open `index.html` in your web browser
2. Upload text files using the drag and drop area or by clicking the upload button
3. Enter your search terms in the search box
4. Select your search mode (OR, AND, or NOT)
5. Click "Search" to find your terms across all uploaded files
6. Results will display with your search terms highlighted
7. Use the fullscreen toggle to expand the results area if needed

## Search Modes Explained

- **OR search** - Returns lines that contain any of the provided search terms. Use this when you want to find mentions of either term A OR term B.
- **AND search** - Returns lines that contain all of the provided search terms. Use this when you need lines that contain both term A AND term B.
- **NOT search** - Returns lines that don't contain any of the provided search terms. Use this to find lines that are free from specific terms.

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- No external dependencies or libraries required
- Runs entirely client-side in the browser
- Compatible with modern browsers (Chrome, Firefox, Safari, Edge)

## Privacy

This tool processes all files locally in your browser. No data is sent to any server, making it safe for sensitive information.

---

Created with ❤️ for efficient text searching
