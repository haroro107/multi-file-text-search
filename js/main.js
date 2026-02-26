let uploadedFiles = [];
let currentResultSnapshot = null;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const dom = {
    fileInput: document.getElementById("file-input"),
    uploadButton: document.getElementById("upload-button"),
    fileList: document.getElementById("file-list"),
    searchInput: document.getElementById("search-input"),
    searchButton: document.getElementById("search-btn"),
    resultsContainer: document.getElementById("results-container"),
    resultsCount: document.getElementById("results-count"),
    searchMeta: document.getElementById("search-meta"),
    clearInputBtn: document.getElementById("clear-input-btn"),
    resultsSection: document.querySelector(".results-section"),
    fullscreenBtn: document.getElementById("fullscreen-btn"),
    fullscreenSearchBar: document.getElementById("fullscreen-search-bar"),
    fullscreenSearchInput: document.getElementById("fullscreen-search-input"),
    fullscreenSearchBtn: document.getElementById("fullscreen-search-btn"),
    fullscreenSearchToggleBtn: document.getElementById(
        "fullscreen-search-toggle-btn"
    ),
    fileUploadArea: document.querySelector(".file-upload"),
    exportBtn: document.getElementById("export-btn"),
    statsFiles: document.getElementById("stats-files"),
    statsLines: document.getElementById("stats-lines"),
    caseSensitive: document.getElementById("case-sensitive"),
    wholeWord: document.getElementById("whole-word"),
    fullscreenCaseSensitive: document.getElementById(
        "fullscreen-case-sensitive"
    ),
    fullscreenWholeWord: document.getElementById("fullscreen-whole-word"),
};

function formatNumber(value) {
    return new Intl.NumberFormat().format(value);
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );
    const size = bytes / 1024 ** unitIndex;
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${
        units[unitIndex]
    }`;
}

function escapeHtml(input) {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLineBreaks(input) {
    return input.replace(/\r\n?/g, "\n");
}

function normalizeSearchInput(input) {
    return normalizeLineBreaks(input)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

function parseSearchTerms(input, caseSensitive) {
    const seen = new Set();
    const terms = [];

    normalizeLineBreaks(input)
        .split("\n")
        .forEach((term) => {
            const cleaned = term.trim();
            if (!cleaned) return;

            const key = caseSensitive ? cleaned : cleaned.toLowerCase();
            if (seen.has(key)) return;

            seen.add(key);
            terms.push(cleaned);
        });

    return terms;
}

function isTextFile(file) {
    return file.type === "text/plain" || /\.txt$/i.test(file.name);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result || "");
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsText(file);
    });
}

function buildFileRecord(file, content) {
    const normalized = normalizeLineBreaks(content);
    const rows = normalized.split("\n");
    const lines = [];

    rows.forEach((rawLine, index) => {
        if (!rawLine.trim()) return;
        lines.push({
            lineNumber: index + 1,
            raw: rawLine,
            lower: rawLine.toLowerCase(),
        });
    });

    return {
        name: file.name,
        uniqueKey: `${file.name}_${file.size}_${file.lastModified}`,
        size: file.size,
        lines,
    };
}

function getSearchMode(isFullscreen) {
    const selector = isFullscreen
        ? 'input[name="fullscreen-search-mode"]:checked'
        : 'input[name="search-mode"]:checked';
    const selected = document.querySelector(selector);
    return selected ? selected.value : "or";
}

function getSearchOptions(isFullscreen) {
    if (isFullscreen && dom.resultsSection.classList.contains("fullscreen")) {
        return {
            caseSensitive: Boolean(dom.fullscreenCaseSensitive.checked),
            wholeWord: Boolean(dom.fullscreenWholeWord.checked),
        };
    }

    return {
        caseSensitive: Boolean(dom.caseSensitive.checked),
        wholeWord: Boolean(dom.wholeWord.checked),
    };
}

function syncSearchMode(mode) {
    const mainMode = document.querySelector(
        `input[name="search-mode"][value="${mode}"]`
    );
    const fullscreenMode = document.querySelector(
        `input[name="fullscreen-search-mode"][value="${mode}"]`
    );

    if (mainMode) mainMode.checked = true;
    if (fullscreenMode) fullscreenMode.checked = true;
}

function syncSearchOptions(options) {
    dom.caseSensitive.checked = options.caseSensitive;
    dom.fullscreenCaseSensitive.checked = options.caseSensitive;
    dom.wholeWord.checked = options.wholeWord;
    dom.fullscreenWholeWord.checked = options.wholeWord;
}

function syncSearchInputs(value) {
    dom.searchInput.value = value;
    dom.fullscreenSearchInput.value = value;
    adjustTextareaHeight(dom.searchInput);
    adjustTextareaHeight(dom.fullscreenSearchInput);
}

function getActiveInputValue(isFullscreen) {
    if (isFullscreen && dom.resultsSection.classList.contains("fullscreen")) {
        return dom.fullscreenSearchInput.value;
    }
    return dom.searchInput.value;
}

function setSearchMeta(text) {
    dom.searchMeta.textContent = text;
}

function setResultsCount(value) {
    dom.resultsCount.textContent = `Results: ${formatNumber(value)}`;
}

function updateQuickStats() {
    const totalLines = uploadedFiles.reduce((sum, file) => sum + file.lines.length, 0);
    dom.statsFiles.textContent = `Files: ${formatNumber(uploadedFiles.length)}`;
    dom.statsLines.textContent = `Lines: ${formatNumber(totalLines)}`;
}

function showNoFilesState() {
    dom.resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-file-alt"></i>
            <h3>No Files Uploaded</h3>
            <p>Upload text files to begin searching</p>
        </div>
    `;
    setResultsCount(0);
    setSearchMeta("Upload files to start searching.");
    dom.exportBtn.disabled = true;
}

