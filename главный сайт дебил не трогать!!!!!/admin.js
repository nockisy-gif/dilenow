const $ = id => document.getElementById(id);
let unsubs = [];
const state = { streamers: [], pub: new Map() };

// ---------- вход администратора ----------
$('btn-admin-login').addEventListener('click', async () => {
    try {
        await auth.signInWithEmailAndPassword($('admin-email').value.trim(), $('admin-pass').value);
    } catch (e) {
        const hints = {
            'auth/operation-not-allowed': 'В Firebase не включён вход по Email/Password',
            'auth/user-not-found': 'Такого пользователя нет в Firebase Authentication',
            'auth/invalid-credential': 'Неверная почта или пароль',
            'auth/wrong-password': 'Неверный пароль',
            'auth/invalid-email': 'Некорректная почта',
            'auth/too-many-requests': 'Слишком много попыток — подожди несколько минут',
            'auth/network-request-failed': 'Нет связи с Firebase'
        };
        toast(hints[e.code] || ('Ошибка входа: ' + (e.code || e.message)), 'error');
    }
});
$('btn-admin-logout').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    const ok = isAdminUser(user);
    $('admin-login').style.display = ok ? 'none' : 'block';
    $('admin-panel').style.display = ok ? 'block' : 'none';
    unsubs.forEach(u => u()); unsubs = [];
    if (user && !ok) toast('Этот аккаунт не администратор. Войди под почтой админа.', 'error');
    if (!ok) return;
    const err = box => e => { $(box).innerHTML = '<p class="empty">Нет доступа: ' + esc(e.code || e.message) +
        '.<br>Проверь, что в firestore.rules и storage.rules вместо ТВОЯ_ПОЧТА стоит ' + esc(user.email) + ' и правила опубликованы.</p>'; };
    unsubs.push(db.collection('reports').where('status', '==', 'pending').onSnapshot(renderReports, err('reports-list')));
    unsubs.push(db.collection('streamers').onSnapshot(s => { state.streamers = s.docs.map(d => ({ ...d.data(), key: d.id })); renderStreamers(); }, err('streamers-admin')));
    unsubs.push(db.collection('streamer_public').onSnapshot(s => { state.pub = new Map(s.docs.map(d => [d.id, d.data()])); renderStreamers(); }));
    unsubs.push(db.collection('complaints').onSnapshot(renderComplaints, err('complaints-list')));
    unsubs.push(db.collection('videos').orderBy('ts', 'desc').limit(40).onSnapshot(renderVideos, err('videos-admin')));
    unsubs.push(db.collection('bans').onSnapshot(renderBans));
});

