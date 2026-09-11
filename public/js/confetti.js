/**
 * Particle Confetti & Cheer FX Engine
 * Lightweight, zero-dependency canvas particle animation for stream cheers/donations
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TSEConfetti = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  var colors = ['#00f2ff', '#3b82f6', '#8b5cf6', '#ec4899', '#f5ce62', '#30dd8a', '#ffffff'];

  function ConfettiEngine(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;
    this.resize();
    var self = this;
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function() { self.resize(); });
    }
  }

  ConfettiEngine.prototype.resize = function () {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth || window.innerWidth || 800;
    this.canvas.height = this.canvas.offsetHeight || window.innerHeight || 600;
  };

  ConfettiEngine.prototype.burst = function (options) {
    if (!this.canvas || !this.ctx) return;
    options = options || {};
    var count = options.count || 60;
    var originX = options.x !== undefined ? options.x : this.canvas.width / 2;
    var originY = options.y !== undefined ? options.y : this.canvas.height / 2;

    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 8 + 3;
      var size = Math.random() * 6 + 3;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var shape = Math.random() > 0.4 ? 'rect' : 'circle';

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: size,
        color: color,
        shape: shape,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.18
      });
    }

    if (!this.animationId) {
      this.animate();
    }
  };

  ConfettiEngine.prototype.animate = function () {
    var self = this;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (var i = self.particles.length - 1; i >= 0; i--) {
      var p = self.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        self.particles.splice(i, 1);
        continue;
      }

      self.ctx.save();
      self.ctx.globalAlpha = Math.max(0, p.alpha);
      self.ctx.fillStyle = p.color;
      self.ctx.shadowColor = p.color;
      self.ctx.shadowBlur = 8;
      self.ctx.translate(p.x, p.y);
      self.ctx.rotate((p.rotation * Math.PI) / 180);

      if (p.shape === 'rect') {
        self.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
      } else {
        self.ctx.beginPath();
        self.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        self.ctx.fill();
      }
      self.ctx.restore();
    }

    if (self.particles.length > 0) {
      self.animationId = requestAnimationFrame(function() { self.animate(); });
    } else {
      self.animationId = null;
      self.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };

  return ConfettiEngine;
}));