function showReadyState() {
    dom.resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <h3>Ready to Search</h3>
            <p>Type one or more keywords, then press Enter or click Search.</p>
        </div>
    `;
    setResultsCount(0);
    setSearchMeta("Files uploaded. Enter keyword(s) to search.");
    dom.exportBtn.disabled = true;
}

function showLoadingState() {
    dom.resultsContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <h3>Searching...</h3>
            <p>Scanning uploaded files</p>
        </div>
    `;
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 260 ? "auto" : "hidden";
}

function buildTermTokens(terms, options) {
    return terms.map((term) => {
        const escaped = escapeRegExp(term);
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;

        return {
            raw: term,
            key: options.caseSensitive ? term : term.toLowerCase(),
            compare: options.caseSensitive ? term : term.toLowerCase(),
            testRegex: options.wholeWord
                ? new RegExp(pattern, options.caseSensitive ? "u" : "iu")
                : null,
            highlightRegex: new RegExp(
                pattern,
                options.caseSensitive ? "gu" : "giu"
            ),
        };
    });
}

function lineContainsToken(line, token, options) {
    if (options.wholeWord) {
        return token.testRegex.test(line.raw);
    }

    if (options.caseSensitive) {
        return line.raw.includes(token.compare);
    }

    return line.lower.includes(token.compare);
}

function getLineHitIndexes(line, termTokens, options) {
    const hitIndexes = [];

    termTokens.forEach((token, index) => {
        if (lineContainsToken(line, token, options)) {
            hitIndexes.push(index);
        }
    });

    return hitIndexes;
}

function doesLineMatchMode(hitIndexes, termCount, mode) {
    if (mode === "or") return hitIndexes.length > 0;
    if (mode === "and") return hitIndexes.length === termCount;
    return hitIndexes.length === 0;
}

function searchFiles(termTokens, mode, options) {
    const fileResults = [];
    const foundTokenKeys = new Set();
    let totalMatches = 0;
    let scannedLines = 0;

    uploadedFiles.forEach((file) => {
        const matches = [];

        file.lines.forEach((line) => {
            scannedLines += 1;

            const hitIndexes = getLineHitIndexes(line, termTokens, options);
            const isMatch = doesLineMatchMode(hitIndexes, termTokens.length, mode);

            if (!isMatch) return;

            matches.push({
                lineNumber: line.lineNumber,
                raw: line.raw,
                hitIndexes,
            });

            if (mode === "or") {
                hitIndexes.forEach((hitIndex) => {
                    foundTokenKeys.add(termTokens[hitIndex].key);
                });
            }
        });

        if (matches.length > 0) {
            fileResults.push({
                fileName: file.name,
                matches,
            });
            totalMatches += matches.length;
        }
    });

    const missingTerms =
        mode === "or"
            ? termTokens
                  .filter((token) => !foundTokenKeys.has(token.key))
                  .map((token) => token.raw)
            : [];

    return {
        fileResults,
        totalMatches,
        scannedLines,
        missingTerms,
    };
}

