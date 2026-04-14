import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';

// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
// REMPLACEZ CES VALEURS PAR CELLES DE VOTRE PROJET SUPABASE 
// (Trouvables dans Supabase Project Settings > API)
const SUPABASE_URL = 'https://pslwvnyauxngwnxwlhqr.supabase.co'; // Ex: 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbHd2bnlhdXhuZ3dueHdsaHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDI4ODgsImV4cCI6MjA4ODExODg4OH0.zm0BDcuUZllMLuDwvTvhYEGY9GE6hbFt7zdeYUjeRcM';

// Initialisation du client Supabase
// window.supabase est disponible grâce au script CDN dans index.html
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const btnStudent = document.getElementById('btn-student');
const btnAdmin = document.getElementById('btn-admin');
const btnScores = document.getElementById('btn-scores');
const viewStudent = document.getElementById('view-student');
const viewAdmin = document.getElementById('view-admin');
const viewScores = document.getElementById('view-scores');
const viewHome = document.getElementById('view-home');
const modeToggle = document.getElementById('mode-toggle');
const btnHomeStudent = document.getElementById('btn-home-student');
const btnHomeAdmin = document.getElementById('btn-home-admin');

const codeEditorTextarea = document.getElementById('code-editor');
const btnRun = document.getElementById('btn-run');
const btnReset = document.getElementById('btn-reset');
const btnSubmit = document.getElementById('btn-submit');
const btnEndExam = document.getElementById('btn-end-exam');
const exerciseFeedback = document.getElementById('exercise-feedback');
const consoleOutput = document.getElementById('r-console-text');
const webrStatus = document.getElementById('webr-status');

const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');

const loginModal = document.getElementById('login-modal');
const btnCancelLogin = document.getElementById('btn-cancel-login');
const btnSendCode = document.getElementById('btn-send-code');
const btnVerifyCode = document.getElementById('btn-verify-code');
const inputLoginEmail = document.getElementById('login-email');
const inputLoginCode = document.getElementById('login-code');
const step1 = document.getElementById('modal-step-1');
const step2 = document.getElementById('modal-step-2');
const step1Footer = document.getElementById('modal-footer-1');
const step2Footer = document.getElementById('modal-footer-2');
const loginError1 = document.getElementById('login-error-1');
const loginError2 = document.getElementById('login-error-2');
const adminLoginSection = document.getElementById('admin-login-section');
const toggleAdminLogin = document.getElementById('toggle-admin-login');

const btnSaveExercise = document.getElementById('btn-save-exercise');
const saveStatus = document.getElementById('save-status');
const btnSeedDb = document.getElementById('btn-seed-db');
const seedStatus = document.getElementById('seed-status');
const exerciseSelector = document.getElementById('exercise-selector');
const courseContent = document.getElementById('course-content');
const currentBadge = document.getElementById('current-badge');
const plotContainer = document.getElementById('plot-container');
const outputTabs = document.querySelectorAll('.output-tab');
const outputContents = document.querySelectorAll('.output-content');
const chronoContainer = document.getElementById('chrono-container');
const chronoTime = document.getElementById('chrono-time');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// New Admin Sub-nav Elements
const adminSubNavBtns = document.querySelectorAll('.sub-tab-btn');
const adminSubPanels = document.querySelectorAll('.admin-sub-panels');
const qaContainer = document.getElementById('qa-container');
const btnAddQA = document.getElementById('btn-add-qa');
const btnPreviewExercise = document.getElementById('btn-preview-exercise');
const adminExercisesList = document.getElementById('admin-exercises-list');

let exercicesList = [];
let editingExerciseId = null; // Tracks if we are editing an existing exercise


// ==========================================
// 3. EDITOR & WEBR INITIALIZATION
// ==========================================

CodeMirror.registerHelper("hint", "r", function (editor, options) {
    const cursor = editor.getCursor();
    const token = editor.getTokenAt(cursor);
    const start = token.start;
    const end = cursor.ch;
    const word = token.string.slice(0, end - start);

    if (!/^[a-zA-Z_0-9\\.]+$/.test(word)) return null;

    const rFunctions = [
        "mean", "median", "var", "sd", "quantile", "summary", "print", "hist",
        "boxplot", "t.test", "plot", "c", "data.frame", "list", "matrix",
        "length", "sum", "min", "max", "seq", "rep", "head", "tail", "str",
        "class", "typeof", "ls", "rm", "library", "require", "install.packages",
        "setwd", "getwd", "paste", "paste0", "gsub", "grep", "if", "else",
        "for", "while", "function", "return"
    ];

    const list = rFunctions.filter(f => f.startsWith(word));

    return {
        list: list,
        from: CodeMirror.Pos(cursor.line, start),
        to: CodeMirror.Pos(cursor.line, end)
    };
});

const editor = CodeMirror.fromTextArea(codeEditorTextarea, {
    mode: 'r',
    theme: 'material-ocean',
    lineNumbers: true,
    tabSize: 4,
    indentUnit: 4,
    matchBrackets: true,
    extraKeys: { "Ctrl-Space": "autocomplete" }
});

editor.setSize(null, '100%');

editor.on("inputRead", function (editor, change) {
    if (change.origin === "+input" && /^[a-zA-Z_0-9]+$/.test(change.text[0])) {
        editor.showHint({ completeSingle: false });
    }
});

let webRInstance = null;
let currentUser = null;
let studentProgress = {};       // Stores code and console per exercise index
let exerciseStartTimes = {};    // Chrono per exercise index
let currentExerciseIndex = "";  // Tracks the active exercise index
let examAccessCode = "";        // Shared code for all students

// ==========================================
// 3.B. THEME & CHRONO
// ==========================================
let currentTheme = localStorage.getItem('theme') || 'dark';

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        if (editor) editor.setOption('theme', 'default');
    } else {
        document.body.removeAttribute('data-theme');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        if (editor) editor.setOption('theme', 'material-ocean');
    }
    localStorage.setItem('theme', theme);
}

// Initial application
applyTheme(currentTheme);

btnThemeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
});

// CHRONO
let chronoDuration = 30 * 60; // 30 minutes d'examen par défaut
let timeRemaining = chronoDuration;
let chronoInterval = null;
let examStartTime = null; // Horodatage réel du début de l'examen

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateChronoDisplay() {
    chronoTime.textContent = formatTime(timeRemaining);
    if (timeRemaining <= 300) { // < 5 minutes (Animation rouge d'urgence)
        chronoContainer.classList.add('chrono-urgent');
    } else {
        chronoContainer.classList.remove('chrono-urgent');
    }
}

function startChrono() {
    timeRemaining = chronoDuration;
    examStartTime = Date.now(); // Enregistrer le vrai début de l'examen
    updateChronoDisplay();

    if (chronoInterval) clearInterval(chronoInterval);

    chronoInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateChronoDisplay();
        } else {
            clearInterval(chronoInterval);
            chronoTime.textContent = "00:00";
            alert("L'examen est terminé ! Le temps imparti est écoulé. Le code est auto-verrouillé.");
            editor.setOption('readOnly', 'nocursor');
            if (btnSubmit) btnSubmit.disabled = true;
            if (btnRun) btnRun.disabled = true;
        }
    }, 1000);
}

// Le lancement auto du chrono se fait désormais uniquement si on est connecté en tant qu'étudiant.

// ==========================================
// 4. AUTHENTICATION (SUPABASE)
// ==========================================

// 💡 AJOUTEZ ICI VOTRE OU VOS EMAILS DE PROFESSEUR
// Ces emails auront automatiquement accès à l'onglet Admin ET Étudiant sans être bloqués
const ADMIN_EMAILS = [
    'ferdaous.boughattas@unilasalle.fr',
    'votre.nom@unilasalle.fr'
];

async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    // Fallback: Check if a simplified student session exists
    if (!currentUser) {
        const storedEmail = localStorage.getItem('student_session_email');
        if (storedEmail) {
            currentUser = { email: storedEmail, isSimpleStudent: true };
        }
    }

    updateAuthUI();
}

function updateAuthUI() {
    if (currentUser) {
        btnLogin.style.display = 'none';
        userInfo.style.display = 'flex';
        userEmail.textContent = currentUser.email;

        // Si l'utilisateur est un admin déclaré dans ADMIN_EMAILS
        if (currentUser.email && ADMIN_EMAILS.includes(currentUser.email)) {
            btnAdmin.style.display = 'inline-block';
            document.getElementById('mode-toggle').style.display = 'flex'; // Allow switching views
            switchMode('admin'); // Default view for admin
        } else {
            btnAdmin.style.display = 'none';
            btnScores.style.display = 'none'; // Cache l'onglet des scores pour l'étudiant
            document.getElementById('mode-toggle').style.display = 'none'; // Bloque l'accès à la navigation
            switchMode('student');
            if (!chronoInterval) startChrono();
        }
    } else {
        btnLogin.style.display = 'inline-block';
        userInfo.style.display = 'none';
        btnAdmin.style.display = 'none'; // Caché si déconnecté
        document.getElementById('mode-toggle').style.display = 'none'; // Cache les onglets si déconnecté
        switchMode('home');
    }
}

btnHomeStudent.addEventListener('click', () => btnLogin.click());
btnHomeAdmin.addEventListener('click', () => btnLogin.click());

btnLogin.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    inputLoginEmail.value = '';
    inputLoginCode.value = '';
    document.getElementById('login-password').value = '';
    loginError1.style.display = 'none';
    loginError2.style.display = 'none';

    // Show Step 1 by default
    step1.style.display = 'block';
    step1Footer.style.display = 'flex';
    step2.style.display = 'none';
    step2Footer.style.display = 'none';

    // Reset admin login visibility
    if (adminLoginSection && toggleAdminLogin) {
        adminLoginSection.style.display = 'none';
        toggleAdminLogin.style.display = 'inline';
    }
});

if (toggleAdminLogin) {
    toggleAdminLogin.addEventListener('click', (e) => {
        e.preventDefault();
        adminLoginSection.style.display = 'block';
        toggleAdminLogin.style.display = 'none';
    });
}

const btnBackToStep1 = document.getElementById('btn-back-to-step1');
if (btnBackToStep1) {
    btnBackToStep1.addEventListener('click', () => {
        step1.style.display = 'block';
        step1Footer.style.display = 'flex';
        step2.style.display = 'none';
        step2Footer.style.display = 'none';
    });
}

btnCancelLogin.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

