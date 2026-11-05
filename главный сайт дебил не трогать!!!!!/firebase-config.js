// Общая настройка Firebase. Подключается ПОСЛЕ firebase-app / auth / firestore / storage.
const firebaseConfig = {
    apiKey: "AIzaSyA-kuzGj3Buo2LvD2LNHzQI1PdxwK5PeoE",
    authDomain: "elosports-tracker-stream.firebaseapp.com",
    projectId: "elosports-tracker-stream",
    storageBucket: "elosports-tracker-stream.firebasestorage.app",
    messagingSenderId: "720000678328",
    appId: "1:720000678328:web:95a0ae4c5f22e1768d374d"
};

// Админка работает в ОТДЕЛЬНОМ приложении Firebase со своей сессией: вход админа больше не выбивает профиль игрока
// (раньше обе страницы делили одну сессию — отсюда «исчезала админка» и «выкидывало из профиля»).
const IS_ADMIN_PAGE = /(^|\/)admin(\.html)?$/.test(location.pathname);
const fbApp = IS_ADMIN_PAGE ? firebase.initializeApp(firebaseConfig, 'admin') : firebase.initializeApp(firebaseConfig);
const db = fbApp.firestore();
const auth = fbApp.auth();
const storage = firebase.storage ? fbApp.storage() : null;

// Почта администратора — ТА ЖЕ, что в firestore.rules и storage.rules (здесь только для показа кнопок удаления)
const ADMIN_EMAILS = ['nockisy@gmail.com', 'dilenowpc@gmail.com'];
const isAdminUser = u => !!u && ADMIN_EMAILS.includes(u.email);

// Защита от XSS
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function toast(message, type = '') {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'toast show ' + type;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast ' + type; }, 3200);
}

// Юзернейм -> служебная почта для Firebase Auth (кириллица и символы кодируются)
const toEmail = id => [...String(id).trim().toLowerCase()]
    .map(c => /[a-z0-9]/.test(c) ? c : '_' + c.charCodeAt(0).toString(16) + '_').join('') + '@elo-sns.app';

