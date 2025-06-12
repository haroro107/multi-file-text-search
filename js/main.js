// Store uploaded files data
let uploadedFiles = [];

// DOM elements
const fileInput = document.getElementById("file-input");
const uploadButton = document.getElementById("upload-button");
const fileList = document.getElementById("file-list");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-btn");
const searchMode = document.getElementById("search-mode");
const resultsContainer = document.getElementById("results-container");
const resultsCount = document.getElementById("results-count");
const clearInputBtn = document.getElementById("clear-input-btn");
const resultsSection = document.querySelector(".results-section");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const fullscreenSearchBar = document.getElementById("fullscreen-search-bar");
const fullscreenSearchInput = document.getElementById(
    "fullscreen-search-input"
);
const fullscreenSearchBtn = document.getElementById("fullscreen-search-btn");
const fullscreenSearchMode = document.getElementById("fullscreen-search-mode");
const fullscreenSearchToggleBtn = document.getElementById(
    "fullscreen-search-toggle-btn"
);
const fileUploadArea = document.querySelector(".file-upload");

// Helper function to clean search input by removing empty lines
function cleanSearchInput(input) {
    return input
        .split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');
}

// Setup event listeners
uploadButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleFileUpload);
searchButton.addEventListener("click", performSearch);

// Add event listeners for radio button changes
document.querySelectorAll('input[name="search-mode"]').forEach(radio => {
    radio.addEventListener('change', () => performSearch());
});

document.querySelectorAll('input[name="fullscreen-search-mode"]').forEach(radio => {
    radio.addEventListener('change', () => performSearch(true));
});

// Handle textarea height adjustment with Shift+Enter
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            // Allow the default behavior (add a new line)
            adjustTextareaHeight(e.target);
        } else {
            e.preventDefault();
            performSearch();
        }
    }
});

fullscreenSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            // Allow the default behavior (add a new line)
            adjustTextareaHeight(e.target);
        } else {
            e.preventDefault();
            performSearch(true);
        }
    }
});

// Function to adjust textarea height based on content
function adjustTextareaHeight(textarea) {
    // Use setTimeout to ensure the new line is added before measuring height
    setTimeout(() => {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }, 0);
}