btnSendCode.addEventListener('click', async () => {
    const email = inputLoginEmail.value.trim().toLowerCase();
    const isAdminMode = (adminLoginSection.style.display === 'block');
    const passwordOrCode = document.getElementById('login-password').value.trim();

    if (!email) {
        loginError1.textContent = "Veuillez entrer votre email.";
        loginError1.style.display = 'block';
        return;
    }

    btnSendCode.disabled = true;
    btnSendCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...';
    loginError1.style.display = 'none';

    // 1. ADMIN CASE: Fixed Code check
    const ADMIN_FIXED_CODE = "apex2026R";
    if (isAdminMode && ADMIN_EMAILS.includes(email)) {
        if (passwordOrCode === ADMIN_FIXED_CODE) {
            // Log in as admin immediately
            currentUser = { email: email, isAdmin: true };
            updateAuthUI();
            loginModal.style.display = 'none';
            btnSendCode.disabled = false;
            btnSendCode.innerHTML = 'Suivant';
            return;
        } else {
            btnSendCode.disabled = false;
            btnSendCode.innerHTML = 'Suivant';
            loginError1.textContent = "Code administrateur incorrect.";
            loginError1.style.display = 'block';
            return;
        }
    }

    // 2. STUDENT CASE: OTP login
    // First, check if email is in allowed_students
    const { data: allowed, error: checkError } = await supabase
        .from('allowed_students')
        .select('*')
        .eq('email', email);

    if (checkError || !allowed || allowed.length === 0) {
        btnSendCode.disabled = false;
        btnSendCode.innerHTML = 'Suivant';
        loginError1.textContent = "Cet email n'est pas autorisé pour l'examen.";
        loginError1.style.display = 'block';
        return;
    }

    // --- NOUVEAU: MODE CODE EXAMEN DÉLÉGUÉ ---
    // Au lieu de connecter directement, on passe à l'étape 2 pour demander le code d'examen

    // On récupère le code d'examen le plus récent depuis la BDD
    examAccessCode = await fetchExamCode();

    if (!examAccessCode) {
        btnSendCode.disabled = false;
        btnSendCode.innerHTML = 'Suivant';
        loginError1.textContent = "L'examen n'est pas encore ouvert par le professeur (pas de code défini).";
        loginError1.style.display = 'block';
        return;
    }

    // Success: Switch to Step 2 for Exam Code entry
    step1.style.display = 'none';
    step1Footer.style.display = 'none';
    step2.style.display = 'block';
    step2Footer.style.display = 'flex';

    btnSendCode.disabled = false;
    btnSendCode.innerHTML = 'Suivant';

    // On ne connecte PAS encore l'utilisateur, on attend la vérification du code à l'étape 2.
    // --- FIN NOUVEAU MODE ---
    // Commentaire du code OTP original :
    /*
    const { error: otpError } = await supabase.auth.signInWithOtp({ 
        email: email,
        options: {
            shouldCreateUser: true
        }
    });

    if (otpError) {
        btnSendCode.disabled = false;
        btnSendCode.innerHTML = 'Suivant';
        loginError1.textContent = "Erreur d'envoi du code : " + otpError.message;
        loginError1.style.display = 'block';
        return;
    }

    // Success: Switch to Step 2
    step1.style.display = 'none';
    step1Footer.style.display = 'none';
    step2.style.display = 'block';
    step2Footer.style.display = 'flex';

    btnSendCode.disabled = false;
    btnSendCode.innerHTML = 'Suivant';
    */
    // --- FIN MODE STANDBY OTP ---

});

btnVerifyCode.addEventListener('click', async () => {
    const email = inputLoginEmail.value.trim().toLowerCase();
    const enteredCode = inputLoginCode.value.trim();

    if (!enteredCode) {
        loginError2.textContent = "Veuillez entrer le code d'examen.";
        loginError2.style.display = 'block';
        return;
    }

    btnVerifyCode.disabled = true;
    btnVerifyCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vérification...';
    loginError2.style.display = 'none';

    // Vérification du code d'examen partagé
    if (enteredCode === examAccessCode) {
        // Success: Log in as simple student
        currentUser = { email: email, isSimpleStudent: true };
        localStorage.setItem('student_session_email', email);

        // RESET SESSION STATE
        examStartTime = Date.now();
        studentProgress = {};
        exerciseStartTimes = {};
        if (editor) editor.setValue('# Sélectionnez un exercice dans le menu de gauche pour commencer');

        loginModal.style.display = 'none';
        btnVerifyCode.disabled = false;
        btnVerifyCode.innerHTML = 'Vérifier & Entrer';
        updateAuthUI();

        if (currentUser.email && !ADMIN_EMAILS.includes(currentUser.email)) {
            startChrono();
        }
    } else {
        btnVerifyCode.disabled = false;
        btnVerifyCode.innerHTML = 'Vérifier & Entrer';
        loginError2.textContent = "Code d'examen incorrect.";
        loginError2.style.display = 'block';
    }
});

btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('student_session_email');
    currentUser = null;
    alert("Vous êtes déconnecté.");

    // Arrêter le chrono s'il tournait
    if (chronoInterval) {
        clearInterval(chronoInterval);
        chronoInterval = null;
    }

    // Reset global state
    examStartTime = null;
    timeRemaining = chronoDuration;
    chronoTime.textContent = "00:00";
    studentProgress = {};
    exerciseStartTimes = {};
    if (editor) editor.setValue('# Sélectionnez un exercice dans le menu de gauche pour commencer');

    updateAuthUI();
});

// Appeler la vérification initiale
checkUser();


// ==========================================
// 5. DATABASE OPERATIONS (SUPABASE)
// ==========================================