function collectHighlightRanges(text, termTokens, hitIndexes) {
    const ranges = [];

    hitIndexes.forEach((hitIndex) => {
        const regex = termTokens[hitIndex].highlightRegex;
        regex.lastIndex = 0;

        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (end > start) {
                ranges.push([start, end]);
            }
            if (match.index === regex.lastIndex) {
                regex.lastIndex += 1;
            }
        }
    });

    if (ranges.length === 0) return ranges;

    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

    const merged = [ranges[0]];
    for (let index = 1; index < ranges.length; index += 1) {
        const current = ranges[index];
        const previous = merged[merged.length - 1];

        if (current[0] <= previous[1]) {
            previous[1] = Math.max(previous[1], current[1]);
            continue;
        }

        merged.push(current);
    }

    return merged;
}

function buildHighlightedHtml(text, termTokens, hitIndexes) {
    if (hitIndexes.length === 0) {
        return escapeHtml(text);
    }

    const ranges = collectHighlightRanges(text, termTokens, hitIndexes);
    if (ranges.length === 0) {
        return escapeHtml(text);
    }

    let cursor = 0;
    let html = "";

    ranges.forEach(([start, end]) => {
        html += escapeHtml(text.slice(cursor, start));
        html += `<mark class="highlight">${escapeHtml(text.slice(start, end))}</mark>`;
        cursor = end;
    });

    html += escapeHtml(text.slice(cursor));
    return html;
}

function createFileResultCard(fileResult, termTokens, mode) {
    const card = document.createElement("div");
    card.className = "file-result";

    const header = document.createElement("div");
    header.className = "file-header";

    const title = document.createElement("span");
    title.className = "file-title";
    title.textContent = fileResult.fileName;

    const matchCount = document.createElement("span");
    matchCount.className = "match-count";
    matchCount.textContent = `${formatNumber(fileResult.matches.length)} match${
        fileResult.matches.length > 1 ? "es" : ""
    }`;

    const collapseIcon = document.createElement("span");
    collapseIcon.className = "collapse-icon";
    collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';

    header.appendChild(title);
    header.appendChild(matchCount);
    header.appendChild(collapseIcon);

    const content = document.createElement("div");
    content.className = "file-content";
    if (dom.resultsSection.classList.contains("fullscreen")) {
        content.classList.add("fullscreen");
    }

    fileResult.matches.forEach((match) => {
        const entry = document.createElement("div");
        entry.className = "file-entry";

        const lineNumber = document.createElement("span");
        lineNumber.className = "entry-line";
        lineNumber.textContent = `L${match.lineNumber}`;

        const lineText = document.createElement("span");
        lineText.className = "entry-text";

        if (mode === "not") {
            lineText.textContent = match.raw;
        } else {
            lineText.innerHTML = buildHighlightedHtml(
                match.raw,
                termTokens,
                match.hitIndexes
            );
        }

        entry.appendChild(lineNumber);
        entry.appendChild(lineText);
        content.appendChild(entry);
    });

    header.addEventListener("click", () => {
        const collapsed = content.classList.toggle("collapsed");
        header.classList.toggle("collapsed", collapsed);
    });

    card.appendChild(header);
    card.appendChild(content);
    return card;
}

function renderMissingSummary(missingTerms) {
    const wrapper = document.createElement("div");
    wrapper.className = "missing-summary";

    const prefix = document.createElement("span");
    prefix.textContent = "Not found in any file:";
    wrapper.appendChild(prefix);

    missingTerms.forEach((term) => {
        const chip = document.createElement("span");
        chip.className = "missing-term";
        chip.textContent = term;
        wrapper.appendChild(chip);
    });

    return wrapper;
}

