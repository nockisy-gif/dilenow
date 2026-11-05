// ELO SNS — каталог магазина: рамки, анимированные эффекты, баннеры, награды ТОП-3 месяца, уровни гильдий.
// Подключается ДО app.js. Цена зашита в префиксе id и продублирована в firestore.rules (itemPrice):
// fr_=200  fx_=500  b2_=200  b3_=300  a5_=500  a7_=700  a8_=800  bz_=1500  bn20_=2000  bn25_=2500  fr20_=2000  fr25_=2500
// 🍬 те же товары можно купить за конфеты: цена = ceil(монеты / 200)
// брелки: cz6_=600 (животные)  cz8_=800 (аниме)  cz10_=1000 (марвел)   (tp_* — награды, не продаются)
const PRICE_BY_PREFIX = { fr: 200, fx: 500, b2: 200, b3: 300, a5: 500, a7: 700, a8: 800, bz: 1500, bn20: 2000, bn25: 2500, fr20: 2000, fr25: 2500, cz6: 600, cz8: 800, cz10: 1000 };
const PRICE_FRAME = 200, PRICE_EFFECT = 500;
const priceOf = id => PRICE_BY_PREFIX[String(id).split('_')[0]] || 0;

const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const clsOf = id => id.replace(/_/g, '-');

// ---------- рамки (существующие стили лежат в extras.css; новые генерируются ниже) ----------
const OLD_ITEMS = [
    { id: 'fr_cyan',    type: 'frame', name: 'Неон бирюза',   desc: 'Холодное свечение киберспорта' },
    { id: 'fr_pink',    type: 'frame', name: 'Неон роза',     desc: 'Яркий розовый контур' },
    { id: 'fr_violet',  type: 'frame', name: 'Ультрафиолет',  desc: 'Фирменный фиолетовый неон' },
    { id: 'fr_gold',    type: 'frame', name: 'Чистое золото', desc: 'Для тех, кто привык побеждать' },
    { id: 'fr_emerald', type: 'frame', name: 'Изумруд',       desc: 'Глубокий зелёный блеск' },
    { id: 'fr_crimson', type: 'frame', name: 'Багровый',      desc: 'Тёмно-красная сталь' },
    { id: 'fr_ice',     type: 'frame', name: 'Лёд',           desc: 'Белый с голубым отливом' },
    { id: 'fr_sunset',  type: 'frame', name: 'Закат',         desc: 'Оранжево-розовый градиент' },
    { id: 'fx_spider',    type: 'effect', name: 'Человек-паук',  desc: 'Паутина и паучок на нити' },
    { id: 'fx_ironman',   type: 'effect', name: 'Железный',      desc: 'Алый металл и реактор в груди' },
    { id: 'fx_thunder',   type: 'effect', name: 'Громовержец',   desc: 'Молнии вокруг аватарки' },
    { id: 'fx_hulk',      type: 'effect', name: 'Зелёная ярость', desc: 'Ударные волны силы' },
    { id: 'fx_venom',     type: 'effect', name: 'Симбиот',       desc: 'Чёрная тьма и капли' },
    { id: 'fx_fire',      type: 'effect', name: 'Огонь',         desc: 'Живое пламя по контуру' },
    { id: 'fx_snow',      type: 'effect', name: 'Снегопад',      desc: 'Ледяная рамка и снежинки' },
    { id: 'fx_sparks',    type: 'effect', name: 'Искры',         desc: 'Золотые искры во все стороны' },
    { id: 'fx_fireworks', type: 'effect', name: 'Салют',         desc: 'Разноцветные залпы' },
    { id: 'fx_galaxy',    type: 'effect', name: 'Галактика',     desc: 'Вращение и мерцающие звёзды' }
];

// 10 новых обычных рамок — 200
const NEW_FRAMES = [
    ['fr_mint', 'Мята', 'Свежий бирюзово-зелёный', ['#d9fff3', '#5cf2c0', '#0d7a5c']],
    ['fr_amber', 'Янтарь', 'Тёплый медовый блеск', ['#fff0c2', '#ffb020', '#8f5a00']],
    ['fr_sky', 'Небо', 'Чистая небесная синева', ['#e0f1ff', '#4aa8ff', '#16509c']],
    ['fr_lime', 'Лайм', 'Кислотный зелёный', ['#f3ffc7', '#b6f23a', '#4f7d00']],
    ['fr_rose', 'Роза', 'Нежный розовый', ['#ffe4ee', '#ff7aa8', '#a8316a']],
    ['fr_steel', 'Сталь', 'Холодный металл', ['#f1f4f8', '#98a5b8', '#4a5568']],
    ['fr_copper', 'Медь', 'Тёмная медь', ['#ffd9b8', '#d9803f', '#7a3a10']],
    ['fr_plasma', 'Плазма', 'Фиолетово-розовая плазма', ['#ffd1f5', '#c44bff', '#4b1d9e']],
    ['fr_night', 'Ночь', 'Глубокий тёмно-синий', ['#c9d4ff', '#3b4fd1', '#0f1650']],
    ['fr_pearl', 'Жемчуг', 'Перламутровый отлив', ['#ffffff', '#f3dcff', '#b8c9ff']]
];

// 10 новых анимированных аватарок/эффектов — 500: [id, имя, описание, градиент, символ частиц, движение]
const NEW_FX = [
    ['fx_dragonfire', 'Дракон', 'Огненное дыхание дракона', ['#ff3d00', '#ffb300', '#7a0000'], '🔥', 'rise'],
    ['fx_frostdragon', 'Ледяной дракон', 'Мороз и снежное дыхание', ['#e8fbff', '#6fd3ff', '#1b5fa8'], '❄', 'fall'],
    ['fx_jadedragon', 'Нефритовый дракон', 'Зелёный дракон ветра', ['#caffd9', '#2ee59d', '#0a6b4a'], '🐲', 'twinkle'],
    ['fx_sakura', 'Сакура', 'Лепестки как в аниме', ['#ffe0ee', '#ff8fb8', '#c2477a'], '🌸', 'fall'],
    ['fx_kitsune', 'Кицунэ', 'Лисий дух и огоньки', ['#fff1d0', '#ff9a3d', '#a84300'], '🦊', 'twinkle'],
    ['fx_katana', 'Катана', 'Вспышки стали', ['#ffffff', '#a8c7ff', '#3b3b6b'], '⚔', 'twinkle'],
    ['fx_bloodmoon', 'Кровавая луна', 'Багровое сияние', ['#ffb3b3', '#d41e3a', '#3a0010'], '🌙', 'rise'],
    ['fx_blizzard', 'Метель', 'Ледяной вихрь', ['#ffffff', '#bfe3ff', '#5d8fb8'], '❄', 'fall'],
    ['fx_lava', 'Лава', 'Пузыри раскалённой лавы', ['#ffe36b', '#ff5a00', '#6a0f00'], '●', 'rise'],
    ['fx_stardust', 'Звёздная пыль', 'Мерцающий космос', ['#fff6c9', '#b78cff', '#2a1a6e'], '✦', 'twinkle']
];

