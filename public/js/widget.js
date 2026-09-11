/**
 * The Scriber Experience - Universal Interactive OBS Donate Widget
 * Multistream-ready on-screen overlay & dock controller
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScriberWidget = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Multistream Platforms Registry
  var PLATFORMS = {
    twitch: { id: 'twitch', name: 'Twitch', icon: '😈', url: 'https://www.twitch.tv/renzoscriber', color: '#a970ff', handle: 'twitch.tv/renzoscriber' },
    velora: { id: 'velora', name: 'Velora', icon: '✨', url: 'https://velora.tv/renzoscriber', color: '#00f2ff', handle: 'velora.tv/renzoscriber' },
    youtube: { id: 'youtube', name: 'YouTube', icon: '❤️', url: 'https://www.youtube.com/@sofiascriber', color: '#ff0000', handle: 'youtube.com/@sofiascriber' },
    kick: { id: 'kick', name: 'Kick', icon: '🤢', url: 'https://www.kick.com/renzoscriber', color: '#53fc18', handle: 'kick.com/renzoscriber' },
    beam: { id: 'beam', name: 'BEAM', icon: '💠', url: 'https://beamstream.gg/renzoscriber', color: '#3b82f6', handle: 'beamstream.gg/renzoscriber' }
  };

  // Donation Targets Registry
  var DONATION_TARGETS = {
    cashapp: {
      id: 'cashapp',
      name: 'Cash App',
      icon: '💸',
      handle: '$renzoscriber',
      url: 'https://cash.app/$renzoscriber',
      color: '#00D632',
      colorClass: 'color-5',
      badgeText: '$renzoscriber'
    },
    bmac: {
      id: 'bmac',
      name: 'Buy Me a Coffee',
      icon: '☕',
      handle: 'renzoscriber',
      url: 'https://www.buymeacoffee.com/renzoscriber',
      color: '#FFDD00',
      colorClass: 'color-2',
      badgeText: 'buymeacoffee/renzoscriber'
    },
    amazon: {
      id: 'amazon',
      name: 'Amazon Wishlist',
      icon: '📦',
      handle: 'TSE Wishlist',
      url: 'https://www.amazon.com/hz/wishlist/ls/4YHE4NZD3W98?ref_=wl_share',
      color: '#FF9900',
      colorClass: 'color-4',
      badgeText: 'Amazon Wishlist'
    },
    landing: {
      id: 'landing',
      name: 'TSE Landing Page',
      icon: '🌊',
      handle: 'the-scriber-experience',
      url: 'https://the-scriber-experience.github.io/tse-landing-page/',
      color: '#14B5FF',
      colorClass: 'color-9',
      badgeText: 'TSE Landing Page'
    }
  };

  // TSE Links & Research Registry
  var TSE_LINKS = {
    landing: {
      id: 'landing',
      name: 'TSE Landing Page',
      icon: '🌊',
      handle: 'the-scriber-experience.github.io',
      url: 'https://the-scriber-experience.github.io/tse-landing-page/',
      color: '#00f2fe',
      colorClass: 'color-9',
      badgeText: 'TSE Landing Page'
    },
    zettelkasten: {
      id: 'zettelkasten',
      name: 'Zettelkasten',
      icon: '🔮',
      handle: 'there-and-back-again',
      url: 'https://eigenscribe.github.io/there-and-back-again/frontmatter.html',
      color: '#a855f7',
      colorClass: 'color-3',
      badgeText: 'Zettelkasten'
    },
    research: {
      id: 'research',
      name: 'Research Notebook',
      icon: '📓',
      handle: 'scriber-labs/research-notebook',
      url: 'https://scriber-labs.github.io/research-notebook/',
      color: '#06b6d4',
      colorClass: 'color-1',
      badgeText: 'Research Notebook'
    }
  };

  // Sound Synthesizer via Web Audio API
  var AudioSynth = {
    ctx: null,
    init: function () {
      if (!this.ctx && typeof window !== 'undefined') {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playChime: function (type) {
      try {
        this.init();
        if (!this.ctx) return;
        var ctx = this.ctx;
        var now = ctx.currentTime;

        if (type === 'coin') {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, now); // B5
          osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'level-up' || type === 'cheer') {
          // 4-note ascending cyber chime
          var notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          notes.forEach(function (freq, index) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var startTime = now + (index * 0.07);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.28);
          });
        }
      } catch (err) {
        // Audio error suppression
      }
    }
  };

  function ScriberWidget(options) {
    this.options = Object.assign({
      mode: 'card', // card | platforms | links | goal | ticker | dock
      activeTab: 'donations',
      activeTarget: 'cashapp',
      activePlatform: 'twitch',
      activeLink: 'landing',
      scale: 1,
      align: 'top-left',
      soundEnabled: true,
      autoRotate: false,
      rotateInterval: 20000,
      subcycleInterval: 20000,
      goalCurrent: 45,
      goalTarget: 100,
      goalTitle: 'Stream Upgrade Goal',
      recentDonor: 'Katnip the Brave',
      recentAmount: '$25.00'
    }, options || {});

    this.tabsList = ['donations', 'platforms', 'links'];
    this.currentTabIndex = 0;
    this.targetsList = ['cashapp', 'bmac', 'amazon'];
    this.currentTargetIndex = 0;
    this.platformsList = ['twitch', 'velora', 'youtube', 'kick', 'beam'];
    this.currentPlatformIndex = 0;
    this.linksList = ['landing', 'zettelkasten', 'research'];
    this.currentLinkIndex = 0;
    this.rotateTimer = null;
    this.confetti = null;
    this.isCardOpen = false;
    this.isPlatformsCardOpen = false;
    this.isLinksCardOpen = false;
    this.isDockOpen = false;

    this.parseURLParams();

    if (this.options.activeTab) {
      var normTab = this.options.activeTab.toLowerCase();
      if (normTab === 'card') normTab = 'donations';
      var tIdx = this.tabsList.indexOf(normTab);
      if (tIdx !== -1) {
        this.currentTabIndex = tIdx;
        this.options.activeTab = normTab;
      }
    } else if (this.options.mode) {
      var m = this.options.mode.toLowerCase();
      if (m === 'card' || m === 'donations') {
        this.options.activeTab = 'donations';
        this.currentTabIndex = 0;
      } else if (m === 'platforms') {
        this.options.activeTab = 'platforms';
        this.currentTabIndex = 1;
      } else if (m === 'links') {
        this.options.activeTab = 'links';
        this.currentTabIndex = 2;
      }
    }
  }

  ScriberWidget.prototype.parseURLParams = function () {
    if (typeof window === 'undefined' || !window.location) return;
    var params = new URLSearchParams(window.location.search);

    if (params.has('mode')) {
      this.options.mode = params.get('mode');
      if (this.options.mode === 'card' || this.options.mode === 'donations') {
        this.options.activeTab = 'donations';
        this.currentTabIndex = 0;
      } else if (this.options.mode === 'platforms') {
        this.options.activeTab = 'platforms';
        this.currentTabIndex = 1;
      } else if (this.options.mode === 'links') {
        this.options.activeTab = 'links';
        this.currentTabIndex = 2;
      }
    }
    if (params.has('tab')) {
      var t = params.get('tab').toLowerCase();
      if (t === 'donations' || t === 'card') {
        this.options.activeTab = 'donations';
        this.options.mode = 'card';
        this.currentTabIndex = 0;
      } else if (t === 'platforms') {
        this.options.activeTab = 'platforms';
        this.options.mode = 'platforms';
        this.currentTabIndex = 1;
      } else if (t === 'links' || t === 'tse-links' || t === 'tselinks') {
        this.options.activeTab = 'links';
        this.options.mode = 'links';
        this.currentTabIndex = 2;
      }
    }
    if (params.has('target') && DONATION_TARGETS[params.get('target')]) {
      this.options.activeTarget = params.get('target');
    }
    if (params.has('platform') && PLATFORMS[params.get('platform')]) {
      this.options.activePlatform = params.get('platform');
    }
    if (params.has('link') && TSE_LINKS[params.get('link')]) {
      this.options.activeLink = params.get('link');
    }
    if (params.has('scale')) this.options.scale = parseFloat(params.get('scale')) || 1;
    if (params.has('align')) this.options.align = params.get('align');
    if (params.has('sound')) this.options.soundEnabled = params.get('sound') !== 'false';
    if (params.has('autoRotate')) this.options.autoRotate = params.get('autoRotate') === 'true';
    if (params.has('interval')) {
      this.options.rotateInterval = (parseInt(params.get('interval'), 10) || 20) * 1000;
      this.options.subcycleInterval = this.options.rotateInterval;
    }
    if (params.has('subcycle')) {
      this.options.subcycleInterval = (parseInt(params.get('subcycle'), 10) || 20) * 1000;
      this.options.rotateInterval = this.options.subcycleInterval;
    }
    if (params.has('goal')) this.options.goalTarget = parseFloat(params.get('goal')) || 100;
    if (params.has('current')) this.options.goalCurrent = parseFloat(params.get('current')) || 45;
    if (params.has('title')) this.options.goalTitle = params.get('title');
    if (params.has('testMode')) this.options.testMode = params.get('testMode') === 'true';

    var idx = this.targetsList.indexOf(this.options.activeTarget);
    if (idx !== -1) this.currentTargetIndex = idx;
    var pIdx = this.platformsList.indexOf(this.options.activePlatform);
    if (pIdx !== -1) this.currentPlatformIndex = pIdx;
    var lIdx = this.linksList.indexOf(this.options.activeLink);
    if (lIdx !== -1) this.currentLinkIndex = lIdx;
  };

  ScriberWidget.prototype.init = function () {
    this.setupDOM();
    this.applyConfiguration();
    this.renderActiveTarget();
    this.renderActivePlatform();
    this.renderActiveLink();
    this.updateGoalHUD();
    this.attachEvents();
    this.connectLiveEvents();

    if (this.options.autoRotate && this.options.mode !== 'dock') {
      this.startAutoRotate();
    }

    if (typeof TSEConfetti !== 'undefined') {
      var canvas = document.getElementById('confetti-canvas');
      if (canvas) this.confetti = new TSEConfetti(canvas);
    }
  };

  ScriberWidget.prototype.connectLiveEvents = function () {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      var eventSource = new EventSource('/events');
      var self = this;
      eventSource.addEventListener('cheer', function (e) {
        try {
          var data = JSON.parse(e.data);
          self.triggerCheerAlert(data);
        } catch (err) {}
      });
    } catch (e) {
      // Offline / standalone file mode fallback
    }
  };

  ScriberWidget.prototype.setupDOM = function () {
    var root = document.getElementById('scriber-widget-container');
    if (!root) return;

    // Apply scaling & alignment classes
    root.className = 'tse-widget-root align-' + this.options.align;
    document.documentElement.style.setProperty('--widget-scale', this.options.scale);

    if (this.options.testMode) {
      document.body.classList.add('test-mode');
    }

    this.updateVisibilityByMode();
  };

  ScriberWidget.prototype.updateVisibilityByMode = function () {
    var qrCard = document.getElementById('tse-card-mode');
    var platformsCard = document.getElementById('tse-platforms-mode');
    var linksCard = document.getElementById('tse-links-mode');
    var goalCard = document.getElementById('tse-goal-mode');
    var tickerBar = document.getElementById('tse-ticker-mode');
    var dockPanel = document.getElementById('tse-dock-mode');

    [qrCard, platformsCard, linksCard, goalCard, tickerBar, dockPanel].forEach(function (el) {
      if (el) el.classList.add('hidden');
    });

    if (this.options.mode === 'card' && qrCard) { qrCard.classList.remove('hidden'); this.updateWindowTabsActive('card'); }
    else if (this.options.mode === 'platforms' && platformsCard) { platformsCard.classList.remove('hidden'); this.updateWindowTabsActive('platforms'); }
    else if (this.options.mode === 'links' && linksCard) { linksCard.classList.remove('hidden'); this.updateWindowTabsActive('links'); }
    else if (this.options.mode === 'goal' && goalCard) goalCard.classList.remove('hidden');
    else if (this.options.mode === 'ticker' && tickerBar) tickerBar.classList.remove('hidden');
    else if (this.options.mode === 'dock' && dockPanel) dockPanel.classList.remove('hidden');
    else if (qrCard) { qrCard.classList.remove('hidden'); this.updateWindowTabsActive('card'); }
  };

  ScriberWidget.prototype.updateWindowTabsActive = function (activeWindow) {
    if (typeof document === 'undefined') return;
    var allWindowTabs = document.querySelectorAll('.window-nav-tabs .window-tab-btn');
    allWindowTabs.forEach(function (btn) {
      var win = btn.getAttribute('data-window');
      if (
        win === activeWindow ||
        (win === 'card' && (activeWindow === 'donations' || activeWindow === 'card')) ||
        (win === 'donations' && (activeWindow === 'donations' || activeWindow === 'card')) ||
        (win === 'links' && (activeWindow === 'links' || activeWindow === 'tse-links' || activeWindow === 'tse links'))
      ) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  ScriberWidget.prototype.applyConfiguration = function () {
    // Populate platform tabs in platforms card
    var platformTabsContainer = document.getElementById('platforms-tabs');
    if (platformTabsContainer) {
      platformTabsContainer.innerHTML = '';
      this.platformsList.forEach(function (key) {
        var plat = PLATFORMS[key];
        if (!plat) return;
        var tab = document.createElement('button');
        tab.className = 'tab-btn tab-' + key + (this.options.activePlatform === key ? ' active' : '');
        tab.innerHTML = '<span>' + plat.icon + '</span> ' + plat.name;
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          this.setPlatform(key);
        }.bind(this));
        platformTabsContainer.appendChild(tab);
      }.bind(this));
    }

    // Populate donation tab buttons in donate card
    var tabsContainer = document.getElementById('donation-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      this.targetsList.forEach(function (targetKey) {
        var target = DONATION_TARGETS[targetKey];
        var tab = document.createElement('button');
        tab.className = 'tab-btn tab-' + targetKey + (this.options.activeTarget === targetKey ? ' active' : '');
        tab.innerHTML = '<span>' + target.icon + '</span> ' + target.name;
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          this.setTarget(targetKey);
        }.bind(this));
        tabsContainer.appendChild(tab);
      }.bind(this));
    }

    // Populate links tab buttons in links card
    var linksTabsContainer = document.getElementById('links-tabs');
    if (linksTabsContainer) {
      linksTabsContainer.innerHTML = '';
      this.linksList.forEach(function (key) {
        var linkItem = TSE_LINKS[key];
        if (!linkItem) return;
        var tab = document.createElement('button');
        tab.className = 'tab-btn tab-' + key + (this.options.activeLink === key ? ' active' : '');
        tab.innerHTML = '<span>' + linkItem.icon + '</span> ' + linkItem.name;
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          this.setLink(key);
        }.bind(this));
        linksTabsContainer.appendChild(tab);
      }.bind(this));
    }
  };

  ScriberWidget.prototype.renderActiveTarget = function () {
    var target = DONATION_TARGETS[this.options.activeTarget] || DONATION_TARGETS.cashapp;
    if (typeof document === 'undefined') return;

    // Update QR Card
    var qrContainer = document.getElementById('qr-code-box');
    var qrHandle = document.getElementById('qr-handle-display');
    var qrMethodName = document.getElementById('qr-method-name');

    if (qrMethodName) qrMethodName.textContent = target.name;
    if (qrHandle) {
      qrHandle.innerHTML = target.icon + ' ' + target.handle + ' <span style="opacity:0.6;font-size:9px">📋 copy</span>';
    }

    if (qrContainer && typeof QRCodeGenerator !== 'undefined') {
      var svgQR = QRCodeGenerator.generateSVG(target.url, {
        size: 160,
        margin: 1,
        colorDark: target.color || '#00f2ff',
        colorLight: 'transparent',
        ecc: 'M'
      });
      qrContainer.innerHTML = svgQR;
    }

    // Update active tab styles
    var tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (btn) {
      if (btn.classList.contains('tab-' + target.id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Ticker active item
    var tickerTarget = document.getElementById('ticker-active-target');
    if (tickerTarget) {
      tickerTarget.innerHTML = target.icon + ' <span class="neon-cyan-text">' + target.name + ':</span> ' + target.handle;
    }
  };

  ScriberWidget.prototype.setTarget = function (targetKey) {
    if (!DONATION_TARGETS[targetKey]) return;
    this.options.activeTarget = targetKey;
    this.currentTargetIndex = this.targetsList.indexOf(targetKey);
    this.renderActiveTarget();
  };

  ScriberWidget.prototype.setPlatform = function (platformKey) {
    if (!PLATFORMS[platformKey]) return;
    this.options.activePlatform = platformKey;
    var idx = this.platformsList.indexOf(platformKey);
    if (idx !== -1) this.currentPlatformIndex = idx;
    this.renderActivePlatform();
  };

  ScriberWidget.prototype.renderActivePlatform = function () {
    var platKey = this.options.activePlatform;
    if (!PLATFORMS[platKey]) {
      platKey = 'twitch';
    }
    var plat = PLATFORMS[platKey];
    if (typeof document === 'undefined' || !plat) return;

    // Update Platforms Card
    var qrContainer = document.getElementById('platform-qr-code-box');
    var qrHandle = document.getElementById('platform-qr-handle-display');
    var qrMethodName = document.getElementById('platform-qr-method-name');

    if (qrMethodName) qrMethodName.textContent = plat.name;
    if (qrHandle) {
      var displayHandle = plat.handle || (plat.url.replace(/^https?:\/\/(www\.)?/, ''));
      qrHandle.innerHTML = plat.icon + ' ' + displayHandle + ' <span style="opacity:0.6;font-size:9px">📋 copy</span>';
    }

    if (qrContainer && typeof QRCodeGenerator !== 'undefined') {
      var svgQR = QRCodeGenerator.generateSVG(plat.url, {
        size: 160,
        margin: 1,
        colorDark: plat.color || '#00f2ff',
        colorLight: 'transparent',
        ecc: 'M'
      });
      qrContainer.innerHTML = svgQR;
    }

    // Update active tab styles for platforms
    var platformTabs = document.querySelectorAll('#platforms-tabs .tab-btn');
    platformTabs.forEach(function (btn) {
      if (btn.classList.contains('tab-' + plat.id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  ScriberWidget.prototype.setLink = function (linkKey) {
    if (!TSE_LINKS[linkKey]) return;
    this.options.activeLink = linkKey;
    var idx = this.linksList.indexOf(linkKey);
    if (idx !== -1) this.currentLinkIndex = idx;
    this.renderActiveLink();
  };

  ScriberWidget.prototype.renderActiveLink = function () {
    var linkKey = this.options.activeLink;
    if (!TSE_LINKS[linkKey]) {
      linkKey = 'landing';
    }
    var item = TSE_LINKS[linkKey];
    if (typeof document === 'undefined' || !item) return;

    // Update Links Card
    var qrContainer = document.getElementById('links-qr-code-box');
    var qrHandle = document.getElementById('links-qr-handle-display');
    var qrMethodName = document.getElementById('links-qr-method-name');

    if (qrMethodName) qrMethodName.textContent = item.name;
    if (qrHandle) {
      var displayHandle = item.handle || item.name;
      qrHandle.innerHTML = item.icon + ' ' + displayHandle + ' <span style="opacity:0.6;font-size:9px">📋 copy</span>';
    }

    if (qrContainer && typeof QRCodeGenerator !== 'undefined') {
      var svgQR = QRCodeGenerator.generateSVG(item.url, {
        size: 160,
        margin: 1,
        colorDark: item.color || '#00f2ff',
        colorLight: 'transparent',
        ecc: 'M'
      });
      qrContainer.innerHTML = svgQR;
    }

    // Update active tab styles for links
    var linksTabs = document.querySelectorAll('#links-tabs .tab-btn');
    linksTabs.forEach(function (btn) {
      if (btn.classList.contains('tab-' + item.id)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  ScriberWidget.prototype.updateGoalHUD = function () {
    if (typeof document === 'undefined') return;
    var pct = Math.min(100, Math.round((this.options.goalCurrent / this.options.goalTarget) * 100));
    var bar = document.getElementById('goal-bar-fill');
    var currentTxt = document.getElementById('goal-current-amount');
    var targetTxt = document.getElementById('goal-target-amount');
    var titleTxt = document.getElementById('goal-title-text');

    if (bar) bar.style.width = pct + '%';
    if (currentTxt) currentTxt.textContent = '$' + this.options.goalCurrent;
    if (targetTxt) targetTxt.textContent = '$' + this.options.goalTarget + ' (' + pct + '%)';
    if (titleTxt) titleTxt.textContent = this.options.goalTitle;
  };

  ScriberWidget.prototype.nextTarget = function () {
    this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targetsList.length;
    var nextKey = this.targetsList[this.currentTargetIndex];
    this.setTarget(nextKey);
  };

  ScriberWidget.prototype.nextPlatform = function () {
    this.currentPlatformIndex = (this.currentPlatformIndex + 1) % this.platformsList.length;
    var nextKey = this.platformsList[this.currentPlatformIndex];
    this.setPlatform(nextKey);
  };

  ScriberWidget.prototype.nextLink = function () {
    this.currentLinkIndex = (this.currentLinkIndex + 1) % this.linksList.length;
    var nextKey = this.linksList[this.currentLinkIndex];
    this.setLink(nextKey);
  };

  ScriberWidget.prototype.nextTab = function () {
    this.currentTabIndex = (this.currentTabIndex + 1) % this.tabsList.length;
    var nextTabName = this.tabsList[this.currentTabIndex];
    this.setTab(nextTabName);
  };

  ScriberWidget.prototype.nextSubtab = function () {
    return this.nextSubcycle();
  };

  ScriberWidget.prototype.nextSubcycle = function () {
    var activeTab = this.options.activeTab || this.tabsList[this.currentTabIndex] || 'donations';
    var normTab = String(activeTab).toLowerCase().trim();

    if (normTab === 'card' || normTab === 'donations' || normTab === 'donation') {
      if (this.currentTargetIndex < this.targetsList.length - 1) {
        this.currentTargetIndex++;
        this.setTarget(this.targetsList[this.currentTargetIndex]);
      } else {
        this.currentTargetIndex = 0;
        this.setTab('platforms');
        this.currentPlatformIndex = 0;
        this.setPlatform(this.platformsList[0]);
      }
    } else if (normTab === 'platforms' || normTab === 'platform') {
      if (this.currentPlatformIndex < this.platformsList.length - 1) {
        this.currentPlatformIndex++;
        this.setPlatform(this.platformsList[this.currentPlatformIndex]);
      } else {
        this.currentPlatformIndex = 0;
        this.setTab('links');
        this.currentLinkIndex = 0;
        this.setLink(this.linksList[0]);
      }
    } else if (normTab === 'links' || normTab === 'tse links' || normTab === 'tse-links' || normTab === 'tselinks' || normTab === 'link') {
      if (this.currentLinkIndex < this.linksList.length - 1) {
        this.currentLinkIndex++;
        this.setLink(this.linksList[this.currentLinkIndex]);
      } else {
        this.currentLinkIndex = 0;
        this.setTab('donations');
        this.currentTargetIndex = 0;
        this.setTarget(this.targetsList[0]);
      }
    } else {
      this.nextTab();
    }
  };

  ScriberWidget.prototype.setTab = function (tabName) {
    if (!tabName) return;
    var normalized = String(tabName).toLowerCase().trim();
    if (normalized === 'donations' || normalized === 'card' || normalized === 'donation') {
      this.currentTabIndex = 0;
      this.toggleCard(true);
    } else if (normalized === 'platforms' || normalized === 'platform') {
      this.currentTabIndex = 1;
      this.togglePlatformsCard(true);
    } else if (normalized === 'links' || normalized === 'tse links' || normalized === 'tse-links' || normalized === 'tselinks' || normalized === 'link') {
      this.currentTabIndex = 2;
      this.toggleLinksCard(true);
    }
  };

  ScriberWidget.prototype.startAutoRotate = function () {
    this.stopAutoRotate();
    var self = this;
    var interval = this.options.subcycleInterval || this.options.rotateInterval || 20000;
    this.rotateTimer = setInterval(function () {
      self.nextSubcycle();
    }, interval);
  };

  ScriberWidget.prototype.stopAutoRotate = function () {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  };

  ScriberWidget.prototype.toggleCard = function (forceState) {
    this.isCardOpen = (forceState !== undefined) ? forceState : !this.isCardOpen;

    if (this.isCardOpen) {
      this.isPlatformsCardOpen = false;
      this.isLinksCardOpen = false;
      this.options.mode = 'card';
      this.options.activeTab = 'donations';
      this.currentTabIndex = 0;
      if (typeof document !== 'undefined') {
        var card = document.getElementById('tse-card-mode');
        var platformsCard = document.getElementById('tse-platforms-mode');
        var linksCard = document.getElementById('tse-links-mode');
        if (card) card.classList.remove('hidden');
        if (platformsCard) platformsCard.classList.add('hidden');
        if (linksCard) linksCard.classList.add('hidden');
        this.updateWindowTabsActive('card');
        this.renderActiveTarget();
      }
    } else {
      if (typeof document !== 'undefined') {
        var card = document.getElementById('tse-card-mode');
        if (card) card.classList.add('hidden');
      }
    }
  };

  ScriberWidget.prototype.togglePlatformsCard = function (forceState) {
    this.isPlatformsCardOpen = (forceState !== undefined) ? forceState : !this.isPlatformsCardOpen;

    if (this.isPlatformsCardOpen) {
      this.isCardOpen = false;
      this.isLinksCardOpen = false;
      this.options.mode = 'platforms';
      this.options.activeTab = 'platforms';
      this.currentTabIndex = 1;
      if (typeof document !== 'undefined') {
        var card = document.getElementById('tse-card-mode');
        var platformsCard = document.getElementById('tse-platforms-mode');
        var linksCard = document.getElementById('tse-links-mode');
        if (platformsCard) platformsCard.classList.remove('hidden');
        if (card) card.classList.add('hidden');
        if (linksCard) linksCard.classList.add('hidden');
        this.updateWindowTabsActive('platforms');
        this.renderActivePlatform();
      }
    } else {
      if (typeof document !== 'undefined') {
        var platformsCard = document.getElementById('tse-platforms-mode');
        if (platformsCard) platformsCard.classList.add('hidden');
      }
    }
  };

  ScriberWidget.prototype.toggleLinksCard = function (forceState) {
    this.isLinksCardOpen = (forceState !== undefined) ? forceState : !this.isLinksCardOpen;

    if (this.isLinksCardOpen) {
      this.isCardOpen = false;
      this.isPlatformsCardOpen = false;
      this.options.mode = 'links';
      this.options.activeTab = 'links';
      this.currentTabIndex = 2;
      if (typeof document !== 'undefined') {
        var card = document.getElementById('tse-card-mode');
        var platformsCard = document.getElementById('tse-platforms-mode');
        var linksCard = document.getElementById('tse-links-mode');
        if (linksCard) linksCard.classList.remove('hidden');
        if (card) card.classList.add('hidden');
        if (platformsCard) platformsCard.classList.add('hidden');
        this.updateWindowTabsActive('links');
        this.renderActiveLink();
      }
    } else {
      if (typeof document !== 'undefined') {
        var linksCard = document.getElementById('tse-links-mode');
        if (linksCard) linksCard.classList.add('hidden');
      }
    }
  };

  ScriberWidget.prototype.toggleDock = function () {
    var dock = document.getElementById('tse-dock-mode');
    if (!dock) return;
    this.isDockOpen = !this.isDockOpen;
    if (this.isDockOpen) dock.classList.remove('hidden');
    else dock.classList.add('hidden');
  };

  ScriberWidget.prototype.triggerCheerAlert = function (data) {
    data = data || {
      donor: 'Scriber Champion',
      amount: '$10.00',
      message: 'Keep creating awesome content! ✨',
      target: this.options.activeTarget
    };

    var overlay = document.getElementById('cheer-alert-overlay');
    var donorElem = document.getElementById('alert-donor-name');
    var amountElem = document.getElementById('alert-amount-display');
    var msgElem = document.getElementById('alert-msg-display');

    if (donorElem) donorElem.textContent = data.donor;
    if (amountElem) amountElem.textContent = data.amount;
    if (msgElem) msgElem.textContent = data.message;

    if (overlay) {
      overlay.classList.add('active');
    }

    if (this.options.soundEnabled) {
      AudioSynth.playChime('cheer');
    }

    if (this.confetti) {
      this.confetti.burst({ count: 70 });
    }

    // Increment goal
    var rawAmt = parseFloat(String(data.amount).replace(/[^0-9.]/g, '')) || 5;
    this.options.goalCurrent = Math.min(this.options.goalTarget, this.options.goalCurrent + rawAmt);
    this.updateGoalHUD();

    setTimeout(function () {
      if (overlay) overlay.classList.remove('active');
    }, 4500);
  };

  ScriberWidget.prototype.copyCurrentLink = function () {
    var target = DONATION_TARGETS[this.options.activeTarget];
    if (!target) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(target.url).then(function () {
        this.showToast('Copied ' + target.name + ' URL to clipboard! ✨');
      }.bind(this)).catch(function () {
        this.fallbackCopy(target.url);
      }.bind(this));
    } else {
      this.fallbackCopy(target.url);
    }
  };

  ScriberWidget.prototype.copyPlatformLink = function () {
    var platKey = this.options.activePlatform;
    if (!PLATFORMS[platKey]) platKey = 'twitch';
    var plat = PLATFORMS[platKey];
    if (!plat) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(plat.url).then(function () {
        this.showToast('Copied ' + plat.name + ' URL to clipboard! ✨');
      }.bind(this)).catch(function () {
        this.fallbackCopy(plat.url);
      }.bind(this));
    } else {
      this.fallbackCopy(plat.url);
    }
  };

  ScriberWidget.prototype.copyLinkItem = function () {
    var linkKey = this.options.activeLink;
    if (!TSE_LINKS[linkKey]) linkKey = 'landing';
    var item = TSE_LINKS[linkKey];
    if (!item) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(item.url).then(function () {
        this.showToast('Copied ' + item.name + ' URL to clipboard! ✨');
      }.bind(this)).catch(function () {
        this.fallbackCopy(item.url);
      }.bind(this));
    } else {
      this.fallbackCopy(item.url);
    }
  };

  ScriberWidget.prototype.fallbackCopy = function (text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast('Copied to clipboard! ✨');
    } catch (err) {
      this.showToast('Direct link: ' + text);
    }
    document.body.removeChild(textArea);
  };

  ScriberWidget.prototype.showToast = function (msg) {
    var toast = document.getElementById('tse-toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2800);
  };

  ScriberWidget.prototype.attachEvents = function () {
    var self = this;

    // Window navigation tabs (in maximized cards)
    var windowTabBtns = document.querySelectorAll('.window-nav-tabs .window-tab-btn');
    windowTabBtns.forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var targetWindow = tabBtn.getAttribute('data-window');
        if (targetWindow === 'card' || targetWindow === 'donations') {
          self.toggleCard(true);
        } else if (targetWindow === 'platforms') {
          self.togglePlatformsCard(true);
        } else if (targetWindow === 'links') {
          self.toggleLinksCard(true);
        }
      });
    });

    // Close Donate QR Card
    var closeCardBtn = document.getElementById('close-card-btn');
    if (closeCardBtn) {
      closeCardBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleCard(false);
      });
    }

    // Close Platforms QR Card
    var closePlatformsBtn = document.getElementById('close-platforms-btn');
    if (closePlatformsBtn) {
      closePlatformsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.togglePlatformsCard(false);
      });
    }

    // Close Links QR Card
    var closeLinksBtn = document.getElementById('close-links-btn');
    if (closeLinksBtn) {
      closeLinksBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleLinksCard(false);
      });
    }

    // Donate QR Handle badge copy
    var qrHandleBadge = document.getElementById('qr-handle-display');
    if (qrHandleBadge) {
      qrHandleBadge.addEventListener('click', function (e) {
        e.stopPropagation();
        self.copyCurrentLink();
      });
    }

    // Platforms QR Handle badge copy
    var platformQrHandleBadge = document.getElementById('platform-qr-handle-display');
    if (platformQrHandleBadge) {
      platformQrHandleBadge.addEventListener('click', function (e) {
        e.stopPropagation();
        self.copyPlatformLink();
      });
    }

    // Links QR Handle badge copy
    var linksQrHandleBadge = document.getElementById('links-qr-handle-display');
    if (linksQrHandleBadge) {
      linksQrHandleBadge.addEventListener('click', function (e) {
        e.stopPropagation();
        self.copyLinkItem();
      });
    }

    // Test Alert button in Dock
    var testCheerBtn = document.getElementById('btn-test-cheer');
    if (testCheerBtn) {
      testCheerBtn.addEventListener('click', function () {
        self.triggerCheerAlert();
      });
    }

    // Mode Switch buttons in Dock
    var modeSelect = document.getElementById('dock-mode-select');
    if (modeSelect) {
      modeSelect.value = self.options.mode;
      modeSelect.addEventListener('change', function () {
        self.options.mode = this.value;
        self.updateVisibilityByMode();
      });
    }

    // Goal amount controls in Dock
    var goalTargetInput = document.getElementById('dock-goal-target');
    var goalCurrentInput = document.getElementById('dock-goal-current');
    if (goalTargetInput) {
      goalTargetInput.value = self.options.goalTarget;
      goalTargetInput.addEventListener('input', function () {
        self.options.goalTarget = parseFloat(this.value) || 100;
        self.updateGoalHUD();
      });
    }
    if (goalCurrentInput) {
      goalCurrentInput.value = self.options.goalCurrent;
      goalCurrentInput.addEventListener('input', function () {
        self.options.goalCurrent = parseFloat(this.value) || 0;
        self.updateGoalHUD();
      });
    }
  };

  return {
    PLATFORMS: PLATFORMS,
    DONATION_TARGETS: DONATION_TARGETS,
    TSE_LINKS: TSE_LINKS,
    AudioSynth: AudioSynth,
    ScriberWidget: ScriberWidget
  };
}));
