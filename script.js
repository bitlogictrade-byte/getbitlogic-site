const phrases = [
    { line1: '시장의 소음을 끄다.', line2: '본질에 몰입' },
    { line1: '가장 복잡한 데이터를', line2: '정교한 직관으로' },
    { line1: '차트 뒤에 숨겨진 흐름', line2: '데이터로 읽다.' }
];
let currentPhrase = 0;

function updateRollingText(element, phrase) {
    element.innerHTML = `<span class="line-white">${phrase.line1}</span><br><span class="line-gradient">${phrase.line2}</span>`;
}

function startRollingText() {
    const rollingText = document.getElementById('rollingText');
    if (!rollingText) return;

    updateRollingText(rollingText, phrases[currentPhrase]);

    const cycle = () => {
        rollingText.style.opacity = '0';
        rollingText.style.transform = 'translateY(-8px)';

        setTimeout(() => {
            currentPhrase = (currentPhrase + 1) % phrases.length;
            updateRollingText(rollingText, phrases[currentPhrase]);
            rollingText.style.opacity = '1';
            rollingText.style.transform = 'translateY(0)';
            setTimeout(cycle, 3800);
        }, 320);
    };

    setTimeout(cycle, 4200);
}

window.addEventListener('DOMContentLoaded', startRollingText);