// ---------- доступ стримеров (привязка к профилю) ----------
$('btn-add-key').addEventListener('click', async () => {
    const pid = $('streamer-player').value.trim().replace('@', '').toLowerCase();
    const key = $('streamer-secret').value.trim();
    if (!pid || !key) return toast('Укажи профиль игрока и ключ', 'error');
    if (key.includes('/')) return toast('Символ / в ключе запрещён', 'error');
    const ytRaw = $('streamer-yt').value.trim();
    const yt = ytRaw ? ytParse(ytRaw) : null;
    const vkRaw = $('streamer-vk').value.trim(), vk = vkRaw ? safeLink(vkRaw, 'vk') : '';
    if (vkRaw && !vk) return toast('Не похоже на ссылку VK. Пример: https://vk.com/id1 или @имя', 'error');
    if (ytRaw && !yt) return toast('Не похоже на ссылку канала YouTube. Пример: https://youtube.com/@channel', 'error');
    try {
        const ps = await db.collection('players').doc(pid).get();
        if (!ps.exists) return toast('Такого игрока нет — пусть сначала зарегистрируется на сайте', 'error');
        const p = ps.data();
        if (!p.uid) return toast('Игрок ещё не входил после обновления — пусть один раз зайдёт на сайт под своим профилем', 'error');
        const name = String(p.displayName || pid).replace(/\//g, '-');
        const batch = db.batch();
        batch.set(db.collection('streamers').doc(key), { name, playerId: pid, playerUid: p.uid });
        const meta = yt ? await fetchYt(yt) : {};
        batch.set(db.collection('streamer_public').doc(name), { name, playerId: pid, playerUid: p.uid, avatar: p.avatarUrl || '', isLive: false, ytUrl: yt ? yt.base : '', vkUrl: vk, ...meta });
        await batch.commit();
        toast(`Доступ выдан: ${name} (@${pid}). Войти сможет только этот профиль.`, 'success');
        $('streamer-player').value = ''; $('streamer-secret').value = ''; $('streamer-yt').value = ''; $('streamer-vk').value = '';
    } catch (e) { toast('Нет доступа: ' + e.message, 'error'); }
});

// название, аватар и подписчики канала (нужен YT_API_KEY в firebase-config.js)
async function fetchYt(yt) {
    if (!YT_API_KEY || !yt) return {};
    const q = yt.kind === 'handle' ? 'forHandle=' + encodeURIComponent(yt.handle)
        : yt.kind === 'channel' ? 'id=' + encodeURIComponent(yt.handle)
        : yt.kind === 'user' ? 'forUsername=' + encodeURIComponent(yt.handle) : '';
    if (!q) return {};
    try {
        const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&' + q + '&key=' + YT_API_KEY);
        const j = await r.json(), c = j.items && j.items[0];
        if (!c) return {};
        const th = c.snippet.thumbnails || {};
        return { ytChannelId: c.id || '', ytTitle: c.snippet.title || '', ytAvatar: (th.medium || th.default || {}).url || '', ytSubs: c.statistics && !c.statistics.hiddenSubscriberCount ? Number(c.statistics.subscriberCount) || 0 : 0 };
    } catch (e) { return {}; }
}

function renderStreamers() {
    const box = $('streamers-admin');
    if (!state.streamers.length) { box.innerHTML = '<p class="empty">Стримеров пока нет.</p>'; return; }
    box.innerHTML = state.streamers.map(s => {
        const pub = state.pub.get(s.name) || {};
        const live = pub.isLive, yt = pub.ytUrl || '';
        return `<div class="adm-row"><div><b>${esc(s.name)}</b> <span class="muted">@${esc(s.playerId)}</span>
            ${live ? '<span class="live-badge" style="margin-left:8px">● LIVE</span>' : ''}<br><small class="muted">Ключ: ${esc(s.key)}</small> <button class="btn btn-ghost btn-sm" data-copykey="${esc(s.key)}" type="button">📋</button><br>
            <small>${yt ? `▶ <a href="${esc(yt)}" target="_blank" rel="noopener">${esc(yt.replace('https://www.youtube.com/', ''))}</a>` : '<span class="muted">YouTube не указан</span>'}</small></div>
            <div>${live ? `<button class="btn btn-ghost btn-sm" data-endlive="${esc(s.name)}">⏹ Снять LIVE</button> ` : ''}
            <button class="btn btn-ghost btn-sm" data-yt="${esc(s.name)}">▶ Ссылка YouTube</button>
            <button class="btn btn-ghost btn-sm" data-vk="${esc(s.name)}">VK${pub.vkUrl ? ' ✔' : ''}</button>
            <button class="btn btn-red btn-sm" data-revoke="${esc(s.key)}" data-name="${esc(s.name)}">Отозвать доступ</button></div></div>`;
    }).join('');
}
$('streamers-admin').addEventListener('click', async e => {
    const end = e.target.closest('[data-endlive]'), rv = e.target.closest('[data-revoke]'), ytb = e.target.closest('[data-yt]'), vkb = e.target.closest('[data-vk]');
    try {
        if (vkb) {
            const name = vkb.dataset.vk, cur = (state.pub.get(name) || {}).vkUrl || '';
            const raw = prompt('VK профиль стримера ' + name + ' (ссылка или @имя; пусто — убрать):', cur);
            if (raw === null) return;
            const vk = raw.trim() ? safeLink(raw, 'vk') : '';
            if (raw.trim() && !vk) return toast('Не похоже на ссылку VK', 'error');
            await db.collection('streamer_public').doc(name).update({ vkUrl: vk });
            toast(vk ? 'VK сохранён' : 'VK убран', 'success');
        }
        if (ytb) {
            const name = ytb.dataset.yt, cur = (state.pub.get(name) || {}).ytUrl || '';
            const raw = prompt('Ссылка на YouTube-канал стримера ' + name + ' (пусто — убрать):', cur);
            if (raw === null) return;
            const yt = raw.trim() ? ytParse(raw) : null;
            if (raw.trim() && !yt) return toast('Не похоже на ссылку канала YouTube', 'error');
            const meta = yt ? await fetchYt(yt) : { ytTitle: '', ytAvatar: '', ytSubs: 0 };
            await db.collection('streamer_public').doc(name).update({ ytUrl: yt ? yt.base : '', ...meta });
            toast(yt ? 'Ссылка сохранена' : 'Ссылка убрана', 'success');
        }
        if (end) { await db.collection('streamer_public').doc(end.dataset.endlive).update({ isLive: false }); toast('LIVE снят'); }
        if (rv && confirm('Отозвать доступ у ' + rv.dataset.name + '?')) {
            const b = db.batch();
            b.delete(db.collection('streamers').doc(rv.dataset.revoke));
            b.delete(db.collection('streamer_public').doc(rv.dataset.name));
            await b.commit(); toast('Доступ отозван', 'success');
        }
    } catch (err) { toast('Ошибка: ' + err.message, 'error'); }
});
$('btn-end-all').addEventListener('click', async () => {
    const live = [...state.pub.values()].filter(s => s.isLive);
    if (!live.length) return toast('Сейчас никто не в эфире');
    const b = db.batch(); live.forEach(s => b.update(db.collection('streamer_public').doc(s.name), { isLive: false }));
    await b.commit(); toast('LIVE снят со всех', 'success');
});

// ---------- отчёты ----------
function playersTable(list, cls, inv) {
    list = list || [];
    if (!list.length) return '<div class="rp-team ' + cls + '"><p class="muted">Состав не указан</p></div>';
    const mark = p => p.guest ? '👤' : (inv && inv[p.pid] === 'confirmed') ? '✅' : '⚠️';
    return '<div class="rp-team ' + cls + '"><table class="rp-tbl"><thead><tr><th></th><th>Игрок</th><th>Килы</th><th>HS</th><th>Эйс</th></tr></thead><tbody>' +
        list.map(p => `<tr><td>${mark(p)}</td><td>${esc(p.name)}${p.tp ? ` <span class="warn" style="display:inline;padding:1px 6px">⚠ ${esc(tpLabel(p.tp))}</span>` : ''}</td><td>${esc(p.k ?? 0)}</td><td class="hs">${esc(p.hs ?? 0)}</td><td>${esc(p.ace ?? 0)}</td></tr>`).join('') +
        '</tbody></table></div>';
}

// пары 1 на 1: кто с кем играл и кто проиграл (✖ выбыл или ТП)
function duelsBlock(d) {
    const list = (d.type === 'series' ? (d.matches || []).flatMap(m => m.duels || []) : d.duels) || [];
    if (!list.length) return '';
    const nm = p => esc(p.name) + (p.tp ? ' <span class="warn" style="display:inline;padding:1px 6px">ТП</span>' : '') + ' <span class="muted">' + esc(p.k ?? 0) + 'K/' + esc(p.hs ?? 0) + 'HS</span>';
    const mark = (a, b) => (a.tp || a.out) ? '✖' : (b.tp || b.out) ? '🏆' : '•';
    return '<details class="rp-det" open><summary>⚔ Дуэли 1 на 1 (' + list.length + ')</summary>' + list.map(du =>
        '<div>' + mark(du.l, du.r) + ' ' + nm(du.l) + ' <b>vs</b> ' + nm(du.r) + ' ' + mark(du.r, du.l) +
        (!(du.l.tp || du.l.out || du.r.tp || du.r.out) ? ' <span class="muted">(не доиграна — не засчитывается)</span>' : '') + '</div>').join('') + '</details>';
}

async function renderReports(snapshot) {
    const box = $('reports-list');
    if (snapshot.empty) { box.innerHTML = '<p class="empty">Новых отчётов нет.</p>'; return; }
    const docs = snapshot.docs.slice().sort((a, b) => ((b.data().timestamp && b.data().timestamp.seconds) || 0) - ((a.data().timestamp && a.data().timestamp.seconds) || 0));

    // подтверждения участия по каждому стримеру
    const names = [...new Set(docs.map(d => d.data().streamer).filter(Boolean))];
    const invBy = {};
    await Promise.all(names.map(async n => {
        try { const s = await db.collection('match_invites').where('streamer', '==', n).get(); invBy[n] = {}; s.docs.forEach(d => invBy[n][d.data().playerId] = d.data().status); }
        catch (e) { invBy[n] = {}; }
    }));

    box.innerHTML = docs.map(doc => {
        const d = doc.data(), isSeries = d.type === 'series';
        const inv = invBy[d.streamer] || {};
        const when = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toLocaleString('ru') : '';
        let extra = '';
        if (isSeries) {
            extra = '<div class="rp-chips"><span class="rp-chip">Матчей: ' + esc(d.matchesCount) + '</span>' +
                '<span class="rp-chip">Выиграно: ' + esc(d.matchWins) + '</span><span class="rp-chip">Килы: ' + esc(d.totalKills) +
                '</span><span class="rp-chip gold">HS: ' + esc(d.totalHeadshots) + '</span></div>' +
                '<details class="rp-det"><summary>Матчи серии</summary>' +
                (d.matches || []).map((m, i) => `<div>${i + 1}. ${esc(m.left)} <b>${esc(m.l)} : ${esc(m.r)}</b> ${esc(m.right)}${m.sent ? ' <span class="muted">(уже отправлен отдельно)</span>' : ''}</div>`).join('') + '</details>';
        }
        const all = [].concat(d.leftPlayers || [], d.rightPlayers || []);
        const unconf = all.filter(p => !p.guest && inv[p.pid] !== 'confirmed').length;
        return '<div class="report-item"><div class="rp-top"><span class="rp-type ' + (isSeries ? 'series' : '') + '">' + (isSeries ? 'ИТОГ СЕРИИ' : 'МАТЧ') + '</span>' +
            '<span class="muted">' + esc(d.streamer || '') + (when ? ' · ' + esc(when) : '') + '</span></div>' +
            '<p class="rp-score"><span class="a">' + esc(d.myGuild) + '</span> <b>' + esc(d.score) + '</b> <span class="b">' + esc(d.enemyGuild) + '</span></p>' + extra +
            '<div class="rp-grid">' + playersTable(d.leftPlayers, 'l', inv) + playersTable(d.rightPlayers, 'r', inv) + '</div>' + duelsBlock(d) +
            (unconf ? `<p class="warn">⚠️ Не нажали «подтвердить»: ${unconf}. Это не мешает: «Одобрить» засчитает матч ВСЕМ зарегистрированным игрокам, гости и неизвестные ники не меняются.</p>` : '') +
            '<div class="rp-btns"><button class="btn btn-green btn-sm" data-approve-all="' + doc.id + '">✔ Одобрить</button>' +
            (unconf ? '<button class="btn btn-ghost btn-sm" data-approve="' + doc.id + '" title="Старый режим: игроки без подтверждения не получат рейтинг">Только подтвердивших</button>' : '') +
            '<button class="btn btn-red btn-sm" data-reject="' + doc.id + '">✕ Отклонить</button></div></div>';
    }).join('');
}

// ---------- начисление при одобрении ----------
// ---- правила ELO (меняй числа здесь): старт с 0, копится бесконечно. Победа: +25 (+10 за килл, +5 за хедшот). Поражение: -10, килы/хедшоты при поражении ELO НЕ поднимают ----
const ELO_KILL = 10, ELO_HS = 5, ELO_LOSS = 10, ELO_WIN = 25, ELO_MIN = 0;
// ТП ставится стримером у конкретного игрока: игрок получает поражение (−10 ELO) без киллов и хедшотов
const TP_LABEL = { body3: 'ТП 3 тела', normal: 'ТП обычный', anon: 'ТП аноним (не зашёл)' };
const tpLabel = k => TP_LABEL[k] || 'ТП';

// награда монетами за отчёт (меняй числа здесь)
const COIN = { win: 10, headshot: 2, ace: 10, plus: [5, 10, 15] };
function coinsFor(dl) {
    const net = dl.wins - dl.losses;                           // «в плюсе» = побед больше, чем поражений
    const plus = net >= 3 ? COIN.plus[2] : net === 2 ? COIN.plus[1] : net === 1 ? COIN.plus[0] : 0;
    return dl.wins * COIN.win + dl.hs * COIN.headshot + dl.ace * COIN.ace + plus;
}

// 🍬 конфеты Хэллоуина (временное событие, до 7 ноября 23:59:59 по Бишкеку): за каждый эйс, за серию (отчёт-серия) и стримеру за стрим
const CANDY = { ace: 1, series: 1, stream: 1 };
const CANDY_END = Date.UTC(2026, 10, 7, 18, 0, 0);
const candyOn = () => Date.now() < CANDY_END;

const parseScore = s => { const m = String(s || '').match(/(\d+)\s*:\s*(\d+)/); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };
const normPlayers = list => (list || []).map(p => typeof p === 'string' ? { name: p, k: 0, hs: 0 } : p).filter(p => p && p.name);

function reportMatches(d) {
    if (d.type === 'series' && Array.isArray(d.matches)) {
        return d.matches.filter(m => !m.sent).map(m => ({
            l: Number(m.l) || 0, r: Number(m.r) || 0, leftName: m.left, rightName: m.right,
            left: normPlayers(m.leftPlayers), right: normPlayers(m.rightPlayers), duels: Array.isArray(m.duels) ? m.duels : [], format: m.format || ''
        }));
    }
    const [l, r] = parseScore(d.score);
    return [{ l, r, leftName: d.myGuild, rightName: d.enemyGuild, left: normPlayers(d.leftPlayers || d.players), right: normPlayers(d.rightPlayers), duels: Array.isArray(d.duels) ? d.duels : [], format: d.format || '' }];
}

// разбираем отчёт: игроки (ELO, победы, серии, эйсы, история) и гильдии
function analyze(d) {
    const pm = new Map(), gm = new Map();
    const base = Date.now();
    const brief = list => list.map(p => ({ name: p.name, k: p.tp ? 0 : Number(p.k) || 0, hs: p.tp ? 0 : Number(p.hs) || 0, tp: p.tp || '' }));

    reportMatches(d).forEach((m, mi) => {
        const ts = base + mi;
        const lres = m.l > m.r ? 'win' : m.l < m.r ? 'loss' : 'draw';
        const rres = lres === 'win' ? 'loss' : lres === 'loss' ? 'win' : 'draw';
        const sides = [
            { res: lres, my: m.l, opp: m.r, name: String(m.leftName || '').trim(), en: String(m.rightName || '').trim(), mates: m.left, foes: m.right },
            { res: rres, my: m.r, opp: m.l, name: String(m.rightName || '').trim(), en: String(m.leftName || '').trim(), mates: m.right, foes: m.left }
        ];
        // новые отчёты: игроки играют 1 на 1 — результат считается по дуэли, а не по счёту гильдий
        const hasDuels = m.duels.length > 0;
        sides.forEach(s => {
            const perfect = s.res === 'win' && s.opp === 0 && s.my > 0;
            const foes = brief(s.foes), mates = brief(s.mates);
            // игроки (старые отчёты без пар — по счёту команды)
            if (!hasDuels) s.mates.forEach(p => {
                const key = String(p.name).trim().toLowerCase();
                const x = pm.get(key) || { name: p.name, pid: p.pid, guest: !!p.guest, elo: 0, wins: 0, losses: 0, games: 0, k: 0, hs: 0, ace: 0, perfects: 0, seq: [], hist: [] };
                const tp = p.tp || '';                                   // ТП: игроку засчитано поражение, килы не считаются
                const pres = tp ? 'loss' : s.res, pk = tp ? 0 : Number(p.k) || 0, ph = tp ? 0 : Number(p.hs) || 0, pa = tp ? 0 : Number(p.ace) || 0;
                x.games++; x.k += pk; x.hs += ph; x.ace += pa;
                x.seq.push(pres);
                // ELO игрока считается только по его собственному матчу (гильдии на него не влияют):
                // победа поднимает (+ килы и хедшоты), поражение всегда снижает на фиксированное значение
                let d = 0;
                if (pres === 'win') { d = ELO_WIN + pk * ELO_KILL + ph * ELO_HS; x.wins++; if (perfect) x.perfects++; }
                else if (pres === 'loss') { d = -ELO_LOSS; x.losses++; }
                else d = pk * ELO_KILL + ph * ELO_HS;
                x.elo += d;
                // история навсегда: кого победил / кому проиграл, счёт, с ТП или без
                const oppTp = foes.some(f => f.tp);
                x.hist.push({ ts, res: pres, my: s.my, opp: s.opp, k: pk, hs: ph, ace: pa, perfect: perfect && !tp,
                    opponents: foes, mates, eloD: d, tp, oppTp });
                pm.set(key, x);
            });
            // гильдия
            if (s.name) {
                const gk = guildKey(s.name);
                const g = gm.get(gk) || { key: gk, name: s.name, elo: 0, wins: 0, losses: 0, games: 0, kills: 0, hs: 0, vs: {}, hist: [] };
                const gk2 = mates.reduce((a, p) => a + p.k, 0), gh2 = mates.reduce((a, p) => a + p.hs, 0);
                g.games++; g.kills += gk2; g.hs += gh2; g.elo += gk2 * ELO_KILL + gh2 * ELO_HS;
                if (s.res === 'win') { g.wins++; g.elo += ELO_WIN; }
                if (s.res === 'loss') { g.losses++; g.elo -= ELO_LOSS; }
                if (s.en && s.res !== 'draw') {
                    const ek = guildKey(s.en), v = g.vs[ek] || { name: s.en, w: 0, l: 0 };
                    if (s.res === 'win') v.w++; else v.l++;
                    g.vs[ek] = v;
                }
                g.hist.push({ ts, enemy: s.en, enemyKey: guildKey(s.en), res: s.res, my: s.my, opp: s.opp,
                    kills: mates.reduce((a, p) => a + p.k, 0), hs: mates.reduce((a, p) => a + p.hs, 0), players: mates, enemyPlayers: foes });
                gm.set(gk, g);
            }
        });
        if (hasDuels) duelsFor(m, mi);
    });
    return { players: pm, guilds: gm };

    // ---- дуэли 1 на 1: проиграл тот, кто выбыл (✖) или получил ТП; соперник ТП выигрывает без боя; недоигранные пары не считаются ----
    function duelsFor(m, mi) {
        m.duels.forEach((du, di) => {
            const ts = base + mi * 1000 + di;
            [[du.l, du.r], [du.r, du.l]].forEach(([me, foe]) => {
                if (!me || !foe || !me.name) return;
                const meLost = !!(me.tp || me.out), foeLost = !!(foe.tp || foe.out);
                if (!meLost && !foeLost) return;
                const pres = meLost ? 'loss' : 'win';
                const pk = me.tp ? 0 : Number(me.k) || 0, ph = me.tp ? 0 : Number(me.hs) || 0, pa = me.tp ? 0 : Number(me.ace) || 0;
                const fk = foe.tp ? 0 : Number(foe.k) || 0, fh = foe.tp ? 0 : Number(foe.hs) || 0;
                const key = String(me.name).trim().toLowerCase();
                const x = pm.get(key) || { name: me.name, pid: me.pid, guest: !!me.guest, elo: 0, wins: 0, losses: 0, games: 0, k: 0, hs: 0, ace: 0, perfects: 0, seq: [], hist: [] };
                x.games++; x.k += pk; x.hs += ph; x.ace += pa; x.seq.push(pres);
                let d = 0;
                if (pres === 'win') { d = ELO_WIN + pk * ELO_KILL + ph * ELO_HS; x.wins++; }
                else { d = -ELO_LOSS; x.losses++; }
                x.elo += d;
                const opp = { name: foe.name, k: fk, hs: fh, tp: foe.tp || '' };
                x.hist.push({ ts, res: pres, my: pk, opp: fk, k: pk, hs: ph, ace: pa, perfect: false, opponent: opp, opponents: [opp],
                    eloD: d, tp: me.tp || '', oppTp: !!foe.tp, duel: true, stage: du.stage || 1 });
                pm.set(key, x);
            });
        });
    }
}

function applyStreak(s0, b0, seq) {
    let s = s0, b = b0;
    seq.forEach(r => { if (r === 'win') { s++; if (s > b) b = s; } else if (r === 'loss') s = 0; });
    return [s, b];
}

async function approveReport(reportId, allowAll) {
    await autoAwards().catch(() => {});
    const reportRef = db.collection('reports').doc(reportId);
    const r0 = (await reportRef.get()).data() || {};
    const inv = {};
    if (r0.streamer) (await db.collection('match_invites').where('streamer', '==', r0.streamer).get()).docs.forEach(d => inv[d.data().playerId] = d.data().status);

    const snap = await db.collection('players').get();
    const ids = new Set(), index = new Map(), bannedIds = new Set();
    snap.docs.forEach(doc => {
        const x = doc.data(); ids.add(doc.id); if (x.banned) bannedIds.add(doc.id);
        [x.displayName, String(x.username || '').replace('@', ''), doc.id].filter(Boolean).forEach(n => index.set(String(n).trim().toLowerCase(), doc.id));
    });

    const result = { updated: [], missing: [], unconfirmed: [], guests: [] };
    const mk = periodKey();
    const pubSnap = r0.streamer ? await db.collection('streamer_public').doc(r0.streamer).get().catch(() => null) : null;
    const pub0 = pubSnap && pubSnap.exists ? pubSnap.data() : {};

    await db.runTransaction(async tx => {
        result.updated = []; result.missing = []; result.unconfirmed = []; result.guests = [];
        const rs = await tx.get(reportRef);
        if (!rs.exists) throw new Error('Отчёт не найден');
        if (rs.data().status !== 'pending') throw new Error('Отчёт уже обработан');

        const { players, guilds } = analyze(rs.data());
        if (!players.size && !guilds.size) throw new Error('В отчёте нет новых матчей с игроками. Если это старый отчёт серии — отклони его, пусть стример отправит заново');

        const todo = [];
        for (const dl of players.values()) {
            if (dl.guest) { result.guests.push(dl.name); continue; }
            const id = (dl.pid && ids.has(dl.pid)) ? dl.pid : index.get(dl.name.trim().toLowerCase());
            if (!id) { result.missing.push(dl.name); continue; }
            if (bannedIds.has(id)) { result.unconfirmed.push(dl.name + ' (бан)'); continue; }
            if (!allowAll && inv[id] !== 'confirmed') { result.unconfirmed.push(dl.name); continue; }
            const ref = db.collection('players').doc(id);
            todo.push({ dl, ref, doc: await tx.get(ref) });
        }
        if (!todo.length && !guilds.size) throw new Error('Некого засчитывать: игроки не подтвердили участие или не найдены. Нажми «Одобрить всех» или отклони отчёт');

        const gtodo = [];
        for (const g of guilds.values()) { const ref = db.collection('guilds').doc(g.key); gtodo.push({ g, ref, doc: await tx.get(ref) }); }

        // ---- записи (после всех чтений) ----
        todo.forEach(({ dl, ref, doc }) => {
            const cur = doc.data() || {};
            const curElo = Number(cur.elo) || 0, newElo = Math.max(ELO_MIN, curElo + dl.elo);
            const curWins = Number(cur.totalWins ?? cur.seasonWins) || 0, curGames = Number(cur.totalGames) || 0;
            const curLosses = Number(cur.totalLosses ?? Math.max(0, curGames - curWins)) || 0;
            const [streak, best] = applyStreak(Number(cur.streak) || 0, Number(cur.bestStreak) || 0, dl.seq);
            const same = cur.monthKey === mk, mv = f => same ? (Number(cur[f]) || 0) : 0;
            const gain = coinsFor(dl);
            const cgain = candyOn() ? dl.ace * CANDY.ace + (rs.data().type === 'series' ? CANDY.series : 0) : 0;
            tx.update(ref, {
                ...(gain && !cur.unlimited ? { coins: (Number(cur.coins) || 0) + gain } : {}),
                ...(cgain ? { candies: (Number(cur.candies) || 0) + cgain } : {}),
                elo: newElo, seasonWins: (Number(cur.seasonWins) || 0) + dl.wins,
                totalWins: curWins + dl.wins, totalLosses: curLosses + dl.losses, totalGames: curGames + dl.games,
                totalKills: (Number(cur.totalKills) || 0) + dl.k, totalHeadshots: (Number(cur.totalHeadshots) || 0) + dl.hs,
                totalAces: (Number(cur.totalAces) || 0) + dl.ace, perfects: (Number(cur.perfects) || 0) + dl.perfects,
                streak, bestStreak: best,
                monthKey: mk, mWins: mv('mWins') + dl.wins, mLosses: mv('mLosses') + dl.losses, mGames: mv('mGames') + dl.games,
                mKills: mv('mKills') + dl.k, mHeadshots: mv('mHeadshots') + dl.hs, mElo: mv('mElo') + (newElo - curElo)
            });
            dl.hist.forEach(h => tx.set(ref.collection('history').doc(), h));
            result.updated.push(`${dl.name} ${dl.elo >= 0 ? '+' : ''}${dl.elo}${gain ? ' · +' + gain + '🪙' : ''}${cgain ? ' · +' + cgain + '🍬' : ''}`);
        });

        // 🍬 стример получает 1 конфету за каждый стрим (одобренный отчёт)
        if (candyOn() && CANDY.stream && pub0.playerId && ids.has(pub0.playerId)) {
            tx.update(db.collection('players').doc(pub0.playerId), { candies: firebase.firestore.FieldValue.increment(CANDY.stream) });
            result.updated.push(`стример ${r0.streamer} · +${CANDY.stream}🍬 за стрим`);
        }

        gtodo.forEach(({ g, ref, doc }) => {
            const cur = doc.exists ? doc.data() : {};
            const vs = { ...(cur.vs || {}) };
            Object.entries(g.vs).forEach(([k, v]) => {
                const o = vs[k] || { name: v.name, w: 0, l: 0 };
                vs[k] = { name: o.name || v.name, w: (o.w || 0) + v.w, l: (o.l || 0) + v.l };
            });
            const curElo = Number(cur.elo) || 0;
            const same = cur.monthKey === mk, mv = f => same ? (Number(cur[f]) || 0) : 0;
            tx.set(ref, {
                name: cur.name || g.name, elo: Math.max(ELO_MIN, curElo + g.elo),
                wins: (Number(cur.wins) || 0) + g.wins, losses: (Number(cur.losses) || 0) + g.losses, games: (Number(cur.games) || 0) + g.games,
                kills: (Number(cur.kills) || 0) + g.kills, hs: (Number(cur.hs) || 0) + g.hs, vs,
                monthKey: mk, mWins: mv('mWins') + g.wins, mLosses: mv('mLosses') + g.losses, mGames: mv('mGames') + g.games,
                mKills: mv('mKills') + g.kills, mHeadshots: mv('mHeadshots') + g.hs
            });
            g.hist.forEach(h => tx.set(ref.collection('history').doc(), h));
        });

        zarubaDocs(reportId, rs.data(), pub0).forEach(z => tx.set(db.collection('zaruby').doc(z.id), z.data));   // для вкладки «Зарубы» на сайте
        tx.update(reportRef, { status: 'approved', approvedAt: new Date(), applied: result.updated, notFound: result.missing, unconfirmed: result.unconfirmed });
    });
    return result;
}

$('reports-list').addEventListener('click', async e => {
    const ok = e.target.closest('[data-approve]'), all = e.target.closest('[data-approve-all]'), no = e.target.closest('[data-reject]');
    const btn = ok || all || no;
    if (!btn) return;
    btn.disabled = true;
    try {
        if (ok || all) {
            const res = await approveReport(all ? all.dataset.approveAll : ok.dataset.approve, !!all);
            toast(`Одобрено. Обновлено игроков: ${res.updated.length}` +
                (res.guests.length ? `. Гости (рейтинг не менялся): ${res.guests.join(', ')}` : '') +
                (res.unconfirmed.length ? `. Пропущены: ${res.unconfirmed.join(', ')}` : '') +
                (res.missing.length ? `. Нет в базе: ${res.missing.join(', ')}` : ''), (res.missing.length || res.unconfirmed.length) ? '' : 'success');
        } else {
            await db.collection('reports').doc(btn.dataset.reject).update({ status: 'rejected' });
            toast('Отчёт отклонён');
        }
    } catch (err) { btn.disabled = false; toast('Ошибка: ' + err.message, 'error'); }
});

// ---------- жалобы с фото и видео ----------
async function renderComplaints(snap) {
    const box = $('complaints-list');
    if (snap.empty) { box.innerHTML = '<p class="empty">Жалоб нет.</p>'; return; }
    const docs = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.ts - a.ts);
    box.innerHTML = docs.map(c => `<div class="report-item" id="cm-${esc(c.id)}">
        <div class="rp-top"><b>На: ${esc(c.target)}</b><span class="muted">от @${esc(c.fromId)} · ${new Date(c.ts).toLocaleString('ru')}</span></div>
        <p>${esc(c.text)}</p><div class="adm-media" data-media="${esc(c.id)}">${(c.media || []).length ? '<span class="muted">Загрузка вложений…</span>' : ''}</div>
        <div class="rp-btns"><button class="btn btn-red btn-sm" data-cdel="${esc(c.id)}">🗑 Удалить жалобу</button></div></div>`).join('');
    for (const c of docs) {
        const holder = box.querySelector(`[data-media="${CSS.escape(c.id)}"]`);
        if (!holder || !(c.media || []).length) continue;
        const parts = await Promise.all(c.media.map(async m => {
            try { const url = m.url || await storage.ref(m.path).getDownloadURL();
                return m.type === 'photo' ? `<a href="${esc(url)}" target="_blank"><img src="${esc(url)}" alt=""></a>` : `<video src="${esc(url)}" controls preload="metadata"></video>`; }
            catch (e) { return '<span class="muted">Файл недоступен</span>'; }
        }));
        holder.innerHTML = parts.join('');
    }
}
$('complaints-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-cdel]');
    if (!b || !confirm('Удалить жалобу и вложения?')) return;
    try {
        const ref = db.collection('complaints').doc(b.dataset.cdel), c = (await ref.get()).data();
        await Promise.all(((c && c.media) || []).map(m => (m.path && storage) ? storage.ref(m.path).delete().catch(() => {}) : null));
        await ref.delete(); toast('Жалоба удалена', 'success');
    } catch (err) { toast('Ошибка: ' + err.message, 'error'); }
});

