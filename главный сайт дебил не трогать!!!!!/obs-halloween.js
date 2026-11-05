/* 🎃 Хэллоуин для OBS-оверлеев: тема карточек (ники игроков, название команды, счёт, состав) + летающие угли,
   духи-привидения и летучие мыши (чистый CSS/SVG, без эмодзи), паутина.
   Подключается в streamer.html.
   — В РЕЖИМЕ ?obs=… (то, что реально видят зрители в браузер-источнике OBS): тема на весь прозрачный холст.
   — В КАБИНЕТЕ стримера (без ?obs=): та же тема применяется к блоку «Предпросмотр», чтобы стример видел
     ровно то же оформление, что и зрители на стриме, но не занимает фон всего кабинета.
   Включение: автоматически 15 окт – 7 ноя. Принудительно: &hw=1 / &hw=0 в ссылке.
   Лёгкий: только CSS-анимированные элементы, JS после старта не работает. */
(function () {
    const q = new URLSearchParams(location.search), obs = q.get('obs'), force = q.get('hw');
    const d = new Date(), m = d.getMonth(), day = d.getDate();
    const auto = (m === 9 && day >= 15) || (m === 10 && day <= 7);
    const active = force === '1' ? true : force === '0' ? false : auto;
    if (!active) return;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const WEB = '<svg viewBox="0 0 150 150" fill="none" stroke="#e8e0ff" stroke-width="1.3" stroke-linecap="round"><path d="M0 0L150 0M0 0L140 55M0 0L112 112M0 0L55 140M0 0L0 150"/><path d="M30 0Q26 22 0 30M60 0Q50 46 0 60M90 0Q74 70 0 90M120 0Q98 92 0 120M150 0Q122 118 0 150"/></svg>';
    const addItems = (h, cls, n, extra) => { for (let i = 0; i < n; i++) h += `<i class="${cls}" style="--x:${rnd(0, 100).toFixed(1)}%;--y:${rnd(6, 60).toFixed(0)}%;--s:${rnd(.7, 1.4).toFixed(2)};--d:${rnd(8, 20).toFixed(1)}s;--dl:-${rnd(0, 20).toFixed(1)}s;--dx:${rnd(-12, 12).toFixed(1)}vw"></i>`; return h; };

    // полноэкранный слой — для настоящего оверлея, который видят зрители (?obs=…)
    function mountFull() {
        const box = document.createElement('div'); box.id = 'obs-hw';
        let h = `<div class="web l">${WEB}</div><div class="web r">${WEB}</div><div class="fog"></div>`;
        h = addItems(h, 'e', 10); h = addItems(h, 'g', 4); h = addItems(h, 'b', 3);
        box.innerHTML = h; document.body.appendChild(box);
    }
    // слой, вписанный в рамку предпросмотра кабинета — стример видит тему, не теряя остальной интерфейс
    function mountPreview() {
        const checker = document.querySelector('.checker');
        if (!checker) return;
        const box = document.createElement('div'); box.id = 'obs-hw-preview';
        let h = ''; h = addItems(h, 'e', 5); h = addItems(h, 'g', 3); h = addItems(h, 'b', 1);
        box.innerHTML = h; checker.prepend(box);
    }
    function mount() {
        document.body.classList.add('hw-obs');
        if (obs) mountFull(); else mountPreview();
    }
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
