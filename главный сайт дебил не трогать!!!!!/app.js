// ELO SNS — ядро: данные, навигация, рейтинги игроков и гильдий, окна статистики
const $ = id => document.getElementById(id);
let curUser = null, isAdmin = false, me = null;
let allPlayers = [], allGuilds = [], playersById = new Map();
let lastByAll = [], shownPeriod = null, streamersList = [], modalBack = null, bansList = [];

const winsAll = p => Number(p.totalWins ?? p.seasonWins) || 0;

// ---------------- навигация ----------------
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = $('page-' + name);
    if (page) page.classList.add('active');
    const navName = name === 'user' ? 'search' : name;
    document.querySelectorAll('.nav-btn[data-page], .bottom-nav [data-page]')
        .forEach(b => b.classList.toggle('active', b.dataset.page === navName));
    $('bottom-more').classList.toggle('active', !['home', 'alltime', 'search', 'profile'].includes(navName));
    $('mobile-menu').classList.remove('open');
    $('burger').textContent = '☰';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'profile' && typeof markNotifsRead === 'function') markNotifsRead();
}
$('burger').addEventListener('click', () => {
    const open = $('mobile-menu').classList.toggle('open');
    $('burger').textContent = open ? '✕' : '☰';
});
$('bottom-more').addEventListener('click', () => $('burger').click());

// ---------------- ранги ТОП-5: 1 алмаз, 2 золото, 3 серебро, 4–5 бронза ----------------
const TIERS = ['diamond', 'gold', 'silver', 'bronze', 'bronze'];
const TIER_NAMES = { diamond: '💎 Алмазный ранг', gold: '🥇 Золотой ранг', silver: '🥈 Серебряный ранг', bronze: '🥉 Бронзовый ранг' };
const PARTICLE = { diamond: '💎', gold: '✦', silver: '✦' };
const tierOf = (i, ok) => (ok && i >= 0 && i < 5) ? TIERS[i] : '';
const tierFor = p => tierOf(lastByAll.findIndex(x => x.id === p.id), (Number(p.elo) || 0) > 0);
const rankClass = (i, tier) => tier ? 'rank r' + (i + 1) : 'rank';

function particles(tier) {
    const g = PARTICLE[tier];
    return g ? [0, 1, 2, 3].map(n => `<i class="pt pt-${n}">${g}</i>`).join('') : '';
}
// p — игрок (нужен, чтобы показать купленные рамку и эффект из магазина)
function avatarBox(src, tier, imgClass = 'table-avatar-square', big = false, p = null) {
    return `<span class="av-wrap ${big ? 'big' : ''} ${tier ? 'tier-' + tier : ''} ${cosClasses(p)}">
        <img class="${imgClass}" src="${esc(src || 'https://via.placeholder.com/80')}" alt="">${particles(tier)}${cosLayer(p)}</span>`;
}
function letterBox(name, tier, big = false, g = null) {
    const t = g ? glTier(guildInfo(g).level) : 0;      // эмблема гильдии растёт с уровнем
    const fx = t >= 4 ? '<i class="gfx"><b></b><b></b><b></b><b></b></i>' : '';
    return `<span class="av-wrap ${big ? 'big' : ''} ${t ? 'glv-' + t : (tier ? 'tier-' + tier : '')}"><span class="g-letter">${esc(String(name || '?').trim().charAt(0).toUpperCase())}</span>${t ? fx : particles(tier)}</span>`;
}
const glvChip = g => `<span class="glv-chip" title="Уровень гильдии">LVL ${guildInfo(g).level}</span>`;

// серия побед: 2+ — огонёк, 4+ — большой, 7+ — пылающий
function streakBadge(n) {
    n = Number(n) || 0;
    if (n < 2) return '';
    const cls = n >= 7 ? 's3' : n >= 4 ? 's2' : 's1';
    return `<span class="streak ${cls}" title="Серия побед"><i class="fl">🔥</i>${n}<b class="em e1"></b><b class="em e2"></b><b class="em e3"></b></span>`;
}