function renderNoResults(terms) {
    const suffix = terms.length ? `for "${terms.join(", ")}"` : "";
    dom.resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <h3>No Results Found</h3>
            <p>No matching entries ${suffix}</p>
        </div>
    `;
}

function renderSearchResults(outcome, termTokens, mode, options, runtimeMs) {
    dom.resultsContainer.innerHTML = "";

    if (outcome.totalMatches === 0) {
        renderNoResults(termTokens.map((token) => token.raw));
    } else {
        const fragment = document.createDocumentFragment();

        outcome.fileResults.forEach((fileResult) => {
            fragment.appendChild(createFileResultCard(fileResult, termTokens, mode));
        });

        dom.resultsContainer.appendChild(fragment);
    }

    if (outcome.missingTerms.length > 0) {
        dom.resultsContainer.appendChild(renderMissingSummary(outcome.missingTerms));
    }

    setResultsCount(outcome.totalMatches);
    setSearchMeta(
        `Scanned ${formatNumber(outcome.scannedLines)} lines in ${runtimeMs.toFixed(
            1
        )} ms`
    );

    currentResultSnapshot = {
        type: "search",
        mode,
        options,
        terms: termTokens.map((token) => token.raw),
        totalMatches: outcome.totalMatches,
        fileResults: outcome.fileResults,
    };

    dom.exportBtn.disabled = outcome.totalMatches === 0;
}

function showAllData() {
    if (uploadedFiles.length === 0) {
        showNoFilesState();
        return;
    }

    showLoadingState();

    requestAnimationFrame(() => {
        dom.resultsContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();
        let totalLines = 0;

        const snapshotFileResults = [];

        uploadedFiles.forEach((file) => {
            if (file.lines.length === 0) return;

            const fileResult = {
                fileName: file.name,
                matches: file.lines.map((line) => ({
                    lineNumber: line.lineNumber,
                    raw: line.raw,
                    hitIndexes: [],
                })),
            };

            snapshotFileResults.push(fileResult);
            totalLines += fileResult.matches.length;

            fragment.appendChild(createFileResultCard(fileResult, [], "not"));
        });

        if (totalLines === 0) {
            dom.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Data</h3>
                    <p>Uploaded files contain no searchable lines.</p>
                </div>
            `;
            setResultsCount(0);
            setSearchMeta("No searchable lines found in uploaded files.");
            dom.exportBtn.disabled = true;
            return;
        }

        dom.resultsContainer.appendChild(fragment);
        setResultsCount(totalLines);
        setSearchMeta("Showing all uploaded lines (no active keyword filter).");

        currentResultSnapshot = {
            type: "all",
            mode: "all",
            options: {
                caseSensitive: false,
                wholeWord: false,
            },
            terms: [],
            totalMatches: totalLines,
            fileResults: snapshotFileResults,
        };

        dom.exportBtn.disabled = false;
    });
}

function performSearch(isFullscreen = false) {
    if (uploadedFiles.length === 0) {
        alert("Please upload text files first");
        showNoFilesState();
        return;
    }

    const mode = getSearchMode(isFullscreen);
    const options = getSearchOptions(isFullscreen);

    syncSearchMode(mode);
    syncSearchOptions(options);

    const cleanedInput = normalizeSearchInput(getActiveInputValue(isFullscreen));
    const terms = parseSearchTerms(cleanedInput, options.caseSensitive);
    const normalizedInput = terms.join("\n");

    syncSearchInputs(normalizedInput);

    if (terms.length === 0) {
        showAllData();
        return;
    }

    showLoadingState();

    requestAnimationFrame(() => {
        const startTime = performance.now();
        const termTokens = buildTermTokens(terms, options);
        const outcome = searchFiles(termTokens, mode, options);
        const runtimeMs = performance.now() - startTime;

        renderSearchResults(outcome, termTokens, mode, options, runtimeMs);
    });
}