async function fetchExercices() {
    try {
        const { data, error } = await supabase
            .from('exercices')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        exercicesList = data || [];

        // Update student selector
        exerciseSelector.innerHTML = '<option value="">-- Sélectionnez un exercice --</option>';
        exercicesList.forEach((ex, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = ex.title || `Exercice ${ex.id}`;
            exerciseSelector.appendChild(option);
        });

        // Update Admin Bank View
        if (adminExercisesList) {
            adminExercisesList.innerHTML = '';
            exercicesList.forEach((ex, index) => {
                const item = document.createElement('div');
                item.className = 'exercise-bank-item';
                item.style = 'padding: 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
                item.innerHTML = `
                    <div>
                        <strong style="display: block;">${ex.title}</strong>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${ex.theme || 'Statistiques'}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                         <button class="action-btn secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="window.loadExerciseToEdit(${ex.id})">
                            <i class="fa-solid fa-pen"></i> Modifier
                        </button>
                         <button class="action-btn secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; color: #ff7b72;" onclick="window.deleteExercise(${ex.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                adminExercisesList.appendChild(item);
            });
        }

    } catch (e) {
        console.error("Erreur chargement:", e);
        exerciseSelector.innerHTML = '<option value="">Erreur Supabase</option>';
    }
}

exerciseSelector.addEventListener('change', async (e) => {
    const newIndex = e.target.value;

    // 1. Sauvegarder l'état actuel avant de changer (si un exercice était déjà sélectionné)
    if (currentExerciseIndex !== "") {
        studentProgress[currentExerciseIndex] = {
            code: editor.getValue(),
            console: document.getElementById('r-console-text').innerHTML,
            feedbackHtml: exerciseFeedback.innerHTML,
            feedbackDisplay: exerciseFeedback.style.display,
            feedbackBg: exerciseFeedback.style.backgroundColor,
            feedbackCol: exerciseFeedback.style.color
        };

        // Sauvegarder la mémoire R de cet exercice dans le VFS (Virtual File System de WebR)
        if (webRInstance) {
            try {
                await webRInstance.evalRVoid(`save.image('/tmp/env_${currentExerciseIndex}.RData')`);
            } catch (err) { console.error("Erreur sauvegarde RData:", err); }
        }
    }

    if (newIndex === "") {
        currentExerciseIndex = "";
        return;
    }

    // Nettoyer l'environnement global R pour le nouvel exercice
    if (webRInstance) {
        try {
            await webRInstance.evalRVoid(`rm(list = ls(all.names = TRUE))`);
        } catch (err) { }
    }

    const ex = exercicesList[newIndex];
    if (ex) {
        courseContent.innerHTML = ex.description;
        currentBadge.textContent = ex.theme || '';
        currentBadge.style.display = ex.theme ? 'inline-block' : 'none';

        // 2. Déverrouiller en cas de changement d'exercice par défaut
        editor.setOption('readOnly', false);
        if (btnSubmit) btnSubmit.disabled = false;
        if (btnRun) btnRun.disabled = false;

        // 3. Restaurer l'état précédent de cet exercice, ou charger ses données par défaut
        if (studentProgress[newIndex]) {
            const saved = studentProgress[newIndex];
            editor.setValue(saved.code);
            document.getElementById('r-console-text').innerHTML = saved.console;

            exerciseFeedback.innerHTML = saved.feedbackHtml || '';
            exerciseFeedback.style.display = saved.feedbackDisplay || 'none';
            exerciseFeedback.style.backgroundColor = saved.feedbackBg || '';
            exerciseFeedback.style.color = saved.feedbackCol || '';

            // Si la réponse était correcte ou verrouillée, re-verrouiller l'éditeur
            if (saved.feedbackHtml && (saved.feedbackHtml.includes('verrouillé') || saved.feedbackHtml.includes('verrouillée'))) {
                editor.setOption('readOnly', 'nocursor');
                btnSubmit.disabled = true;
            }

        } else {
            // Premier chargement de l'exercice - nettoyer la console et le feedback
            editor.setValue(ex.start_code || "# Tapez votre code R ici");
            document.getElementById('r-console-text').innerHTML = '';
            if (exerciseFeedback) exerciseFeedback.style.display = 'none';

            // Si le plot existait, on nettoie aussi pour le nouvel exercice (optionnel)
            plotContainer.innerHTML = '';
            const placeholder = document.querySelector('.placeholder-text');
            if (placeholder) placeholder.style.display = 'block';
        }

        // Charger l'environnement R de cet exercice s'il existe
        if (webRInstance && studentProgress[newIndex]) {
            try {
                await webRInstance.evalRVoid(`if(file.exists('/tmp/env_${newIndex}.RData')) load('/tmp/env_${newIndex}.RData')`);
            } catch (err) { console.error("Erreur chargement RData:", err); }
        }

        currentExerciseIndex = newIndex;
        // Enregistrer le debut de la tentative si pas encore fait
        if (!exerciseStartTimes[newIndex]) {
            exerciseStartTimes[newIndex] = Date.now();
        }

    }
});

btnEndExam.addEventListener('click', async () => {
    if (!confirm("Voulez-vous vraiment terminer l'examen ? Vous ne pourrez plus modifier vos réponses.")) return;

    // 1. Calculer le temps réel écoulé depuis le début de la session
    const now = Date.now();
    let elapsedSeconds = (examStartTime) ? Math.floor((now - examStartTime) / 1000) : 0;
    if (chronoInterval) {
        clearInterval(chronoInterval);
        chronoInterval = null;
    }

    // 2. Verrouiller toute l'interface
    editor.setOption('readOnly', 'nocursor');
    btnSubmit.disabled = true;
    btnRun.disabled = true;
    btnEndExam.disabled = true;
    if (exerciseSelector) exerciseSelector.disabled = true;

    // 2.5 Révoquer l'accès de l'étudiant pour qu'il ne puisse plus se reconnecter
    try {
        const studentEmail = (currentUser && currentUser.email) ? currentUser.email : null;
        if (studentEmail && !ADMIN_EMAILS.includes(studentEmail)) {
            await supabase.from('allowed_students').delete().eq('email', studentEmail);
            console.log(`Accès révoqué pour ${studentEmail}`);
        }
    } catch (err) {
        console.warn("Erreur lors de la révocation de l'accès final:", err);
    }

    // 3. Récupérer uniquement les scores de CETTE SESSION (depuis examStartTime)
    let summaryHtml = '';
    let totalEarned = 0;
    let totalPossible = 0;

    try {
        const studentStr = (currentUser && currentUser.email) ? currentUser.email : 'Étudiant Anonyme';
        const sessionDate = new Date(examStartTime || 0).toISOString();

        // Récupérer les tentatives de la session
        const { data } = await supabase
            .from('scores')
            .select('exercise_title, score_pct, earned_points, total_points')
            .eq('student_name', studentStr)
            .gt('created_at', sessionDate)
            .order('created_at', { ascending: false });

        // Créer un dictionnaire pour accès rapide aux derniers scores
        const sessionScoresMap = new Map();
        if (data) {
            data.forEach(s => {
                if (!sessionScoresMap.has(s.exercise_title)) {
                    sessionScoresMap.set(s.exercise_title, s);
                }
            });
        }

        // Parcourir TOUTE la banque d'exercices
        summaryHtml = exercicesList.map(ex => {
            const s = sessionScoresMap.get(ex.title);

            // Calculer le total de points possible pour cet exercice
            let tp = s ? s.total_points : 0;
            if (!tp && ex.solution_code) {
                tp = ex.solution_code.split('\n')
                    .filter(l => l.replace(/#.*/g, '').replace(/\s+/g, '') !== '').length;
            }
            tp = tp || 1;

            // Points obtenus (0 si pas de tentative)
            let ep = s ? (s.earned_points ?? Math.round((s.score_pct / 100) * tp)) : 0;
            let pct = s ? s.score_pct : 0;

            totalEarned += ep;
            totalPossible += tp;

            const color = pct >= 50 ? '#3fb950' : '#ff7b72';
            return `<div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                <span>${ex.title}</span>
                <strong style="color:${color}">${ep}/${tp} pts (${pct}%)</strong>
            </div>`;
        }).join('');

    } catch (e) { console.warn("Erreur récupération scores finaux:", e); }

    console.log(`[Exam Summary] totalEarned=${totalEarned}, totalPossible=${totalPossible}`);
    const totalPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeStr = `${mins}min ${secs}s`;
    const finalColor = totalPct >= 50 ? '#3fb950' : '#ff7b72';

    // 4. Afficher un modal récapitulatif
    const modal = document.createElement('div');
    modal.id = 'exam-summary-modal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px;
                    padding: 2.5rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <h2 style="text-align:center; margin-bottom:0.25rem;">
                <i class="fa-solid fa-flag-checkered"></i> Examen terminé !
            </h2>

            ${totalPct >= 50
            ? `<div style="text-align:center; margin: 0.75rem 0 1.25rem; padding: 0.6rem 1rem; background: rgba(63,185,80,0.15); border: 1px solid #3fb950; border-radius: 8px; color: #3fb950; font-weight: 700; font-size: 1.05rem;">
                        <i class="fa-solid fa-trophy"></i> Félicitations ! Compétence validée !
                   </div>`
            : `<div style="text-align:center; margin: 0.75rem 0 1.25rem; padding: 0.6rem 1rem; background: rgba(248,81,73,0.15); border: 1px solid #ff7b72; border-radius: 8px; color: #ff7b72; font-weight: 700; font-size: 1.05rem;">
                        <i class="fa-solid fa-circle-xmark"></i> Compétence non validée.
                   </div>`
        }

            <div style="display:flex; justify-content:space-around; margin-bottom:1.5rem;">
                <div style="text-align:center;">
                    <div style="font-size:2.5rem; font-weight:700; color:${finalColor}">${totalPct}%</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">Score total<br>${totalEarned}/${totalPossible} pts</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:2.5rem; font-weight:700; color:var(--accent-blue)">${timeStr}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">Durée de l'examen</div>
                </div>
            </div>

            ${summaryHtml ? `<div style="font-size:0.875rem; margin-bottom:1.5rem;">${summaryHtml}</div>` : ''}
        </div>
    `;
    document.body.appendChild(modal);

    // 5. Déconnexion automatique après 5 secondes pour les étudiants
    if (currentUser && !ADMIN_EMAILS.includes(currentUser.email)) {
        setTimeout(() => {
            const summaryModal = document.getElementById('exam-summary-modal');
            if (summaryModal) summaryModal.remove();
            btnLogout.click();
        }, 5000);
    }
});

// Chargement initial
fetchExercices();

// Abonnement Temps Réel Supabase (Mise à jour automatique quand la base change)
supabase
    .channel('public:exercices')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exercices' }, payload => {
        // Si n'importe quel exercice est créé, modifié, ou supprimé depuis Supabase, 
        // l'application Web re-télécharge la liste à jour automatiquement en arrière plan.
        fetchExercices();
    })
    .subscribe();

btnSaveExercise.addEventListener('click', async () => {
    if (!currentUser) {
        alert("Vous devez être connecté en tant qu'administrateur pour sauvegarder.");
        return;
    }

    const title = document.getElementById('ex-title').value;
    const theme = "Statistiques";
    const desc = document.getElementById('ex-desc').value;

    // Collect Q&A pairs and merge them into start_code and solution_code
    const startLines = [];
    const solutionLines = [];

    const qaPairs = document.querySelectorAll('.qa-pair-container');
    qaPairs.forEach((pair, index) => {
        let start = pair.querySelector('.ex-qa-start').value;
        let solution = pair.querySelector('.ex-qa-solution').value;

        if (start.trim() || solution.trim()) {
            // Ne pas rajouter l'étiquette si elle est déjà présente au début
            const label = `# Étape ${index + 1} `;
            const finalStart = start.trim().startsWith(label) ? start : `${label} \n${start} `;
            const finalSolution = solution.trim().startsWith(label) ? solution : `${label} \n${solution} `;

            startLines.push(finalStart);
            solutionLines.push(finalSolution);
        }
    });

    const startCode = startLines.join('\n\n');
    const solution = solutionLines.join('\n\n');

    if (!title || !desc || !solution) {
        alert("Veuillez remplir au moins le titre, la description et une solution.");
        return;
    }

    if (btnSaveExercise.dataset.saving === 'true') return;
    btnSaveExercise.dataset.saving = 'true';
    btnSaveExercise.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> En cours...';
    btnSaveExercise.disabled = true;

    console.log("Saving exercise...", { id: editingExerciseId, title });

    try {
        let result;
        if (editingExerciseId) {
            // UPDATE MODE
            result = await supabase
                .from('exercices')
                .update({
                    theme: theme,
                    title: title,
                    description: desc,
                    start_code: startCode,
                    solution_code: solution
                })
                .eq('id', editingExerciseId);
        } else {
            // INSERT MODE
            result = await supabase
                .from('exercices')
                .insert([{
                    theme: theme,
                    title: title,
                    description: desc,
                    start_code: startCode,
                    solution_code: solution
                }]);
        }

        if (result.error) {
            throw result.error;
        }

        saveStatus.style.display = 'inline-block';
        saveStatus.textContent = editingExerciseId ? "Modifications enregistrées !" : "Nouvel exercice créé !";
        btnSaveExercise.innerHTML = '<i class="fa-solid fa-check"></i> Succès';

        fetchExercices();

        // Retour automatique à la banque après un court délai
        setTimeout(() => {
            saveStatus.style.display = 'none';
            const bankTabBtn = document.querySelector('[data-admin-view="view-admin-bank"]');
            if (bankTabBtn) bankTabBtn.click();

            // On ne reset le formulaire que si on a terminé (le resetAdminForm met editingExerciseId à null)
            if (!editingExerciseId) {
                resetAdminForm();
            }
            editingExerciseId = null;

            // On réactive le bouton après la redirection et le cleanup
            btnSaveExercise.disabled = false;
            btnSaveExercise.dataset.saving = 'false';
            btnSaveExercise.innerHTML = '<i class="fa-solid fa-save"></i> Sauvegarder';
        }, 1200);

    } catch (err) {
        console.error("Save error:", err);
        btnSaveExercise.disabled = false;
        btnSaveExercise.dataset.saving = 'false';
        btnSaveExercise.innerHTML = '<i class="fa-solid fa-save"></i> Sauvegarder';
        alert("Erreur lors de la sauvegarde : " + err.message);
    }
});

function resetAdminForm() {
    console.log("Resetting admin form");
    document.getElementById('ex-title').value = '';
    document.getElementById('ex-desc').value = '';
    qaContainer.innerHTML = '';
    editingExerciseId = null;
    // On rajoute une ligne vide par défaut
    btnAddQA.click();
}

// Admin Sub-nav Logic
adminSubNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        adminSubNavBtns.forEach(b => b.classList.remove('active'));
        adminSubPanels.forEach(p => p.style.display = 'none');

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-admin-view');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }

        // Charger la liste si on clique sur l'onglet Étudiants
        if (targetId === 'view-admin-students') {
            fetchAllowedStudents();

            // Charger aussi le code d'examen actuel
            const adminExamCodeInput = document.getElementById('admin-exam-code');
            if (adminExamCodeInput) {
                fetchExamCode().then(code => {
                    adminExamCodeInput.value = code || "";
                });
            }
        }
    });
});

