/**
 * LinkPulse Web - Main Application Controller
 * Vanilla JS ES6+ — No frameworks, no dependencies.
 * Handles: Search, Filtering, Sorting, Pagination, CSV Export, History Drawer
 */

class LinkPulseApp {
  constructor() {
    // State
    this.currentData = null;
    this.filteredBacklinks = [];
    this.activeFilter = 'all';       // 'all' | 'dofollow' | 'nofollow'
    this.anchorSearch = '';
    this.sortKey = 'sourceDr';
    this.sortDir = 'desc';
    this.currentPage = 1;
    this.perPage = 25;
    this.isLoading = false;
    this.historyList = [];

    // DOM Refs
    this.searchInput     = document.getElementById('lp-search-input');
    this.scopeSelect     = document.getElementById('lp-scope-select');
    this.searchBtn       = document.getElementById('lp-search-btn');
    this.searchBtnSpinner = document.getElementById('lp-search-spinner');
    this.searchBtnLabel  = document.getElementById('lp-search-label');
    this.alertBox        = document.getElementById('lp-alert');
    this.resultsSection  = document.getElementById('lp-results-section');
    this.initialState    = document.getElementById('lp-initial-state');

    this.targetBannerDomain = document.getElementById('lp-banner-domain');
    this.targetBannerScope  = document.getElementById('lp-banner-scope');
    this.targetBannerTime   = document.getElementById('lp-banner-time');

    this.metricDr        = document.getElementById('lp-metric-dr');
    this.metricDrGauge   = document.getElementById('lp-dr-gauge-fill');
    this.metricBacklinks = document.getElementById('lp-metric-backlinks');
    this.metricRefDomains= document.getElementById('lp-metric-ref-domains');
    this.metricDofollow  = document.getElementById('lp-metric-dofollow');

    this.segmentAll      = document.getElementById('seg-all');
    this.segmentDofollow = document.getElementById('seg-dofollow');
    this.segmentNofollow = document.getElementById('seg-nofollow');
    this.badgeAll        = document.getElementById('badge-all');
    this.badgeDofollow   = document.getElementById('badge-dofollow');
    this.badgeNofollow   = document.getElementById('badge-nofollow');

    this.anchorInput     = document.getElementById('lp-anchor-search');
    this.anchorClearBtn  = document.getElementById('lp-anchor-clear');
    this.anchorChipsWrap = document.getElementById('lp-anchor-chips');

    this.tableBody       = document.getElementById('lp-table-body');
    this.resultsCountEl  = document.getElementById('lp-results-count');
    this.paginationBar   = document.getElementById('lp-pagination');
    this.pageInfoEl      = document.getElementById('lp-page-info');

    this.historyDrawer   = document.getElementById('lp-drawer');
    this.historyBackdrop = document.getElementById('lp-drawer-backdrop');
    this.historyListEl   = document.getElementById('lp-history-list');
    this.historyBtnOpen  = document.getElementById('lp-btn-history');
    this.historyBtnClose = document.getElementById('lp-drawer-close');
    this.historyClearBtn = document.getElementById('lp-history-clear');
    this.historyCountEl  = document.getElementById('lp-history-count');

    this.exportBtn       = document.getElementById('lp-btn-export');
    this.toast           = document.getElementById('lp-toast');

    this._bindEvents();
    this._loadHistory();
  }

  // ─── Event Binding ────────────────────────────────────────────────────────

