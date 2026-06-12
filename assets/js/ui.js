/* ── Toast & Confirm UI Utilities ── */

const _TOAST_DURATION = 3000;
const _TOAST_MAX      = 3;

function _getToastContainer() {
    let el = document.getElementById('bl-toast-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'bl-toast-container';
        document.body.appendChild(el);
    }
    return el;
}

function showToast(message, type) {
    const t = type || 'success';
    const container = _getToastContainer();
    const toasts = container.querySelectorAll('.bl-toast');

    // 같은 메시지 중복 제거
    for (let i = 0; i < toasts.length; i++) {
        if (toasts[i].querySelector('.bl-toast-msg')?.textContent === message) return;
    }

    // 최대 3개 초과 시 가장 오래된 것 제거
    if (toasts.length >= _TOAST_MAX) {
        const oldest = toasts[0];
        oldest.classList.add('bl-toast-hide');
        oldest.addEventListener('transitionend', function() { oldest.remove(); }, { once: true });
    }

    const toast = document.createElement('div');
    toast.className = 'bl-toast bl-toast-' + t;

    const iconMap = { success: '✓', error: '✕', info: 'i' };
    const icon = iconMap[t] || 'i';

    toast.innerHTML =
        '<span class="bl-toast-icon">' + icon + '</span>' +
        '<span class="bl-toast-msg">' + message + '</span>' +
        '<button class="bl-toast-close" aria-label="닫기">✕</button>';

    const remove = function() {
        toast.classList.add('bl-toast-hide');
        toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
    };

    toast.querySelector('.bl-toast-close').addEventListener('click', remove);
    container.appendChild(toast);

    void toast.offsetWidth;
    toast.classList.add('bl-toast-show');

    if (t !== 'error') {
        setTimeout(remove, _TOAST_DURATION);
    }
}

function showConfirm(message, options) {
    const opts = options || {};
    const title       = opts.title       || '확인';
    const confirmText = opts.confirmText || '확인';
    const cancelText  = opts.cancelText  || '취소';
    const danger      = opts.danger      || false;

    return new Promise(function(resolve) {
        const overlay = document.createElement('div');
        overlay.className = 'bl-confirm-overlay';

        overlay.innerHTML =
            '<div class="bl-confirm-box">' +
                '<p class="bl-confirm-title">' + title + '</p>' +
                '<p class="bl-confirm-msg">' + message.replace(/\n/g, '<br>') + '</p>' +
                '<div class="bl-confirm-actions">' +
                    '<button class="bl-confirm-cancel">' + cancelText + '</button>' +
                    '<button class="bl-confirm-ok' + (danger ? ' danger' : '') + '">' + confirmText + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        void overlay.offsetWidth;
        overlay.classList.add('active');

        function close(result) {
            overlay.classList.remove('active');
            overlay.addEventListener('transitionend', function() { overlay.remove(); }, { once: true });
            resolve(result);
        }

        overlay.querySelector('.bl-confirm-ok').addEventListener('click', function() { close(true); });
        overlay.querySelector('.bl-confirm-cancel').addEventListener('click', function() { close(false); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(false); });
    });
}
