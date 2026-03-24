// ── Firebase Configuration ────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDiVDXFxvzX6EuXfkCCpCpJwbm9OJxs5CQ",
    authDomain: "audiobook-creator-33917.firebaseapp.com",
    projectId: "audiobook-creator-33917",
    storageBucket: "audiobook-creator-33917.firebasestorage.app",
    messagingSenderId: "106294143966",
    appId: "1:106294143966:web:75b82a3783cd4bdaa70b4f"
};
if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
}
const db = window.firebase.firestore();

// ── User Profiles ─────────────────────────────────────────────────────────────
// Credentials and API keys per user. Library storage is managed in Firestore.
const USERS = [
    {
        id: 'cameron',
        name: 'Cameron',
        email: 'cameronjameslilley@outlook.com',
        password: 'wereadbooks',
        geminiKey: 'AIzaSyC2lnOg7DR1-4NoryJqRgbk4JOxN6nytw8',
        openAiKey: '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'
    },
    {
        id: 'jaz',
        name: 'Jaz',
        email: 'jazmanson@bigpond.com',
        password: 'wereadbooks',
        geminiKey: 'AIzaSyC2lnOg7DR1-4NoryJqRgbk4JOxN6nytw8',
        openAiKey: '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'
    },
    {
        id: 'shells',
        name: 'Shells',
        email: 'fromshells@yahoo.com.au',
        password: 'wereadbooks',
        geminiKey: 'AIzaSyC2lnOg7DR1-4NoryJqRgbk4JOxN6nytw8',
        openAiKey: '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'
    }
];