  _bindEvents() {
    // Search
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    // Quick picks
    document.querySelectorAll('.lp-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.searchInput.value = chip.dataset.url;
        this.handleSearch();
      });
    });

    // Filter segments
    this.segmentAll.addEventListener('click', () => this._setFilter('all'));
    this.segmentDofollow.addEventListener('click', () => this._setFilter('dofollow'));
    this.segmentNofollow.addEventListener('click', () => this._setFilter('nofollow'));

    // Anchor search
    this.anchorInput.addEventListener('input', () => {
      this.anchorSearch = this.anchorInput.value.trim().toLowerCase();
      this.anchorClearBtn.classList.toggle('visible', this.anchorSearch.length > 0);
      this.currentPage = 1;
      this._applyFilters();
    });

    this.anchorClearBtn.addEventListener('click', () => {
      this.anchorInput.value = '';
      this.anchorSearch = '';
      this.anchorClearBtn.classList.remove('visible');
      this.currentPage = 1;
      this._applyFilters();
    });

    // Sortable column headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          this.sortKey = key;
          this.sortDir = 'desc';
        }
        this.currentPage = 1;
        this._updateSortHeaders();
        this._applyFilters();
      });
    });

    // Export CSV
    this.exportBtn.addEventListener('click', () => this._exportCSV());

    // History drawer
    this.historyBtnOpen.addEventListener('click', () => this._openDrawer());
    this.historyBtnClose.addEventListener('click', () => this._closeDrawer());
    this.historyBackdrop.addEventListener('click', () => this._closeDrawer());

    // Clear history
    this.historyClearBtn.addEventListener('click', async () => {
      if (confirm('Vider tout l\'historique des analyses ?')) {
        await window.linkPulseDB.clearHistory();
        this.historyList = [];
        this._renderHistoryList();
        this._showToast('🗑️ Historique effacé');
      }
    });
  }

  // ─── Search Handler ────────────────────────────────────────────────────────

  async handleSearch() {
    const rawInput = this.searchInput.value.trim();
    if (!rawInput) {
      this._showAlert('Veuillez saisir une URL ou un domaine à analyser.');
      return;
    }

    this._hideAlert();
    this._startLoading();

    // Simulate realistic API delay (600ms – 1800ms)
    const delay = 600 + Math.random() * 1200;
    await this._sleep(delay);

    try {
      const scope = this.scopeSelect.value; // 'domain' | 'subdomains' | 'exact'

      // Check if already cached in IndexedDB
      const cached = await window.linkPulseDB.getAnalysis(rawInput, scope);
      let data;

      if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
        // Cache hit: reuse (fresher than 24h)
        data = cached;
        this._showToast('⚡ Données chargées depuis le cache');
      } else {
        // Generate new deterministic dataset
        data = window.backlinkDataGenerator.generateData(rawInput, scope);
        data.timestamp = Date.now();

        // Persist to IndexedDB
        await window.linkPulseDB.saveAnalysis(data);
        this._showToast('✅ Analyse sauvegardée');
      }

      this.currentData = data;
      this.activeFilter = 'all';
      this.anchorSearch = '';
      this.anchorInput.value = '';
      this.anchorClearBtn.classList.remove('visible');
      this.sortKey = 'sourceDr';
      this.sortDir = 'desc';
      this.currentPage = 1;

      this._stopLoading();
      this._renderResults(data);
      await this._loadHistory();

    } catch (err) {
      console.error('Analysis error:', err);
      this._stopLoading();
      this._showAlert('Une erreur est survenue. Veuillez réessayer.');
    }
  }

  // ─── Render Results ────────────────────────────────────────────────────────

  _renderResults(data) {
    // Show results, hide initial state
    this.initialState.style.display = 'none';
    this.resultsSection.style.display = 'block';

    // Target banner
    this.targetBannerDomain.textContent = data.domain;
    this.targetBannerScope.textContent = this._scopeLabel(data.scope);
    this.targetBannerTime.textContent = `Analysé ${this._timeAgo(data.timestamp)}`;

    // KPI metrics
    this._animateMetric(this.metricDr, data.domainRating, false, 1200);
    this._animateMetric(this.metricBacklinks, data.backlinksCount, true, 1500);
    this._animateMetric(this.metricRefDomains, data.referringDomains, true, 1800);
    this._animateMetric(this.metricDofollow, data.dofollowPercent, false, 2100, '%');

    // DR gauge animation
    setTimeout(() => {
      this.metricDrGauge.style.width = `${data.domainRating}%`;
    }, 150);

    // Count badges for filter segments
    const dfCount = data.backlinks.filter(b => b.linkType === 'dofollow').length;
    const nfCount = data.backlinks.filter(b => b.linkType === 'nofollow').length;
    this.badgeAll.textContent = data.backlinks.length;
    this.badgeDofollow.textContent = dfCount;
    this.badgeNofollow.textContent = nfCount;

    // Render anchor chips
    this._renderAnchorChips(data.frequentAnchors);

    // Apply filters and render table
    this._updateSortHeaders();
    this._applyFilters();

    // Scroll to results
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Filtering, Sorting & Table ────────────────────────────────────────────

  _setFilter(type) {
    this.activeFilter = type;
    this.currentPage = 1;

    this.segmentAll.classList.toggle('active', type === 'all');
    this.segmentDofollow.classList.toggle('active', type === 'dofollow');
    this.segmentNofollow.classList.toggle('active', type === 'nofollow');

    this._applyFilters();
  }

  _applyFilters() {
    if (!this.currentData) return;

    let items = [...this.currentData.backlinks];

    // Filter by link type
    if (this.activeFilter === 'dofollow') {
      items = items.filter(b => b.linkType === 'dofollow');
    } else if (this.activeFilter === 'nofollow') {
      items = items.filter(b => b.linkType === 'nofollow');
    }

    // Filter by anchor text search
    if (this.anchorSearch) {
      items = items.filter(b =>
        b.anchorText.toLowerCase().includes(this.anchorSearch) ||
        b.sourceDomain.toLowerCase().includes(this.anchorSearch) ||
        b.sourceTitle.toLowerCase().includes(this.anchorSearch)
      );
    }

    // Sort
    items.sort((a, b) => {
      let va = a[this.sortKey];
      let vb = b[this.sortKey];
      if (this.sortDir === 'asc') return va - vb;
      return vb - va;
    });

    this.filteredBacklinks = items;
    this._renderTable();
  }

  _renderTable() {
    const total = this.filteredBacklinks.length;
    const totalPages = Math.max(1, Math.ceil(total / this.perPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const start = (this.currentPage - 1) * this.perPage;
    const pageItems = this.filteredBacklinks.slice(start, start + this.perPage);

    // Update count
    this.resultsCountEl.textContent = `${total} résultat${total !== 1 ? 's' : ''}`;

    if (total === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="lp-empty-state">
              <div class="lp-empty-icon">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="lp-empty-title">Aucun backlink trouvé</div>
              <div class="lp-empty-desc">Modifiez vos filtres ou votre recherche par ancre.</div>
            </div>
          </td>
        </tr>`;
      this.paginationBar.innerHTML = '';
      return;
    }

    // Build table rows
    this.tableBody.innerHTML = pageItems.map(bl => this._buildRow(bl)).join('');

    // Pagination
    this._renderPagination(total, totalPages);
  }

  _buildRow(bl) {
    const typeBadgeClass = bl.linkType === 'dofollow' ? 'lp-badge-dofollow' : 'lp-badge-nofollow';
    const typeBadgeLabel = bl.linkType === 'dofollow' ? 'Dofollow' : 'Nofollow';
    const drColor = bl.sourceDr >= 70 ? '#10b981' : bl.sourceDr >= 40 ? '#f59e0b' : '#94a3b8';

    // Shorten long URLs
    const shortSourceUrl = bl.sourceUrl.length > 55
      ? bl.sourceUrl.substring(0, 54) + '…'
      : bl.sourceUrl;
    const shortTargetUrl = bl.targetUrl.length > 42
      ? bl.targetUrl.substring(0, 41) + '…'
      : bl.targetUrl;

    return `
      <tr>
        <td class="lp-source-cell" data-label="Referring page">
          <span class="lp-source-title" title="${this._escHtml(bl.sourceTitle)}">${this._escHtml(bl.sourceTitle)}</span>
          <a class="lp-source-url-link" href="${bl.sourceUrl}" target="_blank" rel="noopener noreferrer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            ${this._escHtml(shortSourceUrl)}
          </a>
        </td>
        <td class="lp-anchor-cell" data-label="Ancre / Contexte">
          <div class="lp-anchor-snippet">${bl.snippet}</div>
        </td>
        <td data-label="URL cible">
          <span class="lp-target-cell" title="${this._escHtml(bl.targetUrl)}">${this._escHtml(shortTargetUrl)}</span>
        </td>
        <td data-label="Type">
          <span class="lp-badge-link ${typeBadgeClass}">${typeBadgeLabel}</span>
        </td>
        <td class="text-right" data-label="DR source">
          <span class="lp-dr-pill" style="color: ${drColor};">${bl.sourceDr}</span>
        </td>
        <td class="text-right" data-label="Trafic / mois">
          <span class="lp-traffic-val">${BacklinkDataGenerator.formatMetric(bl.traffic)}</span>
        </td>
        <td class="text-right" data-label="Vu le">
          <span style="font-size:0.8rem;color:var(--color-text-muted);">${bl.dateSeen}</span>
        </td>
      </tr>`;
  }

  _renderPagination(total, totalPages) {
    if (totalPages <= 1) {
      this.paginationBar.innerHTML = '';
      return;
    }

    const start = (this.currentPage - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage * this.perPage, total);

    // Build page buttons (show at most 7 around current)
    let pages = [];
    if (totalPages <= 7) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      pages = [1];
      if (this.currentPage > 3) pages.push('…');
      for (let p = Math.max(2, this.currentPage - 1); p <= Math.min(totalPages - 1, this.currentPage + 1); p++) {
        pages.push(p);
      }
      if (this.currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }

    const pageButtons = pages.map(p => {
      if (p === '…') return `<span style="padding:0 4px;color:var(--color-text-muted)">…</span>`;
      return `<button class="lp-page-btn ${p === this.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    this.paginationBar.innerHTML = `
      <span class="lp-pagination-info">Affichage ${start}–${end} sur ${total}</span>
      <div class="lp-pagination-controls">
        <button class="lp-page-btn" id="btn-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
          ← Préc.
        </button>
        ${pageButtons}
        <button class="lp-page-btn" id="btn-next" ${this.currentPage === totalPages ? 'disabled' : ''}>
          Suiv. →
        </button>
      </div>`;

    // Bind pagination events
    this.paginationBar.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.dataset.page);
        this._renderTable();
        this.resultsSection.querySelector('.lp-table-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) { this.currentPage--; this._renderTable(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (this.currentPage < totalPages) { this.currentPage++; this._renderTable(); }
    });
  }

  // ─── Anchor Chips ──────────────────────────────────────────────────────────

  _renderAnchorChips(anchors) {
    const topAnchors = anchors.slice(0, 7);
    this.anchorChipsWrap.innerHTML = topAnchors.map(a => `
      <span class="lp-anchor-chip" data-anchor="${this._escHtml(a.text)}">
        ${this._escHtml(a.text)}
        <span class="lp-anchor-chip-count">${a.count}</span>
      </span>`).join('');

    this.anchorChipsWrap.querySelectorAll('.lp-anchor-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const anchorText = chip.dataset.anchor;
        const isSame = this.anchorInput.value === anchorText;

        if (isSame) {
          this.anchorInput.value = '';
          this.anchorSearch = '';
          this.anchorClearBtn.classList.remove('visible');
          chip.classList.remove('active');
        } else {
          this.anchorInput.value = anchorText;
          this.anchorSearch = anchorText.toLowerCase();
          this.anchorClearBtn.classList.add('visible');
          this.anchorChipsWrap.querySelectorAll('.lp-anchor-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        }

        this.currentPage = 1;
        this._applyFilters();
      });
    });
  }

  // ─── Sort Headers ─────────────────────────────────────────────────────────

  _updateSortHeaders() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      const isActive = th.dataset.sort === this.sortKey;
      th.classList.toggle('sorted', isActive);
      const indicator = th.querySelector('.lp-sort-indicator');
      if (indicator) {
        indicator.textContent = isActive ? (this.sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕';
      }
    });
  }

  // ─── CSV Export ────────────────────────────────────────────────────────────

  _exportCSV() {
    if (!this.filteredBacklinks.length) {
      this._showToast('⚠️ Aucune donnée à exporter');
      return;
    }

    const headers = ['#', 'URL source', 'Titre source', 'URL cible', 'Ancre', 'Type', 'DR source', 'Trafic/mois', 'Date vue'];
    const rows = this.filteredBacklinks.map((bl, i) => [
      i + 1,
      `"${bl.sourceUrl}"`,
      `"${bl.sourceTitle.replace(/"/g, '""')}"`,
      `"${bl.targetUrl}"`,
      `"${bl.anchorText.replace(/"/g, '""')}"`,
      bl.linkType,
      bl.sourceDr,
      bl.traffic,
      bl.dateSeen
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const domain = this.currentData ? this.currentData.domain : 'export';
    link.download = `linkpulse-${domain}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this._showToast(`📥 Export CSV téléchargé (${this.filteredBacklinks.length} backlinks)`);
  }

  // ─── History Drawer ────────────────────────────────────────────────────────

  async _loadHistory() {
    this.historyList = await window.linkPulseDB.getHistory(50);
    this.historyCountEl.textContent = this.historyList.length;
    this._renderHistoryList();
  }

  _renderHistoryList() {
    if (!this.historyList.length) {
      this.historyListEl.innerHTML = `
        <div class="lp-empty-state" style="padding:40px 0;">
          <div class="lp-empty-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="lp-empty-title">Aucun historique</div>
          <div class="lp-empty-desc">Analysez un premier domaine pour le voir apparaître ici.</div>
        </div>`;
      return;
    }

    this.historyListEl.innerHTML = this.historyList.map(h => `
      <div class="lp-history-item" data-id="${h.id}" data-target="${this._escHtml(h.target)}" data-scope="${h.scope}">
        <div>
          <div class="lp-history-domain">${this._escHtml(h.domain || h.target)}</div>
          <div class="lp-history-meta">
            <span>${this._scopeLabel(h.scope)}</span>
            <span>·</span>
            <span>${BacklinkDataGenerator.formatMetric(h.backlinksCount)} backlinks</span>
            <span>·</span>
            <span>${this._timeAgo(h.timestamp)}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="lp-history-dr-badge">DR ${h.domainRating}</span>
          <button class="lp-history-delete-btn" data-delete-id="${h.id}" title="Supprimer">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>`).join('');

    // Bind click to reload analysis
    this.historyListEl.querySelectorAll('.lp-history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.lp-history-delete-btn')) return;
        const target = item.dataset.target;
        const scope = item.dataset.scope;
        this.searchInput.value = target;
        this.scopeSelect.value = scope;
        this._closeDrawer();
        this.handleSearch();
      });
    });

    // Bind delete buttons
    this.historyListEl.querySelectorAll('.lp-history-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        await window.linkPulseDB.deleteAnalysis(id);
        await this._loadHistory();
        this._showToast('🗑️ Entrée supprimée');
      });
    });
  }

  _openDrawer() {
    this.historyDrawer.classList.add('active');
    this.historyBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  _closeDrawer() {
    this.historyDrawer.classList.remove('active');
    this.historyBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ─── KPI Metric Animation ─────────────────────────────────────────────────

  _animateMetric(el, targetValue, abbreviated, duration = 1200, suffix = '') {
    if (!el) return;
    const start = Date.now();
    const startVal = 0;

    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.floor(startVal + (targetValue - startVal) * eased);

      if (abbreviated) {
        el.textContent = BacklinkDataGenerator.formatMetric(current) + suffix;
      } else {
        el.textContent = current + suffix;
      }

      if (progress < 1) requestAnimationFrame(update);
      else {
        el.textContent = (abbreviated ? BacklinkDataGenerator.formatMetric(targetValue) : targetValue) + suffix;
      }
    };

    requestAnimationFrame(update);
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────

  _showToast(message, duration = 3000) {
    this.toast.textContent = message;
    this.toast.classList.add('active');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toast.classList.remove('active');
    }, duration);
  }

  // ─── Alert ─────────────────────────────────────────────────────────────────

  _showAlert(msg) {
    this.alertBox.textContent = msg;
    this.alertBox.classList.add('active');
  }

  _hideAlert() {
    this.alertBox.classList.remove('active');
  }

  // ─── Loading State ─────────────────────────────────────────────────────────

  _startLoading() {
    this.isLoading = true;
    this.searchBtn.disabled = true;
    this.searchBtnSpinner.classList.add('active');
    this.searchBtnLabel.textContent = 'Analyse…';
  }

  _stopLoading() {
    this.isLoading = false;
    this.searchBtn.disabled = false;
    this.searchBtnSpinner.classList.remove('active');
    this.searchBtnLabel.textContent = 'Analyser';
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  _scopeLabel(scope) {
    const labels = { domain: 'Domain', subdomains: 'Subdomains', exact: 'Exact URL', path: 'URL & subfolders' };
    return labels[scope] || scope;
  }

  _timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
  }

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Boot app after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.linkPulseApp = new LinkPulseApp();
});