// ---------- модерация публикаций ----------
function renderVideos(snap) {
    const box = $('videos-admin');
    if (snap.empty) { box.innerHTML = '<p class="empty">Публикаций нет.</p>'; return; }
    box.innerHTML = snap.docs.map(d => { const v = d.data();
        return `<div class="adm-row"><div style="display:flex;gap:10px;align-items:center;min-width:0">
            ${v.kind === 'photo' ? `<img src="${esc(v.url)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px">` : `<video src="${esc(v.url)}#t=0.1" style="width:64px;height:64px;object-fit:cover;border-radius:8px" muted preload="metadata"></video>`}
            <div style="min-width:0"><b>@${esc(v.authorId)}</b> <span class="muted">${v.kind === 'photo' ? 'фото' : 'видео'} · ❤ ${v.likes || 0}</span><br><small class="muted">${esc(v.desc || '')}</small></div></div>
            <button class="btn btn-red btn-sm" data-vdel="${esc(d.id)}" data-path="${esc(v.path || '')}">🗑 Удалить</button></div>`; }).join('');
}
$('videos-admin').addEventListener('click', async e => {
    const b = e.target.closest('[data-vdel]');
    if (!b || !confirm('Удалить публикацию?')) return;
    try {
        const ref = db.collection('videos').doc(b.dataset.vdel);
        const cm = await ref.collection('comments').get();
        if (!cm.empty) { const bt = db.batch(); cm.docs.forEach(d => bt.delete(d.ref)); await bt.commit(); }
        await ref.delete();
        if (b.dataset.path && storage) storage.ref(b.dataset.path).delete().catch(() => {});
        toast('Удалено', 'success');
    } catch (err) { toast('Ошибка: ' + err.message, 'error'); }
});