// Dynamic QA Pairs
btnAddQA.addEventListener('click', (e) => {
    if (e) e.preventDefault();
    const count = qaContainer.querySelectorAll('.qa-pair-container').length + 1;
    const div = document.createElement('div');
    div.className = 'qa-pair-container';
    div.style = 'background: rgba(10, 114, 98, 0.03); border: 1px solid #0A726244; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;';
    div.innerHTML = `
        < div class="qa-header" style = "background: #0A7262; color: white; padding: 0.8rem 1.2rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" >
            <span style="font-weight: 600;"><i class="fa-solid fa-chevron-down"></i> Étape ${count}</span>
            <button class="tab-btn remove-qa-btn" style="color: #ff7b72; padding: 0; background:none; border:none;" onclick="event.stopPropagation(); this.closest('.qa-pair-container').remove()"><i class="fa-solid fa-trash"></i></button>
        </div >
        <div class="qa-body" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; background: #ffffff;">
            <div style="width: 100%;">
                <label style="font-size: 0.85rem; color: #0A7262; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-code"></i> Question (Code de départ pour l'étudiant)
                </label>
                <textarea class="textarea-field font-code ex-qa-start" rows="4" style="width: 100%; border-color: #0A726233; background: #fdfdfd; color: #333;" placeholder="# Écrivez ici les commentaires et le code..."></textarea>
            </div>
            <div style="width: 100%;">
                <label style="font-size: 0.85rem; color: #0A7262; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-check-double"></i> Réponse (Code solution attendu)
                </label>
                <textarea class="textarea-field font-code ex-qa-solution" rows="4" style="width: 100%; border-color: #0A726233; background: #fdfdfd; color: #333;" placeholder="# Écrivez ici la solution exacte..."></textarea>
            </div>
        </div>
    `;
    qaContainer.appendChild(div);
    setupCollapse(div);
});

function setupCollapse(container) {
    const header = container.querySelector('.qa-header');
    const body = container.querySelector('.qa-body');
    const icon = header.querySelector('i');

    // Initial state: ensure it's visible if not explicitly hidden
    if (!body.style.display) body.style.display = 'flex';

    header.onclick = (e) => {
        e.preventDefault();
        if (body.style.display === 'none') {
            body.style.display = 'flex';
            icon.className = 'fa-solid fa-chevron-down';
        } else {
            body.style.display = 'none';
            icon.className = 'fa-solid fa-chevron-right';
        }
    };
}

// Initial setup for the first one if it exists
document.querySelectorAll('.qa-pair-container').forEach(setupCollapse);

// Preview Logic
btnPreviewExercise.addEventListener('click', () => {
    const title = document.getElementById('ex-title').value;
    const desc = document.getElementById('ex-desc').value;

    const startLines = [];
    const qaPairs = document.querySelectorAll('.qa-pair-container');
    qaPairs.forEach((pair, index) => {
        const start = pair.querySelector('.ex-qa-start').value;
        if (start.trim()) {
            const label = `# Étape ${index + 1} `;
            const final = start.trim().startsWith(label) ? start : `${label} \n${start} `;
            startLines.push(final);
        }
    });

    const startCode = startLines.join('\n\n');

    // Mettre à jour l'affichage étudiant temporairement (sans sauver en BDD)
    courseContent.innerHTML = desc;
    editor.setValue(startCode || "# Aperçu de l'exercice");

    // Basculer vers le mode étudiant
    switchMode('student');
    alert("Mode Aperçu activé : Voici comment l'étudiant verra votre exercice.");
});

// Flag to prevent reset prompt when we are programmatically switching to edit
let isSwitchingToEdit = false;

// Function to load an exercise from the bank into the Edit form
window.loadExerciseToEdit = (id) => {
    const ex = exercicesList.find(e => e.id === id);
    if (!ex) return;

    isSwitchingToEdit = true;
    editingExerciseId = id;

    // Switch to Add/Edit tab
    const addTabBtn = document.querySelector('[data-admin-view="view-admin-add"]');
    addTabBtn.click();

    isSwitchingToEdit = false;

    // Fill main fields
    document.getElementById('ex-title').value = ex.title;
    document.getElementById('ex-desc').value = ex.description;

    // Split the codes back into pairs
    // Logic: Look for "# Étape X" headers
    const startBlocks = (ex.start_code || '').split(/# Étape \d+\n/).filter(b => b.trim() !== '');
    const solutionBlocks = (ex.solution_code || '').split(/# Étape \d+\n/).filter(b => b.trim() !== '');

    // Clear existing pairs
    qaContainer.innerHTML = '';

    const maxSteps = Math.max(startBlocks.length, solutionBlocks.length);
    for (let i = 0; i < maxSteps; i++) {
        const startVal = (startBlocks[i] || '').trim();
        const solVal = (solutionBlocks[i] || '').trim();

        const div = document.createElement('div');
        div.className = 'qa-pair-container';
        div.style = 'background: rgba(10, 114, 98, 0.03); border: 1px solid #0A726244; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;';
        div.innerHTML = `
        <div class="qa-header" style = "background: #0A7262; color: white; padding: 0.8rem 1.2rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" >
                <span style="font-weight: 600;"><i class="fa-solid fa-chevron-down"></i> Étape ${i + 1}</span>
                <div style="display:flex; gap: 10px; align-items:center;">
                    ${i > 0 ? `<button class="tab-btn remove-qa-btn" style="color: #ff7b72; padding: 0; background:none; border:none;" onclick="event.stopPropagation(); this.closest('.qa-pair-container').remove()"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div >
        <div class="qa-body" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; background: #ffffff;">
            <div style="width: 100%;">
                <label style="font-size: 0.85rem; color: #0A7262; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-code"></i> Question (Code de départ pour l'étudiant)
                </label>
                <textarea class="textarea-field font-code ex-qa-start" rows="4" style="width: 100%; border-color: #0A726233; background: #fdfdfd; color: #333;" placeholder="# Code de départ...">${startVal}</textarea>
            </div>
            <div style="width: 100%;">
                <label style="font-size: 0.85rem; color: #0A7262; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-check-double"></i> Réponse (Solution attendue)
                </label>
                <textarea class="textarea-field font-code ex-qa-solution" rows="4" style="width: 100%; border-color: #0A726233; background: #fdfdfd; color: #333;" placeholder="# Code solution...">${solVal}</textarea>
            </div>
        </div>
    `;
        qaContainer.appendChild(div);
        setupCollapse(div);
    }

    btnSaveExercise.innerHTML = '<i class="fa-solid fa-save"></i> Mettre à jour';
};

// Reset editing mode when manually clicking "Nouvel Exercice"
document.querySelector('[data-admin-view="view-admin-add"]').addEventListener('click', () => {
    // Si on est en train de passer en mode édition via loadExerciseToEdit, on ne fait rien
    if (isSwitchingToEdit) return;

    // Si on clique manuellement sur l'onglet alors qu'on était en train d'éditer
    if (editingExerciseId) {
        if (confirm("Voulez-vous abandonner l'édition en cours pour créer un nouvel exercice ?")) {
            editingExerciseId = null;
            resetAdminForm();
        }
    }
});

// Delete Function exposed globally for onclick
window.deleteExercise = async (id) => {
    if (!confirm("Supprimer cet exercice définitivement ?")) return;
    const { error } = await supabase.from('exercices').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchExercices();
};

// ==========================================
// NEW: EXAM CONFIGURATION (ACCESS CODE)
// ==========================================

async function fetchExamCode() {
    try {
        const { data, error } = await supabase
            .from('exam_config')
            .select('value')
            .eq('key', 'access_code')
            .maybeSingle();

        if (error) throw error;
        return data ? data.value : null;
    } catch (err) {
        console.warn("Erreur fetchExamCode:", err);
        return null;
    }
}

const btnSaveExamCode = document.getElementById('btn-save-exam-code');
if (btnSaveExamCode) {
    btnSaveExamCode.onclick = async () => {
        const codeInput = document.getElementById('admin-exam-code');
        const status = document.getElementById('save-exam-code-status');
        const newCode = codeInput.value.trim();

        if (!newCode) {
            alert("Veuillez entrer un code valide.");
            return;
        }

        btnSaveExamCode.disabled = true;
        btnSaveExamCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const { error } = await supabase
                .from('exam_config')
                .upsert({ key: 'access_code', value: newCode });

            if (error) throw error;

            status.style.display = 'block';
            status.style.color = '#3fb950';
            status.textContent = "Code d'examen mis à jour !";
            setTimeout(() => status.style.display = 'none', 3000);
        } catch (err) {
            console.error(err);
            status.style.display = 'block';
            status.style.color = '#ff7b72';
            status.textContent = "Erreur: " + err.message;
        }

        btnSaveExamCode.disabled = false;
        btnSaveExamCode.innerHTML = '<i class="fa-solid fa-save"></i> Définir le code';
    };
}


// ==========================================
// NEW: STUDENT MANAGEMENT LOGIC
// ==========================================

async function fetchAllowedStudents() {
    console.log("Fetching allowed students...");
    const listContainer = document.getElementById('admin-students-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>';

    try {
        const { data, error } = await supabase
            .from('allowed_students')
            .select('*')
            .order('email', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Aucun accès autorisé.</div>';
            return;
        }

        let html = '';
        data.forEach(student => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--panel-border); background: rgba(255,255,255,0.01);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-user-check" style="color: var(--accent-blue); font-size: 0.8rem; opacity: 0.7;"></i>
                        <span style="font-size: 0.9rem; font-weight: 500;">${student.email}</span>
                        <span style="font-size: 0.7rem; color: #3fb950; background: rgba(63,185,80,0.1); padding: 2px 6px; border-radius: 4px; margin-left:8px;">Prêt</span>
                    </div>
                    <button class="tab-btn" style="color: #ff7b72; padding: 0.4rem; background:none; border:none; transition: opacity 0.2s;" 
                            onclick="deleteStudent('${student.id}', '${student.email}')" title="Révoquer l'accès">
                        <i class="fa-solid fa-user-minus"></i>
                    </button>
                </div>
            `;
        });
        listContainer.innerHTML = html;

    } catch (err) {
        console.error("Student fetch error:", err);
        listContainer.innerHTML = `< div style = "padding: 2rem; text-align: center; color: #ff7b72;" > Erreur : ${err.message}</div > `;
    }
}

window.deleteStudent = async (id, email) => {
    if (!confirm(`Supprimer l'accès pour ${email} ?`)) return;

    try {
        const { error } = await supabase.from('allowed_students').delete().eq('id', id);
        if (error) throw error;
        fetchAllowedStudents();
    } catch (err) {
        alert("Erreur: " + err.message);
    }
};

const btnAddStudent = document.getElementById('btn-add-student');
if (btnAddStudent) {
    btnAddStudent.onclick = async () => {
        const input = document.getElementById('new-student-email');
        const status = document.getElementById('add-student-status');
        const rawText = input.value.trim().toLowerCase();

        // Extraire tous les emails séparés par des virgules, des espaces, des points-virgules ou des sauts de ligne
        // On récupère uniquement les mots contenant potentiellement un @ pour éviter d'insérer des éléments vides
        const emails = rawText.split(/[\s,;]+/).filter(e => e.includes('@'));

        if (emails.length === 0) {
            alert("Veuillez entrer au moins une adresse email valide.");
            return;
        }

        btnAddStudent.disabled = true;
        btnAddStudent.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            // Préparer les données pour une insertion multiple
            const dataToInsert = emails.map(email => ({ email }));
            const { error } = await supabase.from('allowed_students').insert(dataToInsert);

            if (error) throw error;

            status.style.display = 'block';
            status.style.background = 'rgba(35, 134, 54, 0.1)';
            status.style.color = '#3fb950';
            status.textContent = `${emails.length} accès autorisé(s) avec succès !`;
            input.value = '';
            fetchAllowedStudents();
        } catch (err) {
            status.style.display = 'block';
            status.style.background = 'rgba(248, 81, 73, 0.1)';
            status.style.color = '#ff7b72';
            status.textContent = "Erreur: " + err.message;
        }

        btnAddStudent.disabled = false;
        btnAddStudent.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Autoriser la liste';
    };
}

