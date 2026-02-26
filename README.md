# Multi-File Text Search

A browser-based tool for searching through multiple text files simultaneously. This lightweight utility allows you to quickly upload and search through text files without sending any data to a server - everything happens right in your browser.

## Features

- **Upload multiple text files** - Drag and drop or select files to search
- **Three search modes**:
  - **OR search** - Find lines containing any of the search terms
  - **AND search** - Find lines containing all of the search terms
  - **NOT search** - Find lines that don't contain any of the search terms
- **Advanced search options**:
  - **Case Sensitive** - Match exact uppercase/lowercase
  - **Whole Word** - Match complete words only (avoid partial word hits)
- **Highlighted results** - Search terms are highlighted in the results
- **Line number display** - Every match shows its original line number
- **Export results** - Download current search results as `.txt`
- **Realtime stats** - See total uploaded files/lines and scan speed in milliseconds
- **Fullscreen mode** - Expand the results area for better visibility
- **Client-side processing** - All operations happen in your browser, no data is sent to any server
- **Responsive design** - Works on desktop and mobile devices
- **Improved dark UI** - Cleaner, more readable, and easier to navigate

## How to Use

1. Open `index.html` in your web browser
2. Upload text files using the drag and drop area or by clicking the upload button
3. Enter your search terms in the search box
4. Select your search mode (OR, AND, or NOT)
5. (Optional) Enable `Case Sensitive` or `Whole Word`
6. Click "Search" (or press `Enter`) to find your terms across all uploaded files
7. Results will display with highlighted matches and line numbers
8. Use "Export Results" to save current output as a text file
9. Use the fullscreen toggle to expand the results area if needed

## Search Modes Explained

- **OR search** - Returns lines that contain any of the provided search terms. Use this when you want to find mentions of either term A OR term B.
- **AND search** - Returns lines that contain all of the provided search terms. Use this when you need lines that contain both term A AND term B.
- **NOT search** - Returns lines that don't contain any of the provided search terms. Use this to find lines that are free from specific terms.

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- No external dependencies or libraries required
- Runs entirely client-side in the browser
- Compatible with modern browsers (Chrome, Firefox, Safari, Edge)
- Search engine improvements:
  - Trims and deduplicates input terms to prevent false "not found" messages
  - Precomputes lowercase lines for faster case-insensitive searching
  - Uses safer rendering to prevent HTML/script injection from file content
  - Removes artificial search delays and uses frame-based rendering for smoother UX

## Keyboard Shortcuts

- `Enter` in search box: Run search
- `Shift + Enter` in search box: Add new line keyword
- `Ctrl + K` / `Cmd + K`: Focus main search input

## Privacy

This tool processes all files locally in your browser. No data is sent to any server, making it safe for sensitive information.

---

Created with ❤️ for efficient text searching