// ---------- баны: вход закрыт, статистика обнуляется ----------
const ZERO_STATS = {
    elo: 0, seasonWins: 0, totalWins: 0, totalLosses: 0, totalGames: 0, totalKills: 0, totalHeadshots: 0, totalAces: 0, perfects: 0,
    streak: 0, bestStreak: 0, mWins: 0, mLosses: 0, mGames: 0, mKills: 0, mHeadshots: 0, mElo: 0, coins: 0, equipped: {}
};
async function findPlayerDoc(q) {
    q = String(q || '').trim().replace('@', '').toLowerCase();
    if (!q) return null;
    if (!q.includes('/')) { const d = await db.collection('players').doc(q).get(); if (d.exists) return d; }
    const all = await db.collection('players').get();
    return all.docs.find(d => { const x = d.data(); return String(x.displayName || '').trim().toLowerCase() === q || String(x.username || '').replace('@', '').toLowerCase() === q; }) || null;
}
async function wipeHistory(ref) {
    const h = await ref.collection('history').get();
    for (let i = 0; i < h.docs.length; i += 400) { const b = db.batch(); h.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
}
$('btn-ban').addEventListener('click', async () => {
    const nickname = $('ban-player-name').value.trim(), reason = $('ban-player-reason').value.trim() || 'Без причины';
    if (!nickname) return toast('Введите ник!', 'error');
    const btn = $('btn-ban'); btn.disabled = true;
    try {
        const ps = await findPlayerDoc(nickname), d = ps ? ps.data() : null;
        const b = db.batch();
        b.set(db.collection('bans').doc(), {
            nickname: d ? (d.displayName || ps.id) : nickname, playerId: ps ? ps.id : nickname.replace('@', '').toLowerCase(), uid: (d && d.uid) || '', reason, time: new Date()
        });
        if (ps) {
            b.update(ps.ref, { ...ZERO_STATS, banned: true, bannedAt: Date.now() });
            if (d.uid) b.set(db.collection('banned_uids').doc(d.uid), { playerId: ps.id, ts: Date.now() });
        }
        await b.commit();
        if (ps) await wipeHistory(ps.ref);
        $('ban-player-name').value = ''; $('ban-player-reason').value = '';
        toast(ps ? `@${ps.id} забанен: вход закрыт, статистика обнулена` : 'Ник добавлен в бан-лист (профиля с таким юзернеймом нет — зарегистрироваться под ним тоже нельзя)', 'success');
    } catch (e) { toast('Ошибка бана: ' + (e.code || e.message), 'error'); }
    btn.disabled = false;
});
function renderBans(snap) {
    $('bans-admin').innerHTML = snap.docs.map(d => `<div class="adm-row"><span>${esc(d.data().nickname)} <span class="muted">— ${esc(d.data().reason)}</span></span>
        <button class="btn btn-ghost btn-sm" data-unban="${esc(d.id)}">Разбанить</button></div>`).join('');
}
$('bans-admin').addEventListener('click', async e => {
    const b = e.target.closest('[data-unban]');
    if (!b || !confirm('Разбанить? Статистика останется нулевой, ELO вернётся к 500.')) return;
    try {
        const ref = db.collection('bans').doc(b.dataset.unban), bd = (await ref.get()).data() || {};
        const ps = await findPlayerDoc(bd.playerId || bd.nickname);
        const bt = db.batch(); bt.delete(ref);
        if (ps) { bt.update(ps.ref, { banned: false, elo: 500 }); const u = ps.data().uid || bd.uid; if (u) bt.delete(db.collection('banned_uids').doc(u)); }
        await bt.commit(); toast('Разбанен', 'success');
    } catch (err) { toast('Ошибка: ' + (err.code || err.message), 'error'); }
});


// ---------- монеты игроков вручную ----------
async function coinTarget() {
    const id = $('coin-player').value.trim().replace('@', '').toLowerCase();
    if (!id) throw new Error('Укажи юзернейм игрока');
    const ref = db.collection('players').doc(id), snap = await ref.get();
    if (!snap.exists) throw new Error('Игрок не найден');
    return { id, ref, d: snap.data() };
}
const coinLine = d => (d.unlimited ? '♾ безлимит' : (Number(d.coins) || 0) + ' 🪙') + ' · ' + (Number(d.candies) || 0) + ' 🍬 · покупок: ' + ((d.inventory || []).length);
async function coinAction(fn) {
    try { const t = await coinTarget(); const msg = await fn(t); toast(msg, 'success'); const d = (await t.ref.get()).data(); $('coin-status').textContent = '@' + t.id + ': ' + coinLine(d); }
    catch (e) { toast(e.message, 'error'); }
}
function coinAmount() { const n = Math.floor(Number($('coin-amount').value)); if (!(n > 0)) throw new Error('Укажи количество монет'); return n; }
$('btn-coin-add').addEventListener('click', () => coinAction(async t => { const n = coinAmount(); await t.ref.update({ coins: firebase.firestore.FieldValue.increment(n) }); return `Начислено ${n} монет`; }));
$('btn-coin-sub').addEventListener('click', () => coinAction(async t => {
    const n = coinAmount(); await t.ref.update({ coins: Math.max(0, (Number(t.d.coins) || 0) - n) }); return `Списано ${n} монет`;
}));
function candyAmount() { const n = Math.floor(Number($('coin-amount').value)); if (!(n > 0)) throw new Error('Укажи количество (в поле выше)'); return n; }
$('btn-candy-add').addEventListener('click', () => coinAction(async t => { const n = candyAmount(); await t.ref.update({ candies: firebase.firestore.FieldValue.increment(n) }); return `Начислено ${n} конфет`; }));
$('btn-candy-sub').addEventListener('click', () => coinAction(async t => { const n = candyAmount(); await t.ref.update({ candies: Math.max(0, (Number(t.d.candies) || 0) - n) }); return `Списано ${n} конфет`; }));
$('btn-coin-check').addEventListener('click', () => coinAction(async () => 'Баланс обновлён'));
$('btn-coin-inf').addEventListener('click', () => coinAction(async t => { const on = !t.d.unlimited; await t.ref.update({ unlimited: on }); return on ? 'Безлимитный баланс включён' : 'Безлимит выключен'; }));

// ---------- правила сайта ----------
let rules = [{ icon: '📌', title: '', text: '' }];
let rulesLoaded = false;
function renderRulesEditor() {
    $('rules-editor').innerHTML = rules.map((r, i) => `<div class="re-block">
        <div class="re-top"><input type="text" data-rf="icon" data-i="${i}" value="${esc(r.icon)}" maxlength="4" placeholder="🙂" style="text-align:center;font-size:20px">
            <input type="text" data-rf="title" data-i="${i}" value="${esc(r.title)}" placeholder="Заголовок пункта" maxlength="80"></div>
        <textarea data-rf="text" data-i="${i}" placeholder="Текст правила. Строки с «- » станут списком." rows="4">${esc(r.text)}</textarea>
        <div class="re-btns"><button class="btn btn-ghost btn-sm" data-rmove="-1" data-i="${i}">↑</button><button class="btn btn-ghost btn-sm" data-rmove="1" data-i="${i}">↓</button>
            <button class="btn btn-red btn-sm" data-rdel="${i}">🗑 Удалить</button></div></div>`).join('') || '<p class="empty">Пунктов нет — добавь первый.</p>';
}
$('rules-editor').addEventListener('input', e => { const t = e.target; if (t.dataset.rf) rules[Number(t.dataset.i)][t.dataset.rf] = t.value; });
$('rules-editor').addEventListener('click', e => {
    const mv = e.target.closest('[data-rmove]'), dl = e.target.closest('[data-rdel]');
    if (mv) { const i = Number(mv.dataset.i), j = i + Number(mv.dataset.rmove); if (j >= 0 && j < rules.length) { [rules[i], rules[j]] = [rules[j], rules[i]]; renderRulesEditor(); } }
    if (dl && confirm('Удалить этот пункт?')) { rules.splice(Number(dl.dataset.rdel), 1); renderRulesEditor(); }
});
$('btn-rule-add').addEventListener('click', () => { rules.push({ icon: '📌', title: '', text: '' }); renderRulesEditor(); });
$('btn-rules-save').addEventListener('click', async () => {
    const blocks = rules.map(r => ({ icon: (r.icon || '📌').trim(), title: r.title.trim(), text: r.text.trim() })).filter(r => r.title || r.text);
    try { await db.collection('site_content').doc('rules').set({ blocks, updatedAt: Date.now() }); toast('Правила сохранены и уже видны на сайте', 'success'); }
    catch (e) { toast('Не удалось сохранить: ' + (e.code || e.message), 'error'); }
});
auth.onAuthStateChanged(async u => {
    if (!isAdminUser(u) || rulesLoaded) return;
    rulesLoaded = true;
    try {
        const s = await db.collection('site_content').doc('rules').get();
        if (s.exists && Array.isArray(s.data().blocks) && s.data().blocks.length) rules = s.data().blocks.map(b => ({ icon: b.icon || '📌', title: b.title || '', text: b.text || '' }));
        else rules = [
            { icon: '🤝', title: 'Играем честно', text: 'Никаких читов, багов и договорных матчей. Нарушение — бан.' },
            { icon: '📣', title: 'Уважение к соперникам', text: 'Без оскорблений, угроз и токсичности.' },
            { icon: '🎬', title: 'Решение стримера', text: 'Результат матча фиксирует стример. Его решение окончательное.' }
        ];
    } catch (e) {}
    renderRulesEditor();
    if (location.hash === '#rules') setTimeout(() => { const el = $('rules'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 300);
});


// ---------- ключ стримера: генератор и копирование (удобно с телефона) ----------
$('btn-gen-key').addEventListener('click', () => {
    const abc = 'abcdefghjkmnpqrstuvwxyz23456789', a = new Uint32Array(12); crypto.getRandomValues(a);
    $('streamer-secret').value = [...a].map(n => abc[n % abc.length]).join('');
});
const copyText = async t => { try { await navigator.clipboard.writeText(t); toast('Скопировано', 'success'); } catch (e) { prompt('Скопируй вручную:', t); } };
$('btn-copy-key').addEventListener('click', () => { const v = $('streamer-secret').value.trim(); if (v) copyText(v); });
$('streamers-admin').addEventListener('click', e => { const b = e.target.closest('[data-copykey]'); if (b) copyText(b.dataset.copykey); });

// ---------- контакты и группы ----------
$('btn-links-save').addEventListener('click', async () => {
    const f = (id, kind) => { const raw = $(id).value.trim(); if (!raw) return ''; const ok = safeLink(raw, kind); if (!ok) throw new Error('Неверная ссылка: ' + raw); return ok; };
    try {
        const data = { support: f('lnk-support', 'vk'), vk: [f('lnk-vk1', 'vk'), f('lnk-vk2', 'vk')].filter(Boolean), wa: [f('lnk-wa1', 'wa'), f('lnk-wa2', 'wa')].filter(Boolean), updatedAt: Date.now() };
        await db.collection('site_content').doc('links').set(data);
        toast('Ссылки сохранены', 'success');
    } catch (e) { toast(e.message, 'error'); }
});
// ---------- хранилище файлов ----------
$('btn-cld-save').addEventListener('click', async () => {
    const cloudName = $('cld-name').value.trim(), uploadPreset = $('cld-preset').value.trim();
    if (!/^[\w-]*$/.test(cloudName) || !/^[\w-]*$/.test(uploadPreset)) return toast('Cloud name и preset — только буквы, цифры, - и _', 'error');
    try { await db.collection('site_content').doc('media').set({ cloudName, uploadPreset, updatedAt: Date.now() }, { merge: true }); toast(cloudName && uploadPreset ? 'Сохранено — загрузка видео должна заработать' : 'Хранилище очищено', 'success'); }
    catch (e) { toast('Не удалось сохранить: ' + (e.code || e.message), 'error'); }
});
$('btn-ytkey-save').addEventListener('click', async () => {
    const ytKey = $('yt-key').value.trim();
    if (!/^[\w-]*$/.test(ytKey)) return toast('Ключ — только буквы, цифры, - и _', 'error');
    try { await db.collection('site_content').doc('media').set({ ytKey, updatedAt: Date.now() }, { merge: true }); toast(ytKey ? 'Ключ сохранён — эфир будет определяться автоматически' : 'Ключ удалён', 'success'); }
    catch (e) { toast('Не удалось сохранить: ' + (e.code || e.message), 'error'); }
});
// ---------- награды ТОП-3 ----------
async function autoAwards(force) {
    const mk = periodKey(), ref = db.collection('site_content').doc('awards'), cur = await ref.get();
    if (!force && cur.exists && cur.data().period === mk) return false;
    const [y, m] = mk.split('-').map(Number), prev = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
    const n = (o, k) => Number(o[k]) || 0;
    const ps = await db.collection('players').where('monthKey', '==', prev).get();
    const top = ps.docs.map(d => ({ ...d.data(), id: d.id })).filter(p => !p.banned && n(p, 'mElo') > 0)
        .sort((a, b) => (n(b, 'mElo') - n(a, 'mElo')) || (n(b, 'mWins') - n(a, 'mWins')) || (n(b, 'mKills') - n(a, 'mKills'))).slice(0, 3);
    await ref.set({ period: mk, from: prev, until: nextReset().getTime(), top: top.map(p => p.id), names: top.map(p => p.displayName || p.id), ts: Date.now() });
    return true;
}
$('btn-awards').addEventListener('click', async () => {
    try { await autoAwards(true); toast('Награды пересчитаны', 'success'); } catch (e) { toast('Ошибка: ' + (e.code || e.message), 'error'); }
});
let awardsLoaded = false;
auth.onAuthStateChanged(async u => {
    if (!isAdminUser(u) || awardsLoaded) return;
    awardsLoaded = true;
    try {
        const [l, md] = await Promise.all([db.collection('site_content').doc('links').get(), db.collection('site_content').doc('media').get()]);
        const L = l.exists ? l.data() : {}, M = md.exists ? md.data() : {};
        $('lnk-support').value = L.support || ''; $('lnk-vk1').value = (L.vk || [])[0] || ''; $('lnk-vk2').value = (L.vk || [])[1] || '';
        $('lnk-wa1').value = (L.wa || [])[0] || ''; $('lnk-wa2').value = (L.wa || [])[1] || '';
        $('cld-name').value = M.cloudName || ''; $('cld-preset').value = M.uploadPreset || ''; $('yt-key').value = M.ytKey || '';
        await autoAwards().catch(() => {});
    } catch (e) {}
    db.collection('site_content').doc('awards').onSnapshot(s => {
        const d = s.exists ? s.data() : null;
        $('awards-info').textContent = d && d.top && d.top.length ? `Награды месяца ${d.period} (по итогам ${d.from}): ` + d.names.map((n, i) => `${i + 1}. ${n}`).join(' · ') + ' · действуют до ' + new Date(d.until).toLocaleDateString('ru') : 'Сейчас награды получают текущие лидеры месяца — по итогам прошлого периода победителей не было.';
    });
});


// =====================================================================
//  Ручная корректировка рейтинга + удаление игроков
// =====================================================================
const toInt = id => { const n = Math.trunc(Number($(id).value)); return Number.isFinite(n) ? n : 0; };
const statLine = d => `ELO ${Number(d.elo) || 0} · побед ${Number(d.totalWins) || 0} · поражений ${Number(d.totalLosses) || 0} · игр ${Number(d.totalGames) || 0} · киллов ${Number(d.totalKills) || 0} · хедшотов ${Number(d.totalHeadshots) || 0} · эйсов ${Number(d.totalAces) || 0}`;

$('btn-rt-check').addEventListener('click', async () => {
    try {
        const ps = await findPlayerDoc($('rt-player').value);
        if (!ps) return toast('Игрок не найден', 'error');
        const d = ps.data();
        $('rt-status').textContent = `${d.displayName || ps.id} (@${ps.id}): ${statLine(d)}`;
    } catch (e) { toast('Ошибка: ' + (e.code || e.message), 'error'); }
});

$('btn-rt-apply').addEventListener('click', async () => {
    const dl = { elo: toInt('rt-elo'), win: toInt('rt-win'), loss: toInt('rt-loss'), k: toInt('rt-k'), hs: toInt('rt-hs'), ace: toInt('rt-ace') };
    const reason = $('rt-reason').value.trim();
    if (!Object.values(dl).some(Boolean)) return toast('Укажи, что изменить (хотя бы одно число не ноль)', 'error');
    if (reason.length < 3) return toast('Напиши причину — за что меняем рейтинг', 'error');
    const btn = $('btn-rt-apply'); btn.disabled = true;
    try {
        const ps = await findPlayerDoc($('rt-player').value);
        if (!ps) throw new Error('Игрок не найден');
        if (ps.data().banned) throw new Error('Игрок забанен');
        const label = `${ps.data().displayName || ps.id} (@${ps.id})`;
        const txt = [['ELO', dl.elo], ['побед', dl.win], ['поражений', dl.loss], ['киллов', dl.k], ['хедшотов', dl.hs], ['эйсов', dl.ace]]
            .filter(x => x[1]).map(x => `${x[0]} ${x[1] > 0 ? '+' : ''}${x[1]}`).join(', ');
        if (!confirm(`Изменить ${label}:\n${txt}\nПричина: ${reason}`)) { btn.disabled = false; return; }
        const useMonth = $('rt-month').checked, mk = periodKey();
        const by = (auth.currentUser && auth.currentUser.email) || '';
        let after;
        await db.runTransaction(async tx => {
            const snap = await tx.get(ps.ref), cur = snap.data() || {};
            const n = f => Number(cur[f]) || 0, pos = v => Math.max(0, v);
            const curElo = n('elo'), newElo = pos(curElo + dl.elo);
            const wins = pos(Number(cur.totalWins ?? cur.seasonWins) || 0), losses = pos(n('totalLosses'));
            const upd = {
                elo: newElo,
                totalWins: pos(wins + dl.win), seasonWins: pos(n('seasonWins') + dl.win), totalLosses: pos(losses + dl.loss),
                totalGames: pos(n('totalGames') + dl.win + dl.loss),
                totalKills: pos(n('totalKills') + dl.k), totalHeadshots: pos(n('totalHeadshots') + dl.hs), totalAces: pos(n('totalAces') + dl.ace)
            };
            if (useMonth) {
                const same = cur.monthKey === mk, mv = f => same ? (Number(cur[f]) || 0) : 0;
                Object.assign(upd, {
                    monthKey: mk, mWins: pos(mv('mWins') + dl.win), mLosses: pos(mv('mLosses') + dl.loss), mGames: pos(mv('mGames') + dl.win + dl.loss),
                    mKills: pos(mv('mKills') + dl.k), mHeadshots: pos(mv('mHeadshots') + dl.hs), mElo: pos(mv('mElo') + (newElo - curElo))
                });
            }
            tx.update(ps.ref, upd);
            tx.set(ps.ref.collection('history').doc(), { manual: true, ts: Date.now(), reason, dElo: dl.elo, dWin: dl.win, dLoss: dl.loss, dK: dl.k, dHs: dl.hs, dAce: dl.ace, by });
            tx.set(db.collection('rating_log').doc(), { playerId: ps.id, name: cur.displayName || ps.id, reason, ...dl, month: useMonth, by, ts: Date.now() });
            after = { ...cur, ...upd };
        });
        toast('Рейтинг изменён: ' + txt, 'success');
        $('rt-status').textContent = `${label}: ${statLine(after)}`;
        ['rt-elo', 'rt-win', 'rt-loss', 'rt-k', 'rt-hs', 'rt-ace', 'rt-reason'].forEach(i => { $(i).value = ''; });
    } catch (e) { toast(e.message || ('Ошибка: ' + e.code), 'error'); }
    btn.disabled = false;
});

function renderRatingLog(snap) {
    const el = $('rt-log');
    el.innerHTML = snap.docs.length ? snap.docs.map(doc => {
        const d = doc.data();
        const ch = [['ELO', d.elo], ['побед', d.win], ['поражений', d.loss], ['киллов', d.k], ['хедшотов', d.hs], ['эйсов', d.ace]]
            .filter(x => x[1]).map(x => `${x[0]} ${x[1] > 0 ? '+' : ''}${x[1]}`).join(', ');
        return `<div class="adm-row"><span><b>${esc(d.name)}</b> <span class="muted">@${esc(d.playerId)}</span><br>${esc(ch)}<br><span class="muted">Причина: ${esc(d.reason)}${d.by ? ' · ' + esc(d.by) : ''} · ${new Date(d.ts).toLocaleString('ru')}</span></span></div>`;
    }).join('') : '<p class="empty">Пока пусто</p>';
}
let rtUnsub = null;
auth.onAuthStateChanged(user => {
    if (rtUnsub) { rtUnsub(); rtUnsub = null; }
    if (!isAdminUser(user)) return;
    rtUnsub = db.collection('rating_log').orderBy('ts', 'desc').limit(20).onSnapshot(renderRatingLog,
        e => { $('rt-log').innerHTML = '<p class="empty">Нет доступа к журналу: ' + esc(e.code || e.message) + '. Опубликуй обновлённые firestore.rules.</p>'; });
});

// ---------- удаление игроков ----------
let delCache = null;
async function loadDelList(force) {
    if (force || !delCache) {
        $('del-list').innerHTML = '<p class="empty">Загрузка…</p>';
        const s = await db.collection('players').get();
        delCache = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.displayName || a.id).localeCompare(String(b.displayName || b.id), 'ru'));
    }
    renderDelList();
}
function renderDelList() {
    const q = $('del-search').value.trim().toLowerCase().replace('@', '');
    const all = delCache || [];
    const list = all.filter(p => !q || [p.displayName, p.username, p.id].some(v => String(v || '').toLowerCase().replace('@', '').includes(q)));
    $('del-list').innerHTML = list.length
        ? `<p class="muted" style="margin:6px 0">Найдено: ${list.length}${list.length > 40 ? ' (показаны первые 40)' : ''}</p>` + list.slice(0, 40).map(p => `<div class="adm-row">
            <span><b>${esc(p.displayName || p.id)}</b> <span class="muted">@${esc(p.id)} · ELO ${Number(p.elo) || 0} · игр ${Number(p.totalGames) || 0}${p.banned ? ' · забанен' : ''}${p.uid ? '' : ' · не активирован'}</span></span>
            <button class="btn btn-red btn-sm" data-delplayer="${esc(p.id)}">🗑 Удалить</button></div>`).join('')
        : '<p class="empty">Никого не найдено</p>';
}
$('del-search').addEventListener('input', () => loadDelList(false).catch(e => toast('Ошибка: ' + (e.code || e.message), 'error')));
$('btn-del-all').addEventListener('click', () => loadDelList(true).catch(e => toast('Ошибка: ' + (e.code || e.message), 'error')));

async function deletePlayer(id) {
    const ref = db.collection('players').doc(id), snap = await ref.get();
    if (!snap.exists) throw new Error('Профиль уже удалён');
    const d = snap.data();
    const pub = d.uid ? await db.collection('streamer_public').where('playerUid', '==', d.uid).get() : { docs: [] };
    const warn = pub.docs.length ? '\n\n⚠ У игрока есть доступ стримера — он останется, удали его в блоке «Доступ стримеру».' : '';
    if (!confirm(`Удалить игрока «${d.displayName || id}» (@${id}) навсегда?\nБудут удалены профиль, история матчей и бронь имени. Это нельзя отменить.${warn}`)) return false;
    const [keys, invs] = await Promise.all([
        db.collection('name_keys').where('pid', '==', id).get(),
        db.collection('match_invites').where('playerId', '==', id).get().catch(() => ({ docs: [] }))
    ]);
    await wipeHistory(ref);
    const b = db.batch();
    keys.docs.forEach(k => b.delete(k.ref));
    invs.docs.forEach(k => b.delete(k.ref));
    b.delete(ref);
    await b.commit();
    return true;
}
$('del-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-delplayer]'); if (!b) return;
    b.disabled = true;
    try {
        if (await deletePlayer(b.dataset.delplayer)) {
            toast('Игрок удалён — под этим ником можно зарегистрироваться заново', 'success');
            delCache = (delCache || []).filter(p => p.id !== b.dataset.delplayer);
        }
    } catch (err) { toast('Не удалось удалить: ' + (err.code || err.message), 'error'); }
    renderDelList();
});