function updateFileList() {
    dom.fileList.innerHTML = "";

    if (uploadedFiles.length === 0) {
        const text = document.createElement("p");
        text.className = "file-item-detail";
        text.textContent = "No files uploaded yet";
        dom.fileList.appendChild(text);
        return;
    }

    const header = document.createElement("div");
    header.className = "file-list-header";

    const title = document.createElement("span");
    title.textContent = `Uploaded files (${formatNumber(uploadedFiles.length)})`;

    const clearButton = document.createElement("button");
    clearButton.className = "clear-files-btn";
    clearButton.type = "button";
    clearButton.textContent = "Clear All";
    clearButton.addEventListener("click", clearAllFiles);

    header.appendChild(title);
    header.appendChild(clearButton);
    dom.fileList.appendChild(header);

    uploadedFiles.forEach((file) => {
        const item = document.createElement("div");
        item.className = "file-item";

        const metadata = document.createElement("div");
        metadata.className = "file-item-meta";

        const fileName = document.createElement("div");
        fileName.className = "file-item-name";
        fileName.textContent = file.name;

        const fileDetail = document.createElement("div");
        fileDetail.className = "file-item-detail";
        fileDetail.textContent = `${formatNumber(file.lines.length)} lines • ${formatBytes(
            file.size
        )}`;

        metadata.appendChild(fileName);
        metadata.appendChild(fileDetail);

        const removeButton = document.createElement("button");
        removeButton.className = "remove-file-btn";
        removeButton.type = "button";
        removeButton.title = `Remove ${file.name}`;
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.addEventListener("click", () => {
            uploadedFiles = uploadedFiles.filter((entry) => entry.uniqueKey !== file.uniqueKey);
            updateFileList();
            updateQuickStats();

            if (uploadedFiles.length === 0) {
                syncSearchInputs("");
                showNoFilesState();
                return;
            }

            if (!dom.searchInput.value.trim()) {
                showAllData();
                return;
            }

            performSearch(false);
        });

        item.appendChild(metadata);
        item.appendChild(removeButton);
        dom.fileList.appendChild(item);
    });
}

function clearAllFiles() {
    uploadedFiles = [];
    updateFileList();
    updateQuickStats();
    syncSearchInputs("");
    showNoFilesState();
}

async function handleFileUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles = [];
    const warnings = [];

    selectedFiles.forEach((file) => {
        if (!isTextFile(file)) {
            warnings.push(`${file.name} skipped (only .txt is allowed)`);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            warnings.push(`${file.name} skipped (max size is 10 MB)`);
            return;
        }

        validFiles.push(file);
    });

    if (validFiles.length === 0) {
        if (warnings.length > 0) {
            alert(warnings.join("\n"));
        }
        dom.fileInput.value = "";
        return;
    }

    const readResults = await Promise.all(
        validFiles.map(async (file) => {
            const content = await readFileAsText(file);
            return { file, content };
        })
    );

    let addedCount = 0;
    let duplicateCount = 0;

    readResults.forEach(({ file, content }) => {
        const record = buildFileRecord(file, content);
        const exists = uploadedFiles.some(
            (uploadedFile) => uploadedFile.uniqueKey === record.uniqueKey
        );

        if (exists) {
            duplicateCount += 1;
            return;
        }

        uploadedFiles.push(record);
        addedCount += 1;
    });

    updateFileList();
    updateQuickStats();

    if (warnings.length > 0 || duplicateCount > 0) {
        const notices = [...warnings];
        if (duplicateCount > 0) {
            notices.push(`${duplicateCount} duplicate file skipped`);
        }
        setSearchMeta(notices.join(" • "));
    }

    if (addedCount > 0) {
        if (dom.searchInput.value.trim()) {
            performSearch(false);
        } else {
            showAllData();
        }
    }

    dom.fileInput.value = "";
}

function handleSearchEnter(event, isFullscreen) {
    if (event.key !== "Enter") return;

    if (event.shiftKey) {
        setTimeout(() => {
            adjustTextareaHeight(isFullscreen ? dom.fullscreenSearchInput : dom.searchInput);
        }, 0);
        return;
    }

    event.preventDefault();
    performSearch(isFullscreen);
}

