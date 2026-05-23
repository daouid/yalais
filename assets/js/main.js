// Yalais Main JS Script

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    highlightLeanCode();
    setupClipboard();
    setupImageLightbox();
});

// 1. Theme Management
function initTheme() {
    let theme = 'light';
    try {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    } catch (e) {
        console.warn('localStorage is not accessible, using system preference or light mode:', e);
        try {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = systemPrefersDark ? 'dark' : 'light';
        } catch (err) {
            theme = 'light';
        }
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleButtonIcon(theme);
    
    // Sync theme to iframe on load
    window.addEventListener('load', () => {
        syncThemeToIframe(theme);
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
        localStorage.setItem('theme', nextTheme);
    } catch (e) {
        console.warn('localStorage setItem failed:', e);
    }
    updateThemeToggleButtonIcon(nextTheme);
    syncThemeToIframe(nextTheme);
}

function updateThemeToggleButtonIcon(theme) {
    const btn = document.querySelector('.theme-toggle-btn');
    if (!btn) return;
    btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    btn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
}

function syncThemeToIframe(theme) {
    const iframe = document.querySelector('.animation-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ theme: theme }, '*');
    }
}

// Listen to message from child iframes requesting theme on initialization
window.addEventListener('message', (event) => {
    if (event.data && event.data.requestTheme) {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        syncThemeToIframe(theme);
    }
});

// 2. Lean 4 Syntax Highlighter
function highlightLeanCode() {
    const codeElements = document.querySelectorAll('code.language-lean');
    codeElements.forEach(el => {
        const code = el.textContent;
        
        // Tokenizer regex matching comments, strings, multi-character symbols, words, single characters, and spaces
        const tokenRegex = /(\/\-[\s\S]*?\-\/|--.*$|"[^"\\]*(?:\\.[^"\\]*)*"|\b\w+\b|:=|→|≃|≤|≥|∑|∣|∀|∃|λ|¬|∧|∨|::|[\+\-\*\/\^⊆∈]|=|[^\w\s]|\s+)/g;
        
        const tokens = code.match(tokenRegex);
        if (!tokens) return;
        
        const keywords = new Set([
            'import', 'open', 'theorem', 'lemma', 'def', 'example', 
            'have', 'let', 'by', 'calc', 'show', 'from', 'sorry', 'universe'
        ]);
        
        const tactics = new Set([
            'intro', 'intros', 'obtain', 'rcases', 'exact', 'apply', 'rw', 
            'simp', 'simpa', 'rwa', 'constructor', 'cases', 'induction', 
            'left', 'right', 'split', 'contradiction', 'exfalso', 'ring', 'positivity', 'aesop', 'omega'
        ]);
        
        const types = new Set([
            'Nat', 'Int', 'Real', 'Complex', 'Prop', 'Type', 'Fintype', 
            'DecidableEq', 'DecidableRel', 'SimpleGraph', 'Set', 'Finset', 
            'Matrix', 'Unit', 'Sum', 'NNReal', 'Function', 'Equiv'
        ]);
        
        const symbols = new Set([
            ':=', '→', '≃', '≤', '≥', '∑', '∣', '∀', '∃', 'λ', '¬', '∧', '∨', '::', '+', '-', '*', '/', '^', '⊆', '∈', '='
        ]);
        
        let html = '';
        tokens.forEach(token => {
            // Escape HTML tags to prevent execution
            const escaped = token
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
            if (token.startsWith('/-') || token.startsWith('--')) {
                html += `<span class="hl-com">${escaped}</span>`;
            } else if (token.startsWith('"')) {
                html += `<span class="hl-str">${escaped}</span>`;
            } else if (keywords.has(token)) {
                html += `<span class="hl-kw">${escaped}</span>`;
            } else if (tactics.has(token)) {
                html += `<span class="hl-tac">${escaped}</span>`;
            } else if (types.has(token)) {
                html += `<span class="hl-typ">${escaped}</span>`;
            } else if (/^\d+$/.test(token)) {
                html += `<span class="hl-num">${escaped}</span>`;
            } else if (symbols.has(token)) {
                html += `<span class="hl-sym">${escaped}</span>`;
            } else {
                html += escaped;
            }
        });
        
        el.innerHTML = html;
    });
}

// 3. Setup Clipboard copy
function setupClipboard() {
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            
            const textToCopy = targetEl.textContent;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showCopiedFeedback(btn);
                }).catch(err => {
                    console.error('Failed to copy via navigator.clipboard: ', err);
                    fallbackCopyText(textToCopy, btn);
                });
            } else {
                fallbackCopyText(textToCopy, btn);
            }
        });
    });
}

function showCopiedFeedback(btn) {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.borderColor = 'var(--hl-tactic)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.borderColor = '';
    }, 2000);
}

function fallbackCopyText(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopiedFeedback(btn);
        } else {
            console.error('Fallback copy command was unsuccessful');
            btn.textContent = 'Failed to copy';
            setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000);
        }
    } catch (err) {
        console.error('Fallback copy failed', err);
        btn.textContent = 'Failed to copy';
        setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000);
    }
    document.body.removeChild(textArea);
}

// 4. Expand / Maximize Animation Iframe
function toggleExpandAnimation() {
    const card = document.querySelector('.animation-card');
    if (!card) return;
    
    let backdrop = document.querySelector('.animation-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'animation-backdrop';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', toggleExpandAnimation);
    }
    
    const isExpanded = card.classList.contains('expanded');
    const btn = card.querySelector('.expand-btn');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        backdrop.classList.remove('show');
        if (btn) btn.innerHTML = '&#x26F6; Expand';
        document.body.style.overflow = ''; // restore scroll
    } else {
        card.classList.add('expanded');
        backdrop.classList.add('show');
        if (btn) btn.innerHTML = 'Collapse';
        document.body.style.overflow = 'hidden'; // prevent background scroll
    }
    
    // Trigger resize inside iframe so it handles canvas sizing
    setTimeout(() => {
        const iframe = card.querySelector('.animation-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.dispatchEvent(new Event('resize'));
        }
    }, 100);
}

// 5. Image Lightbox for Illustrations
function setupImageLightbox() {
    const img = document.querySelector('.illustration-img');
    if (!img) return;
    
    img.addEventListener('click', () => {
        let modal = document.querySelector('.lightbox-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'lightbox-modal';
            const modalImg = document.createElement('img');
            modalImg.src = img.src;
            modal.appendChild(modalImg);
            document.body.appendChild(modal);
            modal.addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }
        modal.classList.add('show');
    });
}