// =====================================================================
//  Аннуляция матчей и статистики игрока
// =====================================================================
let ann = { ps: null, rows: [] };
const annRes = h => h.res === 'win' ? 'ПОБЕДА' : h.res === 'loss' ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';

function annItem(h, i) {
    if (h.manual) {
        const ch = [['ELO', h.dElo], ['побед', h.dWin], ['поражений', h.dLoss], ['киллов', h.dK], ['хедшотов', h.dHs], ['эйсов', h.dAce]]
            .filter(x => x[1]).map(x => `${x[0]} ${x[1] > 0 ? '+' : ''}${x[1]}`).join(', ');
        return `<label class="adm-row" style="cursor:pointer;align-items:flex-start"><span><input type="checkbox" data-ann="${i}" style="width:auto;margin-right:8px">
            <b>⭐ Ручная корректировка</b> <span class="muted">${new Date(h.ts).toLocaleDateString('ru')}</span><br><small>${esc(ch)} · ${esc(h.reason || '')}</small></span></label>`;
    }
    const foes = h.opponents || (h.opponent ? [h.opponent] : []);
    const prep = h.res === 'win' ? 'над' : h.res === 'loss' ? 'от' : 'с';
    const color = h.res === 'win' ? 'var(--green)' : h.res === 'loss' ? 'var(--red)' : 'var(--muted)';
    const lines = foes.length
        ? foes.map(f => `<div style="margin-left:26px">• ${annRes(h).toLowerCase()} ${prep} <b>${esc(f.name)}</b>${f.tp ? ' <span class="muted">(ТП)</span>' : ''}</div>`).join('')
        : '<div style="margin-left:26px" class="muted">соперник не указан</div>';
    return `<label class="adm-row" style="cursor:pointer;align-items:flex-start"><span><input type="checkbox" data-ann="${i}" style="width:auto;margin-right:8px">
        <b style="color:${color}">${annRes(h)}</b> <span class="muted">${h.my} : ${h.opp} · ${new Date(h.ts).toLocaleDateString('ru')}${h.duel ? ' · дуэль 1×1' : ''}</span>
        <small class="muted"> · K ${h.k || 0} · HS ${h.hs || 0}${h.ace ? ' · эйс ' + h.ace : ''}${h.eloD !== undefined ? ' · ELO ' + (h.eloD >= 0 ? '+' : '') + h.eloD : ''}</small><br>${lines}</span></label>`;
}