// баннеры: [id, имя, описание, цвета, опции]  an — анимация, st — полоски, g/mv — частицы, g2/mv2 — вторые, glow, ov — доп. слой, x — эксклюзив
const BANNERS = [
    // обычные — 200
    ['b2_ocean', 'Океан', 'Глубокая синева', ['#0b3d91', '#1e88e5', '#22e3ff']],
    ['b2_forest', 'Лес', 'Тёмно-зелёный', ['#0a3d2e', '#1f8f5f', '#7be0a8']],
    ['b2_ember', 'Тлеющий', 'Красно-оранжевый', ['#5a0f0f', '#d9431e', '#ffb15c']],
    ['b2_grape', 'Виноград', 'Фиолетовый градиент', ['#2a0f5a', '#7a3fe0', '#d68cff']],
    ['b2_slate', 'Сланец', 'Строгий серо-синий', ['#1b2230', '#3a4a63', '#7f93b3']],
    // обычные — 300 (с узором)
    ['b3_aurora', 'Аврора', 'Зелёно-фиолетовое сияние', ['#06402f', '#2ee59d', '#8b5cf6'], { st: 1 }],
    ['b3_neonpink', 'Неон роза', 'Яркий розовый неон', ['#4a0a2e', '#ff3d8b', '#ffc2dd'], { st: 1 }],
    ['b3_gold', 'Золото', 'Королевский золотой', ['#5c3a00', '#ffc857', '#fff2b8'], { st: 1 }],
    ['b3_ice', 'Лёд', 'Бело-голубой', ['#12425f', '#7fd4ff', '#ffffff'], { st: 1 }],
    ['b3_midnight', 'Полночь', 'Тёмно-синий с бирюзой', ['#05061a', '#1b2a8a', '#22e3ff'], { st: 1 }],
    // анимированные — 500
    ['a5_pulse', 'Пульс', 'Переливающийся неон', ['#22e3ff', '#8b5cf6', '#ff3d8b'], { an: 1 }],
    ['a5_waves', 'Волны', 'Бегущие волны', ['#0a5fd1', '#22e3ff', '#0a5fd1'], { an: 1, g: '〰', mv: 'drift' }],
    ['a5_embers', 'Угли', 'Искры поднимаются вверх', ['#3a0a0a', '#e0451e', '#ffb15c'], { an: 1, g: '✦', mv: 'rise' }],
    ['a5_matrix', 'Матрица', 'Падающий код', ['#021a0c', '#0b6b2f', '#2ee59d'], { an: 1, g: '1', mv: 'fall' }],
    // анимированные — 700
    ['a7_snowfall', 'Метель', 'Снегопад над ареной', ['#0f3b63', '#4aa8e8', '#d6f1ff'], { an: 1, g: '❄', mv: 'fall' }],
    ['a7_sakura', 'Сакура', 'Лепестки летят', ['#5a1535', '#e0508c', '#ffc2dd'], { an: 1, g: '🌸', mv: 'drift' }],
    ['a7_thunder', 'Гроза', 'Вспышки молний', ['#10122e', '#3a3f8f', '#a9b4ff'], { an: 1, g: '⚡', mv: 'flash' }],
    // анимированные — 800
    ['a8_lava', 'Лава', 'Течёт раскалённая лава', ['#3a0500', '#ff4d00', '#ffd000'], { an: 1, g: '🔥', mv: 'rise', glow: '#ff5a00' }],
    ['a8_galaxy', 'Галактика', 'Звёзды и туманность', ['#07051a', '#4b1fa8', '#ff3d8b'], { an: 1, g: '✦', mv: 'flash', glow: '#8b5cf6' }],
    ['a8_cyber', 'Кибергрид', 'Неоновая сетка', ['#05142a', '#0a8fd1', '#22e3ff'], { an: 1, g: '◆', mv: 'drift', glow: '#22e3ff' }],
    // эксклюзив — 1500
    ['bz_hero', 'Герой-шторм', 'Звёзды, щит и молнии как в комиксах', ['#0a1a4a', '#d41e3a', '#2457d6'], { an: 1, x: 1, g: '★', mv: 'drift', g2: '⚡', mv2: 'flash', glow: '#ff3b5c' }],
    ['bz_spider', 'Паутина героя', 'Паучки спускаются на нитях', ['#1a0505', '#c1121f', '#1b2a8a'], { an: 1, x: 1, g: '🕷', mv: 'dangle', g2: '✦', mv2: 'flash', glow: '#ff2b3d', ov: 'repeating-conic-gradient(from 0deg at 12% 0%,rgba(255,255,255,.14) 0 2deg,transparent 2deg 14deg),' }],
    ['bz_dragon', 'Огненный дракон', 'Дракон летит сквозь пламя', ['#2a0000', '#c21800', '#ff9d00'], { an: 1, x: 1, big: 1, g: '🐉', mv: 'drift', g2: '🔥', mv2: 'rise', glow: '#ff6a00' }],
    ['bz_mystic', 'Мистический портал', 'Искрящиеся кольца и руны магии', ['#1a0a2e', '#5b2a9e', '#ff9a1f'], { an: 1, x: 1, g: '✺', mv: 'spin', g2: '✦', mv2: 'flash', glow: '#ff9a1f', ov: 'radial-gradient(circle at 86% 50%,transparent 0 20%,rgba(255,160,40,.9) 21% 24%,transparent 25% 31%,rgba(255,200,90,.6) 32% 34%,transparent 35%),' }],
    ['bz_frostdragon', 'Ледяной дракон', 'Дракон мороза и вьюга', ['#04122a', '#2a7fd1', '#e8fbff'], { an: 1, x: 1, big: 1, g: '🐲', mv: 'drift', g2: '❄', mv2: 'fall', glow: '#6fd3ff' }]
];

// ПРЕМИУМ-баннеры: 10 по 2000 и 10 по 2500 (неон, эмодзи, аниме, анимация)
BANNERS.push(
    ['bn20_sakura_dusk', 'Закат сакуры', 'Лепестки плывут на закате', ['#2a0a2e', '#c2377a', '#ffb3d1'], { an: 1, x: 1, g: '🌸', mv: 'drift', g2: '✨', mv2: 'flash', glow: '#ff6fa8' }],
    ['bn20_neon_tokyo', 'Неон-Токио', 'Иероглифы-вывески горят в ночи', ['#0a0620', '#7a1fd6', '#22e3ff'], { an: 1, fs: 16, fs2: 16, g: '東', mv: 'drift', g2: '京', mv2: 'flash', glow: '#22e3ff', ov: 'repeating-linear-gradient(90deg,rgba(34,227,255,.16) 0 1px,transparent 1px 14px),' }],
    ['bn20_ramen_night', 'Ночной рамен', 'Парок над миской', ['#1a0d05', '#c45a12', '#ffd27a'], { an: 1, x: 1, g: '🍜', mv: 'bob', g2: '♨', mv2: 'rise', glow: '#ffb347' }],
    ['bn20_kitsune_shrine', 'Храм кицунэ', 'Тории и лисьи огни', ['#240808', '#e04b1a', '#ffd07a'], { an: 1, x: 1, g: '⛩', mv: 'pulse', g2: '🦊', mv2: 'drift', glow: '#ff7a3d' }],
    ['bn20_moon_cats', 'Лунные коты', 'Коты гуляют под луной', ['#0b0f2e', '#2b3a9e', '#c9d4ff'], { an: 1, x: 1, g: '🐱', mv: 'bob', g2: '🌙', mv2: 'flash', glow: '#9db4ff' }],
    ['bn20_aurora_dance', 'Танец авроры', 'Северное сияние и искры', ['#04141a', '#12b886', '#9b5de5'], { an: 1, x: 1, g: '✦', mv: 'rise', g2: '✧', mv2: 'flash', glow: '#2ee59d', ov: 'radial-gradient(ellipse at 30% 120%,rgba(155,93,229,.55),transparent 60%),' }],
    ['bn20_lava_core', 'Лавовое ядро', 'Пузыри раскалённой лавы', ['#2a0300', '#ff3d00', '#ffd600'], { an: 1, x: 1, g: '🔥', mv: 'rise', g2: '●', mv2: 'rise', glow: '#ff5a00', sw: 1 }],
    ['bn20_cyber_rain', 'Кибер-дождь', 'Неоновые струи', ['#02121f', '#0a5f8f', '#22e3ff'], { an: 1, fs: 14, g: '|', mv: 'fall', g2: '◆', mv2: 'flash', glow: '#22e3ff' }],
    ['bn20_candy_pop', 'Конфетный поп', 'Сладкий дождь и звёздочки', ['#ff7ac6', '#ffb36b', '#7af0ff'], { an: 1, x: 1, g: '🍬', mv: 'fall', g2: '⭐', mv2: 'flash', glow: '#ff7ac6' }],
    ['bn20_ocean_deep', 'Глубина океана', 'Пузырьки и рыбки', ['#021a2e', '#0a6aa8', '#7be0ff'], { an: 1, x: 1, g: '🫧', mv: 'rise', g2: '🐠', mv2: 'drift', glow: '#4ad8ff' }],
    ['bn25_dragon_storm', 'Драконий шторм', 'Дракон в грозовых тучах', ['#12031e', '#6a1fd1', '#ff6a00'], { an: 1, big: 1, g: '🐉', mv: 'drift', g2: '⚡', mv2: 'flash', glow: '#ff6a00', sw: 1 }],
    ['bn25_ninja_shadow', 'Тень ниндзя', 'Сюрикены во тьме', ['#05050a', '#2a2a4a', '#9b1c3a'], { an: 1, x: 1, g: '✴', mv: 'spin', g2: '🌑', mv2: 'pulse', glow: '#ff3d5c' }],
    ['bn25_phoenix_rise', 'Рассвет феникса', 'Птица огня взмывает ввысь', ['#2a0500', '#e8420a', '#ffdd55'], { an: 1, big: 1, g: '🐦', mv: 'drift', g2: '🔥', mv2: 'rise', glow: '#ff8a1f', sw: 1 }],
    ['bn25_galaxy_empire', 'Галактическая империя', 'Планеты и звёздная пыль', ['#05031a', '#3a1fa8', '#ff3d9a'], { an: 1, x: 1, g: '🪐', mv: 'drift', g2: '✦', mv2: 'flash', glow: '#b78cff', ov: 'radial-gradient(circle at 80% 40%,rgba(255,61,154,.45),transparent 45%),' }],
    ['bn25_thunder_temple', 'Храм грома', 'Молнии бьют в облаках', ['#0a0c2a', '#2f3fbf', '#fff27a'], { an: 1, big: 1, g: '⚡', mv: 'flash', g2: '☁', mv2: 'drift', glow: '#ffe14d' }],
    ['bn25_ice_kingdom', 'Ледяное королевство', 'Метель и ледяная корона', ['#041a33', '#3a9be8', '#ffffff'], { an: 1, x: 1, g: '❄', mv: 'fall', g2: '👑', mv2: 'pulse', glow: '#9fdcff', sw: 1 }],
    ['bn25_spirit_world', 'Мир духов', 'Призраки и бумажные фонарики', ['#0a1a1a', '#1fae9a', '#b8fff0'], { an: 1, x: 1, g: '👻', mv: 'drift', g2: '🏮', mv2: 'sway', glow: '#7af0e0' }],
    ['bn25_mecha_core', 'Меха-ядро', 'Вращаются шестерни', ['#07121f', '#1f6f9f', '#ff8a1f'], { an: 1, x: 1, g: '⚙', mv: 'spin', g2: '◆', mv2: 'flash', glow: '#ff8a1f', ov: 'repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 6px),' }],
    ['bn25_rainbow_neon', 'Радужный неон', 'Переливы всех цветов', ['#ff3d8b', '#ffc857', '#2ee59d', '#22e3ff', '#8b5cf6'], { an: 1, x: 1, g: '💫', mv: 'drift', g2: '✦', mv2: 'flash', glow: '#ffffff', sw: 1 }],
    ['bn25_royal_gold', 'Королевское золото', 'Золотой блеск и корона', ['#2a1a00', '#c98a00', '#fff2b8'], { an: 1, x: 1, g: '👑', mv: 'bob', g2: '✦', mv2: 'flash', glow: '#ffc857', sw: 1 }]
);

