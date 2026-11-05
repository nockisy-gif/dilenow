// ELO SNS — вкладка «Зарубы»: все матчи гильдий, состав, этапы, кто кого победил, дата окончания и стрим.
// Данные пишет админ при одобрении отчёта (коллекция zaruby). Использует: db, esc, openModal, playersById, openPlayerModal.
(function () {
    const $ = id => document.getElementById(id);
    let list = [], q = '', only = 'all';
    const fmtDT = ts => new Date(ts).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fmtFmt = f => String(f || '').replace('x', '×');
    const winName = z => z.winner === 'left' ? z.left : z.winner === 'right' ? z.right : '';

    db.collection('zaruby').orderBy('ts', 'desc').limit(200).onSnapshot(s => {
        list = s.docs.map(d => ({ ...d.data(), id: d.id }));
        render();
    }, e => { $('zb-list').innerHTML = '<p class="empty">Не удалось загрузить зарубы: ' + esc(e.code || e.message) + '. Опубликуй обновлённые firestore.rules.</p>'; });

    function match(z) {
        if (only === 'draw' && z.winner !== 'draw') return false;
        if (!q) return true;
        const hay = [z.left, z.right, z.streamer].concat((z.leftPlayers || []).map(p => p.name), (z.rightPlayers || []).map(p => p.name)).join(' ').toLowerCase();
        return hay.includes(q);
    }

    function render() {
        const box = $('zb-list'); if (!box) return;
        const rows = list.filter(match);
        $('zb-count').textContent = list.length ? `Всего заруб: ${list.length}` : '';
        if (!rows.length) { box.innerHTML = `<p class="empty">${list.length ? 'Ничего не найдено' : 'Заруб пока нет — они появятся после первого одобренного матча.'}</p>`; return; }
        box.innerHTML = rows.map(z => {
            const w = z.winner;
            return `<div class="zb-card" role="button" tabindex="0" data-zb="${esc(z.id)}">
                <div class="zb-top"><span class="zb-date">🕒 ${esc(fmtDT(z.ts))}</span>${z.format ? `<span class="zb-fmt">${esc(fmtFmt(z.format))}</span>` : ''}${z.matchesInReport > 1 ? `<span class="zb-fmt">матч ${z.matchNo} из ${z.matchesInReport}</span>` : ''}</div>
                <div class="zb-vs">
                    <span class="zb-g l ${w === 'left' ? 'win' : w === 'right' ? 'lose' : ''}">${esc(z.left || '—')}${w === 'left' ? '<i>🏆</i>' : ''}</span>
                    <span class="zb-score">${Number(z.l) || 0} : ${Number(z.r) || 0}</span>
                    <span class="zb-g r ${w === 'right' ? 'win' : w === 'left' ? 'lose' : ''}">${esc(z.right || '—')}${w === 'right' ? '<i>🏆</i>' : ''}</span>
                </div>
                <div class="zb-bot"><span class="zb-st">🎙 ${esc(z.streamer || 'стример не указан')}</span>
                    ${z.streamUrl ? `<a class="zb-yt" href="${esc(z.streamUrl)}" target="_blank" rel="noopener noreferrer">▶ Стрим на YouTube</a>` : ''}
                    <span class="zb-more">Подробнее ›</span></div>
            </div>`;
        }).join('');
    }

    // ---------- окно с подробностями ----------
    const pName = (p, withLink) => {
        const nm = esc(p.tp === 'anon' ? 'Аноним' : p.name);
        return p.pid && withLink && typeof playersById !== 'undefined' && playersById.has(p.pid) ? `<a href="#" class="zb-pl" data-zbp="${esc(p.pid)}">${nm}</a>` : nm;
    };
    function rosterTable(z, list, who) {
        const noDuels = !(z.duels || []).length;
        const teamWon = z.winner === (who === 'l' ? 'left' : 'right'), draw = z.winner === 'draw';
        const rows = (list || []).map(p => {
            let res;
            if (p.tp) res = '<span class="zb-r lose">⚠ ТП</span>';
            else if (noDuels) res = draw ? '<span class="zb-r">ничья</span>' : teamWon ? '<span class="zb-r win">✔ победа команды</span>' : '<span class="zb-r lose">✖ поражение команды</span>';
            else res = (p.w ? `<span class="zb-r win">✔ ${p.w}</span>` : '') + (p.lo ? `<span class="zb-r lose">✖ ${p.lo}</span>` : '') || '<span class="zb-r muted">—</span>';
            return `<tr><td>${pName(p, true)}${p.guest ? ' <small class="muted">гость</small>' : ''}</td><td>${p.k}</td><td class="hs">${p.hs}</td><td>${res}</td></tr>`;
        }).join('');
        return `<table class="zb-tbl"><thead><tr><th>Игрок</th><th>K</th><th>HS</th><th>Итог</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">Состав не указан</td></tr>'}</tbody></table>`;
    }
    function duelLine(x) {
        const a = x.l, b = x.r, win = x.w === 'l' ? a : b, lose = x.w === 'l' ? b : a;
        const st = p => `<span class="zb-k">${p.k}K · ${p.hs}HS</span>`;
        const nm = p => esc(p.tp === 'anon' ? 'Аноним' : p.name) + (p.tp ? ' <small>(ТП)</small>' : '');
        return `<div class="zb-duel"><span class="zb-w">✔ <b>${nm(win)}</b> ${st(win)}</span><span class="zb-arrow">победил</span><span class="zb-lz">✖ ${nm(lose)} ${st(lose)}</span></div>`;
    }
    function openZaruba(id) {
        const z = list.find(x => x.id === id); if (!z) return;
        const sumK = l => (l || []).reduce((a, p) => a + (Number(p.k) || 0), 0), sumH = l => (l || []).reduce((a, p) => a + (Number(p.hs) || 0), 0);
        const stages = z.stages || [], duels = z.duels || [];
        const stageBlocks = stages.length ? stages.map(s => `
            <div class="zb-stage"><div class="zb-sh"><b>Этап ${s.n}</b><span class="zb-ss">${esc(z.left)} <b>${s.l} : ${s.r}</b> ${esc(z.right)}</span></div>
                ${duels.filter(d => d.stage === s.n).map(duelLine).join('')}</div>`).join('')
            : `<p class="muted">Подробные дуэли по этапам в этом матче не записаны — показан итоговый счёт и составы.</p>`;
        const head = z.winner === 'draw' ? '🤝 Ничья' : `🏆 Победила гильдия «${esc(winName(z))}»`;
        openModal(`
            <div class="zb-mh">
                <div class="zb-mv"><span class="zb-g l ${z.winner === 'left' ? 'win' : z.winner === 'right' ? 'lose' : ''}">${esc(z.left)}</span>
                    <span class="zb-score big">${Number(z.l) || 0} : ${Number(z.r) || 0}</span>
                    <span class="zb-g r ${z.winner === 'right' ? 'win' : z.winner === 'left' ? 'lose' : ''}">${esc(z.right)}</span></div>
                <div class="zb-res">${head}</div>
                <div class="zb-meta"><span>🕒 Закончилась: <b>${esc(fmtDT(z.ts))}</b></span>
                    ${z.format ? `<span>⚔ Формат: <b>${esc(fmtFmt(z.format))}</b></span>` : ''}
                    ${z.matchesInReport > 1 ? `<span>Матч ${z.matchNo} из ${z.matchesInReport}</span>` : ''}
                    <span>🎙 Стрим вёл: <b>${esc(z.streamer || '—')}</b></span></div>
                ${z.streamUrl ? `<a class="btn btn-sm zb-watch" href="${esc(z.streamUrl)}" target="_blank" rel="noopener noreferrer">▶ Смотреть на YouTube</a>` : ''}
            </div>
            <h4 class="pm-sub">📊 Этапы и счёт</h4>
            ${stageBlocks}
            <h4 class="pm-sub">👥 Составы <span class="muted">(✔ — выигранные дуэли, ✖ — проигранные; нажми на ник, чтобы открыть профиль)</span></h4>
            <div class="zb-rosters">
                <div class="zb-team l"><div class="zb-th">${esc(z.left)} <span class="muted">· ${sumK(z.leftPlayers)}K · ${sumH(z.leftPlayers)}HS</span></div>${rosterTable(z, z.leftPlayers, 'l')}</div>
                <div class="zb-team r"><div class="zb-th">${esc(z.right)} <span class="muted">· ${sumK(z.rightPlayers)}K · ${sumH(z.rightPlayers)}HS</span></div>${rosterTable(z, z.rightPlayers, 'r')}</div>
            </div>`);
    }

    document.addEventListener('click', e => {
        const pl = e.target.closest('[data-zbp]');
        if (pl) { e.preventDefault(); if (typeof openPlayerModal === 'function') openPlayerModal(pl.dataset.zbp); return; }
        if (e.target.closest('.zb-yt')) return;                        // ссылка на YouTube открывается сама
        const c = e.target.closest('[data-zb]'); if (c) openZaruba(c.dataset.zb);
        const f = e.target.closest('[data-zbf]'); if (f) { only = f.dataset.zbf; document.querySelectorAll('[data-zbf]').forEach(b => b.classList.toggle('on', b === f)); render(); }
    });
    document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-zb]')) { e.preventDefault(); openZaruba(e.target.dataset.zb); } });
    const inp = $('zb-search'); if (inp) inp.addEventListener('input', () => { q = inp.value.trim().toLowerCase(); render(); });
})();