async function annLoad() {
    const ps = await findPlayerDoc($('ann-player').value);
    if (!ps) throw new Error('Игрок не найден');
    const s = await ps.ref.collection('history').get();
    ann = { ps, rows: s.docs.map(d => ({ ...d.data(), _id: d.id, _ref: d.ref })).sort((a, b) => b.ts - a.ts) };
    $('ann-status').textContent = `${ps.data().displayName || ps.id} (@${ps.id}): ${statLine(ps.data())}. Записей в истории: ${ann.rows.length}`;
    $('ann-list').innerHTML = ann.rows.length ? ann.rows.map(annItem).join('') : '<p class="empty">История матчей пуста</p>';
    $('ann-actions').hidden = !ann.rows.length;
}
$('btn-ann-load').addEventListener('click', () => annLoad().catch(e => toast(e.message || ('Ошибка: ' + e.code), 'error')));
$('ann-player').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-ann-load').click(); });
$('btn-ann-all-check').addEventListener('click', () => {
    const boxes = [...$('ann-list').querySelectorAll('[data-ann]')], on = boxes.some(b => !b.checked);
    boxes.forEach(b => { b.checked = on; });
});

// серия побед заново по оставшейся истории
function recalcStreak(rows) {
    let s = 0, best = 0;
    rows.filter(h => !h.manual).sort((a, b) => a.ts - b.ts).forEach(h => { if (h.res === 'win') { s++; if (s > best) best = s; } else if (h.res === 'loss') s = 0; });
    return [s, best];
}