// ПРЕМИУМ-рамки (анимация + два эмодзи по углам): 10 по 2000 и 10 по 2500 — [id, имя, описание, цвета, эмодзи 1, эмодзи 2]
const FRAMES_PREM = [
    ['fr20_sakura_storm', 'Сакурная буря', 'Лепестки кружат вокруг', ['#ffd1e3', '#ff6fa8', '#c2377a', '#ffb3d1'], '🌸', '✨'],
    ['fr20_neon_samurai', 'Неон-самурай', 'Клинок в неоне', ['#22e3ff', '#8b5cf6', '#ff3d8b', '#22e3ff'], '⚔', '✨'],
    ['fr20_kitsune_fire', 'Лисий огонь', 'Огоньки кицунэ', ['#ffe0a8', '#ff9a3d', '#e0451e', '#ffb15c'], '🦊', '🔥'],
    ['fr20_moon_rabbit', 'Лунный кролик', 'Сияние лунной ночи', ['#e8eeff', '#9db4ff', '#5b6bd1', '#c9d4ff'], '🐰', '🌙'],
    ['fr20_cyber_oni', 'Кибер-они', 'Алый неон и маска', ['#ff4d6d', '#8b0f3a', '#6a1fd1', '#ff3d8b'], '👹', '⚡'],
    ['fr20_ice_crown', 'Ледяная корона', 'Мороз и королевский блеск', ['#ffffff', '#9fdcff', '#3a9be8', '#d6f1ff'], '👑', '❄'],
    ['fr20_toxic_pulse', 'Токсичный пульс', 'Ядовито-зелёный неон', ['#d4ff3a', '#2ee59d', '#0a7a52', '#b6f23a'], '☣', '💚'],
    ['fr20_aqua_wave', 'Аква-волна', 'Бегущие волны', ['#b8fff6', '#22e3ff', '#0a6aa8', '#7be0ff'], '🌊', '🐚'],
    ['fr20_star_night', 'Звёздная ночь', 'Мерцающий космос', ['#fff6c9', '#b78cff', '#2a1a6e', '#6a1fd1'], '⭐', '🌌'],
    ['fr20_pixel_heart', 'Пиксельное сердце', 'Ретро-неон 8 бит', ['#ff7ac6', '#7af0ff', '#ffe14d', '#ff7ac6'], '💖', '👾'],
    ['fr25_dragon_ruler', 'Повелитель драконов', 'Огонь и чешуя', ['#ffe36b', '#ff4d00', '#7a0000', '#ff9d00'], '🐉', '🔥'],
    ['fr25_thunder_god', 'Бог грома', 'Молнии и корона', ['#fff27a', '#4a6bff', '#1a1f8f', '#a9b4ff'], '⚡', '👑'],
    ['fr25_phoenix', 'Феникс', 'Возрождение из пламени', ['#ffe36b', '#ff6a00', '#c21800', '#ffb347'], '🐦', '🔥'],
    ['fr25_void_portal', 'Портал пустоты', 'Вихрь и магия', ['#d9b8ff', '#7a1fd6', '#0a0620', '#ff3d8b'], '🌀', '🔮'],
    ['fr25_angel_wings', 'Крылья ангела', 'Небесное сияние', ['#ffffff', '#fff2b8', '#9fd8ff', '#ffe9f3'], '👼', '✨'],
    ['fr25_demon_king', 'Король демонов', 'Адское пламя', ['#ff4d4d', '#8b0000', '#2a0010', '#ff7a3d'], '😈', '🔥'],
    ['fr25_galaxy_core', 'Ядро галактики', 'Планеты и туманности', ['#9b5de5', '#22e3ff', '#ff3d8b', '#fff6c9'], '🪐', '✨'],
    ['fr25_scarlet_moon', 'Алая луна', 'Багровая ночь и летучие мыши', ['#ffb3c1', '#d41e3a', '#3a0010', '#ff6b81'], '🌕', '🦇'],
    ['fr25_rainbow_prism', 'Радужная призма', 'Все цвета радуги', ['#ff3d8b', '#ffc857', '#2ee59d', '#22e3ff', '#8b5cf6'], '🌈', '💎'],
    ['fr25_golden_dragon', 'Золотой дракон', 'Сокровища и власть', ['#fff2b8', '#ffc857', '#a8740b', '#ffe36b'], '🐲', '👑']
];

