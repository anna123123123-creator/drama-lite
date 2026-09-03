(function () {
  'use strict';

  var data = DramaData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'series') renderSeries();
    if (name === 'episodes') { renderEpisodeSeriesSelect(); renderEpisodes(); }
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = DramaData.reset();
    switchView('dashboard');
  });

  function seriesById(id) { return data.series.find(function (s) { return s.id === id; }); }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var totalRevenue = data.purchases.reduce(function (sum, p) {
      var s = seriesById(p.seriesId);
      return sum + (s ? s.price : 0);
    }, 0);

    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var monthRevenue = data.purchases
      .filter(function (p) { return p.purchasedAt.slice(0, 7) === ym; })
      .reduce(function (sum, p) {
        var s = seriesById(p.seriesId);
        return sum + (s ? s.price : 0);
      }, 0);

    var stats = [
      { label: '剧集总数', value: data.series.length },
      { label: '总购买数（整季解锁）', value: data.purchases.length },
      { label: '总收入', value: '¥' + DramaData.money(totalRevenue) },
      { label: '本月收入', value: '¥' + DramaData.money(monthRevenue) },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var agg = data.series.map(function (s) {
      var purchasesForSeries = data.purchases.filter(function (p) { return p.seriesId === s.id; });
      return { series: s, count: purchasesForSeries.length, revenue: purchasesForSeries.length * s.price };
    });
    agg.sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.series.title < b.series.title ? -1 : 1;
    });

    document.getElementById('bestSellingBody').innerHTML = agg.map(function (row, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + row.series.coverEmoji + ' ' + row.series.title + '</td>' +
        '<td>' + row.count + '</td><td>¥' + DramaData.money(row.revenue) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">暂无剧集</td></tr>';
  }

  // ---------- Series ----------
  var seriesModalBackdrop = document.getElementById('seriesModalBackdrop');
  var seriesModalTitle = document.getElementById('seriesModalTitle');
  var seriesModalMsg = document.getElementById('seriesModalMsg');
  var seriesForm = document.getElementById('seriesForm');
  var seriesIdInput = document.getElementById('seriesIdInput');
  var seriesTitleInput = document.getElementById('seriesTitleInput');
  var seriesCategoryInput = document.getElementById('seriesCategoryInput');
  var seriesPriceInput = document.getElementById('seriesPriceInput');
  var seriesEmojiInput = document.getElementById('seriesEmojiInput');
  var seriesSynopsisInput = document.getElementById('seriesSynopsisInput');

  var EMOJI_FALLBACKS = ['🎬', '💘', '🔍', '🗡️', '👑', '✨', '🎭'];

  function renderSeries() {
    document.getElementById('seriesBody').innerHTML = data.series.map(function (s) {
      var epCount = DramaData.episodesFor(data, s.id).length;
      var purCount = data.purchases.filter(function (p) { return p.seriesId === s.id; }).length;
      return '<tr><td>' + s.coverEmoji + ' ' + s.title + '</td><td>' + s.category + '</td><td>¥' + DramaData.money(s.price) + '</td>' +
        '<td>' + epCount + ' 集</td><td>' + purCount + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + s.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + s.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:var(--muted)">暂无剧集</td></tr>';

    document.querySelectorAll('#seriesBody [data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSeriesModal(btn.dataset.edit); });
    });
    document.querySelectorAll('#seriesBody [data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteSeries(btn.dataset.delete); });
    });
  }

  function openSeriesModal(id) {
    seriesModalMsg.innerHTML = '';
    seriesForm.reset();
    if (id) {
      var s = seriesById(id);
      seriesModalTitle.textContent = '编辑剧集';
      seriesIdInput.value = s.id;
      seriesTitleInput.value = s.title;
      seriesCategoryInput.value = s.category;
      seriesPriceInput.value = s.price;
      seriesEmojiInput.value = s.coverEmoji;
      seriesSynopsisInput.value = s.synopsis || '';
    } else {
      seriesModalTitle.textContent = '新增剧集';
      seriesIdInput.value = '';
    }
    seriesModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddSeries').addEventListener('click', function () { openSeriesModal(null); });
  document.getElementById('btnCloseSeriesModal').addEventListener('click', function () { seriesModalBackdrop.classList.remove('show'); });
  seriesModalBackdrop.addEventListener('click', function (e) { if (e.target === seriesModalBackdrop) seriesModalBackdrop.classList.remove('show'); });

  seriesForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = seriesTitleInput.value.trim();
    var category = seriesCategoryInput.value.trim();
    var price = parseFloat(seriesPriceInput.value);
    var emoji = seriesEmojiInput.value.trim();
    var synopsis = seriesSynopsisInput.value.trim();

    if (!title || !category || !(price >= 0)) {
      seriesModalMsg.innerHTML = '<div class="msg error">请完整填写剧集名称、分类和价格（价格需大于等于 0）。</div>';
      return;
    }

    var id = seriesIdInput.value;
    if (id) {
      var s = seriesById(id);
      s.title = title; s.category = category; s.price = price;
      s.coverEmoji = emoji || s.coverEmoji; s.synopsis = synopsis;
    } else {
      data.series.push({
        id: DramaData.uid('s'), title: title, category: category, price: price,
        coverEmoji: emoji || EMOJI_FALLBACKS[data.series.length % EMOJI_FALLBACKS.length],
        synopsis: synopsis,
      });
    }
    DramaData.save(data);
    seriesModalBackdrop.classList.remove('show');
    renderSeries();
  });

  function deleteSeries(id) {
    if (!confirm('确定删除这部剧集吗？它的所有分集和购买记录也会被一并删除，此操作不可撤销。')) return;
    data.series = data.series.filter(function (s) { return s.id !== id; });
    data.episodes = data.episodes.filter(function (e) { return e.seriesId !== id; });
    data.purchases = data.purchases.filter(function (p) { return p.seriesId !== id; });
    DramaData.save(data);
    renderSeries();
  }

  // ---------- Episodes ----------
  var episodeSeriesSelect = document.getElementById('episodeSeriesSelect');
  var episodeModalBackdrop = document.getElementById('episodeModalBackdrop');
  var episodeModalTitle = document.getElementById('episodeModalTitle');
  var episodeModalMsg = document.getElementById('episodeModalMsg');
  var episodeForm = document.getElementById('episodeForm');
  var episodeIdInput = document.getElementById('episodeIdInput');
  var episodeTitleInput = document.getElementById('episodeTitleInput');
  var episodeDurationInput = document.getElementById('episodeDurationInput');
  var episodePreviewInput = document.getElementById('episodePreviewInput');

  var selectedSeriesId = null;

  function renderEpisodeSeriesSelect() {
    if (!data.series.some(function (s) { return s.id === selectedSeriesId; })) {
      selectedSeriesId = data.series.length ? data.series[0].id : null;
    }
    episodeSeriesSelect.innerHTML = data.series.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === selectedSeriesId ? ' selected' : '') + '>' + s.coverEmoji + ' ' + s.title + '</option>';
    }).join('') || '<option value="">暂无剧集</option>';
  }

  episodeSeriesSelect.addEventListener('change', function () {
    selectedSeriesId = episodeSeriesSelect.value || null;
    renderEpisodes();
  });

  function renderEpisodes() {
    var btnAdd = document.getElementById('btnAddEpisode');
    if (!selectedSeriesId) {
      document.getElementById('episodesBody').innerHTML = '<tr><td colspan="5" style="color:var(--muted)">请先在"剧集管理"中新增一部剧集。</td></tr>';
      btnAdd.disabled = true;
      return;
    }
    btnAdd.disabled = false;
    var eps = DramaData.episodesFor(data, selectedSeriesId);
    document.getElementById('episodesBody').innerHTML = eps.map(function (e) {
      return '<tr><td>' + e.index + '</td><td>' + e.title + '</td><td>' + DramaData.formatTime(e.durationSeconds) + '（' + e.durationSeconds + ' 秒）</td>' +
        '<td>' + (e.isPreview ? '<span class="badge confirmed">免费试看</span>' : '<span style="color:var(--muted);font-size:12px">-</span>') + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + e.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + e.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">这部剧集还没有分集，点击右上角新增。</td></tr>';

    document.querySelectorAll('#episodesBody [data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openEpisodeModal(btn.dataset.edit); });
    });
    document.querySelectorAll('#episodesBody [data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteEpisode(btn.dataset.delete); });
    });
  }

  function openEpisodeModal(id) {
    episodeModalMsg.innerHTML = '';
    episodeForm.reset();
    if (id) {
      var e = data.episodes.find(function (x) { return x.id === id; });
      episodeModalTitle.textContent = '编辑分集（第 ' + e.index + ' 集）';
      episodeIdInput.value = e.id;
      episodeTitleInput.value = e.title;
      episodeDurationInput.value = e.durationSeconds;
      episodePreviewInput.checked = e.isPreview;
    } else {
      var existingCount = DramaData.episodesFor(data, selectedSeriesId).length;
      episodeModalTitle.textContent = '新增分集（第 ' + (existingCount + 1) + ' 集）';
      episodeIdInput.value = '';
      episodePreviewInput.checked = existingCount === 0;
    }
    episodeModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddEpisode').addEventListener('click', function () { openEpisodeModal(null); });
  document.getElementById('btnCloseEpisodeModal').addEventListener('click', function () { episodeModalBackdrop.classList.remove('show'); });
  episodeModalBackdrop.addEventListener('click', function (e) { if (e.target === episodeModalBackdrop) episodeModalBackdrop.classList.remove('show'); });

  episodeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = episodeTitleInput.value.trim();
    var duration = parseInt(episodeDurationInput.value, 10);
    var isPreview = episodePreviewInput.checked;

    if (!title || !(duration > 0)) {
      episodeModalMsg.innerHTML = '<div class="msg error">请填写分集标题，时长需大于 0 秒。</div>';
      return;
    }

    var id = episodeIdInput.value;
    if (id) {
      var ep = data.episodes.find(function (x) { return x.id === id; });
      ep.title = title; ep.durationSeconds = duration; ep.isPreview = isPreview;
    } else {
      var nextIndex = DramaData.episodesFor(data, selectedSeriesId).length + 1;
      data.episodes.push({
        id: DramaData.uid('e'), seriesId: selectedSeriesId, index: nextIndex,
        title: title, durationSeconds: duration, isPreview: isPreview,
      });
    }
    DramaData.save(data);
    episodeModalBackdrop.classList.remove('show');
    renderEpisodes();
  });

  function deleteEpisode(id) {
    if (!confirm('确定删除这一集吗？')) return;
    data.episodes = data.episodes.filter(function (e) { return e.id !== id; });
    // reindex remaining episodes of this series to keep order contiguous
    var remaining = DramaData.episodesFor(data, selectedSeriesId);
    remaining.forEach(function (e, i) { e.index = i + 1; });
    DramaData.save(data);
    renderEpisodes();
  }

  switchView('dashboard');
})();
