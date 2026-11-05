// ELO SNS — соцчасть: вход, профиль, подписки, уведомления, публикации, просмотр как в TikTok, поиск, жалобы

let subId = null, subs = [];
let followers = [], following = [], notifs = [], invites = [], myMedia = [];
let followTab = 'followers', viewUserId = null, userMedia = [], userCounts = null;
let marking = false;

// ---------------- картинки ----------------
function fileToAvatar(file, size = 240) {
    return new Promise((res, rej) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const s = Math.min(img.width, img.height), c = document.createElement('canvas');
            c.width = c.height = size;
            c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
            URL.revokeObjectURL(url);
            res(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => rej(new Error('Не удалось прочитать картинку'));
        img.src = url;
    });
}
function compressImage(file, max = 1600) {
    return new Promise((res, rej) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob(b => b ? res(b) : rej(new Error('Ошибка сжатия')), 'image/jpeg', 0.85);
        };
        img.onerror = () => rej(new Error('Не удалось прочитать фото'));
        img.src = url;
    });
}

// загрузка в Firebase Storage с прогрессом
function uploadFile(path, blob, bar) {
    return new Promise((resolve, reject) => {
        const ref = storage.ref(path);
        const task = ref.put(blob, { contentType: blob.type || 'application/octet-stream' });
        if (bar) { bar.classList.add('on'); bar.firstElementChild.style.width = '0%'; }
        task.on('state_changed',
            s => { if (bar) bar.firstElementChild.style.width = Math.round(s.bytesTransferred / s.totalBytes * 100) + '%'; },
            err => { if (bar) bar.classList.remove('on'); reject(err); },
            () => { if (bar) bar.classList.remove('on'); resolve(ref); });
    });
}
const randName = ext => Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;

// ---------------- регистрация / вход ----------------
$('btn-register').addEventListener('click', async () => {
    const display = $('p-display-name').value.trim();
    const user = $('p-nickname').value.trim().replace('@', '');
    const phone = $('p-phone-num').value.trim();
    const pass = $('p-password').value;
    const file = $('p-avatar-file').files[0];
    if (!display || !user || !pass) return toast('Заполни имя, юзернейм и пароль', 'error');
    if (!/^[\p{L}\p{N}_]{3,20}$/u.test(user)) return toast('Юзернейм: 3–20 символов, буквы, цифры и _', 'error');
    if (pass.length < 6) return toast('Пароль — минимум 6 символов', 'error');
    const id = user.toLowerCase();
    if (isBannedId(id)) return toast('Этот юзернейм заблокирован администратором', 'error');
    // ник и юзернейм не должны совпадать или быть похожими на уже занятые
    const keys = [...new Set([nameKey(display), nameKey(user)])];
    if (keys.some(k => k.length < 2)) return toast('Имя и юзернейм должны содержать минимум 2 буквы или цифры', 'error');
    const btn = $('btn-register'); btn.disabled = true;
    try {
        if ((await db.collection('players').doc(id).get()).exists) { toast('Такой юзернейм уже занят', 'error'); return; }
        const [pl, kd] = await Promise.all([db.collection('players').get(), Promise.all(keys.map(k => db.collection('name_keys').doc(k).get()))]);
        const clash = pl.docs.find(d => { const x = d.data(); return [x.displayName, x.username, d.id].some(n => n && keys.includes(nameKey(n))); });
        if (clash || kd.some(d => d.exists)) {
            const c = clash && clash.data();
            toast(`Такой или очень похожий ник/юзернейм уже занят${c ? ': ' + (c.displayName || clash.id) + ' (' + (c.username || '@' + clash.id) + ')' : ''}. Придумай другой`, 'error');
            return;
        }
        const avatarUrl = file ? await fileToAvatar(file) : '';
        let cred;
        try { cred = await auth.createUserWithEmailAndPassword(toEmail(id), pass); }
        catch (e0) {
            // вход в Authentication остался от удалённого админом профиля — профиля с таким юзернеймом уже нет (проверено выше), создаём его заново
            if (e0.code !== 'auth/email-already-in-use') throw e0;
            try { cred = await auth.signInWithEmailAndPassword(toEmail(id), pass); } catch (e1) { throw e0; }
        }
        try {
            // игрок и «бронь» имён — одной записью: если ключ уже занят, не создастся ничего
            const batch = db.batch();
            batch.set(db.collection('players').doc(id), {
                displayName: display, username: '@' + user, avatarUrl, uid: cred.user.uid,
                elo: 0, seasonWins: 0, totalWins: 0, totalLosses: 0, totalGames: 0, totalKills: 0, totalHeadshots: 0,
                totalAces: 0, perfects: 0, streak: 0, bestStreak: 0, createdAt: Date.now()
            });
            keys.forEach(k => batch.set(db.collection('name_keys').doc(k), { uid: cred.user.uid, pid: id }));
            await batch.commit();
            if (phone) await db.collection('player_private').doc(cred.user.uid).set({ phone });
        } catch (e) { await cred.user.delete().catch(() => {}); throw e; }
        toast('Профиль создан! Добро пожаловать', 'success');
    } catch (e) {
        toast(e.code === 'auth/email-already-in-use' || e.code === 'permission-denied' ? 'Такой или очень похожий ник/юзернейм уже занят' : 'Ошибка регистрации: ' + (e.code || e.message), 'error');
    } finally { btn.disabled = false; }
});