// БРЕЛКИ — надеваются на рамку и качаются / вращаются / пульсируют: [id, имя, описание, эмодзи, движение, цвет свечения, группа]
const CHARMS = [
    // марвел-стиль — 1000
    ['cz10_spider', 'Паучок', 'Висит на паутинке', '🕷', 'swing', '#ff3355', 'marvel'],
    ['cz10_shield', 'Звёздный щит', 'Летящий щит героя', '🛡', 'spin', '#3a7bff', 'marvel'],
    ['cz10_hammer', 'Молот грома', 'Искрит молниями', '🔨', 'swing', '#ffe14d', 'marvel'],
    ['cz10_reactor', 'Дуговой реактор', 'Пульсирует голубым', '🔵', 'pulse', '#22e3ff', 'marvel'],
    ['cz10_fist', 'Зелёный кулак', 'Ударная сила', '👊', 'bob', '#2ee59d', 'marvel'],
    ['cz10_panther', 'Чёрная пантера', 'Хищная грация', '🐆', 'bob', '#b78cff', 'marvel'],
    ['cz10_gauntlet', 'Перчатка камней', 'Сияет золотом', '🧤', 'pulse', '#ffc857', 'marvel'],
    ['cz10_portal', 'Врата магов', 'Вращающийся портал', '🔮', 'spin', '#ff9a1f', 'marvel'],
    ['cz10_armor', 'Металлическая рука', 'Холодный металл', '🦾', 'sway', '#9aa4c4', 'marvel'],
    ['cz10_starlord', 'Звёздный лорд', 'Наушники и космос', '🎧', 'bob', '#ff3d8b', 'marvel'],
    // аниме — 800
    ['cz8_naruto', 'Вихревая печать', 'Закручивается спиралью', '🍥', 'spin', '#ff8a3d', 'anime'],
    ['cz8_katana', 'Катана', 'Лезвие качается', '🗡', 'swing', '#bfe3ff', 'anime'],
    ['cz8_sakura', 'Лепесток сакуры', 'Плавно колышется', '🌸', 'sway', '#ff8fb8', 'anime'],
    ['cz8_oni', 'Маска они', 'Подпрыгивает от злости', '👹', 'bob', '#ff4d6d', 'anime'],
    ['cz8_kitsune', 'Лисий хвост', 'Хитрый маятник', '🦊', 'swing', '#ff9a3d', 'anime'],
    ['cz8_ramen', 'Миска рамена', 'Горячо и вкусно', '🍜', 'bob', '#ffd27a', 'anime'],
    ['cz8_mask', 'Театральная маска', 'Мерцает таинственно', '🎭', 'pulse', '#b78cff', 'anime'],
    ['cz8_shuriken', 'Сюрикен', 'Свистит по кругу', '✴', 'spin', '#cfd8e6', 'anime'],
    ['cz8_lantern', 'Фонарик', 'Тёплый свет фестиваля', '🏮', 'swing', '#ff6a3d', 'anime'],
    ['cz8_star', 'Звезда мечты', 'Пульсирует светом', '🌟', 'pulse', '#fff27a', 'anime'],
    // животные — 600
    ['cz6_wolf', 'Одинокий волк', 'Воет на луну', '🐺', 'sway', '#9aa4c4', 'animals'],
    ['cz6_lion', 'Лев', 'Царь зверей', '🦁', 'bob', '#ffc857', 'animals'],
    ['cz6_eagle', 'Орёл', 'Парит над рамкой', '🦅', 'sway', '#c98a00', 'animals'],
    ['cz6_snake', 'Змейка', 'Извивается', '🐍', 'swing', '#2ee59d', 'animals'],
    ['cz6_owl', 'Мудрая сова', 'Следит за игрой', '🦉', 'bob', '#b78cff', 'animals'],
    ['cz6_bear', 'Мишка', 'Косолапый друг', '🐻', 'swing', '#c98a5a', 'animals'],
    ['cz6_panda', 'Панда', 'Милый и ленивый', '🐼', 'bob', '#ffffff', 'animals'],
    ['cz6_shark', 'Акула', 'Плывёт по волнам', '🦈', 'sway', '#4aa8ff', 'animals'],
    ['cz6_scorpion', 'Скорпион', 'Жало наготове', '🦂', 'swing', '#ff4d6d', 'animals'],
    ['cz6_tiger', 'Тигр', 'Полосатый хищник', '🐅', 'bob', '#ff9a3d', 'animals']
];

// ---------- 🎃 ХЭЛЛОУИН: новые товары (цены берутся из существующих префиксов — firestore.rules менять не нужно) ----------
NEW_FX.push(
    ['fx_hw_pumpkins', '🎃 Тыквенный дождь', 'Тыквы падают на аватарку', ['#ffd9a0', '#ff7a00', '#5a1f00'], '🎃', 'fall'],
    ['fx_hw_ghosts', '👻 Призраки', 'Привидения всплывают из тьмы', ['#ffffff', '#bfc9ff', '#3a3f8f'], '👻', 'rise'],
    ['fx_hw_bats', '🦇 Летучие мыши', 'Стая мышей над аватаркой', ['#d9b8ff', '#7a3fe0', '#12031e'], '🦇', 'rise'],
    ['fx_hw_witchfire', 'Ведьмин огонь', 'Зелёное пламя из котла', ['#d4ff3a', '#2ee59d', '#0a3a1a'], '🔥', 'rise'],
    ['fx_hw_spiders', 'Паучий дождь', 'Паучки сыплются сверху', ['#ffb36b', '#ff6a00', '#2a1a3a'], '🕷', 'fall'],
    ['fx_hw_candy', 'Конфеты или жизнь', 'Сладости со всех сторон', ['#ffd1f5', '#ff3d8b', '#ff7a00'], '🍬', 'fall']
);
BANNERS.push(
    ['a5_hw_glowpumpkin', 'Светящаяся тыква', 'Тыква мерцает во тьме', ['#1a0a00', '#d9560a', '#ffb347'], { an: 1, g: '🎃', mv: 'pulse', glow: '#ff7a1f' }],
    ['a7_hw_bats', 'Стая мышей', 'Летучие мыши пролетают над ночным небом', ['#0a0414', '#3a1a5a', '#ff7a00'], { an: 1, g: '🦇', mv: 'drift' }],
    ['bn20_hw_pumpkin_patch', 'Тыквенное поле', 'Тыквы качаются в лунном свете', ['#1a0a00', '#d9560a', '#ffb347'], { an: 1, x: 1, g: '🎃', mv: 'bob', g2: '🦇', mv2: 'drift', glow: '#ff7a1f' }],
    ['bn20_hw_haunted_house', 'Дом с привидениями', 'Призраки и свечи в окнах', ['#0a0714', '#3a1f5c', '#a98bff'], { an: 1, x: 1, g: '👻', mv: 'drift', g2: '🕯', mv2: 'flash', glow: '#a98bff' }],
    ['bn20_hw_witch_night', 'Ночь ведьмы', 'Зелёное зелье и магия', ['#12031e', '#5a1f8f', '#7bff5c'], { an: 1, x: 1, g: '🔮', mv: 'pulse', g2: '🧪', mv2: 'bob', glow: '#8aff3d' }],
    ['bn20_hw_trick_treat', 'Сладость или гадость', 'Конфеты сыплются с неба', ['#2a0a00', '#ff7a00', '#8b5cf6'], { an: 1, x: 1, g: '🍬', mv: 'fall', g2: '🎃', mv2: 'bob', glow: '#ff7a00' }],
    ['bn25_hw_graveyard', 'Туманное кладбище', 'Призраки бродят среди могил', ['#050508', '#1f2a2a', '#7af0c0'], { an: 1, big: 1, g: '👻', mv: 'drift', g2: '🪦', mv2: 'pulse', glow: '#7af0c0', sw: 1 }],
    ['bn25_hw_vampire_castle', 'Замок вампира', 'Алая луна и стаи мышей', ['#1a0005', '#8b0f2a', '#ff3d5c'], { an: 1, big: 1, g: '🦇', mv: 'drift', g2: '🌕', mv2: 'pulse', glow: '#ff3d5c', sw: 1 }],
    ['bn25_hw_skull_kingdom', 'Королевство черепов', 'Черепа и паутина', ['#08050f', '#4a1f6a', '#ff7a00'], { an: 1, x: 1, g: '💀', mv: 'bob', g2: '🕸', mv2: 'dangle', glow: '#ff7a00', sw: 1 }],
    ['bn25_hw_spider_nest', 'Паучье гнездо', 'Пауки спускаются на нитях', ['#050505', '#2a1a3a', '#ff6a00'], { an: 1, x: 1, g: '🕷', mv: 'dangle', g2: '🎃', mv2: 'flash', glow: '#ff6a00' }]
);
FRAMES_PREM.push(
    ['fr20_hw_pumpkin', 'Тыква-фонарь', 'Оранжевое сияние и мыши', ['#ffd9a0', '#ff7a00', '#7a2e00', '#ffb347'], '🎃', '🦇'],
    ['fr20_hw_ghost', 'Призрак', 'Бледное свечение привидения', ['#ffffff', '#cfe0ff', '#7a8cc4', '#e8f0ff'], '👻', '✨'],
    ['fr20_hw_brew', 'Ведьмино зелье', 'Кислотный котёл', ['#d4ff3a', '#7a1fd6', '#1a0a2e', '#8aff3d'], '🧪', '🧙'],
    ['fr20_hw_candy', 'Конфетная рамка', 'Сладкая и страшная', ['#ffb347', '#ff3d8b', '#8b5cf6', '#ff7a00'], '🍬', '🎃'],
    ['fr25_hw_vampire', 'Вампир', 'Кроваво-красный блеск', ['#ffb3c1', '#b3122e', '#2a0008', '#ff4d6d'], '🧛', '🦇'],
    ['fr25_hw_reaper', 'Жнец', 'Холодный свет и тьма', ['#cfd8e6', '#3a3a5a', '#0a0a14', '#9b5de5'], '💀', '🔮'],
    ['fr25_hw_haunted', 'Проклятый дом', 'Призрачный бирюзовый туман', ['#b8fff0', '#1fae9a', '#0a1a1a', '#7af0e0'], '🏚', '👻'],
    ['fr25_hw_web', 'Паутина', 'Серебристая паутина и паук', ['#ffffff', '#9aa4c4', '#1a1a2a', '#ff6a00'], '🕸', '🕷']
);
CHARMS.push(
    ['cz6_hw_pumpkin', 'Тыковка', 'Весело подпрыгивает', '🎃', 'bob', '#ff7a1f', 'halloween'],
    ['cz6_hw_ghost', 'Привидение', 'Плавно парит', '👻', 'sway', '#cfe0ff', 'halloween'],
    ['cz6_hw_bat', 'Летучая мышь', 'Качается вниз головой', '🦇', 'swing', '#b78cff', 'halloween'],
    ['cz6_hw_candy', 'Леденец', 'Сладкая приманка', '🍭', 'spin', '#ff3d8b', 'halloween'],
    ['cz8_hw_witchhat', 'Шляпа ведьмы', 'Колдовское покачивание', '🧙', 'sway', '#8aff3d', 'halloween'],
    ['cz8_hw_skull', 'Череп', 'Ухмыляется и подпрыгивает', '💀', 'bob', '#e8f0ff', 'halloween'],
    ['cz8_hw_spider', 'Паучок на нити', 'Висит над рамкой', '🕷', 'swing', '#ff6a00', 'halloween'],
    ['cz10_hw_cauldron', 'Котёл', 'Булькает зелёным огнём', '🧪', 'pulse', '#8aff3d', 'halloween'],
    ['cz10_hw_candle', 'Свеча-призрак', 'Мерцающее пламя', '🕯', 'pulse', '#ffd27a', 'halloween'],
    ['cz10_hw_vampire', 'Граф', 'Магнетический взгляд', '🧛', 'bob', '#ff3d5c', 'halloween']
);