// ---------------- строки таблиц ----------------
function playerRow(p, i, tier, cells) {
    return `<tr data-uid="${esc(p.id)}" class="${tier ? 'row-' + tier : ''}">
        <td class="${rankClass(i, tier)}">${i + 1}</td>
        <td><div class="player-cell ${bnClasses(p)}">${bnLayer(p)}${avatarBox(p.avatarUrl, tier, undefined, false, p)}<span>${esc(p.displayName || p.username)}${awardMini(p)}${streakBadge(p.streak)}</span></div></td>
        ${cells}</tr>`;
}
function guildRow(g, i, tier, cells) {
    return `<tr data-gid="${esc(g.id)}" class="${tier ? 'row-' + tier : ''}">
        <td class="${rankClass(i, tier)}">${i + 1}</td>
        <td><div class="player-cell">${letterBox(g.name, tier, false, g)}<span>${esc(g.name)}${glvChip(g)}</span></div></td>${cells}</tr>`;
}
function fill(id, list, rowFn, cols, empty) {
    $(id).innerHTML = list.length ? list.map(rowFn).join('') : `<tr><td colspan="${cols}" class="empty">${empty}</td></tr>`;
}

function renderResetInfo() {
    const ms = Math.max(0, nextReset() - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
    $('month-reset').textContent = `Статистика месяца обнуляется каждое ${RESET_DAY} число в 00:00 (UTC+6). До сброса: ${d} дн. ${h} ч.`;
}

function renderRanks() {
    const mk = periodKey();
    shownPeriod = mk;
    const P = allPlayers.filter(p => !p.banned), G = allGuilds;
    if (typeof recomputeAwards === 'function') recomputeAwards();
    const num = (o, k) => Number(o[k]) || 0;

    // играли = есть хотя бы один засчитанный матч; зарегистрированные без матчей в таблицы и места не попадают
    const played = P.filter(p => num(p, 'totalGames') > 0);
    // ЗА ВСЁ ВРЕМЯ — накопленный ELO (бесконечный, не обнуляется), дальше победы, меньше поражений, килы.
    const byAll = [...played].sort((a, b) => (num(b, 'elo') - num(a, 'elo')) || (winsAll(b) - winsAll(a)) || (num(a, 'totalLosses') - num(b, 'totalLosses')) || (num(b, 'totalKills') - num(a, 'totalKills')));
    // ЗА МЕСЯЦ — только очки текущего периода, только те, кто играл в этом месяце
    const byMonth = P.filter(p => p.monthKey === mk && num(p, 'mGames') > 0)
        .sort((a, b) => (num(b, 'mElo') - num(a, 'mElo')) || (num(b, 'mWins') - num(a, 'mWins')) || (num(b, 'mKills') - num(a, 'mKills')));
    const gAll = [...G].sort((a, b) => (num(b, 'wins') - num(a, 'wins')) || ((num(b, 'wins') - num(b, 'losses')) - (num(a, 'wins') - num(a, 'losses'))));
    const gMonth = G.filter(g => g.monthKey === mk && num(g, 'mGames') > 0)
        .sort((a, b) => (num(b, 'mWins') - num(a, 'mWins')) || (num(b, 'mKills') - num(a, 'mKills')));
    lastByAll = byAll;

    fill('all-players', byAll, (p, i) => playerRow(p, i, tierOf(i, num(p, 'elo') > 0),
        `<td>${num(p, 'totalGames')}</td><td>${winsAll(p)}</td><td>${num(p, 'totalLosses')}</td><td><span class="badge-elo">${p.elo ?? 0}</span></td>`), 6, 'Пока никто не играл');
    fill('month-players', byMonth, (p, i) => {
        const e = num(p, 'mElo');
        return playerRow(p, i, tierOf(i, num(p, 'mElo') > 0),
            `<td>${num(p, 'mWins')}</td><td>${num(p, 'mKills')}</td><td>${num(p, 'mHeadshots')}</td><td><span class="badge-elo">${e >= 0 ? '+' : ''}${e}</span></td>`);
    }, 6, 'В этом месяце матчей ещё нет');

    fill('all-guilds', gAll, (g, i) => guildRow(g, i, tierOf(i, num(g, 'wins') > 0),
        `<td>${num(g, 'games')}</td><td>${num(g, 'wins')}</td><td>${num(g, 'losses')}</td><td>${num(g, 'kills')}</td><td>${num(g, 'hs')}</td>`), 7, 'Гильдий пока нет');
    fill('month-guilds', gMonth, (g, i) => guildRow(g, i, tierOf(i, num(g, 'mWins') > 0),
        `<td>${num(g, 'mGames')}</td><td>${num(g, 'mWins')}</td><td>${num(g, 'mLosses')}</td><td>${num(g, 'mKills')}</td><td>${num(g, 'mHeadshots')}</td>`), 7, 'В этом месяце матчей ещё нет');

    renderResetInfo();

    const top = byAll[0];
    if (top) {
        $('top1-avatar').src = top.avatarUrl || 'https://via.placeholder.com/120';
        $('top1-player-name').innerHTML = esc(top.displayName || top.username) + streakBadge(top.streak);
        $('top1-player-elo').textContent = '⚡ ' + (top.elo || 0) + ' ELO';
    } else {
        $('top1-player-name').textContent = 'Лидера пока нет';
    }
    $('stat-players').textContent = allPlayers.length;
}

// подвкладки Игроки / Гильдии
document.addEventListener('click', e => {
    const b = e.target.closest('.subtabs button');
    if (!b) return;
    const card = b.closest('.card');
    card.querySelectorAll('.subtabs button').forEach(x => x.classList.toggle('on', x === b));
    card.querySelectorAll('.sub').forEach(s => s.classList.toggle('on', s.dataset.sub === b.dataset.sub));
});

// сменился период (наступило 17 число) — перерисовываем
setInterval(() => { if (periodKey() !== shownPeriod) renderRanks(); else renderResetInfo(); }, 60000);

// ---------------- окна ----------------
function openModal(html, back) {
    if (window.PF) PF.clear();                                  // рамка профиля снимается при смене окна
    $('modal-body').innerHTML = html;
    modalBack = back || null;
    $('modal-back').hidden = !back;
    $('modal').classList.add('open');
    $('modal').querySelector('.modal-card').scrollTop = 0;
}
function closeModal() { $('modal').classList.remove('open'); modalBack = null; }

function statBoxes(p) {
    const games = Number(p.totalGames) || 0, wins = winsAll(p);
    const losses = Number(p.totalLosses ?? Math.max(0, games - wins)) || 0;
    const kills = Number(p.totalKills) || 0, hs = Number(p.totalHeadshots) || 0;
    const wr = games ? Math.round(wins / games * 100) : 0, hp = kills ? Math.round(hs / kills * 100) : 0;
    const st = Number(p.streak) || 0;
    const b = (n, l, c = '') => `<div class="pm-box ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
    return `<div class="pm-grid">${b(games, 'МАТЧЕЙ')}${b(wins, 'ПОБЕД', 'green')}${b(losses, 'ПОРАЖЕНИЙ', 'red')}${b(wr + '%', 'ВИНРЕЙТ')}
        ${b(kills, 'КИЛЛОВ', 'cyan')}${b(hs, 'ХЕДШОТОВ', 'gold')}${b(hp + '%', 'HS %')}${b(p.elo ?? 0, 'ELO', 'cyan')}
        ${b('🔥 ' + st, 'СЕРИЯ ПОБЕД', st >= 2 ? 'fire' : '')}${b('🔥 ' + (Number(p.bestStreak) || 0), 'ЛУЧШАЯ СЕРИЯ', 'gold')}
        ${b('🎯 ' + (Number(p.totalAces) || 0), 'ЭЙСЫ', 'pink')}${b('⭐ ' + (Number(p.perfects) || 0), 'ПЕРФЕКТЫ', 'gold')}</div>`;
}

// ---------- история матчей игрока (хранится навсегда) ----------
const histCache = new Map(), histLoading = new Set();
const histNames = list => (list || []).map(o => `<b>${esc(o.name)}</b>${o.k !== undefined ? ` <span class="muted">(${o.k} K · ${o.hs || 0} HS)</span>` : ''}${o.tp ? ' <span class="tag">⚠ ТП</span>' : ''}`).join(', ');
function playerMatchRow(h) {
    if (h.manual) {
        const f = (v, l) => v ? `<span class="tag p">${l} ${v > 0 ? '+' : ''}${v}</span>` : '';
        return `<div class="hist"><div class="top"><b style="color:var(--cyan)">⭐ КОРРЕКТИРОВКА РЕЙТИНГА</b>${f(h.dElo, 'ELO')}${f(h.dWin, 'побед')}${f(h.dLoss, 'поражений')}${f(h.dK, 'киллов')}${f(h.dHs, 'хедшотов')}${f(h.dAce, 'эйсов')}
            <span class="muted" style="margin-left:auto;font-size:12px">${fmtDate(h.ts)}</span></div><small>Причина: ${esc(h.reason || '—')}</small></div>`;
    }
    const foes = h.opponents || [];
    // командный матч: каждый соперник — отдельная запись («победа над А», «победа над Б»…)
    if (foes.length > 1 && !h.duel) return foes.map((f, i) => matchCard(h, [f], i, foes.length)).join('');
    return matchCard(h, foes, 0, 1);
}

function matchCard(h, foes, part, total) {
    const win = h.res === 'win', loss = h.res === 'loss';
    const oppTp = foes.some(o => o.tp) || (total === 1 && h.oppTp);
    const cls = win ? 'win' : loss ? 'loss' : 'draw';
    const title = win ? 'ПОБЕДА' : loss ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    const prep = win ? 'над' : loss ? 'от' : 'с';
    const who = foes.length ? foes.map(o => `<b>${esc(o.name)}</b>${o.tp ? ' <span class="mtag r">ТП</span>' : ''}`).join(', ') : '<span class="muted">не указан</span>';
    const row = (l, v, c = '') => `<div class="mr"><span class="ml">${l}</span><span class="mv ${c}">${v}</span></div>`;
    const first = part === 0;                                   // килы, хедшоты и ELO матча показываем один раз — на первой записи
    const f0 = foes[0] || {};
    const tags = [
        h.duel ? `<span class="mtag">⚔ дуэль 1×1${h.stage ? ' · этап ' + h.stage : ''}</span>` : '',
        total > 1 ? `<span class="mtag">один матч · ${part + 1} из ${total}</span>` : '',
        loss && h.tp ? '<span class="mtag r">⚠ ТП</span>' : '',
        win && oppTp ? '<span class="mtag">⚠ с ТП соперника</span>' : win ? '<span class="mtag g">без ТП</span>' : '',
        first && h.ace ? `<span class="mtag p">🎯 ЭЙС ×${h.ace}</span>` : '',
        first && h.perfect ? '<span class="mtag">⭐ ПЕРФЕКТ</span>' : ''
    ].join('');
    const myK = h.k ?? 0, myH = h.hs ?? 0;
    return `<div class="mcard ${cls}">
        <div class="mh"><span class="mbadge">${title}${foes.length === 1 ? ' ' + prep + ' ' + esc(f0.name) : ''}</span><span class="mdate">${fmtDate(h.ts)}</span></div>
        <div class="mb">
            ${row(foes.length > 1 ? 'Соперники' : 'Соперник', who)}
            ${row('Счёт', `${h.my} : ${h.opp}`, 'sc')}
            ${f0.k !== undefined && total > 1 ? row('Его киллы / хедшоты', `${f0.k} / ${f0.hs || 0}`) : ''}
            ${first ? row('Мои киллы', myK, 'k') + row('Мои хедшоты', myH, 'h') : ''}
            ${first && h.eloD !== undefined ? row('ELO', `${h.eloD >= 0 ? '+' : ''}${h.eloD}`, h.eloD >= 0 ? 'up' : 'dn') : ''}
        </div>
        ${tags ? `<div class="mt">${tags}</div>` : ''}
    </div>`;
}

function playerHistHtml(rows) {
    return rows.length ? rows.map(playerMatchRow).join('') : '<p class="muted">Матчей пока нет — история появится после первого одобренного матча.</p>';
}
// блок истории: берёт из кэша, если матчей не прибавилось, иначе подгружает заново
function playerHistBox(p) {
    const c = histCache.get(p.id), games = Number(p.totalGames) || 0;
    const fresh = c && c.games === games;
    if (!fresh && !histLoading.has(p.id)) setTimeout(() => loadPlayerHist(p.id, games), 0);
    return `<h4 class="pm-sub">🕘 История матчей <span class="muted">(кого победил и кому проиграл)</span></h4>
        <div class="ph-list" data-ph="${esc(p.id)}">${c ? playerHistHtml(c.rows) : '<p class="muted">Загрузка…</p>'}</div>`;
}
async function loadPlayerHist(pid, games) {
    histLoading.add(pid);
    try {
        const s = await db.collection('players').doc(pid).collection('history').get();
        const rows = s.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
        histCache.set(pid, { games, rows });
        document.querySelectorAll('.ph-list').forEach(el => { if (el.dataset.ph === pid) el.innerHTML = playerHistHtml(rows); });
    } catch (e) {
        document.querySelectorAll('.ph-list').forEach(el => { if (el.dataset.ph === pid) el.innerHTML = '<p class="muted">Не удалось загрузить историю.</p>'; });
    }
    histLoading.delete(pid);
}

function openPlayerModal(id) {
    const p = playersById.get(id);
    if (!p) return;
    const idx = lastByAll.findIndex(x => x.id === id);
    const tier = tierFor(p);
    openModal(`
        ${bannerHead(p, `<div class="pm-head">
            ${avatarBox(p.avatarUrl, tier, 'avatar-square', true, p)}
            <div style="min-width:0">
                <h3 class="pm-name">${esc(p.displayName || p.username)}${streakBadge(p.streak)}</h3>
                <div class="muted">${esc(p.username || '')}</div>
                <div class="pm-tier ${tier ? 'tier-' + tier : ''}">${tier ? TIER_NAMES[tier] : idx >= 0 ? 'Место в рейтинге: #' + (idx + 1) : 'Пока не в рейтинге — нет сыгранных матчей'}</div>
            </div>
        </div>`)}
        ${statBoxes(p)}
        ${playerHistBox(p)}
        <button class="btn btn-sm" style="margin-top:16px" data-open-user="${esc(p.id)}">👤 Открыть профиль и видео</button>`);
    if (window.PF) PF.apply(p);                                 // рамка, купленная и надетая игроком
}

const histRow = h => {
    const win = h.res === 'win', loss = h.res === 'loss';
    return `<div class="hist ${h.res}">
        <div class="top"><b style="color:var(--${win ? 'green' : loss ? 'red' : 'muted'})">${win ? 'ПОБЕДА' : loss ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ'}</b>
        <span class="sc">${h.my} : ${h.opp}</span>${h.tp ? '<span class="tag">⚠ ТП</span>' : ''}${h.eloD !== undefined ? `<span class="tag p">ELO ${h.eloD >= 0 ? '+' : ''}${h.eloD}</span>` : ''}
        ${h.ace ? `<span class="tag p">🎯 ЭЙС ×${h.ace}</span>` : ''}${h.perfect ? '<span class="tag">⭐ ПЕРФЕКТ</span>' : ''}
        <span class="muted" style="margin-left:auto;font-size:12px">${fmtDate(h.ts)}</span></div>
        <small>${h.k !== undefined ? `Киллы: <b>${h.k}</b> · Хедшоты: <b style="color:var(--gold)">${h.hs}</b><br>` : `Киллы команды: <b>${h.kills}</b> · Хедшоты: <b style="color:var(--gold)">${h.hs}</b><br>`}
        ${h.opponents ? 'Соперники: ' + h.opponents.map(o => `${esc(o.name)} (${o.k}/${o.hs} HS)`).join(', ') : ''}
        ${h.players ? 'Состав: ' + h.players.map(o => `${esc(o.name)} (${o.k}/${o.hs} HS)`).join(', ') + '<br>Против: ' + (h.enemyPlayers || []).map(o => `${esc(o.name)} (${o.k}/${o.hs} HS)`).join(', ') : ''}</small></div>`;
};

function openGuildModal(gid) {
    const g = allGuilds.find(x => x.id === gid);
    if (!g) return;
    const idx = [...allGuilds].sort((a, b) => ((b.wins || 0) - (a.wins || 0))).findIndex(x => x.id === gid);
    const tier = tierOf(idx, (g.wins || 0) > 0);
    const games = g.games || 0, wr = games ? Math.round((g.wins || 0) / games * 100) : 0, hp = g.kills ? Math.round((g.hs || 0) / g.kills * 100) : 0;
    const b = (n, l, c = '') => `<div class="pm-box ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
    const vs = Object.entries(g.vs || {}).map(([k, v]) => ({ k, ...v })).sort((a, c) => ((c.w || 0) - (a.w || 0)) || ((a.l || 0) - (c.l || 0)));
    openModal(`
        <div class="pm-head">${letterBox(g.name, tier, true, g)}
            <div><h3 class="pm-name">${esc(g.name)} ${glvChip(g)}</h3><div class="pm-tier ${tier ? 'tier-' + tier : ''}">${tier ? TIER_NAMES[tier] : 'Гильдия'}</div></div></div>
        ${(() => { const gi = guildInfo(g); return `<div class="pm-box" style="margin-bottom:14px;text-align:left"><b>Уровень ${gi.level} / 100 · ${GL_NAMES[glTier(gi.level)]}</b>
            <div class="glv-bar"><i style="width:${gi.pct}%"></i></div>
            <small class="muted">Опыт ${Math.round(gi.xp)}: победы ${gi.xpWin} · матчи ${gi.xpGames} · киллы/хедшоты ${gi.xpKills} · оформление игроков (${gi.members} чел.) ${gi.cos}.<br>
            Чем больше побед и чем круче анимированные баннеры, рамки и эффекты у игроков гильдии — тем быстрее растёт уровень и эмблема.</small></div>`; })()}
        <div class="pm-grid">${b(games, 'МАТЧЕЙ')}${b(g.wins || 0, 'ПОБЕД', 'green')}${b(g.losses || 0, 'ПОРАЖЕНИЙ', 'red')}${b(wr + '%', 'ВИНРЕЙТ')}
            ${b(g.kills || 0, 'КИЛЛОВ', 'cyan')}${b(g.hs || 0, 'ХЕДШОТОВ', 'gold')}${b(hp + '%', 'HS %')}${b(g.elo ?? 0, 'ELO', 'cyan')}</div>
        <h4 class="pm-sub">⚔️ Победы и поражения над гильдиями <span class="muted">(нажми на название)</span></h4>
        ${vs.length ? '<div class="pm-guilds">' + vs.map(v => `
            <button class="pm-guild" data-gv="${esc(v.k)}" data-gid="${esc(gid)}" data-name="${esc(v.name)}">
                <span class="gn">${esc(v.name)}</span><span class="gw">✔ ${v.w || 0}</span><span class="gl">✕ ${v.l || 0}</span><span class="go">›</span></button>`).join('') + '</div>'
            : '<p class="muted">Пока нет данных.</p>'}`);
}

async function openGuildVs(gid, ek, name) {
    openModal(`<h3>⚔️ Матчи против <span class="accent">${esc(name)}</span></h3><p class="muted">Загрузка…</p>`, () => openGuildModal(gid));
    try {
        const s = await db.collection('guilds').doc(gid).collection('history').where('enemyKey', '==', ek).get();
        const rows = s.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
        openModal(`<h3>⚔️ Матчи против <span class="accent">${esc(name)}</span></h3>` +
            (rows.length ? rows.map(histRow).join('') : '<p class="muted">Подробной истории пока нет.</p>'), () => openGuildModal(gid));
    } catch (e) { toast('Не удалось загрузить: ' + e.message, 'error'); }
}

document.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-page]'))) return showPage(el.dataset.page);
    if ((el = t.closest('tr[data-uid]'))) return openPlayerModal(el.dataset.uid);
    if ((el = t.closest('tr[data-gid]'))) return openGuildModal(el.dataset.gid);
    if ((el = t.closest('[data-gv]'))) return openGuildVs(el.dataset.gid, el.dataset.gv, el.dataset.name);
    if ((el = t.closest('[data-open-user]'))) { closeModal(); return openUser(el.dataset.openUser); }
    if ((el = t.closest('[data-endlive]'))) return endLive(el.dataset.endlive);
    if (t.id === 'modal' || t.closest('#modal-x')) return closeModal();
    if (t.closest('#modal-back') && modalBack) return modalBack();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ---------------- данные ----------------
function isBannedId(id) {
    id = String(id || '').trim().toLowerCase().replace('@', '');
    return !!id && bansList.some(b => [b.playerId, b.nickname].some(x => String(x || '').trim().toLowerCase().replace('@', '') === id));
}
function syncMe() {
    me = curUser ? (allPlayers.find(p => p.uid === curUser.uid) || null) : null;
    if (me && me.banned) { me = null; auth.signOut(); toast('Аккаунт заблокирован администратором', 'error'); return; }
    if (typeof onMeChanged === 'function') onMeChanged();
    if (typeof onMeExtras === 'function') onMeExtras();
}

auth.onAuthStateChanged(u => {
    curUser = u;
    isAdmin = isAdminUser(u);
    syncMe();
    renderStreamers();
});

db.collection('players').onSnapshot(snap => {
    allPlayers = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    playersById = new Map(allPlayers.map(p => [p.id, p]));
    if (typeof recomputeAwards === 'function') recomputeAwards();
    renderRanks();
    syncMe();
    if (typeof onPlayersChanged === 'function') onPlayersChanged();
}, err => console.error('players', err));

db.collection('guilds').onSnapshot(snap => {
    allGuilds = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    renderRanks();
}, err => console.error('guilds', err));

// ---------------- стримеры ----------------
function renderStreamers() {
    // оформление карточек (YouTube, неон) — в extras.js
    if (typeof xRenderStreamers === 'function') xRenderStreamers(streamersList, curUser, isAdmin);
}
db.collection('streamer_public').onSnapshot(snap => { streamersList = snap.docs.map(d => d.data()); renderStreamers(); });

async function endLive(name) {
    try { await db.collection('streamer_public').doc(name).update({ isLive: false }); toast('Стрим завершён', 'success'); }
    catch (e) { toast('Завершить стрим может только сам стример или админ', 'error'); }
}

// ---------------- баны ----------------
db.collection('bans').onSnapshot(snap => {
    bansList = snap.docs.map(d => d.data());
    $('stat-bans').textContent = snap.size;
    $('banned-players-table').innerHTML = snap.empty
        ? '<tr><td colspan="3" class="empty">Банов нет.</td></tr>'
        : snap.docs.map(d => { const b = d.data(); return `<tr><td>${esc(b.nickname)}</td><td>${esc(b.reason)}</td><td><span class="chip l">Забанен</span></td></tr>`; }).join('');
});

// число публикаций на главной
db.collection('videos').get().then(s => { $('stat-videos').textContent = s.size; }).catch(() => {});
