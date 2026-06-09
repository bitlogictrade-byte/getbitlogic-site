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
    el.style.transition = 'opacity 0.35s ease';
    el.style.opacity = '0';
    setTimeout(() => {
        phraseIdx = (phraseIdx + 1) % phrases.length;
        renderPhrase(phraseIdx);
        el.style.opacity = '1';
    }, 380);
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
            const chartImg = document.getElementById('stageChartImg');
            if (chartImg) chartImg.src = plan === 'pro' ? 'pro.png' : 'basic.png';
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

/* Init */
window.addEventListener('DOMContentLoaded', () => {
    const tw = document.querySelector('.hero-title .tw');
    if (tw) {
        tw.style.display = 'block';
        tw.style.transition = 'opacity 0.35s ease';
    }
    renderPhrase(0);
    setInterval(cyclePhrase, 4200);
    setupTabs();
    setupFaq();
    setupNav();
});