// ---------- 🧛 ХЭЛЛОУИН · МОНСТРЫ И ДРАКУЛА (временное событие до 7 ноября) ----------
NEW_FX.push(
    ['fx_hw_dracula', '🧛 Граф Дракула', 'Летучие мыши вьются вокруг графа', ['#ffb3c1', '#b3122e', '#1a0008'], '🧛', 'rise'],
    ['fx_hw_zombie', '🧟 Зомби-орда', 'Зомби выползают из-под земли', ['#d4ff9a', '#4a8f2a', '#0a1a0a'], '🧟', 'rise'],
    ['fx_hw_werewolf', '🐺 Оборотень', 'Вой на кровавую луну', ['#e0e4f0', '#6a7090', '#14141f'], '🐺', 'fall'],
    ['fx_hw_monsters', '👹 Монстры', 'Монстры лезут из тьмы', ['#ffb3ff', '#9b2fd6', '#1a0033'], '👹', 'rise']
);
BANNERS.push(
    ['a8_hw_werewolf_moon', 'Луна оборотня', 'Волки воют под красной луной', ['#0a0510', '#3a1030', '#ff4d4d'], { an: 1, g: '🐺', mv: 'drift', glow: '#ff4d4d' }],
    ['bn20_hw_monster_party', 'Вечеринка монстров', 'Монстры устроили праздник', ['#150826', '#6a1fa8', '#7bff5c'], { an: 1, x: 1, g: '👹', mv: 'bob', g2: '🧟', mv2: 'drift', glow: '#7bff5c' }],
    ['bn20_hw_mummy_tomb', 'Гробница мумии', 'Бинты, золото и проклятье', ['#1a1205', '#6a4a14', '#ffd166'], { an: 1, x: 1, g: '🏺', mv: 'pulse', g2: '💀', mv2: 'bob', glow: '#ffd166' }],
    ['bn25_hw_dracula_manor', 'Поместье Дракулы', 'Граф и его летучая стая', ['#14000a', '#7a0a24', '#ff2a55'], { an: 1, big: 1, g: '🧛', mv: 'bob', g2: '🦇', mv2: 'drift', glow: '#ff2a55', sw: 1 }],
    ['bn25_hw_ghost_ship', 'Корабль-призрак', 'Призраки плывут в тумане', ['#04080f', '#12304a', '#7af0ff'], { an: 1, big: 1, g: '👻', mv: 'drift', g2: '🌫', mv2: 'pulse', glow: '#7af0ff', sw: 1 }]
);
FRAMES_PREM.push(
    ['fr20_hw_zombie', 'Зомби', 'Ядовито-зелёная гниль', ['#e6ffb0', '#7ac943', '#1f3d12', '#b6f23a'], '🧟', '🧠'],
    ['fr20_hw_mummy', 'Мумия', 'Старые бинты и золото', ['#fff5d6', '#d9c08a', '#5a4520', '#ffd166'], '🏺', '💀'],
    ['fr25_hw_dracula', 'Дракула', 'Алые крылья и клыки', ['#ffb3c1', '#e11d48', '#1a0008', '#ff4d6d'], '🧛', '🦇'],
    ['fr25_hw_werewolf', 'Оборотень', 'Лунное серебро и когти', ['#f0f2ff', '#8a90b8', '#14141f', '#ff4d4d'], '🐺', '🌕']
);
CHARMS.push(
    ['cz6_hw_zombie', 'Зомби', 'Тянет руки к рамке', '🧟', 'sway', '#8aff3d', 'halloween'],
    ['cz6_hw_monster', 'Монстрик', 'Рычит и подпрыгивает', '👹', 'bob', '#ff4d4d', 'halloween'],
    ['cz8_hw_wolf', 'Оборотень', 'Воет на луну', '🐺', 'sway', '#cfd8ff', 'halloween'],
    ['cz8_hw_mummy', 'Мумия', 'Бинты развеваются', '🏺', 'swing', '#ffd166', 'halloween'],
    ['cz10_hw_dracula', 'Дракула', 'Клыки и плащ', '🧛', 'bob', '#ff1744', 'halloween'],
    ['cz10_hw_bats', 'Стая мышей', 'Три мыши — один брелок', '🦇', 'swing', '#c084fc', 'halloween']
);

// награды ТОП-1/2/3 месяца — выдаются автоматически на месяц, не продаются
const TOP_COL = { 1: ['#fff2b8', '#ffc857', '#a8740b'], 2: ['#ffffff', '#cfd8e6', '#6b7a90'], 3: ['#ffd7b0', '#d98a4a', '#7a3d12'] };
const TOP_NAME = { 1: 'ТОП-1', 2: 'ТОП-2', 3: 'ТОП-3' };
const TOP_ITEMS = [1, 2, 3].flatMap(r => [
    { id: 'tp_fr' + r, type: 'frame', award: r, name: 'Рамка ' + TOP_NAME[r], desc: 'Награда за ' + r + ' место месяца' },
    { id: 'tp_fx' + r, type: 'effect', award: r, name: 'Корона ' + TOP_NAME[r], desc: 'Анимация чемпиона месяца' },
    { id: 'tp_bn' + r, type: 'banner', award: r, name: 'Баннер ' + TOP_NAME[r], desc: 'Живёт до сброса статистики' }
]);

const SHOP_ITEMS = [
    ...OLD_ITEMS,
    ...NEW_FRAMES.map(([id, name, desc]) => ({ id, type: 'frame', name, desc })),
    ...NEW_FX.map(([id, name, desc]) => ({ id, type: 'effect', name, desc })),
    ...BANNERS.map(([id, name, desc, , o]) => ({ id, type: 'banner', name, desc, tier: id.startsWith('bz_') ? 'excl' : /^bn2/.test(id) ? 'prem' : (o && o.an) ? 'anim' : 'plain' })),
    ...FRAMES_PREM.map(([id, name, desc]) => ({ id, type: 'frame', tier: 'prem', name, desc })),
    ...CHARMS.map(([id, name, desc, , anim, , group]) => ({ id, type: 'charm', name, desc, anim, group }))
].map(i => ({ ...i, price: priceOf(i.id), hw: /_hw_/.test(i.id) }));
const ITEM_BY_ID = new Map([...SHOP_ITEMS, ...TOP_ITEMS].map(i => [i.id, i]));