$('btn-login').addEventListener('click', async () => {
    const id = $('login-nickname').value.trim().replace('@', '').toLowerCase();
    const pass = $('login-password').value;
    if (!id || !pass) return toast('Введи юзернейм и пароль', 'error');
    if (isBannedId(id)) return toast('Этот аккаунт заблокирован администратором. Вход невозможен', 'error');
    try {
        await auth.signInWithEmailAndPassword(toEmail(id), pass);
        const chk = await db.collection('players').doc(id).get().catch(() => null);
        if (chk && chk.exists && chk.data().banned) { await auth.signOut(); return toast('Этот аккаунт заблокирован администратором. Вход невозможен', 'error'); }
        toast('Вы вошли', 'success');
    } catch (e) {
        if (['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e.code)) {
            // старый аккаунт (до обновления): пароль лежал в базе — переносим его в защищённый вход
            try {
                const snap = await db.collection('players').doc(id).get();
                const d = snap.exists ? snap.data() : null;
                if (d && !d.uid && d.password && String(d.password) === pass) {
                    const cred = await auth.createUserWithEmailAndPassword(toEmail(id), pass);
                    const del = firebase.firestore.FieldValue.delete();
                    if (d.phone) await db.collection('player_private').doc(cred.user.uid).set({ phone: d.phone });
                    await db.collection('players').doc(id).update({ uid: cred.user.uid, password: del, phone: del });
                    return toast('Аккаунт обновлён и защищён. Добро пожаловать!', 'success');
                }
            } catch (e2) { console.error(e2); }
            return toast('Неверный юзернейм или пароль', 'error');
        }
        toast('Ошибка входа: ' + (e.code || e.message), 'error');
    }
});
$('btn-logout').addEventListener('click', () => auth.signOut());

$('change-avatar-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f || !me) return;
    try { await db.collection('players').doc(me.id).update({ avatarUrl: await fileToAvatar(f) }); toast('Аватар обновлён', 'success'); }
    catch (err) { toast('Не удалось: ' + err.message, 'error'); }
    e.target.value = '';
});

// ---------------- подписки на данные текущего игрока ----------------
function onMeChanged() {
    const id = me && me.id;
    if (id === subId) { renderProfile(); return; }
    subs.forEach(u => u()); subs = [];
    subId = id; followers = []; following = []; notifs = []; invites = []; myMedia = [];
    renderProfile();
    if (!me) return;
    const uid = curUser.uid, col = n => db.collection(n);
    const on = (q, fn) => subs.push(q.onSnapshot(s => { fn(s.docs.map(d => ({ ...d.data(), id: d.id }))); renderProfile(); if (viewUserId) renderUserPage(); },
        err => console.error(err)));
    on(col('follows').where('target', '==', id), l => followers = l);
    on(col('follows').where('follower', '==', id), l => following = l);
    on(col('notifications').where('toUid', '==', uid), l => notifs = l.sort((a, b) => b.ts - a.ts));
    on(col('match_invites').where('playerUid', '==', uid), l => invites = l);
    on(col('videos').where('authorId', '==', id), l => myMedia = l.sort((a, b) => b.ts - a.ts));
}
function onPlayersChanged() {
    if (viewUserId) renderUserPage();
    if ($('page-search').classList.contains('active')) renderSearch();
}