const btnClearStudents = document.getElementById('btn-clear-students');
if (btnClearStudents) {
    btnClearStudents.onclick = async () => {
        if (!confirm("Voulez-vous vraiment supprimer TOUS les accès étudiants ? (Utile pour préparer un nouvel examen)")) return;

        btnClearStudents.disabled = true;
        btnClearStudents.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            // Supprimer tous les étudiants (on prend ceux dont l'id n'est pas nul)
            const { error } = await supabase.from('allowed_students').delete().not('id', 'is', null);
            if (error) throw error;
            fetchAllowedStudents();
        } catch (err) {
            alert("Erreur lors de la suppression: " + err.message);
        }

        btnClearStudents.disabled = false;
        btnClearStudents.innerHTML = '<i class="fa-solid fa-trash-can"></i> Tout vider';
    }
}

const btnRefreshS = document.getElementById('btn-refresh-students');
if (btnRefreshS) {
    btnRefreshS.onclick = fetchAllowedStudents;
}

// Templates logic for colleagues
const tplStats = document.getElementById('tpl-stats');
const tplViz = document.getElementById('tpl-viz');

const loadTemplate = (title, desc, pairs) => {
    resetAdminForm();
    document.getElementById('ex-title').value = title;
    document.getElementById('ex-desc').value = desc;

    // Clear initial empty pair from resetAdminForm
    qaContainer.innerHTML = '';

    pairs.forEach((p, i) => {
        btnAddQA.click();
        const containers = qaContainer.querySelectorAll('.qa-pair-container');
        const last = containers[containers.length - 1];
        last.querySelector('.ex-qa-start').value = p.start;
        last.querySelector('.ex-qa-solution').value = p.sol;
    });

    // Switch to ADD tab
    document.querySelector('[data-admin-view="view-admin-add"]').click();
    saveStatus.style.display = 'inline-block';
    saveStatus.textContent = "Template chargé !";
    setTimeout(() => saveStatus.style.display = 'none', 2000);
};

if (tplStats) {
    tplStats.onclick = () => {
        loadTemplate(
            "Analyse Descriptive de base",
            "<h3>Consignes</h3><p>Dans cet exercice, utilisez le dataset <code>mtcars</code> pour calculer les statistiques demandées.</p>",
            [
                { start: "# 1. Calculer la moyenne du poids (wt)\nmoyenne <- ", sol: "moyenne <- mean(mtcars$wt)\nprint(moyenne)" },
                { start: "# 2. Calculer la médiane du poids (wt)\nmediane <- ", sol: "mediane <- median(mtcars$wt)\nprint(mediane)" }
            ]
        );
    };
}

if (tplViz) {
    tplViz.onclick = () => {
        loadTemplate(
            "Visualisation de Données",
            "<h3>Objectif</h3><p>Créez des graphiques pour explorer la distribution des données.</p>",
            [
                { start: "# 1. Tracer l'histogramme de mpg\nhist()", sol: "hist(mtcars$mpg, col='steelblue', main='Consommation')" },
                { start: "# 2. Tracer un boxplot de mpg par cylindre (cyl)\nboxplot()", sol: "boxplot(mpg ~ cyl, data=mtcars, main='MPG par Cylindre')" }
            ]
        );
    };
}

btnSeedDb.addEventListener('click', async () => {
    if (!currentUser) return alert("Action réservée aux administrateurs");

    btnSeedDb.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importation...';

    const banque = [
        {
            "theme": "Qualité Agroalimentaire",
            "title": "Teneur en protéines de yaourts",
            "level": "Débutant",
            "description": "<h3>Contexte</h3><p>Une entreprise agroalimentaire mesure la teneur en protéines (g/100g) de 15 lots de yaourts enrichis.</p><p>Les valeurs observées sont : <strong>4.8, 5.1, 4.9, 5.3, 5.0, 4.7, 5.2, 5.4, 4.6, 5.1, 4.9, 5.0, 5.2, 4.8, 5.3</strong></p><h4>Instructions</h4><div class=\"exercise-box\"><ol><li>Créez un vecteur nommé <code>proteines_yaourt</code> contenant ces valeurs.</li><li>Calculez la moyenne.</li><li>Calculez la médiane.</li><li>Calculez l'écart-type.</li><li>Calculez la variance.</li></ol></div>",
            "start_code": "# 1. Créez un vecteur nommé proteines_yaourt contenant ces valeurs\nproteines_yaourt <- \n\n# 2. Calculez la moyenne\n\n\n# 3. Calculez la médiane\n\n\n# 4. Calculez l'écart-type\n\n\n# 5. Calculez la variance\n\n",
            "solution_code": "# 1. Créez un vecteur nommé proteines_yaourt contenant ces valeurs\nproteines_yaourt <- c(4.8, 5.1, 4.9, 5.3, 5.0, 4.7, 5.2, 5.4, 4.6, 5.1, 4.9, 5.0, 5.2, 4.8, 5.3)\n\n# 2. Calculez la moyenne\nmean(proteines_yaourt)\n\n# 3. Calculez la médiane\nmedian(proteines_yaourt)\n\n# 4. Calculez l'écart-type\nsd(proteines_yaourt)\n\n# 5. Calculez la variance\nvar(proteines_yaourt)"
        },
        {
            "theme": "Statistiques Agronomiques",
            "title": "Évaluation",
            "level": "Intermédiaire",
            "description": "<h3>Évaluation agronomique</h3><p>Le rendement (t/ha) a été mesuré sur 12 parcelles : <code>42, 38, 45, 12, 40, 35, 48, 36, 41, 39, 46, 32</code>.</p><h4>Instructions</h4><div class=\"exercise-box\"><ol><li>Créez le vecteur <code>rendement_pdt</code>.</li><li>Calculez les quartiles du rendement avec une seule fonction (quantile).</li><li>Tracez un diagramme en boîte (boxplot) avec le titre \"Dispersion des rendements (Pommes de terre)\", l'axe Y \"Rendement (t/ha)\" et la couleur \"lightgreen\".</li><li>L'analyse montre-t-elle un point aberrant ? (Répondez par <code>print(\"oui\")</code> ou <code>print(\"non\")</code>).</li><li>Tracer l'histogramme de la distribution avec : Titre: \"Distribution des rendements agricoles\", Axe X: \"Classes de rendement (t/ha)\", Axe Y: \"Nombre de parcelles\", Couleur: \"wheat\".</li></ol></div>",
            "start_code": "# Étape 1 : Créer le vecteur rendement_pdt\nrendement_pdt <- \n\n# Étape 2 : Calculer et afficher les quartiles avec une seule fonction\n\n\n# Étape 3 : Tracer le boxplot (titre et couleur)\n\n\n# Étape 4 : Point aberrant ?\n\n\n# Étape 5 : Tracer l'histogramme\n",
            "solution_code": "# Étape 1 : Créer le vecteur rendement_pdt avec les 12 valeurs\nrendement_pdt = c(42, 38, 45, 12, 40, 35, 48, 36, 41, 39, 46, 32)\n\n# Étape 2 : Calculer et afficher les quartiles avec une seule fonction\nquantile(rendement_pdt)\n\n# Étape 3 : Tracer le boxplot avec les titres et la couleur demandés\nboxplot(rendement_pdt, main = \"Dispersion des rendements (Pommes de terre)\", ylab = \"Rendement (t/ha)\", col = \"lightgreen\")\n\n# Étape 4 : Point aberrant ?\nprint(\"oui\")\n\n# Étape 5 : Tracer l'histogramme avec les titres et la couleur demandés\nhist(rendement_pdt, main = \"Distribution des rendements agricoles\", xlab = \"Classes de rendement (t/ha)\", ylab = \"Nombre de parcelles\", col = \"wheat\")"
        },
        {
            "theme": "Statistiques Agronomiques",
            "title": "Influence de la variété sur le rendement du blé",
            "level": "Avancé",
            "description": "<h3>Évaluation agronomique : tests d'hypothèses</h3><p>Un agronome souhaite déterminer si la variété influence le rendement du blé. Deux types de variété sont étudiés : variétés A et B.</p><p>Le rendement du blé (en quintaux par hectare) est mesuré sur 10 parcelles pour chaque variété : varA(68, 70, 69, 71, 72, 70, 69, 71, 70, 68) et \nvarB (55, 80, 60, 78, 52, 85, 58, 82, 50, 88).</p><h4>Instructions</h4><div class=\"exercise-box\"><ol><li>Créez les vecteurs de rendement nommés <code>varA</code> (68, 70, 69, 71, 72, 70, 69, 71, 70, 68) et <code>varB</code> (55, 80, 60, 78, 52, 85, 58, 82, 50, 88).</li><li>Vérifiez la normalité de chaque variété avec le test de Shapiro-Wilk.</li><li>interpréter le résultat de la normalité : taper print (\"la distribution est normale pour les deux variétés\") ou bien print (\"la distribution n'est pas normale pour les deux variétés\")\n.</li><li>Vérifiez l'homogénéité des variances (test de Levene) en utilisant la librairie <code>car</code>.</li><li>interpréter le test de levene : taper print(\"les variances des rendements du blé sont identiques en fonction de la variétés\") ou bien print(\"les variances des rendements du blé ne sont pas identiques en fonction de la variétés\").</li><li>quel test faut utiliser avec les données ? Taper : print(\"Le test classique Student avec var.equal = TRUE\") ou print(\"Le test classique Student avec var.equal = FALSE\").</li><li>Réaliser le test statistique choisi.</li><li>interpréter le résultat avec la fonction print(\"il n'existe pas de différence statistiquement significative entre les rendements moyens du blé en fonction de la variété\") ou bien print(\"il existe une différence statistiquement significative entre les rendements moyens du blé en fonction de la variété\").</li></ol></div>",
            "start_code": "# Étape 1 : créer les vecteurs de rendement nommé varA et varB\n\n\n# Étape 2 : vérifier la normalité de chaque variété\n\n\n# Étape 3 : interpréter le résultat de la normalité avec la fonction print\n# (taper : \"la distribution est normale pour les deux variétés\" ou \"la distribution n'est pas normale pour les deux variétés\")\n\n# Étape 4 : vérifier l'homogénéité des variances (test de Levene)\nlibrary(car)\nleveneTest(c(, ), factor(rep(c(\"\", \"\"), each = )))\n\n# Étape 5 : interpréter le test de levene avec la fonction print(\"les variances des rendements du blé sont identiques en fonction de la variétés\") ou bien print(\"les variances des rendements du blé ne sont pas identiques en fonction de la variétés\")\n\n# Étape 6 : quel test faut utiliser avec les données ?\n# Taper : print(\"Le test classique Student avec var.equal = TRUE\") ou print(\"Le test classique Student avec var.equal = FALSE\")\n\n# Étape 7 : réaliser le test\n\n\n# Étape 8 : interpréter le résultat avec la fonction print(\"il n'existe pas de différence statistiquement significative entre les rendements moyens du blé en fonction de la variété\") ou bien print(\"il existe une différence statistiquement significative entre les rendements moyens du blé en fonction de la variété\")",
            "solution_code": "# Étape 1 : créer les vecteurs de rendement nommé varA et varB\nvarA <- c(68, 70, 69, 71, 72, 70, 69, 71, 70, 68)\nvarB <- c(55, 80, 60, 78, 52, 85, 58, 82, 50, 88)\n\n# Étape 2 : vérifier la normalité de chaque variété\nshapiro.test(varA)\nshapiro.test(varB)\n\n# Étape 3 : interpréter le résultat de la normalité avec la fonction print\nprint(\"la distribution est normale pour les deux variétés\")\n\n# Étape 4 : vérifier l'homogénéité des variances (test de Levene)\nlibrary(car)\nleveneTest(c(varA, varB), factor(rep(c(\"varA\", \"varB\"), each = 10)))\n\n# Étape 5 : interpréter le test de levene avec la fonction print\nprint(\"les variances des rendements du blé sont identiques en fonction de la variétés\")\n\n# Étape 6 : quel test faut utiliser avec données\nprint(\"Le test classique Student avec var.equal = TRUE\")\n\n# Étape 7 : réaliser le test\nt.test(varA, varB, var.equal = TRUE)\n\n# Étape 8 : interpréter le résultat avec la fonction print\nprint(\"il n'existe pas de différence statistiquement significative entre les rendements moyens du blé en fonction de la variété\")"
        }
    ];

    // On supprime d'abord tous les anciens exercices de la base de données
    const { error: deleteError } = await supabase.from('exercices').delete().neq('id', 0);
    if (deleteError) {
        alert("Erreur lors de la suppression des anciens exercices : " + deleteError.message);
        return;
    }

    // Puis on insère la nouvelle banque
    const { error } = await supabase.from('exercices').insert(banque);

    btnSeedDb.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Importer la banque d\'exercices';

    if (error) {
        alert("Erreur: " + error.message);
    } else {
        seedStatus.style.display = 'inline-block';
        setTimeout(() => seedStatus.style.display = 'none', 3000);
        fetchExercices();
    }
});