// ---------- награды ТОП-3 ----------
let AWARD_RANK = {}, AWARDS_DOC = null;
function recomputeAwards() {
    const m = {};
    if (AWARDS_DOC && AWARDS_DOC.until > Date.now() && Array.isArray(AWARDS_DOC.top) && AWARDS_DOC.top.length) {
        AWARDS_DOC.top.slice(0, 3).forEach((id, i) => { m[id] = i + 1; });      // итоги прошлого месяца держатся весь текущий
    } else if (typeof allPlayers !== 'undefined') {
        const mk = periodKey(), n = (o, k) => Number(o[k]) || 0;
        allPlayers.filter(p => !p.banned && p.monthKey === mk && n(p, 'mElo') > 0)
            .sort((a, b) => (n(b, 'mElo') - n(a, 'mElo')) || (n(b, 'mWins') - n(a, 'mWins')) || (n(b, 'mKills') - n(a, 'mKills')))
            .slice(0, 3).forEach((p, i) => { m[p.id] = i + 1; });
    }
    AWARD_RANK = m;
}
db.collection('site_content').doc('awards').onSnapshot(s => {
    AWARDS_DOC = s.exists ? s.data() : null;
    recomputeAwards();
    if (typeof renderRanks === 'function' && typeof allPlayers !== 'undefined' && allPlayers.length) renderRanks();
}, () => {});

// надето игроком + награда (награда перекрывает слот на месяц)
function equippedOf(p) {
    const e = { ...((p && p.equipped) || {}) }, r = p && AWARD_RANK[p.id], off = e.aoff || {};
    delete e.aoff;
    // игрок может снять награду в магазине (aoff) и носить свои купленные вещи
    if (r) { if (!off.frame) e.frame = 'tp_fr' + r; if (!off.effect) e.effect = 'tp_fx' + r; if (!off.banner) e.banner = 'tp_bn' + r; }
    return e;
}

// ---------- 🍬 КОНФЕТЫ (валюта Хэллоуина) ----------
// 1 конфета = 200 монет. Всё, что продаётся за монеты, можно купить и за конфеты (цена = монеты / 200, вверх).
// Событие временное: после EVENT_END_MS конфеты не тратятся, обменник закрыт, хэллоуин-товары не покупаются (купленное остаётся).
// Конец события: 7 ноября 23:59:59 по Бишкеку (UTC+6). То же значение зашито в firestore.rules.
const COINS_PER_CANDY = 200;
const EVENT_END_MS = Date.UTC(2026, 10, 7, 18, 0, 0);
const eventOver = () => Date.now() >= EVENT_END_MS;
const candyPriceOf = coins => Math.ceil((Number(coins) || 0) / COINS_PER_CANDY);
const candiesOf = p => Number(p && p.candies) || 0;
const candiesText = p => candiesOf(p).toLocaleString('ru');

// монеты игрока: безлимит показывается как ∞
const coinsOf = p => (p && p.unlimited) ? Infinity : (Number(p && p.coins) || 0);
const coinsText = p => (p && p.unlimited) ? '∞' : (Number(p && p.coins) || 0).toLocaleString('ru');

// классы и слой частиц для аватарки игрока p
function cosClasses(p) {
    const e = equippedOf(p), c = [];
    if (e.frame && ITEM_BY_ID.has(e.frame)) c.push('cos', 'cos-' + clsOf(e.frame));
    if (e.effect && ITEM_BY_ID.has(e.effect)) c.push('cos', 'cos-fxon', 'cos-' + clsOf(e.effect));
    return c.join(' ');
}
function cosLayer(p) {
    const e = equippedOf(p);
    let h = (e.effect && ITEM_BY_ID.has(e.effect)) ? '<i class="fxl"><b></b><b></b><b></b><b></b><b></b><b></b></i>' : '';
    const c = e.charm && ITEM_BY_ID.get(e.charm);                      // брелок висит на рамке и двигается
    if (c) h += `<i class="chm chm-${c.anim} chm-${clsOf(c.id)}"></i>`;
    return h;
}
// баннер: классы и слой частиц; плашка-полоса для профилей
function bnClasses(p) { const b = equippedOf(p).banner; return (b && ITEM_BY_ID.has(b)) ? 'bn-bg bn-' + clsOf(b) : ''; }
function bnLayer(p) { const b = equippedOf(p).banner; return (b && ITEM_BY_ID.has(b)) ? '<i class="bnl"><b></b><b></b><b></b><b></b><b></b><b></b></i>' : ''; }
function awardBadge(p) { const r = p && AWARD_RANK[p.id]; return r ? `<span class="aw-badge aw${r}">🏆 ${TOP_NAME[r]} МЕСЯЦА</span>` : ''; }
function awardMini(p) { const r = p && AWARD_RANK[p.id]; return r ? `<i class="aw-mini aw${r}" title="${TOP_NAME[r]} месяца">${r === 1 ? '👑' : '🏆'}</i>` : ''; }
// надета ли сейчас награда ТОП в слоте (frame | effect | banner) у игрока p
const awardOn = (p, slot) => !!(p && AWARD_RANK[p.id]) && !(((p.equipped || {}).aoff) || {})[slot];
// баннер как фон всей шапки профиля (аватар + ник): inner — HTML шапки
function bannerHead(p, inner) {
    const c = bnClasses(p);
    if (!c) return (AWARD_RANK[p && p.id] ? `<div class="pf-banner-none">${awardBadge(p)}</div>` : '') + inner;
    return `<div class="bn-head ${c}">${bnLayer(p)}<i class="bn-shade"></i>${awardBadge(p)}<div class="bn-in">${inner}</div></div>`;
}
function bannerStrip(p) {
    const c = bnClasses(p);
    return c ? `<div class="pf-banner ${c}">${bnLayer(p)}${awardBadge(p)}</div>` : (AWARD_RANK[p && p.id] ? `<div class="pf-banner-none">${awardBadge(p)}</div>` : '');
}

// ---------- уровни гильдий 0–100 (считаются автоматически из побед и из оформления игроков) ----------
const COS_VAL = { fr: 10, fx: 30, b2: 15, b3: 25, a5: 40, a7: 60, a8: 80, bz: 150, tp: 120, bn20: 100, bn25: 130, fr20: 80, fr25: 110, cz6: 20, cz8: 30, cz10: 45 };
const cosScore = p => {
    const e = equippedOf(p);
    let s = ['frame', 'effect', 'banner', 'charm'].reduce((a, k) => a + (e[k] ? (COS_VAL[String(e[k]).split('_')[0]] || 0) : 0), 0);
    s += Math.min(20, ((p && p.inventory) || []).length) * 2;                  // коллекция тоже даёт очки
    return s;
};
function guildInfo(g) {
    const pl = typeof allPlayers !== 'undefined' ? allPlayers : [];
    const mem = pl.filter(p => !p.banned && guildKey(p.guild) === g.id);
    const cos = mem.reduce((a, p) => a + cosScore(p), 0);
    const w = Number(g.wins) || 0, gm = Number(g.games) || 0;
    const xpWin = w * 40, xpGames = gm * 5, xpKills = Math.round((Number(g.kills) || 0) * .4 + (Number(g.hs) || 0) * .8);
    const xp = xpWin + xpGames + xpKills + cos;
    const level = Math.min(100, Math.floor(Math.pow(xp / 25, 2 / 3)));
    const cur = 25 * Math.pow(level, 1.5), next = 25 * Math.pow(level + 1, 1.5);
    return { level, xp, cos, xpWin, xpGames, xpKills, members: mem.length, pct: level >= 100 ? 100 : Math.max(0, Math.min(100, Math.round((xp - cur) / (next - cur) * 100))) };
}
const glTier = l => l >= 100 ? 6 : l >= 80 ? 5 : l >= 60 ? 4 : l >= 40 ? 3 : l >= 25 ? 2 : l >= 10 ? 1 : 0;
const GL_NAMES = ['Новичок', 'Бронза', 'Серебро', 'Золото', 'Платина', 'Дракон', 'Легенда'];

