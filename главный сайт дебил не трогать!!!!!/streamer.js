// Кабинет стримера (db, toast приходят из firebase-config.js)

const $ = id => document.getElementById(id);

async function login() {
    const key = $('streamer-key').value.trim();
    if (!key || key.includes('/')) return toast('Введите ключ!', 'error');

    let snap;
    try { snap = await db.collection('streamers').doc(key).get(); }
    catch (e) { return toast('Неверный ключ!', 'error'); }
    if (!snap.exists) return toast('Неверный ключ!', 'error');

    $('login-block').style.display = 'none';
    $('streamer-panel').style.display = 'block';

    const base = window.location.href.replace(/[^/]*$/, '');
    $('obs-link').value = base + 'obs-score.html';
    $('obs-link-players').value = base + 'obs-players.html';

    db.collection('streamer_public').doc(snap.data().name).update({ isLive: true });
    toast('Добро пожаловать!', 'success');
}

async function sendReport() {
    const myGuild = $('my-guild').value.trim();
    const enemyGuild = $('enemy-guild').value.trim();
    const score = $('score').value.trim();
    const players = $('players').value.split(',').map(p => p.trim()).filter(Boolean);

    if (!myGuild || !enemyGuild || !score || !players.length) {
        return toast('Заполните все поля!', 'error');
    }

    await db.collection('reports').add({
        myGuild, enemyGuild, score, players, status: 'pending', timestamp: new Date()
    });
    await db.collection('live_match').doc('current').set({ myGuild, enemyGuild, score, players });

    toast('Отчёт отправлен DILENOW!', 'success');
}

$('btn-login').addEventListener('click', login);
$('btn-send').addEventListener('click', sendReport);
$('streamer-key').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