// ==========================================
// 6. UI LOGIC
// ==========================================
function switchMode(mode) {
    btnAdmin.classList.remove('active');
    btnStudent.classList.remove('active');
    btnScores.classList.remove('active');

    // Cacher par défaut l'accueil
    viewHome.classList.add('hidden-view');
    viewHome.classList.remove('active-view');

    // On suppose qu'on est connecté si on passe par ici, sauf si mode === 'home'
    if (mode === 'home') {
        viewHome.classList.add('active-view');
        viewHome.classList.remove('hidden-view');
        viewStudent.classList.add('hidden-view');
        viewStudent.classList.remove('active-view');
        modeToggle.style.display = 'none';
        chronoContainer.style.display = 'none';
        return;
    }

    // Le workspace principal est toujours affiché.
    viewStudent.classList.add('active-view');
    viewStudent.classList.remove('hidden-view');

    // Afficher le menu seulement pour les admins
    const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
    modeToggle.style.display = isAdmin ? 'flex' : 'none';
    if (!isAdmin) {
        btnScores.style.display = 'none';
        btnAdmin.style.display = 'none';
    } else {
        btnScores.style.display = 'inline-block';
        btnAdmin.style.display = 'inline-block';
    }

    // Dom Elements pour le panneau de gauche
    const headerStudent = document.getElementById('header-student');
    const headerAdmin = document.getElementById('header-admin');
    const headerScores = document.getElementById('header-scores');

    const contentStudent = document.getElementById('content-student');
    const contentAdmin = document.getElementById('content-admin');
    const contentScores = document.getElementById('content-scores');

    // Cacher tout le contenu du panneau gauche par défaut
    headerStudent.style.display = 'none';
    headerAdmin.style.display = 'none';
    headerScores.style.display = 'none';
    contentStudent.style.display = 'none';
    contentAdmin.style.display = 'none';
    contentScores.style.display = 'none';

    if (mode === 'admin') {
        btnAdmin.classList.add('active');
        headerAdmin.style.display = 'flex';
        contentAdmin.style.display = 'block';
        chronoContainer.style.display = 'inline-flex'; // Afficher le chrono aussi pour l'admin
        if (btnSubmit) document.getElementById('btn-submit').style.display = 'none'; // Pas de soumission à la BDD pour l'admin !
    } else if (mode === 'scores') {
        btnScores.classList.add('active');
        headerScores.style.display = 'flex';
        contentScores.style.display = 'block';
        fetchScores();
        chronoContainer.style.display = 'none'; // Cacher chrono pour scores
        if (btnSubmit) document.getElementById('btn-submit').style.display = 'none'; // Pas de soumission ici
    } else if (mode === 'student') {
        btnStudent.classList.add('active');
        headerStudent.style.display = 'flex';
        contentStudent.style.display = 'block';
        chronoContainer.style.display = 'inline-flex'; // Afficher le chrono pour l'étudiant
        if (btnSubmit) document.getElementById('btn-submit').style.display = 'inline-flex'; // Afficher bouton d'envoi
        // Démarrer le vrai horodatage si pas encore fait
        if (!examStartTime) examStartTime = Date.now();
    }
    setTimeout(() => editor.refresh(), 10);
}

btnAdmin.addEventListener('click', () => switchMode('admin'));
btnStudent.addEventListener('click', () => switchMode('student'));
btnScores.addEventListener('click', () => switchMode('scores'));