function exportCurrentResults() {
    if (!currentResultSnapshot || currentResultSnapshot.totalMatches === 0) {
        alert("No results available to export");
        return;
    }

    const lines = [];
    lines.push("Multi-File Text Search Export");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Total Results: ${currentResultSnapshot.totalMatches}`);

    if (currentResultSnapshot.type === "search") {
        lines.push(`Mode: ${currentResultSnapshot.mode.toUpperCase()}`);
        lines.push(
            `Options: caseSensitive=${currentResultSnapshot.options.caseSensitive}, wholeWord=${currentResultSnapshot.options.wholeWord}`
        );
        lines.push(
            `Terms: ${
                currentResultSnapshot.terms.length > 0
                    ? currentResultSnapshot.terms.join(" | ")
                    : "-"
            }`
        );
    } else {
        lines.push("Mode: SHOW_ALL");
    }

    lines.push("");

    currentResultSnapshot.fileResults.forEach((fileResult) => {
        lines.push(`=== ${fileResult.fileName} (${fileResult.matches.length}) ===`);
        fileResult.matches.forEach((match) => {
            lines.push(`[L${match.lineNumber}] ${match.raw}`);
        });
        lines.push("");
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date()
        .toISOString()
        .replace(/[:]/g, "-")
        .replace(/\..+$/, "");

    anchor.href = url;
    anchor.download = `search-results-${timestamp}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function toggleFullscreen() {
    dom.resultsSection.classList.toggle("fullscreen");
    const isFullscreen = dom.resultsSection.classList.contains("fullscreen");

    if (isFullscreen) {
        dom.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Full Screen';
        dom.fullscreenSearchToggleBtn.style.display = "inline-flex";
        return;
    }

    dom.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Full Screen';
    dom.fullscreenSearchToggleBtn.style.display = "none";
    dom.fullscreenSearchBar.classList.remove("visible");
}

function setupEventListeners() {
    dom.uploadButton.addEventListener("click", () => dom.fileInput.click());
    dom.fileInput.addEventListener("change", handleFileUpload);

    dom.searchButton.addEventListener("click", () => performSearch(false));
    dom.fullscreenSearchBtn.addEventListener("click", () => performSearch(true));

    dom.clearInputBtn.addEventListener("click", () => {
        syncSearchInputs("");

        if (uploadedFiles.length === 0) {
            showNoFilesState();
            return;
        }

        showAllData();
    });

    dom.fullscreenBtn.addEventListener("click", toggleFullscreen);

    dom.fullscreenSearchToggleBtn.addEventListener("click", () => {
        dom.fullscreenSearchBar.classList.toggle("visible");
        if (dom.fullscreenSearchBar.classList.contains("visible")) {
            dom.fullscreenSearchInput.focus();
        }
    });

    dom.searchInput.addEventListener("input", () => adjustTextareaHeight(dom.searchInput));
    dom.fullscreenSearchInput.addEventListener("input", () =>
        adjustTextareaHeight(dom.fullscreenSearchInput)
    );

    dom.searchInput.addEventListener("keydown", (event) =>
        handleSearchEnter(event, false)
    );
    dom.fullscreenSearchInput.addEventListener("keydown", (event) =>
        handleSearchEnter(event, true)
    );

    document.querySelectorAll('input[name="search-mode"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            syncSearchMode(radio.value);
            if (uploadedFiles.length > 0 && dom.searchInput.value.trim()) {
                performSearch(false);
            }
        });
    });

    document
        .querySelectorAll('input[name="fullscreen-search-mode"]')
        .forEach((radio) => {
            radio.addEventListener("change", () => {
                syncSearchMode(radio.value);
                if (uploadedFiles.length > 0 && dom.searchInput.value.trim()) {
                    performSearch(true);
                }
            });
        });

    const onOptionChange = (source) => {
        const options = getSearchOptions(source === "fullscreen");
        syncSearchOptions(options);

        if (uploadedFiles.length > 0 && dom.searchInput.value.trim()) {
            performSearch(source === "fullscreen");
        }
    };

    dom.caseSensitive.addEventListener("change", () => onOptionChange("main"));
    dom.wholeWord.addEventListener("change", () => onOptionChange("main"));
    dom.fullscreenCaseSensitive.addEventListener("change", () =>
        onOptionChange("fullscreen")
    );
    dom.fullscreenWholeWord.addEventListener("change", () =>
        onOptionChange("fullscreen")
    );

    dom.exportBtn.addEventListener("click", exportCurrentResults);

    dom.fileUploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dom.fileUploadArea.classList.add("dragover");
    });

    dom.fileUploadArea.addEventListener("dragleave", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dom.fileUploadArea.classList.remove("dragover");
    });

    dom.fileUploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dom.fileUploadArea.classList.remove("dragover");

        const files = Array.from(event.dataTransfer.files || []).filter((file) =>
            isTextFile(file)
        );

        if (files.length === 0) {
            alert("Please drop .txt files only");
            return;
        }

        handleFileUpload({ target: { files } });
    });

    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            dom.searchInput.focus();
        }
    });
}

function initialize() {
    setupEventListeners();
    updateFileList();
    updateQuickStats();
    adjustTextareaHeight(dom.searchInput);
    adjustTextareaHeight(dom.fullscreenSearchInput);
    dom.fullscreenSearchToggleBtn.style.display = "none";
    showNoFilesState();
}

initialize();