// ---------------- мой профиль ----------------
function renderProfile() {
    const logged = !!me;
    $('profile-auth-box').style.display = logged ? 'none' : 'block';
    $('profile-info-box').style.display = logged ? 'block' : 'none';
    const pend = invites.filter(i => i.status === 'pending').length;
    const unread = notifs.filter(n => !n.read).length + pend;
    document.querySelectorAll('[data-nb]').forEach(b => { b.hidden = !unread; b.textContent = unread; });
    if (!logged) return;

    const wrap = $('my-av-wrap');
    let mb = $('my-banner');
    const ph = wrap.parentElement;                                // .profile-head — баннер растягивается на всю шапку
    if (!mb) { mb = document.createElement('div'); mb.id = 'my-banner'; ph.insertAdjacentElement('beforebegin', mb); }
    ph.querySelectorAll(':scope > .bnl, :scope > .bn-shade, :scope > .aw-badge').forEach(e => e.remove());
    [...ph.classList].filter(c => /^bn-/.test(c)).forEach(c => ph.classList.remove(c));
    const bcls = bnClasses(me);
    if (bcls) { ph.classList.add(...bcls.split(' '), 'bn-head'); ph.insertAdjacentHTML('afterbegin', bnLayer(me) + '<i class="bn-shade"></i>' + awardBadge(me)); }
    mb.innerHTML = bcls ? '' : bannerStrip(me);
    wrap.innerHTML = avatarBox(me.avatarUrl, tierFor(me), 'avatar-square', true, me);
    $('my-profile-display-name').textContent = me.displayName || me.username;
    $('my-profile-username').textContent = me.username || '';
    $('my-streak').innerHTML = streakBadge(me.streak);
    $('my-stat-elo').textContent = me.elo ?? 0;
    $('my-stat-followers').textContent = followers.length;
    $('my-stat-following').textContent = following.length;
    $('my-stat-likes').textContent = myMedia.reduce((s, v) => s + (v.likes || 0), 0);

    renderFollowList();

    $('notifications-list').innerHTML = notifs.length
        ? notifs.map(n => `<div class="nt ${n.read ? '' : 'new'}"><span>${esc(n.text)}</span></div>`).join('')
        : 'Нет уведомлений';

    const pending = invites.filter(i => i.status === 'pending');
    $('invites-list').innerHTML = pending.map(i => `
        <div class="invite">🎮 Стример <b>${esc(i.streamer)}</b> добавил тебя в матч. Это правда ты?
            <div class="row">
                <button class="btn btn-green btn-sm" data-inv="${esc(i.id)}" data-st="confirmed">✅ Да, это я</button>
                <button class="btn btn-red btn-sm" data-inv="${esc(i.id)}" data-st="declined">✕ Не я</button>
            </div></div>`).join('');

    $('my-media').innerHTML = myMedia.length ? mediaGrid(myMedia, 'my', true) : '<p class="muted">Публикаций пока нет.</p>';
}

function renderFollowList() {
    const list = followTab === 'followers' ? followers : following;
    const key = followTab === 'followers' ? 'follower' : 'target';
    document.querySelectorAll('[data-flt]').forEach(b => b.classList.toggle('on', b.dataset.flt === followTab));
    $('follow-list').innerHTML = list.length ? list.map(f => {
        const p = playersById.get(f[key]);
        return `<button class="list-row" data-open-user="${esc(f[key])}">${avatarBox(p && p.avatarUrl, '', 'table-avatar-square', false, p)}
            <span>${esc(p ? p.displayName : f[key])}</span></button>`;
    }).join('') : (followTab === 'followers' ? 'Пока нет подписчиков' : 'Ты ни на кого не подписан');
}

