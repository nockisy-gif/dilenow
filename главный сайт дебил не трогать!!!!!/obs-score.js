// Оверлей счёта для OBS — слушаем live_match/current
db.collection('live_match').doc('current').onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById('myGuild').textContent = d.myGuild;
    document.getElementById('enemyGuild').textContent = d.enemyGuild;
    document.getElementById('score').textContent = d.score;
});
