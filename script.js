(function () {
  'use strict';

  var data = DramaData.load();
  var currentSeriesId = null;

  // ---------- elements ----------
  var balanceBadge = document.getElementById('balanceBadge');
  var seriesGrid = document.getElementById('seriesGrid');
  var viewCatalog = document.getElementById('view-catalog');
  var viewSeries = document.getElementById('view-series');
  var btnBackToCatalog = document.getElementById('btnBackToCatalog');
  var seriesHead = document.getElementById('seriesHead');
  var seriesMsg = document.getElementById('seriesMsg');
  var episodeList = document.getElementById('episodeList');

  var playerBackdrop = document.getElementById('playerBackdrop');
  var btnClosePlayer = document.getElementById('btnClosePlayer');
  var playerTitle = document.getElementById('playerTitle');
  var playerSub = document.getElementById('playerSub');
  var playerStageEmoji = document.getElementById('playerStageEmoji');
  var playerFinishedOverlay = document.getElementById('playerFinishedOverlay');
  var btnPlayPause = document.getElementById('btnPlayPause');
  var playerProgressTrack = document.getElementById('playerProgressTrack');
  var playerProgressBar = document.getElementById('playerProgressBar');
  var playerTime = document.getElementById('playerTime');
  var playerPreviewTag = document.getElementById('playerPreviewTag');
  var btnNextEpisode = document.getElementById('btnNextEpisode');

  // ---------- balance ----------
  function renderBalance() {
    balanceBadge.textContent = '余额 ¥' + DramaData.money(data.balance);
  }

  // ---------- catalog ----------
  function renderCatalog() {
    seriesGrid.innerHTML = data.series.map(function (s) {
      var eps = DramaData.episodesFor(data, s.id);
      var owned = DramaData.isOwned(data, s.id);
      return '<div class="series-card" data-id="' + s.id + '">' +
        '<div class="series-card__cover">' + s.coverEmoji +
        (owned ? '<span class="owned-flag">已购买</span>' : '') +
        '</div>' +
        '<div class="series-card__body">' +
        '<span class="category-tag">' + s.category + '</span>' +
        '<h3>' + s.title + '</h3>' +
        '<div class="series-card__meta">共 ' + eps.length + ' 集</div>' +
        '<div class="series-card__price">' + (owned ? '已解锁全集' : '¥' + DramaData.money(s.price) + ' 解锁全集') + '</div>' +
        '</div></div>';
    }).join('');

    seriesGrid.querySelectorAll('.series-card').forEach(function (card) {
      card.addEventListener('click', function () { openSeries(card.dataset.id); });
    });
  }

  // ---------- series detail ----------
  function openSeries(seriesId) {
    currentSeriesId = seriesId;
    seriesMsg.innerHTML = '';
    viewCatalog.style.display = 'none';
    viewSeries.style.display = 'block';
    renderSeriesDetail();
  }

  function closeSeries() {
    currentSeriesId = null;
    viewSeries.style.display = 'none';
    viewCatalog.style.display = 'block';
    renderCatalog();
  }
  btnBackToCatalog.addEventListener('click', closeSeries);

  function renderSeriesDetail() {
    var s = data.series.find(function (x) { return x.id === currentSeriesId; });
    if (!s) { closeSeries(); return; }
    var eps = DramaData.episodesFor(data, s.id);
    var owned = DramaData.isOwned(data, s.id);

    seriesHead.innerHTML =
      '<div class="series-head__cover">' + s.coverEmoji + '</div>' +
      '<div class="series-head__body">' +
      '<span class="category-tag">' + s.category + '</span>' +
      '<h1>' + s.title + '</h1>' +
      '<p class="series-head__synopsis">' + s.synopsis + '</p>' +
      '<div class="series-head__meta">共 ' + eps.length + ' 集 · 整季解锁价 ¥' + DramaData.money(s.price) + '</div>' +
      (owned
        ? '<div class="owned-state">✓ 已购买，全部 ' + eps.length + ' 集已解锁</div>'
        : '<button class="btn btn-primary" id="btnUnlockAll">解锁全部集数 · ¥' + DramaData.money(s.price) + '</button>') +
      '</div>';

    if (!owned) {
      document.getElementById('btnUnlockAll').addEventListener('click', function () { purchaseSeries(s.id); });
    }

    episodeList.innerHTML = eps.map(function (e) {
      var playable = e.isPreview || owned;
      return '<div class="episode-row' + (playable ? '' : ' locked') + '" data-id="' + e.id + '">' +
        '<div class="ep-index">' + e.index + '</div>' +
        '<div class="ep-info"><div class="ep-title">' + e.title + (e.isPreview ? ' <span class="preview-tag">试看</span>' : '') + '</div>' +
        '<div class="ep-duration">' + DramaData.formatTime(e.durationSeconds) + '</div></div>' +
        '<div class="ep-status">' + (playable ? '▶' : '<span class="lock-icon">🔒</span>') + '</div>' +
        '</div>';
    }).join('');

    episodeList.querySelectorAll('.episode-row').forEach(function (row) {
      row.addEventListener('click', function () { onEpisodeClick(row.dataset.id); });
    });
  }

  function purchaseSeries(seriesId) {
    var s = data.series.find(function (x) { return x.id === seriesId; });
    if (!s || DramaData.isOwned(data, seriesId)) return;

    if (data.balance < s.price) {
      var shortfall = DramaData.money(s.price - data.balance);
      seriesMsg.innerHTML = '<div class="msg error">余额不足，还差 ¥' + shortfall + '，请先为账户充值后再解锁。</div>';
      return;
    }

    data.balance -= s.price;
    data.purchases.push({ id: DramaData.uid('pur'), seriesId: s.id, purchasedAt: new Date().toISOString() });
    DramaData.save(data);

    var eps = DramaData.episodesFor(data, s.id);
    seriesMsg.innerHTML = '<div class="msg success">解锁成功！已花费 ¥' + DramaData.money(s.price) + '，全部 ' + eps.length + ' 集现在都可以观看了。</div>';
    renderBalance();
    renderSeriesDetail();
  }

  // ---------- simulated video player ----------
  var player = {
    episode: null,
    series: null,
    elapsed: 0,
    playing: false,
    timer: null,
  };

  function onEpisodeClick(episodeId) {
    var e = data.episodes.find(function (x) { return x.id === episodeId; });
    if (!e) return;
    var owned = DramaData.isOwned(data, e.seriesId);
    if (!e.isPreview && !owned) {
      seriesMsg.innerHTML = '<div class="msg error">这一集需要先解锁整季才能观看，请先购买。</div>';
      return;
    }
    seriesMsg.innerHTML = '';
    openPlayer(e);
  }

  function openPlayer(episode) {
    stopTimer();
    player.episode = episode;
    player.series = data.series.find(function (x) { return x.id === episode.seriesId; });
    player.elapsed = 0;
    player.playing = false;
    renderPlayerChrome();
    renderPlayerProgress();
    playerBackdrop.classList.add('show');
  }

  function closePlayer() {
    stopTimer();
    playerBackdrop.classList.remove('show');
    player.episode = null;
    // reflect any purchase state change made while player was open
    if (currentSeriesId) renderSeriesDetail();
  }
  btnClosePlayer.addEventListener('click', closePlayer);
  playerBackdrop.addEventListener('click', function (e) { if (e.target === playerBackdrop) closePlayer(); });

  function renderPlayerChrome() {
    var e = player.episode, s = player.series;
    playerTitle.textContent = s.title + ' · 第 ' + e.index + ' 集';
    playerSub.textContent = e.title;
    playerPreviewTag.textContent = e.isPreview ? '免费试看' : '';
    playerFinishedOverlay.classList.remove('show');
    btnPlayPause.textContent = '▶';

    var eps = DramaData.episodesFor(data, s.id);
    var next = eps.find(function (x) { return x.index === e.index + 1; });
    if (!next) {
      btnNextEpisode.disabled = true;
      btnNextEpisode.textContent = '已是最后一集';
    } else {
      var nextPlayable = next.isPreview || DramaData.isOwned(data, s.id);
      btnNextEpisode.disabled = !nextPlayable;
      btnNextEpisode.textContent = nextPlayable ? '下一集 →' : '下一集已锁定 🔒';
    }
  }

  function renderPlayerProgress() {
    var e = player.episode;
    var pct = Math.min(100, (player.elapsed / e.durationSeconds) * 100);
    playerProgressBar.style.width = pct + '%';
    playerTime.textContent = DramaData.formatTime(player.elapsed) + ' / ' + DramaData.formatTime(e.durationSeconds);
  }

  function stopTimer() {
    if (player.timer) { clearInterval(player.timer); player.timer = null; }
    player.playing = false;
  }

  function tick() {
    var e = player.episode;
    if (!e) return;
    player.elapsed = Math.min(e.durationSeconds, player.elapsed + 0.25);
    renderPlayerProgress();
    if (player.elapsed >= e.durationSeconds) {
      stopTimer();
      btnPlayPause.textContent = '▶';
      playerFinishedOverlay.classList.add('show');
    }
  }

  btnPlayPause.addEventListener('click', function () {
    if (!player.episode) return;
    if (player.playing) {
      stopTimer();
      btnPlayPause.textContent = '▶';
      return;
    }
    if (player.elapsed >= player.episode.durationSeconds) {
      player.elapsed = 0; // replay from start
    }
    playerFinishedOverlay.classList.remove('show');
    player.playing = true;
    btnPlayPause.textContent = '⏸';
    player.timer = setInterval(tick, 250);
  });

  btnNextEpisode.addEventListener('click', function () {
    if (btnNextEpisode.disabled || !player.series) return;
    var eps = DramaData.episodesFor(data, player.series.id);
    var next = eps.find(function (x) { return x.index === player.episode.index + 1; });
    if (next) openPlayer(next);
  });

  // ---------- init ----------
  renderBalance();
  renderCatalog();
})();