async function markNotifsRead() {
    if (marking || !me) return;
    const un = notifs.filter(n => !n.read);
    if (!un.length) return;
    marking = true;
    try { const b = db.batch(); un.forEach(n => b.update(db.collection('notifications').doc(n.id), { read: true })); await b.commit(); }
    catch (e) { console.error(e); }
    marking = false;
}

document.addEventListener('click', async e => {
    let el;
    if ((el = e.target.closest('[data-flt]'))) { followTab = el.dataset.flt; renderFollowList(); }
    if ((el = e.target.closest('[data-follow-list]'))) {
        followTab = el.dataset.followList; renderFollowList();
        $('follow-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if ((el = e.target.closest('[data-inv]'))) {
        try { await db.collection('match_invites').doc(el.dataset.inv).update({ status: el.dataset.st }); toast(el.dataset.st === 'confirmed' ? 'Участие подтверждено' : 'Отклонено', 'success'); }
        catch (err) { toast('Ошибка: ' + err.message, 'error'); }
    }
    if ((el = e.target.closest('[data-md]'))) {            // удалить публикацию
        e.stopPropagation();
        const v = [...myMedia, ...userMedia].find(x => x.id === el.dataset.md);
        if (v) deleteMedia(v);
        return;
    }
    if ((el = e.target.closest('.media-item[data-mi]'))) {
        const list = el.dataset.grid === 'my' ? myMedia : userMedia;
        openReels(list, Number(el.dataset.mi));
    }
    if ((el = e.target.closest('[data-follow]'))) toggleFollow(el.dataset.follow);
});
$('btn-clear-notif').addEventListener('click', async () => {
    if (!notifs.length) return;
    const b = db.batch(); notifs.forEach(n => b.delete(db.collection('notifications').doc(n.id)));
    try { await b.commit(); toast('Уведомления очищены'); } catch (e) { toast('Ошибка: ' + e.message, 'error'); }
});
$('btn-my-stats').addEventListener('click', () => me && openPlayerModal(me.id));
$('btn-my-public').addEventListener('click', () => me && openUser(me.id));

// ---------------- уведомления / подписка ----------------
function notify(toId, type, text, fixedId) {
    const t = playersById.get(toId);
    if (!t || !t.uid || !me || t.id === me.id) return;
    const col = db.collection('notifications');
    return (fixedId ? col.doc(fixedId) : col.doc())
        .set({ toUid: t.uid, to: t.id, from: me.id, fromUid: curUser.uid, type, text, ts: Date.now(), read: false })
        .catch(() => {});                                   // повтор того же лайка — не спамим
}

async function toggleFollow(targetId) {
    if (!me) { toast('Войди в профиль, чтобы подписываться', 'error'); showPage('profile'); return; }
    if (me.id === targetId) return;
    const ref = db.collection('follows').doc(me.id + '__' + targetId);
    try {
        if (following.some(f => f.target === targetId)) await ref.delete();
        else {
            await ref.set({ follower: me.id, target: targetId, followerUid: curUser.uid, ts: Date.now() });
            notify(targetId, 'follow', `👤 ${me.displayName} (@${me.id}) подписался на вас`, 'follow_' + me.id + '_' + targetId);
        }
    } catch (e) { toast('Ошибка: ' + e.message, 'error'); }
}

// ---------------- публикации ----------------
$('btn-upload').addEventListener('click', async () => {
    if (!me) return toast('Сначала войди в профиль', 'error');
    const files = [...$('up-file').files].slice(0, 6);
    if (!files.length) return toast('Выбери видео или фото', 'error');
    for (const f of files) {
        const k = f.type.startsWith('video/') ? 'video' : f.type.startsWith('image/') ? 'photo' : '';
        if (!k) return toast(`«${f.name}»: можно только видео или фото`, 'error');
        if (k === 'video' && f.size > 100 * 1024 * 1024) return toast(`«${f.name}»: видео больше 100 МБ`, 'error');
    }
    const btn = $('btn-upload'); btn.disabled = true;
    const desc = $('up-desc').value.trim().slice(0, 200);
    let ok = 0;
    try {
        for (let i = 0; i < files.length; i++) {
            const f = files[i], kind = f.type.startsWith('video/') ? 'video' : 'photo';
            btn.textContent = `⏳ Загрузка ${i + 1} из ${files.length}…`;
            const blob = kind === 'photo' ? await compressImage(f) : f;
            const up = await uploadMedia('media', blob, $('up-progress'), curUser.uid);
            await db.collection('videos').add({
                authorId: me.id, authorUid: curUser.uid, kind, url: up.url, path: up.path || '', provider: up.provider,
                desc, likes: 0, likedBy: [], ts: Date.now() + i
            });
            ok++;
        }
        toast(ok > 1 ? `Опубликовано: ${ok}` : 'Опубликовано!', 'success');
    } catch (e) { toast((ok ? `Загружено ${ok} из ${files.length}. ` : '') + uploadErrorText(e), 'error'); }
    finally {
        btn.disabled = false; btn.textContent = '🎥 Опубликовать видео или фото';
        if (ok) { $('up-file').value = ''; $('up-desc').value = ''; if ($('up-file')._reset) $('up-file')._reset(); }
        db.collection('videos').get().then(s => { $('stat-videos').textContent = s.size; }).catch(() => {});
    }
});

function mediaGrid(list, gridName, canDelete) {
    return list.map((v, i) => `<div class="media-item" data-mi="${i}" data-grid="${gridName}">
        ${v.kind === 'photo' ? `<img src="${esc(v.url)}" loading="lazy" alt="">` : `<video src="${esc(v.url)}#t=0.1" preload="metadata" muted playsinline></video><span class="play">▶</span>`}
        <span class="mlike">❤ ${v.likes || 0}</span>
        ${canDelete ? `<button class="m-del" data-md="${esc(v.id)}" title="Удалить">✕</button>` : ''}</div>`).join('');
}

async function deleteMedia(v) {
    const mine = curUser && v.authorUid === curUser.uid;
    if (!mine && !isAdmin) return toast('Удалять можно только свои публикации', 'error');
    if (!confirm('Удалить эту публикацию?')) return;
    try {
        const ref = db.collection('videos').doc(v.id);
        const cm = await ref.collection('comments').get().catch(() => null);
        if (cm && !cm.empty) { const b = db.batch(); cm.docs.forEach(d => b.delete(d.ref)); await b.commit().catch(() => {}); }
        await ref.delete();
        if (v.path && storage) storage.ref(v.path).delete().catch(() => {});
        v.deleted = true;
        toast('Удалено', 'success');
        if (viewUserId) loadUserMedia(viewUserId);
        db.collection('videos').get().then(s => { $('stat-videos').textContent = s.size; });
    } catch (e) { toast('Не удалось удалить: ' + e.message, 'error'); }
}

// ---------------- просмотр как в TikTok ----------------
let reelList = [], reelMuted = true, reelObs = null, sheetVideo = null;

function reelHtml(v, i) {
    const p = playersById.get(v.authorId) || {};
    const liked = curUser && (v.likedBy || []).includes(curUser.uid);
    const own = curUser && v.authorUid === curUser.uid;
    const canDel = own || isAdmin;
    const fol = following.some(f => f.target === v.authorId);
    return `<section class="reel" data-i="${i}">
        ${v.kind === 'photo' ? `<img class="reel-media" src="${esc(v.url)}" alt="">`
            : `<video class="reel-media" src="${esc(v.url)}" loop playsinline ${reelMuted ? 'muted' : ''} preload="metadata"></video>`}
        <div class="reel-info"><b>${esc(p.displayName || v.authorId)}</b><p>${esc(v.desc || '')}</p></div>
        <div class="reel-rail">
            <button data-r="profile"><img src="${esc(p.avatarUrl || 'https://via.placeholder.com/80')}" alt=""></button>
            ${own ? '' : `<button data-r="follow" class="${fol ? 'on' : ''}"><span>${fol ? '✔' : '➕'}</span></button>`}
            <button data-r="like" class="${liked ? 'on' : ''}"><span>${liked ? '❤️' : '🤍'}</span><i>${v.likes || 0}</i></button>
            <button data-r="comments"><span>💬</span></button>
            ${canDel ? '<button data-r="del"><span>🗑</span></button>' : ''}
        </div></section>`;
}

function openReels(list, start) {
    reelList = list;
    const box = $('reels-scroll');
    box.innerHTML = list.map(reelHtml).join('');
    $('reels').classList.add('open');
    document.body.classList.add('noscroll');
    $('reels-mute').textContent = reelMuted ? '🔇' : '🔊';
    box.scrollTop = start * box.clientHeight;
    if (reelObs) reelObs.disconnect();
    reelObs = new IntersectionObserver(es => es.forEach(en => {
        const vid = en.target.querySelector('video');
        if (!vid) return;
        if (en.isIntersecting) { vid.muted = reelMuted; vid.play().catch(() => {}); } else { vid.pause(); }
    }), { root: box, threshold: 0.65 });
    box.querySelectorAll('.reel').forEach(r => reelObs.observe(r));
}
function closeReels() {
    $('reels').classList.remove('open');
    document.body.classList.remove('noscroll');
    $('reels-scroll').querySelectorAll('video').forEach(v => v.pause());
    $('reels-scroll').innerHTML = '';
    $('reel-sheet').classList.remove('open');
    if (reelObs) reelObs.disconnect();
}
$('reels-x').addEventListener('click', closeReels);
$('reels-mute').addEventListener('click', () => {
    reelMuted = !reelMuted;
    $('reels-mute').textContent = reelMuted ? '🔇' : '🔊';
    $('reels-scroll').querySelectorAll('video').forEach(v => { v.muted = reelMuted; });
});
document.addEventListener('keydown', e => {
    if (!$('reels').classList.contains('open')) return;
    const box = $('reels-scroll');
    if (e.key === 'Escape') closeReels();
    if (e.key === 'ArrowDown') box.scrollBy({ top: box.clientHeight, behavior: 'smooth' });
    if (e.key === 'ArrowUp') box.scrollBy({ top: -box.clientHeight, behavior: 'smooth' });
});

async function toggleLike(v, btn) {
    if (!me) { toast('Войди в профиль, чтобы ставить лайки', 'error'); return; }
    const ref = db.collection('videos').doc(v.id), uid = curUser.uid;
    try {
        let nowLiked = false;
        await db.runTransaction(async tx => {
            const s = await tx.get(ref);
            const arr = s.data().likedBy || [], has = arr.includes(uid);
            const next = has ? arr.filter(x => x !== uid) : [...arr, uid];
            tx.update(ref, { likedBy: next, likes: next.length });
            v.likedBy = next; v.likes = next.length; nowLiked = !has;
        });
        btn.classList.toggle('on', nowLiked);
        btn.querySelector('span').textContent = nowLiked ? '❤️' : '🤍';
        btn.querySelector('i').textContent = v.likes;
        if (nowLiked) notify(v.authorId, 'like', `❤️ ${me.displayName} лайкнул вашу публикацию`, `like_${v.id}_${me.id}`);
    } catch (e) { toast('Ошибка: ' + e.message, 'error'); }
}

$('reels').addEventListener('click', async e => {
    const reel = e.target.closest('.reel');
    const b = e.target.closest('[data-r]');
    if (!reel) return;
    const v = reelList[Number(reel.dataset.i)];
    if (!b) {                                              // тап по видео — пауза/пуск
        const vid = e.target.closest('video');
        if (vid) vid.paused ? vid.play() : vid.pause();
        return;
    }
    switch (b.dataset.r) {
        case 'like': return toggleLike(v, b);
        case 'follow': await toggleFollow(v.authorId); { const on = following.some(f => f.target === v.authorId); b.classList.toggle('on', on); b.querySelector('span').textContent = on ? '✔' : '➕'; } return;
        case 'profile': closeReels(); return openUser(v.authorId);
        case 'comments': return openComments(v);
        case 'del':
            await deleteMedia(v);
            if (v.deleted) { reel.remove(); if (!$('reels-scroll').children.length) closeReels(); }
    }
});

// комментарии
async function openComments(v) {
    sheetVideo = v;
    $('reel-sheet').classList.add('open');
    $('sheet-list').innerHTML = '<p class="muted">Загрузка…</p>';
    loadComments();
}
async function loadComments() {
    const v = sheetVideo; if (!v) return;
    try {
        const s = await db.collection('videos').doc(v.id).collection('comments').orderBy('ts').get();
        const rows = s.docs.map(d => ({ ...d.data(), id: d.id }));
        $('sheet-list').innerHTML = rows.length ? rows.map(c => {
            const can = curUser && (c.authorUid === curUser.uid || v.authorUid === curUser.uid || isAdmin);
            return `<div class="cm"><span><b class="accent">${esc(c.authorName || c.authorId)}</b> ${esc(c.text)}</span>${can ? `<button data-cdel="${esc(c.id)}">🗑</button>` : ''}</div>`;
        }).join('') : '<p class="muted">Комментариев пока нет — будь первым!</p>';
    } catch (e) { $('sheet-list').innerHTML = '<p class="muted">Не удалось загрузить комментарии</p>'; }
}
$('sheet-x').addEventListener('click', () => $('reel-sheet').classList.remove('open'));
$('sheet-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-cdel]');
    if (!b || !sheetVideo) return;
    try { await db.collection('videos').doc(sheetVideo.id).collection('comments').doc(b.dataset.cdel).delete(); loadComments(); }
    catch (err) { toast('Ошибка: ' + err.message, 'error'); }
});
async function sendComment() {
    if (!me) return toast('Войди в профиль, чтобы комментировать', 'error');
    const text = $('sheet-input').value.trim();
    if (!text || !sheetVideo) return;
    try {
        await db.collection('videos').doc(sheetVideo.id).collection('comments').add({
            authorId: me.id, authorUid: curUser.uid, authorName: me.displayName, text: text.slice(0, 300), ts: Date.now()
        });
        notify(sheetVideo.authorId, 'comment', `💬 ${me.displayName}: ${text.slice(0, 60)}`);
        $('sheet-input').value = '';
        loadComments();
    } catch (e) { toast('Ошибка: ' + e.message, 'error'); }
}
$('sheet-send').addEventListener('click', sendComment);
$('sheet-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendComment(); });

// ---------------- поиск игроков ----------------
function renderSearch() {
    const q = $('player-search').value.trim().toLowerCase().replace('@', '');
    let list;
    if (q) {
        list = allPlayers.filter(p => [p.displayName, p.username, p.id].some(x => String(x || '').toLowerCase().replace('@', '').includes(q))).slice(0, 40);
        $('search-hint').textContent = list.length ? `Найдено: ${list.length}` : 'Никого не нашли';
    } else {
        list = [...allPlayers].sort((a, b) => (b.elo || 0) - (a.elo || 0)).slice(0, 10);
        $('search-hint').textContent = 'Топ игроков по ELO — нажми, чтобы открыть профиль';
    }
    $('search-results').innerHTML = list.map(p => `
        <button class="list-row ${bnClasses(p)}" data-open-user="${esc(p.id)}">${bnLayer(p)}
            ${avatarBox(p.avatarUrl, tierFor(p), undefined, false, p)}
            <span>${esc(p.displayName || p.username)}${awardMini(p)}${streakBadge(p.streak)}<br><small class="muted">${esc(p.username || '')}</small></span>
            <span class="sub-t"><span class="badge-elo">${p.elo ?? 0}</span></span>
        </button>`).join('');
}
$('player-search').addEventListener('input', renderSearch);
document.addEventListener('click', e => { if (e.target.closest('[data-page="search"]')) setTimeout(renderSearch, 0); });

// ---------------- профиль другого игрока ----------------
function openUser(id) {
    viewUserId = id; userMedia = []; userCounts = null;
    showPage('user');
    renderUserPage();
    loadUserMedia(id);
    Promise.all([db.collection('follows').where('target', '==', id).get(), db.collection('follows').where('follower', '==', id).get()])
        .then(([a, b]) => { if (viewUserId === id) { userCounts = { followers: a.size, following: b.size }; renderUserPage(); } }).catch(() => {});
}
async function loadUserMedia(id) {
    try {
        const s = await db.collection('videos').where('authorId', '==', id).get();
        userMedia = s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.ts - a.ts);
        if (viewUserId === id) renderUserPage();
    } catch (e) { console.error(e); }
}
function renderUserPage() {
    const p = playersById.get(viewUserId), box = $('user-box');
    box.classList.remove('has-pf');
    if (!p) { box.innerHTML = '<p class="empty">Игрок не найден</p>'; return; }
    const isMe = me && me.id === p.id, fol = following.some(f => f.target === p.id);
    const canDel = isAdmin || isMe;
    const head = `<div class="user-head">
            ${avatarBox(p.avatarUrl, tierFor(p), 'avatar-square', true, p)}
            <div style="min-width:0">
                <h2>${esc(p.displayName || p.username)}${streakBadge(p.streak)}</h2>
                <div class="accent" style="font-weight:700">${esc(p.username || '')}</div>
                <div class="user-counts">
                    <span><b>${userCounts ? userCounts.followers : '…'}</b> подписчиков</span>
                    <span><b>${userCounts ? userCounts.following : '…'}</b> подписок</span>
                </div>
                ${isMe ? '' : `<button class="btn btn-sm ${fol ? 'btn-ghost' : ''}" data-follow="${esc(p.id)}">${fol ? '✔ Вы подписаны' : '➕ Подписаться'}</button>`}
            </div>
        </div>`;
    box.innerHTML = `<div class="pf-pagehost" id="user-pf">
        ${p.banned ? '<p class="warn">🚫 Игрок заблокирован администратором, статистика обнулена.</p>' : ''}
        ${bannerHead(p, head)}
        ${statBoxes(p)}
        ${playerHistBox(p)}
        <hr class="divider">
        <h3>📹 <span class="accent">Видео и фото</span></h3>
        ${userMedia.length ? `<div class="media-grid">${mediaGrid(userMedia, 'user', canDel)}</div>` : '<p class="muted">Публикаций пока нет.</p>'}
    </div>`;
    // рамка профиля, которую игрок купил и надел, видна всем, кто открыл его профиль
    if (window.PF && PF.mount(box.querySelector('#user-pf'), p)) box.classList.add('has-pf');
}