// Ключ гильдии для базы
const guildKey = name => String(name || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'unknown';

// Ключ для сравнения ников/юзернеймов "на похожесть": регистр, пробелы и знаки, кириллица/латиница-двойники
// (а/a, е/e, о/o, р/p, с/c ...), цифры-замены (0/o, 1/l/i, 3/e ...) и повторы букв не делают ник «новым».
const NAME_HOMO = { 'а':'a','в':'b','е':'e','ё':'e','з':'3','и':'u','й':'u','к':'k','м':'m','н':'h','о':'o','р':'p','с':'c','т':'t','у':'y','х':'x','ь':'b','ъ':'b','і':'i','ј':'j','ѕ':'s',
    '0':'o','1':'l','i':'l','3':'e','4':'a','5':'s','6':'b','7':'t','8':'b','$':'s','@':'a','!':'l','|':'l' };
function nameKey(str) {
    const base = String(str || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^@/, '');
    let out = '';
    for (const ch of base) {
        if (!/[\p{L}\p{N}$@!|]/u.test(ch)) continue;                    // пробелы, _ . - и прочее не считаем
        const c = NAME_HOMO[ch] || ch;
        if (out[out.length - 1] !== c) out += c;                         // «aa» = «a»
    }
    return out;
}

const fmtDate = ts => new Date(ts).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ---------- Месячный период: обнуляется 17 числа в 00:00 по Бишкеку (UTC+6) ----------
const RESET_DAY = 17;
const RESET_TZ_H = 6;

function periodKey(date = new Date()) {
    const t = new Date(date.getTime() + RESET_TZ_H * 3600e3);
    let y = t.getUTCFullYear(), m = t.getUTCMonth();
    if (t.getUTCDate() < RESET_DAY) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
    return y + '-' + String(m + 1).padStart(2, '0');
}

function nextReset(date = new Date()) {
    const t = new Date(date.getTime() + RESET_TZ_H * 3600e3);
    let y = t.getUTCFullYear(), m = t.getUTCMonth();
    if (t.getUTCDate() >= RESET_DAY) m += 1;
    return new Date(Date.UTC(y, m, RESET_DAY) - RESET_TZ_H * 3600e3);
}

// =====================================================================
//  ЗАГРУЗКА ФОТО И ВИДЕО
//  Вариант А (бесплатно, без карты): Cloudinary. Заполни два поля ниже — и всё заработает.
//    1) cloudinary.com → регистрация → Dashboard: скопируй «Cloud name»
//    2) Settings → Upload → Upload presets → Add preset → Signing mode: UNSIGNED → Save, скопируй имя пресета
//  Вариант Б: оставь поля пустыми — тогда используется Firebase Storage
//    (в новых проектах он требует тариф Blaze; без него загрузка не работает).
// =====================================================================
const CLOUDINARY = { cloudName: '', uploadPreset: '' };

// Необязательно: ключ YouTube Data API v3 — тогда в списке стримеров подтянутся
// настоящее название, аватар и число подписчиков канала. Без ключа берётся ник из ссылки.
const YT_API_KEY = '';

// Настройки хранилища можно задать прямо в админ-панели (карточка «Хранилище файлов») — править код не нужно.
let _mediaCfg = null;
async function loadMediaCfg() {
    if (CLOUDINARY.cloudName && CLOUDINARY.uploadPreset) return;
    if (!_mediaCfg) {
        _mediaCfg = db.collection('site_content').doc('media').get().then(s => {
            const d = s.exists ? s.data() : {};
            CLOUDINARY.cloudName = String(d.cloudName || '').trim();
            CLOUDINARY.uploadPreset = String(d.uploadPreset || '').trim();
        }).catch(() => {});
    }
    await _mediaCfg;
    if (!(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset)) _mediaCfg = null;   // пусто — в следующий раз спросим снова
}
function uploadMedia(folder, blob, bar, uid) { return loadMediaCfg().then(() => _uploadMedia(folder, blob, bar, uid)); }

// Безопасная ссылка на VK / WhatsApp (kind: 'vk' | 'wa'); пустая строка — ссылка не подходит
function safeLink(raw, kind) {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (kind === 'vk' && /^@?[\w.]+$/.test(s)) s = 'https://vk.com/' + s.replace('@', '');
    if (kind === 'wa' && /^\+?\d{7,15}$/.test(s)) s = 'https://wa.me/' + s.replace('+', '');
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    let u; try { u = new URL(s); } catch (e) { return ''; }
    const h = u.hostname.replace(/^www\./, '');
    const ok = kind === 'vk' ? /(^|\.)vk\.(com|ru)$/.test(h) : /^(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com|whatsapp\.com)$/.test(h);
    return ok ? u.href : '';
}

// Загрузка одного файла → { url, path, provider }
function _uploadMedia(folder, blob, bar, uid) {
    const isVideo = (blob.type || '').startsWith('video/');
    if (bar) { bar.classList.add('on'); bar.firstElementChild.style.width = '0%'; }
    const done = () => { if (bar) bar.classList.remove('on'); };
    const setPct = p => { if (bar) bar.firstElementChild.style.width = Math.round(p) + '%'; };

    if (CLOUDINARY.cloudName && CLOUDINARY.uploadPreset) {
        return new Promise((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', blob);
            fd.append('upload_preset', CLOUDINARY.uploadPreset);
            fd.append('folder', folder);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${isVideo ? 'video' : 'image'}/upload`);
            xhr.upload.onprogress = e => { if (e.lengthComputable) setPct(e.loaded / e.total * 100); };
            xhr.onerror = () => { done(); reject(new Error('Нет связи с Cloudinary')); };
            xhr.onload = () => {
                done();
                let r = {}; try { r = JSON.parse(xhr.responseText); } catch (e) {}
                if (xhr.status >= 200 && xhr.status < 300 && r.secure_url) resolve({ url: r.secure_url, path: '', provider: 'cloudinary' });
                else reject(new Error((r.error && r.error.message) || ('Cloudinary: ' + xhr.status)));
            };
            xhr.send(fd);
        });
    }

    if (!storage) { done(); return Promise.reject(new Error('Хранилище не подключено')); }
    return new Promise((resolve, reject) => {
        const ext = isVideo ? ((blob.name || 'v.mp4').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
        const path = `${folder}/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const ref = storage.ref(path);
        const task = ref.put(blob, { contentType: blob.type || 'application/octet-stream' });
        task.on('state_changed',
            s => setPct(s.bytesTransferred / s.totalBytes * 100),
            err => { done(); reject(err); },
            async () => { done(); try { resolve({ url: await ref.getDownloadURL(), path, provider: 'firebase' }); } catch (e) { reject(e); } });
    });
}

// Понятное объяснение ошибки загрузки
function uploadErrorText(e) {
    const c = (e && (e.code || e.message)) || '';
    if (/unauthorized|unauthenticated/.test(c)) return 'Нет прав на загрузку. Опубликуй storage.rules в Firebase (Storage → Rules)';
    if (/bucket|object-not-found|unknown|retry-limit|canceled|quota|no-default-bucket/.test(c)) return 'Хранилище файлов не настроено. Администратору: Админ-панель → «☁️ Хранилище файлов» — вставь Cloud name и Upload preset от Cloudinary (бесплатно)';
    if (/preset/i.test(c)) return 'Cloudinary: пресет не найден или не «Unsigned». Проверь настройки в Админ-панели → «Хранилище файлов»';
    if (/file size|too large/i.test(c)) return 'Файл слишком большой для бесплатного Cloudinary (лимит видео — 100 МБ)';
    return 'Не удалось загрузить: ' + c;
}

// ---------- YouTube: разбор ссылки на канал ----------
// Возвращает { base, live, handle, kind } или null
function ytParse(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (/^@[\w.\-]+$/.test(s)) s = 'https://www.youtube.com/' + s;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    let u; try { u = new URL(s); } catch (e) { return null; }
    if (!/(^|\.)youtube\.com$/i.test(u.hostname) && u.hostname !== 'youtu.be') return null;
    const seg = u.pathname.split('/').filter(Boolean);
    let path = '', handle = '', kind = '';
    if (seg[0] && seg[0].startsWith('@')) { path = '/' + seg[0]; handle = seg[0]; kind = 'handle'; }
    else if (['channel', 'c', 'user'].includes(seg[0]) && seg[1]) { path = '/' + seg[0] + '/' + seg[1]; handle = seg[1]; kind = seg[0]; }
    else return null;
    const base = 'https://www.youtube.com' + path;
    return { base, live: base + '/live', handle, kind };
}