// =====================================================================
//  CSS: генерируется из каталога выше
// =====================================================================
(function injectCss() {
    const css = [];
    css.push(`@keyframes n-shift{0%{background-position:0% 50%}100%{background-position:100% 50%}}
@keyframes n-glow{0%{box-shadow:0 0 8px var(--gl),0 0 2px var(--gl) inset}100%{box-shadow:0 0 22px var(--gl),0 0 8px var(--gl) inset}}
@keyframes n-rise{0%{transform:translateY(62px) scale(.6);opacity:0}20%{opacity:1}100%{transform:translateY(-14px) scale(1);opacity:0}}
@keyframes n-fall{0%{transform:translateY(-14px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(64px) rotate(160deg);opacity:0}}
@keyframes n-drift{0%{left:-8%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:104%;opacity:0}}
@keyframes n-flash{0%,100%{opacity:0;transform:scale(.4)}8%{opacity:1;transform:scale(1.35)}20%{opacity:.25}30%{opacity:1;transform:scale(1)}55%{opacity:0}}
@keyframes n-dangle{0%{transform:translateY(0);opacity:1}100%{transform:translateY(34px);opacity:1}}
@keyframes n-spin{0%{transform:rotate(0) scale(.8);opacity:.95}100%{transform:rotate(360deg) scale(1.15);opacity:.95}}
@keyframes n-twinkle{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.25) rotate(40deg)}}
@keyframes n-sweep{0%{left:-70%}100%{left:140%}}
@keyframes n-bob{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(-7px);opacity:1}}
@keyframes n-sway{0%{transform:rotate(-16deg);opacity:1}100%{transform:rotate(16deg);opacity:1}}
@keyframes n-pulse{0%,100%{transform:scale(.8);opacity:.7}50%{transform:scale(1.3);opacity:1}}
@keyframes n-swing{0%{transform:rotate(-22deg)}100%{transform:rotate(22deg)}}
@keyframes n-cspin{to{transform:rotate(360deg)}}
@keyframes n-cbob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-4px) rotate(6deg)}}
@keyframes n-csway{0%{transform:translateX(-3px) rotate(-14deg)}100%{transform:translateX(3px) rotate(14deg)}}
@keyframes n-cpulse{0%,100%{transform:scale(.9);filter:drop-shadow(0 0 2px var(--cg))}50%{transform:scale(1.18);filter:drop-shadow(0 0 10px var(--cg)) brightness(1.35)}}
.chm{position:absolute;right:-7px;bottom:-10px;z-index:7;font-size:15px;line-height:1;font-style:normal;pointer-events:none;transform-origin:50% -6px;--cg:#fff;filter:drop-shadow(0 0 4px var(--cg));animation-duration:2.4s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-direction:alternate}
.chm::before{content:"";position:absolute;left:50%;bottom:100%;width:1.5px;height:8px;margin-left:-.75px;background:linear-gradient(#fff,#9aa4c4);border-radius:1px}
.av-wrap.big .chm{font-size:27px;right:-11px;bottom:-16px;transform-origin:50% -10px}.av-wrap.big .chm::before{height:12px}
.chm-swing{animation-name:n-swing}.chm-bob{animation-name:n-cbob}.chm-sway{animation-name:n-csway}.chm-pulse{animation-name:n-cpulse;animation-duration:1.8s}
.chm-spin{animation-name:n-cspin;animation-direction:normal;animation-timing-function:linear;animation-duration:3s;transform-origin:50% 55%}.chm-spin::before{display:none}
.bn-bg{position:relative;overflow:hidden;border-radius:12px;padding:6px 14px 6px 8px;color:#fff}
.player-cell.bn-bg{width:100%}
.bn-bg>*:not(.bnl){position:relative;z-index:2}
.bn-bg span,.bn-bg small{text-shadow:0 1px 5px rgba(0,0,0,.8)}
.bnl{position:absolute!important;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.bnl b{position:absolute;opacity:0;line-height:1;font-size:12px;font-weight:400;color:rgba(255,255,255,.92);text-shadow:0 0 6px currentColor;animation-iteration-count:infinite;animation-timing-function:linear;animation-delay:var(--d)}
.bnl b:nth-child(1){--x:8%;--y:16%;--d:-.2s}.bnl b:nth-child(2){--x:24%;--y:62%;--d:-1.1s}.bnl b:nth-child(3){--x:41%;--y:30%;--d:-2s}
.bnl b:nth-child(4){--x:58%;--y:72%;--d:-.6s}.bnl b:nth-child(5){--x:74%;--y:14%;--d:-1.6s}.bnl b:nth-child(6){--x:90%;--y:52%;--d:-2.4s}
.pf-banner{height:88px;border-radius:16px;margin-bottom:14px;padding:0}
.pf-banner .aw-badge{position:absolute;right:10px;bottom:8px}
.pf-banner-none{margin-bottom:10px}
.bn-bg.bn-head{border-radius:16px;padding:16px 18px;margin-bottom:18px}
.bn-head>i.bn-shade{position:absolute!important;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(5,3,13,.62),rgba(5,3,13,.2) 70%,rgba(5,3,13,.08))}
.bn-head .bn-in{min-width:0}
.bn-head .bn-in>.pm-head,.bn-head .bn-in>.user-head{margin-bottom:0}
.bn-head h2,.bn-head h3,.bn-head .pm-name{color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.85)}
.bn-head .muted,.bn-head .user-counts,.bn-head .user-counts b{color:#e9e6ff;text-shadow:0 1px 5px rgba(0,0,0,.85)}
.bn-head .accent{text-shadow:0 1px 6px rgba(0,0,0,.9)}
.bn-head>.aw-badge{position:absolute;right:10px;bottom:8px;z-index:3}
.profile-head.bn-head{border-bottom:0;margin-bottom:16px}
.aw-badge{display:inline-block;font:800 11px 'Orbitron',sans-serif;letter-spacing:1px;padding:4px 10px;border-radius:999px;color:#1a1200;background:linear-gradient(90deg,#ffc857,#fff2b8,#ffc857);box-shadow:0 0 12px rgba(255,200,87,.7);text-shadow:none!important}
.aw-badge.aw2{background:linear-gradient(90deg,#cfd8e6,#fff,#cfd8e6);box-shadow:0 0 12px rgba(207,216,230,.7)}
.aw-badge.aw3{background:linear-gradient(90deg,#d98a4a,#ffd7b0,#d98a4a);box-shadow:0 0 12px rgba(217,138,74,.7)}
.aw-mini{font-style:normal;margin-left:4px;font-size:13px;filter:drop-shadow(0 0 4px #ffc857)}
.glv-chip{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;font:800 10px 'Orbitron',sans-serif;background:rgba(139,92,246,.25);border:1px solid rgba(139,92,246,.6);color:#d9c8ff;vertical-align:middle}
.glv-bar{height:10px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:8px 0}
.glv-bar i{display:block;height:100%;background:linear-gradient(90deg,#22e3ff,#8b5cf6,#ff3d8b);border-radius:99px}
.bn-prev{display:flex;align-items:center;gap:10px;min-height:64px;width:100%}
.shop-grid .item .pv .bn-prev{padding:8px 12px}`);

    // новые обычные рамки
    NEW_FRAMES.forEach(([id, , , c]) => css.push(`.av-wrap.cos-${clsOf(id)}{background-image:linear-gradient(135deg,${c[0]},${c[1]} 50%,${c[2]});box-shadow:0 0 14px ${rgba(c[1], .7)}}`));

    // новые анимированные аватарки
    const MOT = { rise: 'n-rise', fall: 'n-fall', twinkle: 'n-twinkle' };
    NEW_FX.forEach(([id, , , c, g, mv]) => {
        const k = '.cos-' + clsOf(id);
        css.push(`.av-wrap${k}{background-image:linear-gradient(120deg,${c[0]},${c[1]},${c[2]},${c[1]},${c[0]});background-size:300% 300%;animation:n-shift 3s linear infinite alternate;box-shadow:0 0 16px ${rgba(c[1], .65)}}
${k} .fxl b{left:var(--x);top:${mv === 'twinkle' ? 'var(--x)' : '0'};font-size:10px;font-weight:400;line-height:1;color:${c[1]};text-shadow:0 0 6px ${c[1]};animation-name:${MOT[mv]};animation-duration:${mv === 'twinkle' ? '2s' : '2.8s'};animation-timing-function:linear}
${k} .fxl b::before{content:"${g}"}`);
    });

    // баннеры
    const MD = { fall: ['n-fall', '3.2s', 'left:var(--x);top:0'], rise: ['n-rise', '3s', 'left:var(--x);top:0'], drift: ['n-drift', '6s', 'top:var(--y)'],
        flash: ['n-flash', '2.4s', 'left:var(--x);top:var(--y)'], bob: ['n-bob', '2.4s', 'left:var(--x);top:var(--y)'], sway: ['n-sway', '2.8s', 'left:var(--x);top:var(--y)'], pulse: ['n-pulse', '2.2s', 'left:var(--x);top:var(--y)'], dangle: ['n-dangle', '3s', 'left:var(--x);top:-8px'], spin: ['n-spin', '4s', 'left:var(--x);top:var(--y)'] };
    const particles = (cls, g, mv, sel, fs, col, glow) => {
        const m = MD[mv]; if (!g || !m) return '';
        return `${cls} .bnl b${sel}{${m[2]};animation-name:${m[0]};animation-duration:${m[1]};font-size:${fs}px;${(mv === 'dangle' || mv === 'sway') ? 'animation-direction:alternate;' : ''}${(mv === 'dangle' || mv === 'sway' || mv === 'bob' || mv === 'pulse') ? 'animation-timing-function:ease-in-out;' : ''}${col ? 'color:' + col + ';' : ''}${glow ? 'filter:drop-shadow(0 0 4px ' + glow + ');' : ''}}
${cls} .bnl b${sel}::before{content:"${g}"}${mv === 'dangle' ? `\n${cls} .bnl b${sel}::after{content:"";position:absolute;left:50%;bottom:100%;width:1px;height:46px;background:rgba(255,255,255,.55)}` : ''}`;
    };
    BANNERS.forEach(([id, , , c, o = {}]) => {
        const k = '.bn-' + clsOf(id);
        let bg = `linear-gradient(100deg,${c.join(',')})`;
        if (o.st) bg = `repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 6px,transparent 6px 12px),${bg}`;
        if (o.ov) bg = o.ov + bg;
        let s = `${k}{background-image:${bg};`;
        if (o.an) s += `${o.ov ? 'background-size:100% 100%,300% 300%' : 'background-size:300% 300%'};animation:n-shift 6s ease-in-out infinite alternate${o.glow ? ',n-glow 2.4s ease-in-out infinite alternate' : ''};`;
        if (o.glow) s += `--gl:${rgba(o.glow, .6)};box-shadow:0 0 14px ${rgba(o.glow, .5)};`;
        css.push(s + '}');
        const fs = o.fs || (o.big ? 24 : o.x ? 17 : 12);
        css.push(particles(k, o.g, o.mv, (o.g2 ? ':nth-child(odd)' : ''), fs, '', o.glow));
        if (o.g2) css.push(particles(k, o.g2, o.mv2, ':nth-child(even)', o.fs2 || (o.x ? 15 : 12), '', o.glow));
        if (o.sw) css.push(`${k}::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-70%;width:40%;z-index:1;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.42),transparent);transform:skewX(-20deg);animation:n-sweep 3.4s ease-in-out infinite}`);
    });

    // премиум-рамки: бегущий градиент + свечение + два эмодзи по углам (не мешают эффектам и брелкам)
    FRAMES_PREM.forEach(([id, , , c, g1, g2]) => {
        const k = '.av-wrap.cos-' + clsOf(id), hi = id.startsWith('fr25_'), glow = c[1];
        css.push(`${k}{background-image:linear-gradient(120deg,${c.join(',')},${c[0]});background-size:300% 300%;animation:n-shift ${hi ? 2.2 : 3.2}s linear infinite alternate,n-glow 2.2s ease-in-out infinite alternate;--gl:${rgba(glow, .85)}}
${k}::before{content:"${g1}";position:absolute;top:-9px;right:-6px;z-index:6;font-size:${hi ? 16 : 14}px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 4px ${glow});animation:n-cbob 2.2s ease-in-out infinite}
${k}::after{content:"${g2}";position:absolute;bottom:-8px;left:-6px;z-index:6;font-size:${hi ? 14 : 12}px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 4px ${glow});animation:n-twinkle 1.9s ease-in-out infinite}
.av-wrap.big.cos-${clsOf(id)}::before{font-size:${hi ? 30 : 26}px;top:-15px;right:-10px}.av-wrap.big.cos-${clsOf(id)}::after{font-size:${hi ? 26 : 22}px;bottom:-12px;left:-10px}`);
    });
    // брелки
    CHARMS.forEach(([id, , , g, , col]) => css.push(`.chm-${clsOf(id)}{--cg:${col}}.chm-${clsOf(id)}::after{content:"${g}"}`));

    // награды ТОП
    [1, 2, 3].forEach(r => {
        const c = TOP_COL[r], gl = rgba(c[1], .75), glyph = r === 1 ? '👑' : '★';
        css.push(`.av-wrap.cos-tp-fr${r}{background-image:linear-gradient(135deg,${c[0]},${c[1]},${c[2]},${c[1]},${c[0]});background-size:300% 300%;animation:n-shift 2.4s linear infinite alternate;box-shadow:0 0 18px ${gl},0 0 30px ${rgba(c[1], .4)}}
.av-wrap.cos-tp-fx${r}{background-image:linear-gradient(135deg,${c[0]},${c[1]},${c[2]});background-size:300% 300%;animation:n-shift 2.4s linear infinite alternate;box-shadow:0 0 18px ${gl}}
.cos-tp-fx${r} .fxl b{left:var(--x);top:0;font-size:${r === 1 ? 13 : 10}px;font-weight:400;line-height:1;color:${c[1]};text-shadow:0 0 8px ${c[1]};animation-name:n-rise;animation-duration:2.6s;animation-timing-function:linear}
.cos-tp-fx${r} .fxl b::before{content:"${glyph}"}
.bn-tp-bn${r}{background-image:linear-gradient(100deg,${c[2]},${c[1]},${c[0]},${c[1]},${c[2]});background-size:300% 300%;animation:n-shift 4s linear infinite alternate,n-glow 2s ease-in-out infinite alternate;--gl:${gl};box-shadow:0 0 16px ${gl}}
.bn-tp-bn${r}::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-70%;width:40%;z-index:1;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:n-sweep 2.8s ease-in-out infinite}
.bn-tp-bn${r} .bnl b:nth-child(odd){left:var(--x);top:0;animation-name:n-rise;animation-duration:3s;font-size:15px;color:${c[0]}}
.bn-tp-bn${r} .bnl b:nth-child(odd)::before{content:"${glyph}"}
.bn-tp-bn${r} .bnl b:nth-child(even){left:var(--x);top:var(--y);animation-name:n-flash;animation-duration:2.2s;font-size:12px;color:#fff}
.bn-tp-bn${r} .bnl b:nth-child(even)::before{content:"✦"}`);
    });

    // эмблемы гильдий по уровню
    const GL = [null, ['#ffd7b0', '#d98a4a', '#7a3d12'], ['#ffffff', '#cfd8e6', '#6b7a90'], ['#fff1b8', '#ffc857', '#a8740b'], ['#d6fbff', '#22e3ff', '#8b5cf6'], ['#ffe36b', '#ff4d00', '#7a0000'], ['#ff3d8b', '#ffc857', '#22e3ff']];
    const GG = { 4: ['✦', 'n-twinkle'], 5: ['🔥', 'n-rise'], 6: ['👑', 'n-rise'] };
    for (let t = 1; t <= 6; t++) {
        const c = GL[t], k = '.av-wrap.glv-' + t;
        css.push(`${k}{padding:4px;background-image:linear-gradient(135deg,${c.join(',')});${t >= 3 ? 'background-size:300% 300%;animation:n-shift 3s linear infinite alternate;' : ''}box-shadow:0 0 ${8 + t * 3}px ${rgba(c[1], .7)}}`);
        if (GG[t]) css.push(`${k} .gfx b{position:absolute;left:var(--x);top:0;opacity:0;font-size:10px;font-weight:400;line-height:1;color:${c[1]};animation:${GG[t][1]} 2.6s linear infinite;animation-delay:var(--d)}
${k} .gfx b::before{content:"${GG[t][0]}"}`);
    }
    css.push('.gfx{position:absolute;inset:-12px;z-index:4;pointer-events:none;line-height:0}.gfx b:nth-child(1){--x:12%;--d:0s}.gfx b:nth-child(2){--x:35%;--d:.5s}.gfx b:nth-child(3){--x:58%;--d:1s}.gfx b:nth-child(4){--x:80%;--d:1.5s}');

    const st = document.createElement('style'); st.id = 'cos-css'; st.textContent = css.join('\n');
    document.head.appendChild(st);
})();