async function fetchScores() {
    const tableBody = document.getElementById('scores-table-body');
    tableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des scores...</td></tr>`;

    try {
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Aucun score enregistré pour l'instant.</td></tr>`;
            return;
        }

        // Grouping by student to calculate total
        const studentStats = {};
        data.forEach(s => {
            if (!studentStats[s.student_name]) {
                studentStats[s.student_name] = {
                    name: s.student_name,
                    totalEarned: 0,
                    totalPoints: 0,
                    attempts: []
                };
            }
            studentStats[s.student_name].totalEarned += s.earned_points || 0;
            studentStats[s.student_name].totalPoints += s.total_points || 0;
            studentStats[s.student_name].attempts.push(s);
        });

        tableBody.innerHTML = '';

        // We list individual attempts but with a "Total" summary for the student if we wanted to.
        // For now, let's keep the list but add the "View Code" and highlight totals.
        data.forEach(score => {
            const date = new Date(score.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const pct = score.score_pct;
            const scoreColor = pct >= 50 ? '#3fb950' : '#ff7b72';
            const scoreBg = pct >= 50 ? 'rgba(63,185,80,0.12)' : 'rgba(255,123,114,0.12)';

            let timeStr = 'â€”';
            if (score.time_spent_seconds != null) {
                const m = Math.floor(score.time_spent_seconds / 60);
                const s = score.time_spent_seconds % 60;
                timeStr = m > 0 ? `${m}m${s}s` : `${s}s`;
            }

            const studentShort = (score.student_name || 'Anonyme').split('@')[0];
            const titleShort = (score.exercise_title || 'Inconnu').substring(0, 20) + ((score.exercise_title || '').length > 20 ? 'â€¦' : '');

            const stats = studentStats[score.student_name];
            const totalPct = Math.round((stats.totalEarned / stats.totalPoints) * 100);

            const row = `
                <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
                    <td style="padding: 0.55rem 0.5rem; font-size: 0.85rem;" title="${score.student_name || ''}">
                        <strong>${studentShort}</strong><br>
                        <span style="font-size: 0.7rem; color: var(--accent-blue)">Total: ${totalPct}%</span>
                        <span style="font-size: 0.65rem; padding: 1px 4px; border-radius: 3px; font-weight:bold; background: ${totalPct >= 50 ? 'rgba(63,185,80,0.15)' : 'rgba(255,123,114,0.15)'}; color: ${totalPct >= 50 ? '#3fb950' : '#ff7b72'}">
                            ${totalPct >= 50 ? 'Validé' : 'Non validé'}
                        </span>
                    </td>
                    <td style="padding: 0.55rem 0.5rem; color:var(--text-secondary); font-size: 0.85rem;" title="${score.exercise_title || ''}">${titleShort}</td>
                    <td style="padding: 0.55rem 0.5rem; text-align:center;">
                        <span style="font-weight:700; color:${scoreColor}; background:${scoreBg}; padding:2px 6px; border-radius:4px; font-size: 0.85rem;">${pct}%</span>
                    </td>
                    <td style="padding: 0.55rem 0.5rem; text-align:center; font-weight:600; font-size: 0.85rem;">${score.earned_points ?? 'â€”'}/${score.total_points ?? 'â€”'}</td>
                    <td style="padding: 0.55rem 0.5rem; text-align:center; color:var(--accent-blue); font-weight:600; font-size: 0.85rem;">${timeStr}</td>
                    <td style="padding: 0.55rem 0.5rem; text-align:right;">
                        <button class="action-btn secondary" style="padding: 2px 6px; font-size: 0.7rem;" onclick="viewStudentCode('${btoa(unescape(encodeURIComponent(score.submitted_code || "")))}', '${score.student_name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-eye"></i> Code
                        </button>
                    </td>
                </tr>
             `;
            tableBody.innerHTML += row;
        });
    } catch (e) {
        console.error("Erreur chargement scores:", e);
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #ff7b72;">
            <i class="fa-solid fa-triangle-exclamation"></i> Erreur lors du chargement des scores.<br>
            <span style="font-size:0.75rem; opacity:0.8;">Détail : ${e.message}</span><br>
            <span style="font-size:0.7rem;">Note : Avez-vous ajouté la colonne <strong>submitted_code</strong> (TEXT) à la table 'scores' ?</span>
        </td></tr>`;
    }
}

window.viewStudentCode = (base64Code, student) => {
    try {
        const code = decodeURIComponent(escape(atob(base64Code)));
        const modal = document.createElement('div');
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:10000; padding: 2rem;";
        modal.innerHTML = `
            <div style="background:var(--panel-bg); border:1px solid var(--panel-border); border-radius:12px; width:100%; max-width:800px; height:80vh; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <header style="padding:1rem 1.5rem; border-bottom:1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.1rem; color:var(--accent-blue);">Code de ${student}</h3>
                    <button class="action-btn secondary" onclick="this.closest('.modal-overlay-code').remove()" style="padding:0.4rem 0.8rem;"><i class="fa-solid fa-xmark"></i> Fermer</button>
                </header>
                <div style="flex:1; padding:1rem; overflow:auto;">
                    <pre style="margin:0; font-family:var(--font-code); font-size:0.9rem; color:#a5d6ff; line-height:1.5; white-space:pre-wrap; background:rgba(0,0,0,0.3); padding:1rem; border-radius:8px;">${escapeHtml(code || "# Aucun code trouvé")}</pre>
                </div>
            </div>
        `;
        modal.className = 'modal-overlay-code';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    } catch (err) {
        alert("Erreur lors de l'ouverture du code.");
        console.error(err);
    }
};

function appendConsole(html) {
    consoleOutput.innerHTML += html + '\n';
    consoleOutput.parentElement.scrollTop = consoleOutput.parentElement.scrollHeight;
}

outputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        outputTabs.forEach(t => t.classList.remove('active'));
        outputContents.forEach(c => c.classList.remove('active-content'));

        tab.classList.add('active');
        const target = tab.getAttribute('data-target');
        document.getElementById(`${target}-output`).classList.add('active-content');
    });
});


// ==========================================
// 7. WEBR ENGINE (R Execution)
// ==========================================
async function initWebR() {
    try {
        webrStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initialisation de R...';
        webRInstance = new WebR();
        await webRInstance.init();

        webrStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Téléchargement des packages requis...';
        try {
            await webRInstance.installPackages(['car']);
        } catch (pkgErr) {
            console.warn("Erreur lors de l'installation du package car:", pkgErr);
        }

        webrStatus.innerHTML = '<i class="fa-solid fa-check text-success" style="color:var(--success)"></i> Moteur R prêt !';
        btnRun.disabled = false;

        // Initialiser webr pour supporter nativement le mode canvas
        await webRInstance.evalRVoid('webr::canvas(width = 504, height = 504)');

        // Initialisation des données pour les exercices (Food Consumption)
        await webRInstance.evalRVoid(`
            food_consumption <- data.frame(
                food_category = c("Boeuf", "Porc", "Volaille", "Produits laitiers", "Oeufs", "Riz", "Légumineuses", "Boeuf", "Riz", "Boeuf"),
                consumption = c(12.1, 25.4, 18.2, 110.5, 10.2, 35.1, 5.4, 12.1, 35.1, 12.1),
                co2_emissions = c(312.5, 95.2, 24.1, 150.8, 12.3, 40.5, 3.2, 312.5, 40.5, 312.5)
            )
            # Simulation simplifiée de dplyr pour l'exercice si le package n'est pas installé
            if (!require("dplyr", quietly = TRUE)) {
                # Définition du pipe
                \`%>\` <- function(lhs, rhs) {
                    call <- substitute(rhs)
                    call[[2]] <- substitute(lhs)
                    eval(call, parent.frame())
                }
                # Fonction count simulant celle de dplyr
                count <- function(df, ..., sort = FALSE) {
                    vars <- as.character(substitute(list(...))[-1])
                    res <- as.data.frame(table(df[vars]))
                    names(res) <- c(vars, "n")
                    if(sort) res <- res[order(-res$n),]
                    res
                }
            }
        `);
    } catch (e) {
        webrStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:#ff7b72"></i> Erreur: ${e.message}`;
    }
}

initWebR();

btnRun.addEventListener('click', async () => {
    if (!webRInstance) return;

    const code = editor.getValue();
    if (!code.trim()) return;

    btnRun.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exécution...';
    btnRun.disabled = true;

    appendConsole(`<span class="r-code-input">> ${code.split('\n').join('\n> ')}</span>`);

    try {
        let sheltr = await new webRInstance.Shelter();

        try {
            // Nettoyer l'ancien graphique
            plotContainer.innerHTML = '';

            // 1. Exécuter le code normalement pour récupérer la sortie Console
            try {
                const result = await sheltr.captureR(code, {
                    withAutoprint: true,
                    captureStreams: true,
                    captureConditions: false
                });

                let finalOutput = '';
                if (result.output && result.output.length > 0) {
                    result.output.forEach(out => {
                        if (out.type === 'stdout' || out.type === 'stderr') {
                            finalOutput += escapeHtml(out.data) + '\n';
                        }
                    });
                }

                if (finalOutput) {
                    appendConsole(`<span class="r-code-output">${finalOutput}</span>`);
                } else {
                    appendConsole(`<span class="r-code-output">[Code exécuté]</span>`);
                }
            } catch (rErr) {
                appendConsole(`<span class="r-error">Erreur: ${rErr.message}</span>`);
            }

            // 2. Tentons une méthode alternative puissante pour le graphique en passant par un fichier
            // Cela évite les bugs avec les apostrophes (ex: l'histogramme) qui cassaient la syntaxe R
            // On encode en UTF-8 pour supporter les accents (ex: "Évaluation") et on protège par un try() R pour garantir l'exécution de dev.off()
            const codeBytes = new TextEncoder().encode(code);
            await webRInstance.FS.writeFile('/tmp/student_plot.R', codeBytes);
            await webRInstance.evalRVoid(`
                    local({
                       tryCatch({
                           png('/tmp/plot_%03d.png', width=500, height=500);
                           exprs <- try(parse('/tmp/student_plot.R'), silent=TRUE);
                           if (!inherits(exprs, 'try-error')) {
                               for (e in exprs) {
                                   try(eval(e, envir = parent.frame()), silent=TRUE)
                               }
                           }
                           dev.off();
                       }, error=function(e){})
                    })
                 `);
            await webRInstance.evalRVoid(`if(file.exists('/tmp/student_plot.R')) file.remove('/tmp/student_plot.R')`);

            try {
                // Lister tous les fichiers plot_XXX.png créés
                const plotFilesObj = await webRInstance.evalR(`list.files(path = "/tmp", pattern = "^plot_\\\\d+\\\\.png$")`);
                const plotFiles = await plotFilesObj.toArray();

                if (plotFiles && plotFiles.length > 0) {
                    for (const file of plotFiles) {
                        const imgData = await webRInstance.FS.readFile(`/tmp/${file}`);
                        if (imgData && imgData.length > 100) {
                            const blob = new Blob([imgData], { type: "image/png" });
                            const url = URL.createObjectURL(blob);

                            let img = document.createElement("img");
                            img.src = url;
                            img.style.maxWidth = '100%';
                            img.style.borderRadius = '5px';
                            img.style.border = '1px solid var(--panel-border)';
                            img.style.marginBottom = '1rem';
                            plotContainer.appendChild(img);
                        }
                        // Nettoyage interne R du fichier
                        await webRInstance.evalRVoid(`if(file.exists('/tmp/${file}')) file.remove('/tmp/${file}')`);
                    }

                    // Basculer sur l'onglet Graphiques
                    document.querySelector('[data-target="plots"]').click();
                    const placeholder = document.querySelector('.placeholder-text');
                    if (placeholder) placeholder.style.display = 'none';
                }
            } catch (e) {
                // Pas grave, pas de plot png créé (sans doute aucun code graphique exécuté)
                console.warn("Erreur chargement plots:", e);
            }

        } catch (e) {
            appendConsole(`<span class="r-error">Erreur: ${e.message}</span>`);
        } finally {
            await sheltr.purge();
        }

    } catch (error) {
        appendConsole(`<span class="r-error">${error.message}</span>`);
    }

    btnRun.innerHTML = '<i class="fa-solid fa-play"></i> Exécuter';
    btnRun.disabled = false;
});