const app = {
    pages: [],
    currentPageIndex: 0,
    currentPlaybackId: 0,
    currentChunkIndex: 0,
    currentNodes: [],
    audio: new Audio(),
    isPlaying: false,
    
    currentFileBase64: null,
    currentFileMime: null,
    currentUser: null,
    unsubFirestore: null,
    cloudLibraryCache: [],

    // ── Auth ───────────────────────────────────────────────────────────────────

    checkSession() {
        const saved = sessionStorage.getItem('abc_session');
        if (saved) {
            try {
                const user = JSON.parse(saved);
                // Validate the user still exists in USERS
                if (USERS.find(u => u.id === user.id)) {
                    this.currentUser = user;
                    this.startApp();
                    return;
                }
            } catch(e) {}
        }
        // No session — show login screen
        lucide.createIcons();
    },

    login() {
        const email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginError');

        const user = USERS.find(u => u.email.toLowerCase() === email && u.password === password);
        if (!user) {
            errEl.textContent = 'Incorrect email or password. Please try again.';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            return;
        }

        errEl.textContent = '';
        this.currentUser = user;
        sessionStorage.setItem('abc_session', JSON.stringify({ id: user.id, name: user.name, email: user.email }));

        // Migrate legacy unnamespaced library to Cameron's profile (one-time)
        if (user.id === 'cameron') {
            const legacy = localStorage.getItem('audiobook_library');
            if (legacy && !localStorage.getItem('legacy_migrated_cameron')) {
                const legacyLibrary = JSON.parse(legacy);
                if (legacyLibrary.length > 0) {
                    legacyLibrary.forEach(b => {
                        db.collection("users").doc(user.id).collection("books").doc(b.id || `legacy_${Date.now()}_${Math.random()}`).set({
                            title: b.title,
                            date: b.date,
                            pages: b.pages,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    });
                }
                localStorage.setItem('legacy_migrated_cameron', 'true');
                console.log('[Auth] Migrated legacy local library to Cameron cloud profile.');
            }
        }

        this.startApp();
    },

    logout() {
        if (this.unsubFirestore) {
            this.unsubFirestore();
            this.unsubFirestore = null;
        }
        this.cloudLibraryCache = [];
        
        sessionStorage.removeItem('abc_session');
        this.currentUser = null;
        this.pages = [];
        this.stopAudio();
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').textContent = '';
        lucide.createIcons();
    },

    startApp() {
        // Populate API keys from user profile
        document.getElementById('geminiKey').value = this.currentUser.geminiKey || '';
        document.getElementById('openAiKey').value = this.currentUser.openAiKey || '';

        // Update user profile bar
        document.getElementById('userDisplayName').textContent = this.currentUser.name;
        document.getElementById('userDisplayEmail').textContent = this.currentUser.email;
        document.getElementById('userAvatar').textContent = this.currentUser.name.charAt(0).toUpperCase();

        // Show app, hide login
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('app').style.display = 'grid';

        this.setupEventListeners();
        lucide.createIcons();
        this.changeTheme(document.getElementById('themeChoice').value);
        this.changeFont(document.getElementById('fontChoice').value);
        this.setupFirestoreListener();
    },

    init() {
        lucide.createIcons();
        this.checkSession();
    },

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = "var(--accent-app)"; });
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = "");
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "";
            if (e.dataTransfer.files.length) this.handleFileUpload(e.dataTransfer.files[0]);
        });

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFileUpload(e.target.files[0]);
            fileInput.value = ''; // Reset so the same file can be re-selected if needed
        });
    },

    logActivity(msg, isError = false) {
        const log = document.getElementById('activityLog');
        log.style.display = 'block';
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        const color = isError ? '#ff4444' : 'var(--text-app-muted)';
        log.innerHTML += `<div style="color: ${color}; margin-bottom: 2px;">[${time}] ${msg}</div>`;
        log.scrollTop = log.scrollHeight;
    },

    async handleFileUpload(file) {
        // Fallback for missing MIME types on Windows
        let type = file.type;
        if (!type || file.name.toLowerCase().endsWith('.md')) { // Force .md checks physically
            if (file.name.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
            else if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) type = 'text/plain';
            else if (file.name.toLowerCase().endsWith('.png')) type = 'image/png';
            else type = 'application/octet-stream';
        }
        
        document.getElementById('uploadStatus').innerHTML = "File loaded: <strong>" + file.name + "</strong>";
        
        if (type === 'text/plain' || type === 'text/markdown') {
            const reader = new FileReader();
            reader.onload = () => {
                document.getElementById('rawTextInput').value = reader.result;
                this.currentFileBase64 = null;
                this.currentFileMime = null;
                this.logActivity(`Successfully loaded text document (${file.name}) into staging buffer.`);
            };
            reader.readAsText(file, 'UTF-8'); // Force UTF-8 to handle UTF-16 encoded .md files
        } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
            // .docx: send as binary to Gemini (it can natively read Word documents)
            const reader = new FileReader();
            reader.onload = () => {
                this.currentFileBase64 = reader.result.split(',')[1];
                this.currentFileMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                this.logActivity(`Word document (${file.name}) loaded for binary transfer to Gemini.`);
            };
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                this.currentFileBase64 = reader.result.split(',')[1];
                this.currentFileMime = type;
                this.logActivity(`Successfully attached binary asset (${file.name}).`);
            };
            reader.readAsDataURL(file);
        }
    },

    // Recursively attempts an API call. On failure, splits the text in half and retries each half.
    // depth=0 = full chunk, depth=1 = half, depth=2 = quarter. Below that, log and give up.
    async callGeminiWithRetry(model, buildPromptFn, text, depth = 0) {
        const MAX_DEPTH = 2; // Will try: full → halves → quarters
        const results = [];

        // Attempt the API call up to 3 times
        let responseText = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const prompt = buildPromptFn(text);
                const response = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 32768 }
                });
                responseText = response.response.text() || '';
                break;
            } catch (err) {
                this.logActivity(`API attempt ${attempt}/3 failed${depth > 0 ? ' (sub-chunk)' : ''}. ${attempt < 3 ? `Retrying in ${attempt * 3}s...` : ''}`, true);
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
            }
        }

        if (responseText !== null) {
            // Success — parse and return slides
            results.push(...this.parseAIResponse(responseText));
        } else if (depth < MAX_DEPTH) {
            // All 3 attempts failed — split in half and try each half independently
            this.logActivity(`Splitting failed chunk into halves and retrying (depth ${depth + 1})...`, true);
            const mid = text.lastIndexOf('\n\n', Math.floor(text.length / 2));
            const splitPoint = mid > 200 ? mid : Math.floor(text.length / 2);
            const firstHalf = text.slice(0, splitPoint);
            const secondHalf = text.slice(splitPoint);
            if (firstHalf.trim()) results.push(...await this.callGeminiWithRetry(model, buildPromptFn, firstHalf, depth + 1));
            if (secondHalf.trim()) results.push(...await this.callGeminiWithRetry(model, buildPromptFn, secondHalf, depth + 1));
        } else {
            this.logActivity(`⚠️ Sub-chunk failed after maximum retries — this small section of content could not be processed.`, true);
        }

        return results;
    },

    async processWithGemini() {
        const apiKey = document.getElementById('geminiKey').value;
        if (!apiKey) return alert("Gemini API Key is missing.");
        
        const rawText = document.getElementById('rawTextInput').value.trim();
        if (!this.currentFileBase64 && !rawText) return alert("Please drop a document or paste raw text first.");

        document.getElementById('activityLog').innerHTML = '';
        this.logActivity("Initializing AI parsing engine...");
        this.showLoading("Transmitting to AI. Analyzing document structure...");

        try {
            // Dynamically import the stable Gemini SDK from ESM Run
            const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
            
            const userDensity = document.getElementById('densityChoice').value || 'moderate';
            const prompt = `
            You are a hyper-accurate AI Document Parser. Your sole objective is to extract EVERY SINGLE ITEM (e.g., every individual spell, rule, or chapter) from the attached source document. YOU MUST NOT SUMMARIZE. YOU MUST NOT SKIP ANYTHING.

            FORMAT TEMPLATE (Strictly use for each and every item):
            <PAGE_BREAK>
            TITLE: [Main Heading or Spell Name]
            META: [Subtitle or Source Level]
            STATS: { "Key": "Value" }
            FOOTER: [Page number or footnote]
            CONTENT:
            <p>[Full textual properties perfectly preserved in HTML]</p>

            DENSITY RULE: ${userDensity.toUpperCase()}
            ${userDensity === 'sparse' ? '- SPARSE: Extract EXACTLY ONE spell/item per <PAGE_BREAK>. If there are 50 spells in the document, you MUST output 50 separate <PAGE_BREAK> template blocks sequentially.' : ''}
            ${userDensity === 'moderate' ? '- MODERATE: Group logically related paragraphs or items into readable sections.' : ''}
            ${userDensity === 'dense' ? '- DENSE: Combine as much text as logically possible into long continuous pages sections.' : ''}

            - Put mechanics/stats (Casting Time, Range, Classes, etc.) strictly into the flat STATS JSON object. Ensure no nested arrays.
            - Ensure ALL informative text is captured. Never use phrases like "rest of the spell description".
            
            CRITICAL COMPLETION RULE:
            When you have successfully extracted the VERY LAST item in the entire source document, you MUST output the exact string <END_OF_DOCUMENT> on a new line. Do NOT output this string if there is more text remaining in the document to process.
            
            RAW TEXT:
            ${rawText}
            `;

            let fullSourceText = rawText;
            let useBinaryTransfer = false;
            
            if ((this.currentFileMime === 'application/pdf' || 
                 this.currentFileMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') 
                && this.currentFileBase64) {
                this.logActivity("Pre-processing PDF file locally to prevent Google server 503 Overloads...");
                try {
                    const pdfData = atob(this.currentFileBase64);
                    const uint8Array = new Uint8Array(pdfData.length);
                    for (let i = 0; i < pdfData.length; i++) { uint8Array[i] = pdfData.charCodeAt(i); }
                    
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    if (pdfjsLib) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            fullSourceText += content.items.map(s => s.str).join(' ') + "\\n";
                        }
                        this.logActivity(`Local text extraction complete. Total string length: ${fullSourceText.length}`);
                    } else { throw new Error("PDF Library not loaded."); }
                } catch(e) {
                    this.logActivity("Local parsing bypassed. Activating direct binary transfer fallback...");
                    useBinaryTransfer = true;
                }
            }

            let textChunks = [];
            if (!useBinaryTransfer && fullSourceText.length > 0) {
                let i = 0;
                while (i < fullSourceText.length) {
                    let end = Math.min(i + 12000, fullSourceText.length);
                    if (end < fullSourceText.length) {
                        let lastNewline = fullSourceText.lastIndexOf('\n\n', end);
                        if (lastNewline > i + 4000) end = lastNewline; 
                        else {
                            lastNewline = fullSourceText.lastIndexOf('\n', end);
                            if (lastNewline > i + 4000) end = lastNewline;
                        }
                    }
                    textChunks.push(fullSourceText.substring(i, end));
                    i = end;
                }
            } else if (useBinaryTransfer) {
                textChunks = ["<BINARY_TRANSFER>"];
            } else {
                this.hideLoading();
                return this.logActivity("No valid text or document provided.", true);
            }
            
            this.logActivity(`Execution Pipeline configured for ${textChunks.length} blocks. Beginning transmission...`);
            this.pages = [];

            for (let chunkIdx = 0; chunkIdx < textChunks.length; chunkIdx++) {
                // Update loading overlay with live progress from the very first block
                const progressPct = Math.round(((chunkIdx) / textChunks.length) * 100);
                document.getElementById('loadingText').textContent = `Processing block ${chunkIdx + 1} of ${textChunks.length} (${progressPct}%)...`;
                this.logActivity(`Transmitting Block ${chunkIdx + 1} of ${textChunks.length} to AI...`);
                
                const isSparse = userDensity === 'sparse';
                
                
                // ── SPARSE SPELL PROMPT (fully isolated — changes here ONLY affect sparse/spell mode) ──
                const buildSparsePromptFn = (textBlock) => `
You are a hyper-accurate D&D Spell & Item Extractor. Extract EVERY spell or item from the text below.
Output EXACTLY ONE <PAGE_BREAK> block per spell or item. NEVER combine two spells. NEVER skip a spell.

FORMAT TEMPLATE — use for every single spell or item:
<PAGE_BREAK>
TITLE: [Spell or Item Name only — e.g. "Goodberry"]
META: [Level + School — e.g. "Level 1 — Transmutation" or "Cantrip — Evocation"]
STATS: { "Casting Time": "...", "Range": "...", "Components": "...", "Duration": "...", "Classes": "...", "Sourcebook": "..." }
FOOTER:
CONTENT:
<p>[Full spell description word for word. Formatting rules:
  - Wrap "At Higher Levels." and similar section headers in <strong> tags
  - Bold dice rolls like <strong>4d6</strong>, <strong>1d10</strong>
  - Bold ability score names: <strong>Strength</strong>, <strong>Dexterity</strong>, <strong>Constitution</strong>, <strong>Intelligence</strong>, <strong>Wisdom</strong>, <strong>Charisma</strong>
  - Bold distances: <strong>30 feet</strong>, <strong>5-foot</strong>, etc.
  - Bold level references: <strong>2nd level</strong>, <strong>5th level</strong>, etc.
  - Do not summarize or omit anything.]</p>

STATS RULES:
- Extract ALL fields present: Casting Time, Range, Components (include material in parentheses), Duration, Classes, Sourcebook.
- STATS must be a flat JSON object — no nested arrays or objects.
- If multiple sourcebooks appear, join them: "Player's Handbook, Xanathar's Guide to Everything".
- For "Classes": if not stated explicitly, use your D&D 5e knowledge to provide the correct class list (e.g. "Druid" for Goodberry, "Cleric, Druid" for Cure Wounds). Always include this field.
- For "Sourcebook": if not stated explicitly, use your D&D 5e knowledge to name the primary sourcebook (e.g. "Player's Handbook"). Always include this field.
- NEVER put stat lines (Casting Time, Range etc.) inside the CONTENT block — ONLY in STATS.
- NEVER include the word CONTENT in the FOOTER field.

RAW TEXT BLOCK:
${textBlock}
`;

                // ── MODERATE / DENSE PROMPT (untouched — do NOT modify for spell fixes) ──
                const contextTail = chunkIdx > 0 
                    ? `CONTEXT FROM PREVIOUS BLOCK (for reference only — do NOT re-output this content):\n...${textChunks[chunkIdx - 1].slice(-800)}\n--- END OF PREVIOUS BLOCK CONTEXT ---\n\n`
                    : '';
                
                const buildModeratePromptFn = (textBlock) => `
                You are a hyper-accurate AI Document Parser. Your sole objective is to extract EVERY SINGLE piece of content from the raw text block below. YOU MUST NOT SUMMARIZE. YOU MUST NOT SKIP ANYTHING. YOU MUST NOT TRUNCATE.
                If there is a CONTEXT FROM PREVIOUS BLOCK section above the RAW CONTENT BLOCK, use it only to understand where the previous block ended. Do NOT re-output that context — only process the RAW CONTENT BLOCK below.

                FORMAT TEMPLATE (use for each logical section):
                <PAGE_BREAK>
                TITLE: [The single primary chapter/section heading — e.g. "Chapter 1: A Friend in Need"]
                META: [ONLY a genuine subtitle if one exists in the source — e.g. a subsection name or book source. If no real subtitle exists, write N/A. NEVER put page numbers, footnotes or footer text here.]
                FOOTER: [Page number ONLY — a bare number like "42". If unknown, leave blank.]
                CONTENT:
                [Full text content in rich HTML. Rules:
                  - Wrap every paragraph in <p> tags
                  - Convert subheadings (bold lines, titled subsections) into <h3> or <h4> tags
                  - Wrap important terms, mechanics, proper nouns in <strong> tags
                  - Italicised source text should use <em> tags
                  - Lists should use <ul><li> or <ol><li> tags
                  - Do NOT summarize or skip. Reproduce the text faithfully and completely.]

                DENSITY RULE: ${userDensity.toUpperCase()}
                ${userDensity === 'moderate' ? '- MODERATE: Each <PAGE_BREAK> block MUST contain substantial content — aim for 500-800+ words. Include multiple paragraphs, subsections and lists. NEVER break for a single short paragraph or heading. Only start a new block when the topic significantly shifts. Keep slides consistently full.' : ''}
                ${userDensity === 'dense' ? '- DENSE: Combine as much text as logically possible into long continuous chapter blocks per <PAGE_BREAK>.' : ''}
                
                - TRANSLATE MARKDOWN TABLES: Convert any | Column | style tables into proper HTML <table><thead><tr><th>... elements.
                - DESTROY ALL IMAGES: Strip and delete ALL image references (<img>, ![]()). Do NOT output broken image placeholders.
                
                RAW CONTENT BLOCK:
                ${contextTail}${textBlock}
                `;

                // Choose the right prompt based on density — sparse and moderate/dense are fully independent
                const buildPromptFn = isSparse ? buildSparsePromptFn : buildModeratePromptFn;

                // Use the recursive split-and-retry helper — guarantees near-zero content loss
                try {
                    const parsedBatch = await this.callGeminiWithRetry(model, buildPromptFn, textChunks[chunkIdx]);
                    if (parsedBatch.length > 0) {
                        const prevTotal = this.pages.length;
                        this.pages.push(...parsedBatch);
                        this.logActivity(`Streamed ${parsedBatch.length} slides (total: ${this.pages.length}).`);
                        document.getElementById('pageCountBadge').textContent = this.pages.length + " Pages";
                        
                        if (prevTotal < 5 && this.pages.length >= 5) {
                            this.hideLoading();
                            this.currentPageIndex = 0;
                            this.updateReaderStage();
                        } else if (prevTotal === 0 && this.pages.length > 0 && this.pages.length < 5) {
                            document.getElementById('pageCountBadge').textContent = this.pages.length + " Pages (loading...)";
                        }
                    }
                    const progress = Math.round(((chunkIdx + 1) / textChunks.length) * 100);
                    document.getElementById('loadingText').textContent = `Processing block ${chunkIdx + 1} of ${textChunks.length} (${progress}%)...`;
                    document.querySelector('.btn-magic').innerHTML = `<i data-lucide="loader"></i> Processing (${chunkIdx + 1}/${textChunks.length} — ${progress}%)`;
                    lucide.createIcons();
                } catch(chunkErr) {
                    this.logActivity(`Unexpected error on chunk ${chunkIdx + 1}: ${chunkErr.message}`, true);
                }
            }
            
            document.querySelector('.btn-magic').innerHTML = `<i data-lucide="sparkles"></i> Auto-Format & Parse`;
            lucide.createIcons();
            
            this.logActivity(`All ${textChunks.length} blocks resolved. Book fully generated!`);
            if (this.pages.length === 0) throw new Error("Could not detect any valid <PAGE_BREAK> blocks in AI response.");
            
            // Safety: if short doc never crossed 5-slide threshold, show reader now
            if (this.pages.length > 0 && document.getElementById('readerContent').querySelector('.page-block') === null) {
                this.currentPageIndex = 0;
                this.updateReaderStage();
            }
            document.getElementById('pageCountBadge').textContent = this.pages.length + " Pages";
            
        } catch (err) {
            console.error(err);
            this.logActivity("Process terminated due to error: " + err.message, true);
            alert("Parsing Failed: Make sure the document is valid text and API key is active. Error: " + err.message);
        } finally {
            this.hideLoading();
        }
    },

    changeTheme(val) {
        document.body.classList.remove('theme-modern', 'theme-fantasy', 'theme-scifi', 'theme-academia');
        document.body.classList.add('theme-' + val);
        const labels = { modern: 'Modern Theme', fantasy: 'Fantasy Parchment', scifi: 'Sci-Fi Holo', academia: 'Dark Academia' };
        document.getElementById('activeThemeBadge').textContent = labels[val] || val;
    },

    changeFont(val) {
        document.body.classList.remove('font-sans', 'font-serif', 'font-cinzel', 'font-merriweather', 'font-mono', 'font-handwriting');
        document.body.classList.add('font-' + val);
    },

    changeSize(val) {
        document.body.classList.remove('size-small', 'size-medium', 'size-large');
        document.body.classList.add('size-' + val);
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.toggle-btn[data-val="${val}"]`).classList.add('active');
    },

    showLoading(msg) {
        document.getElementById('loadingText').textContent = msg;
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    renderPageHTML(page) {
        let statsHtml = '';
        let classesVal = '';
        let sourcebookVal = '';
        
        if (page.stats && Object.keys(page.stats).length > 0) {
            // Extract Classes and Sourcebook — render below content, not in the box
            classesVal = page.stats['Classes'] || page.stats['classes'] || '';
            sourcebookVal = page.stats['Sourcebook'] || page.stats['sourcebook'] || '';
            
            // Only render mechanical stats in the box
            const skipKeys = new Set(['classes', 'sourcebook']);
            const mechanicEntries = Object.entries(page.stats).filter(([k]) => !skipKeys.has(k.toLowerCase()));
            
            if (mechanicEntries.length > 0) {
                statsHtml = `<div class="page-stats" style="max-width: 55%; margin-bottom: 1.5rem; padding: 0.9rem 1.1rem; background: rgba(0,0,0,0.05); border: 1px solid var(--border-glass); border-radius: 6px;">`;
                for (let [key, val] of mechanicEntries) {
                    statsHtml += `<div style="display:flex; justify-content:space-between; gap: 1.5rem; margin-bottom: 0.2rem;"><strong style="color:var(--page-accent); white-space:nowrap;">${key}</strong><span style="text-align:right;">${val}</span></div>`;
                }
                statsHtml += `</div>`;
            }
        }

        // Build Classes + Sourcebook footer lines (shown below content)
        let spellFooterHtml = '';
        const footerStyle = 'font-style: italic; font-size: 0.88em; color: var(--page-color-muted); margin-top: 0.35rem;';
        const labelStyle = 'color: var(--page-accent); font-style: normal; font-weight: 600;';
        if (classesVal) spellFooterHtml += `<div style="${footerStyle}"><span style="${labelStyle}">Classes:</span> ${classesVal}</div>`;
        if (sourcebookVal) spellFooterHtml += `<div style="${footerStyle}"><span style="${labelStyle}">Sourcebook:</span> ${sourcebookVal}</div>`;

        // processedContent used directly — bold will be applied as DOM post-process in updateReaderStage
        let processedContent = page.html_content || '';
        
        let html = '<div class="page-block">';
        if (page.title) html += '<h2 class="page-header" style="margin: 0; padding: 0; color: var(--page-accent); line-height: 1.1;">' + page.title + '</h2>';
        if (page.meta) html += '<div class="page-meta" style="margin-top: 5px; color: var(--page-color-muted); font-style: italic; border-bottom: 1px solid var(--border-glass); padding-bottom: 10px;"><span>' + page.meta + '</span></div>';
        html += statsHtml;
        html += '<div class="page-content" style="flex: 1; overflow-y: auto; padding-right: 15px;">' + processedContent + '</div>';
        if (spellFooterHtml) html += `<div class="spell-footer" style="margin-top: 1.2rem; padding-top: 0.6rem; border-top: 1px solid var(--border-glass);">${spellFooterHtml}</div>`;
        if (page.footer) html += '<div class="page-footer">' + page.footer + '</div>';
        html += '</div>';
        
        return html;
    },

    updateReaderStage() {
        document.getElementById('pageIndicator').textContent = (this.currentPageIndex + 1) + " / " + (this.pages.length || 0);
        const stage = document.getElementById('readerContent');
        
        if (this.pages.length === 0) return;

        stage.innerHTML = this.renderPageHTML(this.pages[this.currentPageIndex]);
        
        // DOM-based bold post-processing for spell pages (has .page-stats = is a sparse/spell slide)
        if (stage.querySelector('.page-stats')) {
            const contentEl = stage.querySelector('.page-content');
            if (contentEl) this.applySpellBolding(contentEl);
        }
    },

    // Walks text nodes inside a container and wraps matching D&D spell terms in <strong>
    applySpellBolding(container) {
        const SPELL_PATTERNS = [
            { re: /At Higher Levels\.?:?/g },
            { re: /\b\d+d\d+(?:[+-]\d+)?\b/g },  // dice: 4d6, 1d10, 2d8+3
            { re: /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/g },
            { re: /\b\d+(?:-|\s)foot(?:er)?(?:\s(?:radius|cube|line|cone|square))?\b/gi },
            { re: /\b\d+\s+feet\b/gi },
            { re: /\b\d+(?:st|nd|rd|th)[- ]level\b/gi },
        ];
        
        // Collect all text nodes (skip ones already inside <strong>)
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => node.parentElement.closest('strong') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        
        for (const textNode of textNodes) {
            let text = textNode.textContent;
            if (!text.trim()) continue;
            
            // Try each pattern to see if any match
            let matched = false;
            for (const { re } of SPELL_PATTERNS) {
                re.lastIndex = 0;
                if (re.test(text)) { matched = true; break; }
            }
            if (!matched) continue;
            
            // Replace text node with HTML that wraps matches in <strong>
            const span = document.createElement('span');
            let html = text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // escape first
            for (const { re } of SPELL_PATTERNS) {
                re.lastIndex = 0;
                html = html.replace(re, '<strong>$&</strong>');
            }
            span.innerHTML = html;
            textNode.parentNode.replaceChild(span, textNode);
        }
    },

    prevPage() {
        if (this.currentPageIndex > 0) {
            this.currentPlaybackId++;
            this.currentPageIndex--;
            this.updateReaderStage();
            if (this.isPlaying) this.speakCurrentPage();
        }
    },

    nextPage() {
        this.currentPlaybackId++;
        if (this.currentPageIndex < this.pages.length - 1) {
            this.currentPageIndex++;
            this.updateReaderStage();
            if (this.isPlaying) this.speakCurrentPage();
        } else {
            this.isPlaying = false;
            this.audio.pause();
            document.getElementById('playIcon').setAttribute('data-lucide', 'play');
            lucide.createIcons();
            alert("End of document.");
        }
    },

    prevChunk() {
        if (this.currentChunkIndex > 0) {
            this.currentPlaybackId++;
            this.currentChunkIndex--;
            if (this.isPlaying) this.playAudioQueue();
        } else {
            this.prevPage();
        }
    },

    nextChunk() {
        if (this.currentChunkIndex < this.currentNodes.length - 1) {
            this.currentPlaybackId++;
            this.currentChunkIndex++;
            if (this.isPlaying) this.playAudioQueue();
        } else {
            this.nextPage();
        }
    },

    toggleAudiobook() {
        if (this.pages.length === 0) return alert("Nothing to play.");
        
        this.isPlaying = !this.isPlaying;
        const icon = document.getElementById('playIcon');
        icon.setAttribute('data-lucide', this.isPlaying ? 'pause-circle' : 'play-circle');
        lucide.createIcons();
        
        if (this.isPlaying) {
            if (this.audio.paused && this.audio.src && this.audioPageIndex === this.currentPageIndex) {
                this.audio.play();
            } else {
                this.speakCurrentPage();
            }
        } else {
            this.audio.pause();
        }
    },

    stopAudio() {
        this.currentPlaybackId++;
        this.isPlaying = false;
        this.currentChunkIndex = 0;
        this.audioPageIndex = -1;
        this.audio.pause();
        this.audio.removeAttribute('src');
        
        document.getElementById('playIcon').setAttribute('data-lucide', 'play');
        document.getElementById('narratorSubtitle').style.display = 'none';
        
        // Clear any lingering highlights
        document.querySelectorAll('.active-reading-highlight').forEach(el => el.classList.remove('active-reading-highlight'));
        lucide.createIcons();
    },

    toggleFullscreen() {
        const reader = document.querySelector('.panel-reader');
        if (!document.fullscreenElement) {
            reader.requestFullscreen().catch(err => {
                alert(`Error attempting to enable fullscreen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    },

    async speakCurrentPage() {
        this.currentPlaybackId++;
        const apiKey = document.getElementById('openAiKey').value;
        const voice = document.getElementById('voiceChoice').value || 'fable';
        const sub = document.getElementById('narratorSubtitle');

        if (!apiKey || apiKey.includes('...')) {
            this.isPlaying = false;
            return alert("OpenAI API Key is required for audio playback.");
        }
        
        const stage = document.getElementById('readerContent');
        const headerNodes = [stage.querySelector('.page-header'), stage.querySelector('.page-meta')];
        // Include stats box rows so Casting Time, Range etc. are read aloud
        const statsNodes = Array.from(stage.querySelectorAll('.page-stats div'));
        const contentNodes = Array.from(stage.querySelectorAll('.page-content > *:not(table)'));
        // Include spell footer (Classes / Sourcebook) at the end
        const spellFooterNodes = Array.from(stage.querySelectorAll('.spell-footer div'));
        
        this.currentNodes = [...headerNodes, ...statsNodes, ...contentNodes, ...spellFooterNodes].filter(n => n && n.textContent.trim() !== '');
        this.currentChunkIndex = 0;
        this.audioPageIndex = this.currentPageIndex;
        
        if (this.currentNodes.length === 0) {
            this.isPlaying = false;
            return;
        }

        document.getElementById('narratorSubtitle').style.display = 'block';
        sub.textContent = "Pre-rendering audio...";

        const pbId = this.currentPlaybackId;
        const fetchAudio = async (text) => {
            if (!text.trim()) return null;
            const res = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: { 'Authorization': "Bearer " + apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'tts-1', voice: voice, input: text })
            });
            if (!res.ok) throw new Error("Voice API Error");
            return await res.blob();
        };

        try {
            document.querySelectorAll('.active-reading-highlight').forEach(el => el.classList.remove('active-reading-highlight'));
            
            // Bulk exact fetch for entire page
            const promises = this.currentNodes.map(n => fetchAudio(n.textContent.trim()));
            this.preloadedBlobs = await Promise.all(promises);
            
            if (this.currentPlaybackId !== pbId) return; // Stale break
            this.playAudioQueue();
        } catch(e) {
            console.error(e);
            sub.textContent = "Voice API failed. Check key.";
            this.isPlaying = false;
        }
    },

    async playAudioQueue() {
        const playbackId = this.currentPlaybackId;
        const sub = document.getElementById('narratorSubtitle');

        while (this.currentChunkIndex < this.currentNodes.length) {
            if (!this.isPlaying || this.currentPlaybackId !== playbackId) break;
            
            const node = this.currentNodes[this.currentChunkIndex];
            const text = node.textContent.trim();
            if (!text) {
                this.currentChunkIndex++;
                continue;
            }

            // Update Highlight UI & Auto-Scroll — snaps to top of paragraph so no text is cut mid-line
            document.querySelectorAll('.active-reading-highlight').forEach(el => el.classList.remove('active-reading-highlight'));
            node.classList.add('active-reading-highlight');
            
            // Scroll within .page-content so the active node appears near the top with a small gap
            const pageContent = node.closest('.page-content');
            if (pageContent) {
                const nodeTop = node.offsetTop - pageContent.offsetTop;
                const gapPx = 16; // small breathing room above the highlighted paragraph
                pageContent.scrollTo({ top: Math.max(0, nodeTop - gapPx), behavior: 'smooth' });
            } else {
                node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            sub.textContent = "Reading...";

            try {
                let blob = this.preloadedBlobs ? this.preloadedBlobs[this.currentChunkIndex] : null;
                if (!blob) {
                    this.currentChunkIndex++;
                    continue;
                }
                
                if (!this.isPlaying || this.currentPlaybackId !== playbackId) break;

                this.audio.src = URL.createObjectURL(blob);
                this.audio.playbackRate = parseFloat(document.getElementById('speedChoice').value || 1.0);
                
                sub.textContent = "";
                await this.audio.play();

                await new Promise(resolve => {
                    this.audio.onended = resolve;
                    this.audio.onerror = resolve; // Skip on error
                });

                if (this.currentPlaybackId === playbackId) {
                    this.currentChunkIndex++; // Move naturally if not interrupted
                }
            } catch (err) {
                console.error("TTS Chunk Error:", err);
                if (this.currentPlaybackId === playbackId) this.currentChunkIndex++;
            }
        }

        if (this.isPlaying && this.currentPlaybackId === playbackId && this.currentChunkIndex >= this.currentNodes.length) {
            document.querySelectorAll('.active-reading-highlight').forEach(el => el.classList.remove('active-reading-highlight'));
            sub.style.display = 'none';
            this.nextPage();
        }
    },

    parseAIResponse(fullExtractedText) {
        let cleanText = fullExtractedText.replace('<END_OF_DOCUMENT>', '').trim();
        if (cleanText.startsWith('\`\`\`')) {
            cleanText = cleanText.substring(3);
            if (cleanText.startsWith('markdown')) cleanText = cleanText.substring(8);
            if (cleanText.endsWith('\`\`\`')) cleanText = cleanText.substring(0, cleanText.length - 3);
        }

        let rawPages = cleanText.split('<PAGE_BREAK>');
        let parsedPages = [];
        
        for (let block of rawPages) {
            block = block.trim();
            if (!block) continue;
            
            let titleMatch = block.match(/\*?\*?TITLE:\*?\*?\s*(.*)/i);
            let metaMatch = block.match(/\*?\*?META:\*?\*?\s*(.*)/i);
            let statsMatch = block.match(/\*?\*?STATS:\*?\*?\s*(\{.*?\})/i);
            let footerMatch = block.match(/\*?\*?FOOTER:\*?\*?\s*(.*)/i);
            let contentMatch = block.match(/\*?\*?CONTENT:\*?\*?\s*([\s\S]*)/i);
            
            if (titleMatch || contentMatch) {
                let statsObj = {};
                try { if (statsMatch) statsObj = JSON.parse(statsMatch[1]); } catch(e){}
                
                // META sanity filter — strip values that look like page numbers, footers, or garbage
                let metaValue = metaMatch ? metaMatch[1].trim() : '';
                const junkMeta = /^(n\/a|footer|page|\d+|\d+\s*[-–]\s*\d+|\s*)$/i;
                if (junkMeta.test(metaValue)) metaValue = '';
                
                // FOOTER sanity filter — only keep bare page numbers (e.g. "42"). Strip "CONTENT:", long strings, anything else.
                let footerValue = footerMatch ? footerMatch[1].trim() : '';
                const validFooter = /^\d+$/.test(footerValue); // must be purely numeric
                if (!validFooter) footerValue = '';

                const htmlContent = contentMatch ? contentMatch[1].trim() : '';
                
                // Empty slide guard — skip slides with no real content (under 40 chars stripped of tags)
                const strippedContent = htmlContent.replace(/<[^>]*>/g, '').trim();
                if (strippedContent.length < 40 && !htmlContent.includes('<table')) continue;
                
                parsedPages.push({
                    title: titleMatch ? titleMatch[1].trim() : "",
                    meta: metaValue,
                    stats: statsObj,
                    footer: footerValue,
                    html_content: htmlContent
                });
            }
        }
        return parsedPages;
    },

    async saveCurrentBook() {
        if (!this.pages || this.pages.length === 0) return alert("No active document loaded to save!");
        const title = prompt("Enter a title for this Audiobook in your library:", "My Saved Book");
        if (!title) return;
        
        const id = 'book_' + Date.now();
        const bookData = {
            title,
            date: new Date().toLocaleDateString(),
            pages: this.pages,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            await db.collection("users").doc(this.currentUser.id).collection("books").doc(id).set(bookData);
            alert("Saved to " + this.currentUser.name + "'s Cloud Library successfully!");
        } catch (e) {
            console.error("Save error:", e);
            alert("Failed to save audiobook to cloud.");
        }
    },
    
    loadFromLibrary(id) {
        let book = this.cloudLibraryCache.find(b => b.id === id);
        if (!book) return alert("Book not found in cloud!");
        
        this.pages = book.pages;
        this.currentPageIndex = 0;
        document.getElementById('pageCountBadge').textContent = this.pages.length + " Pages";
        this.updateReaderStage();
        this.stopAudio();
    },
    
    async deleteFromLibrary(id) {
        if (!confirm("Are you sure you want to delete this serialized book from the cloud?")) return;
        try {
            await db.collection("users").doc(this.currentUser.id).collection("books").doc(id).delete();
        } catch (e) {
            console.error("Delete error:", e);
            alert("Failed to delete book from cloud.");
        }
    },
    
    setupFirestoreListener() {
        if (this.unsubFirestore) {
            this.unsubFirestore();
            this.unsubFirestore = null;
        }

        const list = document.getElementById('libraryList');
        if (!list) return;

        if (!this.currentUser) return;

        list.innerHTML = '<p style="color:var(--text-app-muted); font-size: 0.9rem;">Syncing with cloud...</p>';

        this.unsubFirestore = db.collection("users").doc(this.currentUser.id).collection("books")
            .orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {
                const library = [];
                snapshot.forEach(doc => {
                    library.push({ id: doc.id, ...doc.data() });
                });
                
                this.cloudLibraryCache = library;
                
                if (library.length === 0) {
                    list.innerHTML = '<p style="color:var(--text-app-muted); font-size: 0.9rem;">Your cloud library is empty.</p>';
                } else {
                    list.innerHTML = library.map(b => `
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <div style="overflow: hidden; flex: 1; padding-right: 10px;">
                                <strong style="display: block; font-size: 0.9rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${b.title}</strong>
                                <span style="font-size: 0.75rem; color: var(--text-app-muted);">${b.pages ? b.pages.length : 0} Pages • ${b.date}</span>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn-primary" onclick="app.loadFromLibrary('${b.id}')" style="padding: 4px 8px; font-size: 0.75rem;"><i data-lucide="play" style="width:12px;height:12px;"></i></button>
                                <button class="btn-icon" onclick="app.deleteFromLibrary('${b.id}')" style="padding: 4px; color: #ff5e5e;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
                            </div>
                        </div>
                    `).join('');
                }
                lucide.createIcons();
            }, err => {
                console.error("Firestore sync error:", err);
                list.innerHTML = '<p style="color:#ef4444; font-size: 0.9rem;">Failed to sync cloud library.</p>';
            });
    },

    downloadWord() {
        if (this.pages.length === 0) return alert("Nothing to export.");
        
        let allHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>';
        this.pages.forEach(p => {
            allHtml += '<div>' + this.renderPageHTML(p) + '</div><br clear="all" style="page-break-before:always" />';
        });
        allHtml += "</body></html>";
        
        const blob = new Blob(['\ufeff', allHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Audiobook_Export.doc';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    exportLibrary() {
        const library = this.cloudLibraryCache || [];
        if (library.length === 0) return alert('Your cloud library is empty — nothing to export.');
        
        const blob = new Blob([JSON.stringify(library)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audiobooks_${this.currentUser.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Exported ${library.length} book(s) from cloud.`);
    },

    importLibrary() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const imported = JSON.parse(reader.result);
                    if (!Array.isArray(imported)) throw new Error('Invalid format');
                    
                    document.getElementById('libraryList').innerHTML = '<p style="color:var(--text-app-muted); font-size: 0.9rem;">Uploading to cloud...</p>';
                    let count = 0;
                    for (const b of imported) {
                        const id = b.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        await db.collection("users").doc(this.currentUser.id).collection("books").doc(id).set({
                            title: b.title || "Imported Book",
                            date: b.date || new Date().toLocaleDateString(),
                            pages: b.pages,
                            createdAt: b.createdAt || firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        count++;
                    }
                    alert(`✅ Imported ${count} book(s) into ${this.currentUser.name}'s cloud library!`);
                } catch(err) {
                    console.error("Import error:", err);
                    alert('Import failed — the file does not appear to be a valid library export.');
                    this.setupFirestoreListener(); // trigger a re-render
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

window.onload = () => { app.init(); };
window.app = app;
