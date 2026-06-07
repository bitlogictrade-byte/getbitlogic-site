/* Rolling hero text */
const phrases = [
    { line1: '시장의 소음을 끄다.', line2: '본질에 몰입 하는 순간.' },
    { line1: '가장 복잡한 데이터를', line2: '정교한 직관으로.' },
    { line1: '차트 뒤에 숨겨진 흐름', line2: '데이터로 읽다.' },
];
let phraseIdx = 0;

function renderPhrase(idx) {
    const el = document.querySelector('.hero-title .tw');
    if (!el) return;
    el.innerHTML =
        `<span class="line-white">${phrases[idx].line1}</span>` +
        `<span class="line-cyan">${phrases[idx].line2}</span>`;
}

function cyclePhrase() {
    const el = document.querySelector('.hero-title .tw');
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        phraseIdx = (phraseIdx + 1) % phrases.length;
        renderPhrase(phraseIdx);
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    }, 350);
}

/* Plan tabs */
function setupTabs() {
    document.querySelectorAll('.plan-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const plan = tab.dataset.plan;
            document.getElementById('planBasic').classList.toggle('hidden', plan !== 'basic');
            document.getElementById('planPro').classList.toggle('hidden', plan !== 'pro');
        });
    });
}

/* FAQ accordion */
function setupFaq() {
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
            const answer = btn.nextElementSibling;
            if (answer) answer.classList.toggle('open', !expanded);
        });
    });
}

/* Mobile nav */
function setupNav() {
    const hamburger = document.getElementById('navHamburger');
    const mobile = document.getElementById('navMobile');
    if (!hamburger || !mobile) return;
    hamburger.addEventListener('click', () => {
        mobile.classList.toggle('open');
    });
    mobile.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => mobile.classList.remove('open'));
    });
}

/* Modal */
function setupModal() {
    const loginModal  = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    if (!loginModal || !signupModal) return;

    function openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    function closeAll() {
        closeModal(loginModal);
        closeModal(signupModal);
    }

    /* Triggers */
    ['navLoginBtn', 'mobileLoginBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', e => { e.preventDefault(); openModal(loginModal); });
    });

    /* Close buttons */
    document.getElementById('modalClose')?.addEventListener('click', () => closeModal(loginModal));
    document.getElementById('signupModalClose')?.addEventListener('click', () => closeModal(signupModal));

    /* Switch between login / signup */
    document.getElementById('switchToSignup')?.addEventListener('click', () => { closeModal(loginModal); openModal(signupModal); });
    document.getElementById('switchToLogin')?.addEventListener('click', () => { closeModal(signupModal); openModal(loginModal); });

    /* Overlay click to close */
    [loginModal, signupModal].forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeAll(); });
    });

    /* Esc key */
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

    /* Password toggle */
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.setAttribute('aria-label', input.type === 'password' ? '비밀번호 보기' : '비밀번호 숨기기');
        });
    });

    /* Login form submit (placeholder) */
    document.getElementById('loginForm')?.addEventListener('submit', e => {
        e.preventDefault();
        alert('로그인 기능은 준비 중입니다.');
    });

    /* Signup form submit (placeholder) */
    document.getElementById('signupForm')?.addEventListener('submit', e => {
        e.preventDefault();
        alert('회원가입 기능은 준비 중입니다.');
    });
}

/* Init */
window.addEventListener('DOMContentLoaded', () => {
    const tw = document.querySelector('.hero-title .tw');
    if (tw) {
        tw.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        tw.style.display = 'block';
    }
    renderPhrase(0);
    setInterval(cyclePhrase, 4200);
    setupTabs();
    setupFaq();
    setupNav();
    setupModal();
});
