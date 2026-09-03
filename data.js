(function (global) {
  'use strict';
  var STORAGE_KEY = 'drama_lite_data_v1';

  function ep(seriesId, index, title, durationSeconds, isPreview) {
    return {
      id: seriesId + '_e' + index,
      seriesId: seriesId,
      index: index,
      title: title,
      durationSeconds: durationSeconds,
      isPreview: !!isPreview,
    };
  }

  function buildEpisodes(seriesId, titles, durations) {
    return titles.map(function (title, i) {
      return ep(seriesId, i + 1, title, durations[i], i === 0);
    });
  }

  function seed() {
    var series = [
      { id: 's1', title: '闪婚厉总请签收', coverEmoji: '💘', category: '甜宠', price: 29,
        synopsis: '一纸契约把她推到了传闻中最难缠的厉总面前，婚是假的，心动是真的。' },
      { id: 's2', title: '深夜来电', coverEmoji: '🔍', category: '悬疑', price: 39,
        synopsis: '午夜十二点准时响起的匿名电话，把三年前那桩悬案重新拖回了她的生活。' },
      { id: 's3', title: '她的复仇计划', coverEmoji: '🗡️', category: '复仇', price: 49,
        synopsis: '家族崩塌一夜之间，她隐姓埋名归来，一步步布局，只为讨回属于自己的一切。' },
      { id: 's4', title: '凤策天下', coverEmoji: '👑', category: '古装', price: 59,
        synopsis: '深宫初醒，她从无宠的落魄庶女，走到权谋漩涡中心，只手谋一个太平盛世。' },
      { id: 's5', title: '重生之嫡女归来', coverEmoji: '✨', category: '重生', price: 19,
        synopsis: '一场意外让她重活一世，这一次，她要看清所有人的真面目，夺回本该属于自己的人生。' },
    ];

    var episodes = []
      .concat(buildEpisodes('s1',
        ['意外的婚约', '总裁的秘密', '家宴风波', '前女友登场', '深夜救场', '误会加深', '坦白心意', '家族阻挠', '生死考验', '圆满结局'],
        [96, 108, 120, 132, 144, 102, 126, 138, 150, 162]))
      .concat(buildEpisodes('s2',
        ['神秘来电', '消失的证人', '尘封的档案', '二次案发', '可疑的邻居', '监控疑云', '真假证词', '意外线索', '幕后黑手浮现', '生死追踪', '真相反转', '结案之夜'],
        [90, 105, 115, 125, 135, 145, 155, 165, 175, 120, 140, 160]))
      .concat(buildEpisodes('s3',
        ['家破人亡', '隐忍归来', '潜入豪门', '第一步棋', '暗中布局', '反将一军', '昔日仇人现身', '身份即将暴露', '绝地反击', '联手对抗', '真相大白', '最后的筹码', '血债血偿', '尘埃落定'],
        [100, 110, 120, 130, 140, 150, 160, 170, 180, 95, 115, 135, 155, 175]))
      .concat(buildEpisodes('s4',
        ['深宫初醒', '伴君如伴虎', '暗流涌动', '联姻风波', '宫闱秘史', '夺嫡之争', '兵临城下', '忠奸难辨', '密诏现世', '边关急报', '内忧外患', '反戈一击', '登基之路', '权谋落幕', '凤临天下'],
        [110, 120, 130, 140, 150, 160, 170, 180, 100, 125, 145, 165, 135, 155, 175]))
      .concat(buildEpisodes('s5',
        ['重生归来', '认清真面目', '智斗继母', '夺回属于自己的', '意外的盟友', '步步为营', '真相浮出水面', '逆袭人生'],
        [95, 115, 135, 155, 175, 105, 125, 145]));

    var purchases = [
      { id: 'pur_seed1', seriesId: 's1', purchasedAt: '2026-08-12T10:20:00.000Z' },
      { id: 'pur_seed2', seriesId: 's3', purchasedAt: '2026-09-01T09:00:00.000Z' },
    ];

    return {
      balance: 150,
      series: series,
      episodes: episodes,
      purchases: purchases,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var s = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function episodesFor(data, seriesId) {
    return data.episodes
      .filter(function (e) { return e.seriesId === seriesId; })
      .sort(function (a, b) { return a.index - b.index; });
  }

  function isOwned(data, seriesId) {
    return data.purchases.some(function (p) { return p.seriesId === seriesId; });
  }

  function money(n) {
    var r = Math.round(n * 100) / 100;
    return (r % 1 === 0) ? String(r) : r.toFixed(2);
  }

  function formatTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }

  global.DramaData = {
    load: load,
    save: save,
    uid: uid,
    episodesFor: episodesFor,
    isOwned: isOwned,
    money: money,
    formatTime: formatTime,
    reset: function () { var s = seed(); save(s); return s; },
  };
})(window);
