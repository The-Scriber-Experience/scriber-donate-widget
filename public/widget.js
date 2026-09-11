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
    twitch: { id: 'twitch', name: 'Twitch', icon: '😈', url: 'https://www.twitch.tv/renzoscriber', color: '#a970ff' },
    velora: { id: 'velora', name: 'Velora', icon: '✨', url: 'https://velora.tv/renzoscriber', color: '#00f2ff' },
    youtube: { id: 'youtube', name: 'YouTube', icon: '❤️', url: 'https://www.youtube.com/@sofiascriber', color: '#ff0000' },
    kick: { id: 'kick', name: 'Kick', icon: '🤢', url: 'https://www.kick.com/renzoscriber', color: '#53fc18' },
    beam: { id: 'beam', name: 'BEAM', icon: '💠', url: 'https://beamstream.gg/renzoscriber', color: '#3b82f6' }
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
      name: 'TSE All Links',
      icon: '🌊',
      handle: 'the-scriber-experience',
      url: 'https://the-scriber-experience.github.io/tse-landing-page/',
      color: '#14B5FF',
      colorClass: 'color-9',
      badgeText: 'TSE Portal'
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
      mode: 'compact', // compact | card | goal | ticker | dock
      activeTarget: 'cashapp',
      activePlatform: 'all',
      scale: 1,
      align: 'top-left',
      soundEnabled: true,
      autoRotate: false,
      rotateInterval: 12000,
      goalCurrent: 45,
      goalTarget: 100,
      goalTitle: 'Stream Upgrade Goal',
      recentDonor: 'Katnip the Brave',
      recentAmount: '$25.00'
    }, options || {});

    this.targetsList = ['cashapp', 'bmac', 'amazon', 'landing'];
    this.currentTargetIndex = 0;
    this.rotateTimer = null;
    this.confetti = null;
    this.isCardOpen = false;
    this.isDockOpen = false;

    this.parseURLParams();
  }

  ScriberWidget.prototype.parseURLParams = function () {
    if (typeof window === 'undefined' || !window.location) return;
    var params = new URLSearchParams(window.location.search);

    if (params.has('mode')) this.options.mode = params.get('mode');
    if (params.has('target') && DONATION_TARGETS[params.get('target')]) {
      this.options.activeTarget = params.get('target');
    }
    if (params.has('platform')) this.options.activePlatform = params.get('platform');
    if (params.has('scale')) this.options.scale = parseFloat(params.get('scale')) || 1;
    if (params.has('align')) this.options.align = params.get('align');
    if (params.has('sound')) this.options.soundEnabled = params.get('sound') !== 'false';
    if (params.has('autoRotate')) this.options.autoRotate = params.get('autoRotate') === 'true';
    if (params.has('interval')) this.options.rotateInterval = (parseInt(params.get('interval'), 10) || 12) * 1000;
    if (params.has('goal')) this.options.goalTarget = parseFloat(params.get('goal')) || 100;
    if (params.has('current')) this.options.goalCurrent = parseFloat(params.get('current')) || 45;
    if (params.has('title')) this.options.goalTitle = params.get('title');
    if (params.has('testMode')) this.options.testMode = params.get('testMode') === 'true';

    var idx = this.targetsList.indexOf(this.options.activeTarget);
    if (idx !== -1) this.currentTargetIndex = idx;
  };

  ScriberWidget.prototype.init = function () {
    this.setupDOM();
    this.applyConfiguration();
    this.renderActiveTarget();
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
    var pill = document.getElementById('tse-pill-mode');
    var qrCard = document.getElementById('tse-card-mode');
    var goalCard = document.getElementById('tse-goal-mode');
    var tickerBar = document.getElementById('tse-ticker-mode');
    var dockPanel = document.getElementById('tse-dock-mode');

    [pill, qrCard, goalCard, tickerBar, dockPanel].forEach(function (el) {
      if (el) el.classList.add('hidden');
    });

    if (this.options.mode === 'compact' && pill) pill.classList.remove('hidden');
    else if (this.options.mode === 'card' && qrCard) qrCard.classList.remove('hidden');
    else if (this.options.mode === 'goal' && goalCard) goalCard.classList.remove('hidden');
    else if (this.options.mode === 'ticker' && tickerBar) tickerBar.classList.remove('hidden');
    else if (this.options.mode === 'dock' && dockPanel) dockPanel.classList.remove('hidden');
  };

  ScriberWidget.prototype.applyConfiguration = function () {
    // Populate platforms
    var cluster = document.getElementById('multistream-cluster');
    if (cluster) {
      cluster.innerHTML = '';
      Object.keys(PLATFORMS).forEach(function (key) {
        var plat = PLATFORMS[key];
        var dot = document.createElement('div');
        dot.className = 'platform-dot' + (this.options.activePlatform === key || this.options.activePlatform === 'all' ? ' active' : '');
        dot.title = plat.name + ' - ' + plat.url;
        dot.innerHTML = '<span>' + plat.icon + '</span><span class="pulse-indicator"></span>';
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          this.setPlatform(key);
        }.bind(this));
        cluster.appendChild(dot);
      }.bind(this));
    }

    // Populate tab buttons
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
  };

  ScriberWidget.prototype.renderActiveTarget = function () {
    var target = DONATION_TARGETS[this.options.activeTarget] || DONATION_TARGETS.cashapp;
    if (typeof document === 'undefined') return;

    // Update compact pill
    var pillActiveText = document.getElementById('pill-target-name');
    var pillActionBtn = document.getElementById('pill-action-btn');
    var pillActionEmoji = document.getElementById('pill-action-emoji');
    var pillActionLabel = document.getElementById('pill-action-label');

    if (pillActiveText) pillActiveText.textContent = target.name + ' (' + target.handle + ')';
    if (pillActionBtn) {
      pillActionBtn.className = 'btn-hover ' + target.colorClass + ' pill-action-btn';
    }
    if (pillActionEmoji) pillActionEmoji.textContent = target.icon;
    if (pillActionLabel) pillActionLabel.textContent = 'Donate';

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
    this.options.activePlatform = platformKey;
    if (typeof document === 'undefined') return;
    var dots = document.querySelectorAll('.platform-dot');
    dots.forEach(function (dot, i) {
      var key = Object.keys(PLATFORMS)[i];
      if (platformKey === 'all' || platformKey === key) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
    this.showToast('Platform filter: ' + (PLATFORMS[platformKey] ? PLATFORMS[platformKey].name : 'All Multistream'));
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

  ScriberWidget.prototype.startAutoRotate = function () {
    this.stopAutoRotate();
    var self = this;
    this.rotateTimer = setInterval(function () {
      self.nextTarget();
    }, this.options.rotateInterval);
  };

  ScriberWidget.prototype.stopAutoRotate = function () {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  };

  ScriberWidget.prototype.toggleCard = function (forceState) {
    var card = document.getElementById('tse-card-mode');
    var pill = document.getElementById('tse-pill-mode');
    if (!card) return;

    this.isCardOpen = (forceState !== undefined) ? forceState : !this.isCardOpen;

    if (this.isCardOpen) {
      card.classList.remove('hidden');
      if (this.options.mode === 'compact' && pill) pill.classList.add('hidden');
    } else {
      card.classList.add('hidden');
      if (this.options.mode === 'compact' && pill) pill.classList.remove('hidden');
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

    // Pill click triggers QR Card popup
    var pill = document.getElementById('tse-pill-mode');
    if (pill) {
      pill.addEventListener('click', function () {
        self.toggleCard(true);
      });
    }

    // Close QR Card
    var closeCardBtn = document.getElementById('close-card-btn');
    if (closeCardBtn) {
      closeCardBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggleCard(false);
      });
    }

    // QR Handle badge copy
    var qrHandleBadge = document.getElementById('qr-handle-display');
    if (qrHandleBadge) {
      qrHandleBadge.addEventListener('click', function (e) {
        e.stopPropagation();
        self.copyCurrentLink();
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
    AudioSynth: AudioSynth,
    ScriberWidget: ScriberWidget
  };
}));