$('btn-ann-sel').addEventListener('click', async () => {
    const picked = [...$('ann-list').querySelectorAll('[data-ann]:checked')].map(b => ann.rows[Number(b.dataset.ann)]).filter(Boolean);
    if (!picked.length) return toast('Отметь матчи, которые нужно аннулировать', 'error');
    const label = ann.ps.data().displayName || ann.ps.id;
    if (!confirm(`Аннулировать записей: ${picked.length} у ${label}?\nСтатистика этих матчей будет вычтена, записи удалены из истории.`)) return;
    const btn = $('btn-ann-sel'); btn.disabled = true;
    try {
        const by = (auth.currentUser && auth.currentUser.email) || '';
        const gone = new Set(picked.map(h => h._id));
        const left = ann.rows.filter(h => !gone.has(h._id));
        const [streak, bestStreak] = recalcStreak(left);
        const tot = { elo: 0, win: 0, loss: 0, games: 0, k: 0, hs: 0, ace: 0, perf: 0, m: { win: 0, loss: 0, games: 0, k: 0, hs: 0, elo: 0 } };
        await db.runTransaction(async tx => {
            const snap = await tx.get(ann.ps.ref), cur = snap.data() || {};
            ['elo', 'win', 'loss', 'games', 'k', 'hs', 'ace', 'perf'].forEach(k => { tot[k] = 0; }); Object.keys(tot.m).forEach(k => { tot.m[k] = 0; });   // при повторе транзакции считаем заново
            picked.forEach(h => {
                if (h.manual) {
                    tot.elo += Number(h.dElo) || 0; tot.win += Number(h.dWin) || 0; tot.loss += Number(h.dLoss) || 0; tot.games += (Number(h.dWin) || 0) + (Number(h.dLoss) || 0);
                    tot.k += Number(h.dK) || 0; tot.hs += Number(h.dHs) || 0; tot.ace += Number(h.dAce) || 0;
                    return;
                }
                const w = h.res === 'win' ? 1 : 0, l = h.res === 'loss' ? 1 : 0;
                tot.elo += Number(h.eloD) || 0; tot.win += w; tot.loss += l; tot.games += 1;
                tot.k += Number(h.k) || 0; tot.hs += Number(h.hs) || 0; tot.ace += Number(h.ace) || 0; tot.perf += h.perfect ? 1 : 0;
                if (periodKey(new Date(h.ts)) === cur.monthKey) {              // матч относится к текущему месяцу
                    tot.m.win += w; tot.m.loss += l; tot.m.games += 1; tot.m.k += Number(h.k) || 0; tot.m.hs += Number(h.hs) || 0; tot.m.elo += Number(h.eloD) || 0;
                }
            });
            const n = f => Number(cur[f]) || 0, pos = v => Math.max(0, v);
            const upd = {
                elo: pos(n('elo') - tot.elo),
                totalWins: pos(Number(cur.totalWins ?? cur.seasonWins) - tot.win || 0), seasonWins: pos(n('seasonWins') - tot.win),
                totalLosses: pos(n('totalLosses') - tot.loss), totalGames: pos(n('totalGames') - tot.games),
                totalKills: pos(n('totalKills') - tot.k), totalHeadshots: pos(n('totalHeadshots') - tot.hs), totalAces: pos(n('totalAces') - tot.ace),
                perfects: pos(n('perfects') - tot.perf), streak, bestStreak
            };
            if (cur.monthKey) Object.assign(upd, {
                mWins: pos(n('mWins') - tot.m.win), mLosses: pos(n('mLosses') - tot.m.loss), mGames: pos(n('mGames') - tot.m.games),
                mKills: pos(n('mKills') - tot.m.k), mHeadshots: pos(n('mHeadshots') - tot.m.hs), mElo: n('mElo') - tot.m.elo
            });
            tx.update(ann.ps.ref, upd);
            picked.forEach(h => tx.delete(h._ref));
            tx.set(db.collection('rating_log').doc(), {
                playerId: ann.ps.id, name: cur.displayName || ann.ps.id, reason: `Аннулировано записей: ${picked.length}`, annul: true,
                elo: -tot.elo, win: -tot.win, loss: -tot.loss, k: -tot.k, hs: -tot.hs, ace: -tot.ace, month: true, by, ts: Date.now()
            });
        });
        toast(`Аннулировано записей: ${picked.length}`, 'success');
        await annLoad();
    } catch (e) { toast('Ошибка: ' + (e.message || e.code), 'error'); }
    btn.disabled = false;
});