// ---------------- жалобы (приходят только админам) ----------------
$('complaint-files').addEventListener('change', e => {
    const fs = [...e.target.files];
    $('complaint-file-list').textContent = fs.length ? fs.map(f => f.name).join(', ') : '';
});
$('btn-complaint').addEventListener('click', async () => {
    if (!me) { toast('Чтобы отправить жалобу, войди в профиль', 'error'); showPage('profile'); return; }
    const target = $('complaint-target').value.trim(), text = $('complaint-text').value.trim();
    const files = [...$('complaint-files').files].slice(0, 4);
    if (!target || !text) return toast('Укажи ник и опиши нарушение', 'error');
    for (const f of files) {
        if (!/^(image|video)\//.test(f.type)) return toast('Можно прикреплять только фото и видео', 'error');
        if (f.size > 50 * 1024 * 1024) return toast(`Файл «${f.name}» больше 50 МБ`, 'error');
    }
    const btn = $('btn-complaint'); btn.disabled = true;
    try {
        const media = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i], isImg = f.type.startsWith('image/');
            btn.textContent = `⏳ Загрузка ${i + 1} из ${files.length}…`;
            const blob = isImg ? await compressImage(f) : f;
            const up = await uploadMedia('complaints', blob, $('complaint-progress'), curUser.uid);
            media.push({ url: up.url, path: up.path || '', provider: up.provider, type: isImg ? 'photo' : 'video' });
        }
        await db.collection('complaints').add({ target, text, fromId: me.id, fromUid: curUser.uid, media, ts: Date.now() });
        $('complaint-target').value = ''; $('complaint-text').value = ''; $('complaint-files').value = '';
        if ($('complaint-files')._reset) $('complaint-files')._reset(); else $('complaint-file-list').textContent = '';
        toast('Жалоба отправлена администраторам', 'success');
    } catch (e) { toast(uploadErrorText(e), 'error'); }
    finally { btn.disabled = false; btn.textContent = '🚀 Отправить жалобу'; }
});
