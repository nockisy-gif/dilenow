// Оверлей состава для OBS — слушаем live_match/current
db.collection('live_match').doc('current').onSnapshot(doc => {
    if (!doc.exists) return;
    document.getElementById('players').textContent = (doc.data().players || []).join(' • ');
});