// Initialize textarea height adjustment on input
searchInput.addEventListener("input", () => adjustTextareaHeight(searchInput));
fullscreenSearchInput.addEventListener("input", () =>
    adjustTextareaHeight(fullscreenSearchInput)
);
clearInputBtn.addEventListener("click", () => {
    searchInput.value = "";
    fullscreenSearchInput.value = "";
    // Reset textarea heights
    searchInput.style.height = "";
    fullscreenSearchInput.style.height = "";
    if (uploadedFiles.length > 0) {
        showAllData();
    } else {
        resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h3>No Files Uploaded</h3>
                        <p>Upload text files to begin searching</p>
                    </div>
                `;
        resultsCount.textContent = "Results: 0";
    }
});

// Show/hide fullscreen search bar
fullscreenSearchToggleBtn.addEventListener("click", () => {
    fullscreenSearchBar.classList.toggle("visible");
    if (fullscreenSearchBar.classList.contains("visible")) {
        fullscreenSearchInput.focus();
    }
});

// Fullscreen search event
fullscreenSearchBtn.addEventListener("click", () => {
    performSearch(true);
});
fullscreenSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        performSearch(true);
    }
});

// Full screen toggle
fullscreenBtn.addEventListener("click", () => {
    resultsSection.classList.toggle("fullscreen");
    // Toggle .fullscreen on all .file-content elements
    document.querySelectorAll(".file-content").forEach((el) => {
        if (resultsSection.classList.contains("fullscreen")) {
            el.classList.add("fullscreen");
        } else {
            el.classList.remove("fullscreen");
        }
    });
    // Toggle fullscreen search toggle button
    if (resultsSection.classList.contains("fullscreen")) {
        fullscreenBtn.innerHTML =
            '<i class="fas fa-compress"></i> Exit Full Screen';
        fullscreenSearchToggleBtn.style.display = "";
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Full Screen';
        fullscreenSearchToggleBtn.style.display = "none";
        fullscreenSearchBar.classList.remove("visible");
    }
});

// Handle file upload
function handleFileUpload(e) {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    files.forEach((file) => {
        if (file.type !== "text/plain") {
            alert("Please upload only text files (.txt)");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            const content = event.target.result;
            const fileName = file.name;
            // Use a unique key for each file: name + size + lastModified
            const uniqueKey = `${file.name}_${file.size}_${file.lastModified}`;

            // Check if file is already uploaded (by uniqueKey)
            if (uploadedFiles.some((f) => f.uniqueKey === uniqueKey)) {
                alert(`File "${fileName}" is already uploaded`);
                return;
            }

            // Store file content with uniqueKey
            uploadedFiles.push({
                name: fileName,
                uniqueKey: uniqueKey,
                content: content,
                lines: content.split("\n").filter((line) => line.trim() !== ""),
            });

            // Update UI
            updateFileList();
            updateEmptyState();

            // If search input is empty, show all data
            if (!searchInput.value.trim()) {
                showAllData();
            }
        };
        reader.readAsText(file);
    });

    // Reset input to allow uploading same file again
    fileInput.value = "";
}

// Update the file list display
function updateFileList() {
    if (uploadedFiles.length === 0) {
        fileList.innerHTML = "<p>No files uploaded yet</p>";
        return;
    }

    fileList.innerHTML = `
                <div class="file-list-header" style="display:flex;align-items:center;justify-content:space-between;">
                    <span><strong>Uploaded Files:</strong> (${uploadedFiles.length})</span>
                    <span id="clear-files-link" style="color:#ff7043;cursor:pointer;font-weight:500;font-size:1em;user-select:none;">Clear All Files</span>
                </div>
            `;

    // Add event for clear all files link
    setTimeout(() => {
        const clearFilesLink = document.getElementById("clear-files-link");
        if (clearFilesLink) {
            clearFilesLink.onclick = clearAllFiles;
        }
    }, 0);

    uploadedFiles.forEach((file, idx) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        // Add remove button for each file
        fileItem.innerHTML = `
                    <i class="fas fa-file-alt"></i> ${file.name} (${file.lines.length} entries)
                    <button class="remove-file-btn" title="Remove file" style="margin-left:12px; color:#ff7043; background:none; border:none; cursor:pointer; font-size:1.1em;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
        // Remove file on button click
        fileItem.querySelector(".remove-file-btn").onclick = function () {
            uploadedFiles.splice(idx, 1);
            updateFileList();
            if (uploadedFiles.length === 0) {
                resultsContainer.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-file-alt"></i>
                                <h3>No Files Uploaded</h3>
                                <p>Upload text files to begin searching</p>
                            </div>
                        `;
                resultsCount.textContent = "Results: 0";
                searchInput.value = "";
            } else {
                // If search input is empty, show all data; else, re-search
                if (!searchInput.value.trim()) {
                    showAllData();
                } else {
                    performSearch();
                }
            }
        };
        fileList.appendChild(fileItem);
    });
}

// Function to show loading state
function showLoadingState() {
    resultsContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <h3>Searching...</h3>
            <p>Processing your search request</p>
        </div>
    `;
    resultsCount.textContent = "Results: ...";
}

// Function to hide loading state
function hideLoadingState() {
    // This function doesn't need to do anything explicitly
    // as the loading state will be replaced by search results
}

// Perform search (normal or fullscreen)
function performSearch(isFullscreen = false) {
    let rawInput, searchTerms, mode;
    if (isFullscreen && resultsSection.classList.contains("fullscreen")) {
        rawInput = fullscreenSearchInput.value.trim();
        // Clean the input to remove empty lines
        const cleanedInput = cleanSearchInput(rawInput);
        fullscreenSearchInput.value = cleanedInput;
        searchTerms = cleanedInput
            .split("\n")
            .filter(Boolean);
        // Get selected radio button value for fullscreen
        mode = document.querySelector('input[name="fullscreen-search-mode"]:checked').value;
        // Sync value to main search input
        searchInput.value = cleanedInput;
        // Sync radio button selection
        document.querySelector(`input[name="search-mode"][value="${mode}"]`).checked = true;
    } else {
        rawInput = searchInput.value.trim();
        // Clean the input to remove empty lines
        const cleanedInput = cleanSearchInput(rawInput);
        searchInput.value = cleanedInput;
        searchTerms = cleanedInput
            .split("\n")
            .filter(Boolean);
        // Get selected radio button value 
        mode = document.querySelector('input[name="search-mode"]:checked').value;
        // Sync value to fullscreen search input
        fullscreenSearchInput.value = cleanedInput;
        // Sync radio button selection
        document.querySelector(`input[name="fullscreen-search-mode"][value="${mode}"]`).checked = true;
    }

    // Adjust textarea heights after cleaning
    adjustTextareaHeight(searchInput);
    adjustTextareaHeight(fullscreenSearchInput);

    if (searchTerms.length === 0) {
        // If no search terms, show all data if files uploaded
        if (uploadedFiles.length > 0) {
            showAllData();
        } else {
            alert("Please enter at least one search term");
        }
        return;
    }
    if (uploadedFiles.length === 0) {
        alert("Please upload some text files first");
        return;
    }

    // Show loading state before starting the search
    showLoadingState();

    // Use setTimeout to allow the loading state to render before the search starts
    setTimeout(() => {
        let totalResults = 0;
        resultsContainer.innerHTML = "";

        // Track which terms are found in any file
        let foundTermsGlobal = new Set();

        uploadedFiles.forEach((file) => {
            let matchingLines = [];
            if (mode === "or") {
                matchingLines = file.lines.filter((line) =>
                    searchTerms.some((term) =>
                        line.toLowerCase().includes(term.toLowerCase())
                    )
                );
            } else if (mode === "and") {
                matchingLines = file.lines.filter((line) =>
                    searchTerms.every((term) =>
                        line.toLowerCase().includes(term.toLowerCase())
                    )
                );
            } else if (mode === "not") {
                matchingLines = file.lines.filter((line) =>
                    searchTerms.every(
                        (term) => !line.toLowerCase().includes(term.toLowerCase())
                    )
                );
            }

            const fileResult = document.createElement("div");
            fileResult.className = "file-result";

            const header = document.createElement("div");
            header.className = "file-header";
            header.innerHTML = `from ${file.name}`;

            const content = document.createElement("div");
            content.className = "file-content";
            if (resultsSection.classList.contains("fullscreen")) {
                content.classList.add("fullscreen");
            }

            if (matchingLines.length > 0) {
                totalResults += matchingLines.length;
                matchingLines.forEach((line) => {
                    const entry = document.createElement("div");
                    entry.className = "file-entry";

                    // Highlight all search terms
                    let highlightedLine = line;
                    searchTerms.forEach((term) => {
                        if (term) {
                            const regex = new RegExp(
                                term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                                "gi"
                            );
                            highlightedLine = highlightedLine.replace(
                                regex,
                                (match) => `<span class="highlight">${match}</span>`
                            );
                        }
                    });

                    entry.innerHTML = highlightedLine;
                    content.appendChild(entry);
                });
            }

            // For OR mode, show "not found" for each search term not found in this file
            if (mode === "or") {
                const foundTerms = new Set();
                matchingLines.forEach((line) => {
                    searchTerms.forEach((term) => {
                        if (line.toLowerCase().includes(term.toLowerCase())) {
                            foundTerms.add(term.toLowerCase());
                            foundTermsGlobal.add(term.toLowerCase());
                        }
                    });
                });
                const notFoundTerms = searchTerms.filter(
                    (term) => !foundTerms.has(term.toLowerCase())
                );
                if (notFoundTerms.length > 0) {
                    notFoundTerms.forEach((term) => {
                        const entry = document.createElement("div");
                        entry.className = "file-entry";
                        entry.style.opacity = "0.6";
                        entry.style.fontStyle = "italic";
                        entry.innerHTML = `<span class="highlight">${term}</span> <span style="color:#ff5e62;">not found</span>`;
                        content.appendChild(entry);
                    });
                }
            }
            // For NOT mode, show "excluded" for each search term
            if (mode === "not" && searchTerms.length > 0) {
                const entry = document.createElement("div");
                entry.className = "file-entry";
                entry.style.opacity = "0.6";
                entry.style.fontStyle = "italic";
                entry.innerHTML = `<span class="highlight">${searchTerms.join(
                    ", "
                )}</span> <span style="color:#ff5e62;">excluded</span>`;
                content.appendChild(entry);
            }

            if (
                matchingLines.length > 0 ||
                (mode === "or" && content.childNodes.length > 0)
            ) {
                fileResult.appendChild(header);
                fileResult.appendChild(content);
                resultsContainer.appendChild(fileResult);
            }
        });

        // Show global not found summary at the bottom (for OR mode)
        if (mode === "or" && searchTerms.length > 0) {
            const notFoundGlobal = searchTerms.filter(
                (term) => !foundTermsGlobal.has(term.toLowerCase())
            );
            if (notFoundGlobal.length > 0) {
                const summary = document.createElement("div");
                summary.className = "empty-state";
                summary.style.marginTop = "32px";
                summary.innerHTML = `
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Not Found In Any File</h3>
                        <p>
                            ${notFoundGlobal
                                .map(
                                    (term) =>
                                        `<span class="highlight">${term}</span>`
                                )
                                .join(", ")}
                        </p>
                    `;
                resultsContainer.appendChild(summary);
            }
        }

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>No entries match your search term${
                        searchTerms.length > 1 ? "s" : ""
                    }${
            searchTerms.length ? ` "${searchTerms.join(", ")}"` : ""
        }</p>
                </div>
            `;
        }

        resultsCount.textContent = `Results: ${totalResults}`;

        // Make collapsible after rendering
        makeFileResultsCollapsible();
    }, 300); // Small delay to show loading state
}

// Show all data grouped by file
function showAllData() {
    // Show loading state before loading all data
    showLoadingState();

    // Use setTimeout to allow the loading state to render
    setTimeout(() => {
        resultsContainer.innerHTML = "";
        let totalResults = 0;
        
        uploadedFiles.forEach((file) => {
            if (file.lines.length === 0) return;
            const fileResult = document.createElement("div");
            fileResult.className = "file-result";

            const header = document.createElement("div");
            header.className = "file-header";
            header.innerHTML = `from ${file.name}`;

            const content = document.createElement("div");
            content.className = "file-content";
            if (resultsSection.classList.contains("fullscreen")) {
                content.classList.add("fullscreen");
            }

            file.lines.forEach((line) => {
                const entry = document.createElement("div");
                entry.className = "file-entry";
                entry.textContent = line;
                content.appendChild(entry);
            });

            fileResult.appendChild(header);
            fileResult.appendChild(content);
            resultsContainer.appendChild(fileResult);
            totalResults += file.lines.length;
        });

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h3>No Data</h3>
                        <p>No entries to display</p>
                    </div>
                `;
        }
        resultsCount.textContent = `Results: ${totalResults}`;

        // Make collapsible after rendering
        makeFileResultsCollapsible();
    }, 200); // Small delay to show loading state
}

// Clear all uploaded files
function clearAllFiles() {
    uploadedFiles = [];
    updateFileList();
    resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Files Uploaded</h3>
                    <p>Upload text files to begin searching</p>
                </div>
            `;
    resultsCount.textContent = "Results: 0";
    searchInput.value = "";
}

// Update empty state
function updateEmptyState() {
    if (uploadedFiles.length > 0) {
        resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Ready to Search</h3>
                        <p>Enter a search term to find matching entries</p>
                    </div>
                `;
        resultsCount.textContent = "Results: 0";
    }
}

// Initialize
updateFileList();

// Set initial heights for textareas
adjustTextareaHeight(searchInput);
adjustTextareaHeight(fullscreenSearchInput);

// Demo data for initial display
setTimeout(() => {
    if (uploadedFiles.length === 0) {
        resultsContainer.innerHTML = `
                `;
        resultsCount.textContent = "Results: 0";
    }
}, 1000);

// On page load, hide fullscreen search toggle button
fullscreenSearchToggleBtn.style.display = "none";

// Utility: Add collapse/expand to file results
function makeFileResultsCollapsible() {
    document.querySelectorAll(".file-result").forEach((fileResult) => {
        const header = fileResult.querySelector(".file-header");
        const content = fileResult.querySelector(".file-content");
        if (!header || !content) return;

        // Add collapse icon if not present
        if (!header.querySelector(".collapse-icon")) {
            const icon = document.createElement("span");
            icon.className = "collapse-icon";
            icon.innerHTML = '<i class="fas fa-chevron-down"></i>';
            header.appendChild(icon);
        }

        // Default: expanded
        header.classList.remove("collapsed");
        content.classList.remove("collapsed");

        header.onclick = function () {
            const isCollapsed = content.classList.toggle("collapsed");
            header.classList.toggle("collapsed", isCollapsed);
        };
    });
}

// Drag & Drop support for file upload area
fileUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileUploadArea.classList.add("dragover");
});
fileUploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileUploadArea.classList.remove("dragover");
});
fileUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileUploadArea.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "text/plain" || f.name.endsWith(".txt")
    );
    if (files.length === 0) {
        alert("Please drop only text files (.txt)");
        return;
    }
    // Simulate file input change event for consistency
    handleFileUpload({ target: { files } });
});