// полный сброс / сброс месяца
async function annReset(kind) {
    const ps = await findPlayerDoc($('ann-player').value);
    if (!ps) return toast('Игрок не найден', 'error');
    const label = `${ps.data().displayName || ps.id} (@${ps.id})`;
    const full = kind === 'all';
    if (!confirm(full ? `ПОЛНОСТЬЮ обнулить статистику и историю матчей у ${label}?\nELO станет 500. Это нельзя отменить.` : `Обнулить у ${label} статистику за текущий месяц?`)) return;
    const by = (auth.currentUser && auth.currentUser.email) || '';
    const month = { monthKey: periodKey(), mWins: 0, mLosses: 0, mGames: 0, mKills: 0, mHeadshots: 0, mElo: 0 };
    const upd = full
        ? { elo: 500, seasonWins: 0, totalWins: 0, totalLosses: 0, totalGames: 0, totalKills: 0, totalHeadshots: 0, totalAces: 0, perfects: 0, streak: 0, bestStreak: 0, guildStats: {}, ...month }
        : month;
    await ps.ref.update(upd);
    if (full) await wipeHistory(ps.ref);
    await db.collection('rating_log').add({ playerId: ps.id, name: ps.data().displayName || ps.id, reason: full ? 'Полное обнуление статистики' : 'Обнуление статистики месяца', annul: true, month: !full, by, ts: Date.now() });
    toast(full ? 'Статистика и история обнулены' : 'Статистика месяца обнулена', 'success');
    await annLoad().catch(() => {});
}
$('btn-ann-reset').addEventListener('click', () => annReset('all').catch(e => toast('Ошибка: ' + (e.message || e.code), 'error')));
$('btn-ann-month').addEventListener('click', () => annReset('month').catch(e => toast('Ошибка: ' + (e.message || e.code), 'error')));


// =====================================================================
//  «Зарубы»: публичная запись каждого матча (гильдии, состав, этапы, кто кого победил)
// =====================================================================
function zarubaDocs(reportId, d, pub) {
    const ts = d.timestamp && d.timestamp.toMillis ? d.timestamp.toMillis() : (d.approvedAt && d.approvedAt.toMillis ? d.approvedAt.toMillis() : Date.now());
    const yt = pub && pub.ytUrl ? ytParse(pub.ytUrl) : null;
    const N = v => Number(v) || 0, T = v => String(v == null ? '' : v);
    const lost = p => !!(p && (p.tp || p.out));
    const side = p => ({ name: T(p.name), pid: T(p.pid), guest: !!p.guest, k: p.tp ? 0 : N(p.k), hs: p.tp ? 0 : N(p.hs), ace: p.tp ? 0 : N(p.ace), tp: T(p.tp), out: !!p.out });
    const all = reportMatches(d);
    return all.map((m, i) => {
        const duels = [];
        (m.duels || []).forEach(du => {
            if (!du || !du.l || !du.r) return;
            const ll = lost(du.l), rl = lost(du.r);
            if (ll === rl) return;                                       // не доигранные пары в историю не идут
            duels.push({ stage: N(du.stage) || 1, l: side(du.l), r: side(du.r), w: ll ? 'r' : 'l' });
        });
        const stageMap = new Map();
        duels.forEach(x => { const o = stageMap.get(x.stage) || { n: x.stage, l: 0, r: 0 }; o[x.w]++; stageMap.set(x.stage, o); });
        const stages = [...stageMap.values()].sort((a, b) => a.n - b.n);
        const roster = (list, who) => (list || []).map(p => {
            const key = String(p.name).trim().toLowerCase();
            let w = 0, lo = 0;
            duels.forEach(x => { const me = x[who]; if (String(me.name).trim().toLowerCase() === key) { if (x.w === who) w++; else lo++; } });
            return { ...side(p), w, lo };
        });
        const L = N(m.l), R = N(m.r);
        return {
            id: reportId + '_' + (i + 1),
            data: {
                reportId, ts, matchNo: i + 1, matchesInReport: all.length,
                streamer: T(d.streamer), streamUrl: yt ? yt.base + '/streams' : '', streamBase: yt ? yt.base : '',
                left: T(m.leftName), right: T(m.rightName), lg: guildKey(m.leftName), rg: guildKey(m.rightName),
                l: L, r: R, winner: L > R ? 'left' : L < R ? 'right' : 'draw', format: T(m.format),
                stages, duels, leftPlayers: roster(m.left, 'l'), rightPlayers: roster(m.right, 'r')
            }
        };
    });
}

$('btn-zb-backfill').addEventListener('click', async () => {
    const btn = $('btn-zb-backfill'); btn.disabled = true;
    try {
        const reps = await db.collection('reports').where('status', '==', 'approved').get();
        const pubs = new Map((await db.collection('streamer_public').get()).docs.map(d => [d.id, d.data()]));
        let n = 0, batch = db.batch(), ops = 0;
        for (const r of reps.docs) {
            for (const z of zarubaDocs(r.id, r.data(), pubs.get(r.data().streamer))) {
                batch.set(db.collection('zaruby').doc(z.id), z.data); n++;
                if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
            }
        }
        if (ops) await batch.commit();
        $('zb-status').textContent = `Готово: обработано отчётов ${reps.size}, зарубов на сайте: ${n}`;
        toast(`В «Зарубы» добавлено: ${n}`, 'success');
    } catch (e) { toast('Ошибка: ' + (e.code || e.message), 'error'); }
    btn.disabled = false;
});

// =====================================================================
//  Общая аннуляция: за месяц / за всё время — у всех игроков и гильдий
// =====================================================================
async function commitAll(refsOps) {                                 // refsOps: [{ref, upd}|{ref, del:true}]
    for (let i = 0; i < refsOps.length; i += 400) {
        const b = db.batch();
        refsOps.slice(i, i + 400).forEach(o => o.del ? b.delete(o.ref) : b.update(o.ref, o.upd));
        await b.commit();
    }
}
async function globalReset(kind) {
    const full = kind === 'all', st = $('gr-status'), say = t => { st.textContent = t; };
    const word = prompt(full
        ? 'ПОЛНЫЙ СБРОС за всё время у ВСЕХ игроков и гильдий. Это нельзя отменить.\nДля подтверждения введи слово: ОБНУЛИТЬ'
        : 'Обнулить статистику ЗА МЕСЯЦ у всех игроков и гильдий.\nДля подтверждения введи слово: ОБНУЛИТЬ');
    if (word === null) return;
    if (word.trim().toUpperCase() !== 'ОБНУЛИТЬ') return toast('Слово не совпало — ничего не изменено', 'error');
    const btns = [$('btn-gr-month'), $('btn-gr-all')]; btns.forEach(b => { b.disabled = true; });
    try {
        const month = { monthKey: periodKey(), mWins: 0, mLosses: 0, mGames: 0, mKills: 0, mHeadshots: 0, mElo: 0 };
        const zero = { elo: 500, seasonWins: 0, totalWins: 0, totalLosses: 0, totalGames: 0, totalKills: 0, totalHeadshots: 0, totalAces: 0, perfects: 0, streak: 0, bestStreak: 0, guildStats: {}, ...month };
        say('Загружаю игроков…');
        const ps = await db.collection('players').get();
        await commitAll(ps.docs.map(d => ({ ref: d.ref, upd: full ? { ...zero, ...(d.data().banned ? { elo: 0 } : {}) } : month })));
        if (full) {
            let i = 0;
            for (const d of ps.docs) { i++; say(`Очищаю историю матчей: ${i} из ${ps.size}…`); await wipeHistory(d.ref); }
        }
        say('Обновляю гильдии…');
        const gs = await db.collection('guilds').get();
        if (full) {
            for (const g of gs.docs) { await wipeHistory(g.ref); }
            await commitAll(gs.docs.map(g => ({ ref: g.ref, del: true })));
        } else await commitAll(gs.docs.map(g => ({ ref: g.ref, upd: month })));
        let zn = 0;
        if ($('gr-zb').checked) {
            say('Чищу «Зарубы»…');
            const zs = await db.collection('zaruby').get();
            const kill = zs.docs.filter(z => full || periodKey(new Date(z.data().ts)) === periodKey());
            await commitAll(kill.map(z => ({ ref: z.ref, del: true }))); zn = kill.length;
        }
        say(`Готово (${full ? 'за всё время' : 'за месяц'}): игроков ${ps.size}, гильдий ${gs.size}${$('gr-zb').checked ? ', заруб удалено ' + zn : ''}.`);
        toast(full ? 'Вся статистика обнулена' : 'Статистика месяца обнулена', 'success');
    } catch (e) { say('Ошибка: ' + (e.code || e.message)); toast('Ошибка: ' + (e.code || e.message), 'error'); }
    btns.forEach(b => { b.disabled = false; });
}
$('btn-gr-month').addEventListener('click', () => globalReset('month'));
$('btn-gr-all').addEventListener('click', () => globalReset('all'));

// =====================================================================
//  Вкладки админ-панели
// =====================================================================
(function () {
    const bar = $('adm-tabs');
    function show(t) {
        document.querySelectorAll('#admin-panel [data-tab]').forEach(c => { c.style.display = c.dataset.tab === t ? '' : 'none'; });
        bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
        try { localStorage.setItem('adm_tab', t); } catch (e) {}
    }
    bar.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { show(b.dataset.t); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    let start = 'reports';
    try { start = localStorage.getItem('adm_tab') || start; } catch (e) {}
    if (location.hash === '#rules') start = 'content';
    if (!bar.querySelector(`[data-t="${start}"]`)) start = 'reports';
    show(start);
    // число новых отчётов / жалоб на значках вкладок
    const badge = (listId, badgeId, ...extra) => {
        const el = $(listId); if (!el) return;
        const upd = () => { const n = el.querySelectorAll('.report-item').length + extra.reduce((a, id) => a + ($(id) ? $(id).querySelectorAll('.report-item').length : 0), 0); $(badgeId).textContent = n || ''; };
        new MutationObserver(upd).observe(el, { childList: true, subtree: true }); upd();
    };
    badge('reports-list', 'bd-reports', 'complaints-list');
})();