btnSubmit.addEventListener('click', async () => {
    const code = editor.getValue();
    if (!code.trim() || !webRInstance) return;

    // Verrouiller l'éditeur dans les 2 cas
    editor.setOption('readOnly', 'nocursor');
    btnRun.disabled = true;
    btnSubmit.disabled = true;

    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Correction...';

    // Récupérer la solution attendue
    const index = exerciseSelector.value;
    let expectedCode = '';
    if (index !== "" && exercicesList[index]) {
        expectedCode = exercicesList[index].solution_code || "";
    }

    if (expectedCode === '') {
        exerciseFeedback.style.display = 'block';
        exerciseFeedback.style.backgroundColor = 'rgba(210, 153, 34, 0.2)';
        exerciseFeedback.style.color = '#d29922';
        exerciseFeedback.innerHTML = "<i class=\"fa-solid fa-circle-info\"></i> Exercice libre : il n'y a pas de solution spécifique à valider. Le code est verrouillé.";
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Soumettre';
        return;
    }

    let sheltr = await new webRInstance.Shelter();

    // Nettoyer SEULEMENT la solution attendue (pour se protéger des caractères invisibles copiés-collés en base de données)
    const cleanExpectedCode = expectedCode.replace(/[\u00A0\u200B]/g, ' ');

    try {
        // Exécuter la solution de l'étudiant en bloc unique d'abord (pour vérifier si TOUT est bon d'un coup)
        let outStudent = "";
        try {
            // L'étudiant exécute SON code brut. S'il y a une erreur de syntaxe (ex: â†), ça plantera et sera compté faux.
            const resultStudent = await sheltr.captureR(code, { withAutoprint: true });
            outStudent = resultStudent.output.filter(o => o.type === 'stdout' || o.type === 'stderr').map(o => o.data).join('').trim();
        } catch (execErr) {
            // L'étudiant a fait une erreur de syntaxe ou d'exécution
            appendConsole(`<span class="r-error">âš ï¸ Erreur détectée dans votre code lors de l'évaluation : ${execErr.message}</span>`);
            // outStudent reste vide, on laisse l'évaluation ligne par ligne se faire
        }

        // Idem pour la solution attendue entière
        let outExpected = "";
        try {
            const resultExpected = await sheltr.captureR(cleanExpectedCode, { withAutoprint: true });
            outExpected = resultExpected.output.filter(o => o.type === 'stdout' || o.type === 'stderr').map(o => o.data).join('').trim();
        } catch (exprErr) {
            console.error("Erreur grave dans la solution attendue sauvegardée en base :", exprErr);
        }

        // ============================================================
        // BARÈME : 1 POINT PAR QUESTION
        // Les questions sont séparées par une ligne vide dans la solution.
        // ============================================================

        let totalPoints = 0;
        let earnedPoints = 0;
        let isPerfect = false;

        // Normalise le code : supprime TOUT (commentaires, @pts, espaces, guillemets, assignations)
        const normalizeCode = (str) => {
            return str
                .split('\n')
                .map(l => l
                    .replace(/@[\w#=]+\d*/g, '')   // Supprimer les marqueurs @pts=1, @p#s1, etc.
                    .replace(/#.*/g, '')             // Supprimer les commentaires
                    .trim()
                )
                .filter(l => l !== '')
                .join('')
                .replace(/\s+/g, '')             // Supprimer TOUS les espaces restants
                .replace(/=/g, '<-')             // Normalise l'assignation R
                .replace(/[“”‘’]/g, '"')         // Normalise les guillemets
                .replace(/'/g, '"')
                .trim();
        };

        const codeClean = normalizeCode(code);
        const expectedClean = normalizeCode(cleanExpectedCode);

        // Découpage intelligent par bloc (soit ligne vide, soit commentaire débutant par # Étape ou # 1.)
        const questionBlocks = cleanExpectedCode
            .split(/\n\s*\n|\n(?=\s*#\s*(?:[ÉéEe]tape|Question|\d+[\.\-\)]))/i)
            .map(b => b.trim())
            .filter(b => b !== '');

        // Calcul du total des points (par défaut 1 par bloc, sauf si @pts=X est présent)
        const blockSpecs = questionBlocks.map(block => {
            let pts = 1;
            const match = block.match(/@pts\s*=\s*(\d+)/i);
            if (match) pts = parseInt(match[1]);
            return { raw: block, norm: normalizeCode(block), pts: pts };
        });

        totalPoints = blockSpecs.reduce((sum, b) => sum + b.pts, 0);
        if (totalPoints === 0) totalPoints = 1;

        // DEBUG : afficher dans la console du navigateur pour diagnostic
        console.log('=== CORRECTION DEBUG ===');
        console.log('Nb questions (totalPoints):', totalPoints);
        console.log('Code étudiant normalisé:', codeClean);
        blockSpecs.forEach((spec, i) => {
            console.log(`Bloc ${i+1} normalisé:`, spec.norm);
            console.log(`  -> pts attribués: ${spec.pts}`);
            console.log(`  -> Présent dans code étudiant ?`, codeClean.includes(spec.norm));
        });

        if (codeClean === expectedClean) {
            isPerfect = true;
            earnedPoints = totalPoints;
        } else {
            let studentCodeMut = codeClean;
            blockSpecs.forEach(spec => {
                if (spec.norm && studentCodeMut.includes(spec.norm)) {
                    earnedPoints += spec.pts;
                    studentCodeMut = studentCodeMut.replace(spec.norm, '');
                }
            });
            if (earnedPoints >= totalPoints) isPerfect = true;
        }

        earnedPoints = Number(earnedPoints.toFixed(1));
        const scorePct = Math.round((earnedPoints / totalPoints) * 100);

        // Envoyer le score sur Supabase
        let studentStr = "Étudiant Anonyme";
        if (currentUser && currentUser.email) {
            studentStr = currentUser.email;
        } else {
            studentStr = prompt("Quel est votre Prénom et Nom pour enregistrer votre note ?") || "Étudiant Anonyme";
        }

        const exObj = exercicesList[index];
        const titleEx = exObj ? exObj.title : "Exercice";
        const realId = exObj ? exObj.id : null;

        // Temps passé
        let timeSpentSec = 0;
        if (exerciseStartTimes[index]) {
            timeSpentSec = Math.floor((Date.now() - exerciseStartTimes[index]) / 1000);
            // On le supprime pour le réinitialiser si l'étudiant retente l'exercice depuis 0
            delete exerciseStartTimes[index];
        }

        // Diagnostic logging
        console.log(`[Submit] Index: ${index}, Score: ${scorePct}%, Earned: ${earnedPoints}/${totalPoints}, Perfect: ${isPerfect}`);

        // Insertion dans 'scores'
        try {
            const { error: scoreErr } = await supabase.from('scores').insert([{
                student_name: studentStr,
                exercise_id: realId, // On utilise le vrai ID de l'exercice
                exercise_title: titleEx,
                score_pct: scorePct,
                earned_points: Math.round(earnedPoints),
                total_points: totalPoints,
                time_spent_seconds: timeSpentSec,
                submitted_code: code
            }]);

            if (scoreErr) {
                console.error("Erreur Supabase lors de la sauvegarde :", scoreErr);
                appendConsole(`<span class="r-error">âš ï¸ Votre score n'a pas pu être enregistré automatiquement : ${scoreErr.message}</span>`);
            } else {
                console.log("Score sauvegardé avec succès !");
            }
        } catch (dbErr) {
            console.error("Erreur système sauvegarde :", dbErr);
        }

        // Afficher la console pour le résultat final
        document.querySelector('[data-target="console"]').click();

        exerciseFeedback.style.display = 'none';
        exerciseFeedback.innerHTML = '';

        exerciseFeedback.style.display = 'block';
        if (isPerfect || scorePct === 100) {
            exerciseFeedback.style.backgroundColor = 'rgba(35, 134, 54, 0.2)';
            exerciseFeedback.style.color = '#3fb950';
            exerciseFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Succès parfait ! Score : 100% (${totalPoints}/${totalPoints} pts). Le code est verrouillé.`;
            appendConsole(`<span class="r-code-output" style="color:var(--success)">[CORRECTION : EXACT ! Score 100%]</span>`);
        } else if (earnedPoints > 0) {
            exerciseFeedback.style.backgroundColor = 'rgba(210, 153, 34, 0.2)';
            exerciseFeedback.style.color = '#d29922';
            exerciseFeedback.innerHTML = `<i class="fa-solid fa-circle-info"></i> Partiellement correct. Score : ${scorePct}% (${earnedPoints}/${totalPoints} pts).`;
            appendConsole(`<span class="r-code-output" style="color:#d29922">[CORRECTION : INCOMPLET. Score : ${scorePct}%]</span>`);
        } else {
            exerciseFeedback.style.backgroundColor = 'rgba(248, 81, 73, 0.2)';
            exerciseFeedback.style.color = '#ff7b72';
            exerciseFeedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Incorrect. Score : ${scorePct}% (0/${totalPoints} pts). Le code est verrouillé.`;
            appendConsole(`<span class="r-error">[CORRECTION : FAUX ! Score : ${scorePct}%]</span>`);
        }
    } catch (e) {
        console.error("Submission execution error:", e);
        exerciseFeedback.style.display = 'block';
        exerciseFeedback.style.backgroundColor = 'rgba(248, 81, 73, 0.2)';
        exerciseFeedback.style.color = '#ff7b72';
        exerciseFeedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Erreur lors de l'exécution : ${e.message || 'La réponse est verrouillée.'}`;
    } finally {
        await sheltr.purge();
    }

    btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Soumis';
});

btnReset.addEventListener('click', async () => {
    const i = exerciseSelector.value;

    // Nettoyer la console et le feedback visuel
    document.getElementById('r-console-text').innerHTML = '';
    if (exerciseFeedback) exerciseFeedback.style.display = 'none';
    plotContainer.innerHTML = '';
    const placeholder = document.querySelector('.placeholder-text');
    if (placeholder) placeholder.style.display = 'block';

    // Déverrouiller
    editor.setOption('readOnly', false);
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnRun) btnRun.disabled = false;

    // Vider la mémoire R
    if (webRInstance) {
        try {
            await webRInstance.evalRVoid(`rm(list = ls(all.names = TRUE))`);
            if (i !== "") {
                await webRInstance.evalRVoid(`if(file.exists('/tmp/env_${i}.RData')) file.remove('/tmp/env_${i}.RData')`);
            }
        } catch (err) { }
    }

    if (i !== "" && exercicesList[i]) {
        editor.setValue(exercicesList[i].start_code || "");
        delete studentProgress[i]; // Effacer la mémoire pour cet exercice
    } else {
        editor.setValue('# Sélectionnez un exercice dans le menu de gauche');
    }
});

const btnExportScores = document.getElementById('btn-export-scores');
if (btnExportScores) {
    btnExportScores.addEventListener('click', async () => {
        try {
            btnExportScores.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Export...';

            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                alert("Aucun score à exporter.");
                return;
            }

            // Create CSV content
            const headers = ["Date", "Etudiant", "Exercice", "Score %", "Points Obtenus", "Total Points", "Temps (sec)", "Code Soumis"];
            const rows = data.map(s => [
                new Date(s.created_at).toLocaleString(),
                s.student_name,
                s.exercise_title,
                s.score_pct,
                s.earned_points,
                s.total_points,
                s.time_spent_seconds,
                `"${(s.submitted_code || "").replace(/"/g, '""')}"` // Escape quotes for CSV
            ]);

            const csvContent = [headers, ...rows]
                .map(e => e.join(";")) // Semi-colon for Excel-fr compatibility
                .join("\n");

            // Download trigger
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `scores_examen_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            btnExportScores.innerHTML = '<i class="fa-solid fa-file-excel"></i> Exporter';
        } catch (err) {
            alert("Erreur lors de l'export: " + err.message);
            btnExportScores.innerHTML = '<i class="fa-solid fa-file-excel"></i> Exporter';
        }
    });
}

const btnClearScores = document.getElementById('btn-clear-scores');
if (btnClearScores) {
    btnClearScores.addEventListener('click', async () => {
        if (!confirm("Voulez-vous vraiment supprimer TOUS les scores ? Cette action est irréversible.")) return;

        try {
            btnClearScores.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>...';

            const { error } = await supabase
                .from('scores')
                .delete()
                .not('id', 'is', null);

            if (error) throw error;

            alert("Tableau des scores vidé avec succès.");
            fetchScores();
        } catch (err) {
            alert("Erreur lors de la suppression: " + err.message);
        } finally {
            btnClearScores.innerHTML = '<i class="fa-solid fa-trash-can"></i> Vider';
        }
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}




