/**
 * ============================================================================
 * AQUAPETS - REALISTIC SWIMMING FISH & AQUATIC HERO ENGINE
 * Multi-Axis Hydrodynamic Swimming, Scroll Physics, Interactive Steering & Bubbles
 * ============================================================================
 */

(function () {
    'use strict';

    function initHeroAquatic() {
        const heroSection = document.querySelector('.section_home-header');
        if (!heroSection) return;

        const fishImg = heroSection.querySelector('.home-header_dog');
        const pelletsImg = heroSection.querySelector('.home-header_bone');

        // Ensure canvas element exists
        let canvas = document.getElementById('hero-aquatic-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'hero-aquatic-canvas';
            canvas.className = 'hero-aquatic-canvas';
            heroSection.insertBefore(canvas, heroSection.firstChild);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let dpr = window.devicePixelRatio || 1;

        // Interactive mouse state
        const mouse = {
            x: -1000,
            y: -1000,
            prevX: -1000,
            prevY: -1000,
            speed: 0,
            isHovering: false,
            lastMoveTime: 0
        };

        // Scroll state
        const scrollState = {
            currentY: window.scrollY || window.pageYOffset,
            lastY: window.scrollY || window.pageYOffset,
            velocity: 0,
            smoothVelocity: 0,
            progress: 0
        };

        // Fish Hydrodynamic Swimming Physics State
        const fish = {
            // Animated transform coordinates
            x: 0,
            y: 0,
            z: 0,
            rotZ: 0,
            rotY: 0,
            rotX: 0,
            skewY: 0,
            scale: 1,

            // Target positions
            targetX: 0,
            targetY: 0,
            targetRotZ: 0,
            targetRotY: 0,
            targetRotX: 0,

            // Swimming cycle & speed
            phase: 0,
            speed: 1,
            tailAngle: 0,
            isDarting: false,
            dartVelocity: 0,
            mouthBubbleTimer: 0
        };

        // Entities
        let bubbles = [];
        let ripples = [];
        let particles = [];
        let animationFrameId = null;
        let isVisible = true;

        // Setup dimensions
        function resize() {
            const rect = heroSection.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            ctx.scale(dpr, dpr);
        }

        // ==========================================
        // BUBBLE CLASS (Main Floating Ambient Bubbles)
        // ==========================================
        class Bubble {
            constructor(initRandomY = false, customX = null, customY = null, customRadius = null, customSpeed = null) {
                this.reset(initRandomY, customX, customY, customRadius, customSpeed);
            }

            reset(initRandomY = false, customX = null, customY = null, customRadius = null, customSpeed = null) {
                this.radius = customRadius || (6 + Math.random() * 22);
                this.baseRadius = this.radius;
                this.x = customX !== null ? customX : Math.random() * width;
                this.y = customY !== null ? customY : (initRandomY ? Math.random() * height : height + this.radius + Math.random() * 50);
                
                this.speedY = customSpeed || (0.4 + Math.random() * 0.9);
                this.vx = 0;
                this.vy = 0;
                
                this.wobbleSpeed = 0.015 + Math.random() * 0.02;
                this.wobbleAmp = 0.4 + Math.random() * 0.8;
                this.wobbleAngle = Math.random() * Math.PI * 2;
                
                this.opacity = 0.25 + Math.random() * 0.45;
                this.tintHue = Math.random() > 0.4 ? '119, 194, 243' : '150, 220, 245';
            }

            update() {
                this.wobbleAngle += this.wobbleSpeed;
                this.y -= this.speedY + this.vy;
                this.x += Math.sin(this.wobbleAngle) * this.wobbleAmp + this.vx;

                this.vx *= 0.93;
                this.vy *= 0.93;

                // Mouse interaction / Repulsion physics
                if (mouse.isHovering) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = 110 + this.radius;

                    if (dist < minDist && dist > 0) {
                        const force = (1 - dist / minDist) * 3.5;
                        const angle = Math.atan2(dy, dx);
                        this.vx += Math.cos(angle) * force;
                        this.vy += Math.sin(angle) * force;
                    }
                }

                if (this.y < -this.radius * 2) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);

                // Outer bubble glow / stroke
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${this.tintHue}, ${this.opacity * 0.85})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();

                // Inner subtle gradient fill
                const grad = ctx.createRadialGradient(
                    -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
                    0, 0, this.radius
                );
                grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.6})`);
                grad.addColorStop(0.5, `rgba(${this.tintHue}, ${this.opacity * 0.2})`);
                grad.addColorStop(1, `rgba(${this.tintHue}, ${this.opacity * 0.05})`);

                ctx.fillStyle = grad;
                ctx.fill();

                // Glossy specular highlight arc (Top-Left)
                ctx.beginPath();
                ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.38, 0.2 * Math.PI, 1.1 * Math.PI, false);
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.95})`;
                ctx.lineWidth = Math.max(1, this.radius * 0.12);
                ctx.lineCap = 'round';
                ctx.stroke();

                // Tiny secondary bottom reflection
                ctx.beginPath();
                ctx.arc(this.radius * 0.25, this.radius * 0.25, this.radius * 0.2, -0.4 * Math.PI, 0.4 * Math.PI, false);
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.4})`;
                ctx.lineWidth = Math.max(0.8, this.radius * 0.08);
                ctx.stroke();

                ctx.restore();
            }
        }

        // ==========================================
        // RIPPLE CLASS (Water Surface Ripples)
        // ==========================================
        class Ripple {
            constructor(x, y, isClick = false) {
                this.x = x;
                this.y = y;
                this.radius = 5;
                this.maxRadius = isClick ? 130 + Math.random() * 40 : 65 + Math.random() * 25;
                this.speed = isClick ? 2.6 : 1.6;
                this.alpha = isClick ? 0.65 : 0.4;
                this.initialAlpha = this.alpha;
                this.lineWidth = isClick ? 2.2 : 1.4;
                this.rings = isClick ? 3 : 2;
            }

            update() {
                this.radius += this.speed;
                this.alpha = (1 - (this.radius / this.maxRadius)) * this.initialAlpha;
            }

            draw() {
                if (this.alpha <= 0.01) return;

                ctx.save();
                for (let i = 0; i < this.rings; i++) {
                    const r = this.radius - i * 14;
                    if (r > 0) {
                        const ringAlpha = this.alpha * (1 - (i * 0.28));
                        ctx.beginPath();
                        ctx.ellipse(this.x, this.y, r, r * 0.55, 0, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(119, 194, 243, ${ringAlpha})`;
                        ctx.lineWidth = Math.max(0.6, this.lineWidth * (1 - this.radius / this.maxRadius));
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

            isDead() {
                return this.radius >= this.maxRadius || this.alpha <= 0.01;
            }
        }

        // ==========================================
        // BURST PARTICLES CLASS
        // ==========================================
        class BurstParticle {
            constructor(x, y, isClick = false) {
                this.x = x;
                this.y = y;
                this.radius = isClick ? 3 + Math.random() * 7 : 2 + Math.random() * 4;
                
                const speed = isClick ? (1.5 + Math.random() * 3.5) : (0.5 + Math.random() * 1.5);
                const angle = Math.random() * Math.PI * 2;
                
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed - (isClick ? 1.2 : 0.6);
                
                this.alpha = 0.7 + Math.random() * 0.3;
                this.decay = isClick ? 0.012 + Math.random() * 0.01 : 0.02 + Math.random() * 0.015;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy -= 0.03;
                this.vx *= 0.96;
                this.alpha -= this.decay;
            }

            draw() {
                if (this.alpha <= 0.01) return;
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(119, 194, 243, ${this.alpha * 0.8})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
                ctx.restore();
            }

            isDead() {
                return this.alpha <= 0.01;
            }
        }

        function initBubbles() {
            bubbles = [];
            const count = Math.min(38, Math.max(18, Math.floor(width / 45)));
            for (let i = 0; i < count; i++) {
                bubbles.push(new Bubble(true));
            }
        }

        // ==========================================
        // SPAWN FISH MOUTH BREATHING BUBBLES
        // ==========================================
        function spawnFishMouthBubbles() {
            if (!fishImg) return;
            const fishRect = fishImg.getBoundingClientRect();
            const heroRect = heroSection.getBoundingClientRect();

            // Fish mouth location: approx 8% from left edge, 48% from top of the fish image
            const mouthX = (fishRect.left - heroRect.left) + fishRect.width * 0.08;
            const mouthY = (fishRect.top - heroRect.top) + fishRect.height * 0.48;

            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const r = 3 + Math.random() * 5;
                    const b = new Bubble(false, mouthX + (Math.random() * 6 - 3), mouthY + (Math.random() * 6 - 3), r, 1.2 + Math.random() * 0.8);
                    b.vx = -0.5 - Math.random() * 1.0; // drifting forward from mouth
                    bubbles.push(b);
                }, i * 180);
            }
        }

        // ==========================================
        // FISH DARTING BEHAVIOR (ON CLICK / INTERACTION)
        // ==========================================
        function triggerFishDart() {
            fish.isDarting = true;
            fish.dartVelocity = 14;
            spawnFishMouthBubbles();

            if (fishImg) {
                const fishRect = fishImg.getBoundingClientRect();
                const heroRect = heroSection.getBoundingClientRect();
                ripples.push(new Ripple(fishRect.left - heroRect.left + fishRect.width * 0.5, fishRect.top - heroRect.top + fishRect.height * 0.5, true));
            }

            setTimeout(() => {
                fish.isDarting = false;
            }, 600);
        }

        if (fishImg) {
            fishImg.addEventListener('click', function (e) {
                e.stopPropagation();
                triggerFishDart();
            });
        }

        // ==========================================
        // SCROLL & MOUSE EVENT LISTENERS
        // ==========================================
        function onScroll() {
            const currentY = window.scrollY || window.pageYOffset;
            const delta = currentY - scrollState.lastY;
            scrollState.velocity = delta;
            scrollState.lastY = currentY;
            scrollState.currentY = currentY;

            const heroHeight = heroSection.offsetHeight || window.innerHeight;
            scrollState.progress = Math.min(1.5, Math.max(0, currentY / heroHeight));
        }

        window.addEventListener('scroll', onScroll, { passive: true });

        function updateMousePos(clientX, clientY) {
            const rect = heroSection.getBoundingClientRect();
            const now = performance.now();
            const newX = clientX - rect.left;
            const newY = clientY - rect.top;

            if (mouse.prevX !== -1000) {
                const dx = newX - mouse.prevX;
                const dy = newY - mouse.prevY;
                mouse.speed = Math.sqrt(dx * dx + dy * dy);

                if (mouse.speed > 8 && (now - mouse.lastMoveTime) > 40 && particles.length < 50) {
                    particles.push(new BurstParticle(newX, newY, false));
                    if (Math.random() > 0.6 && ripples.length < 8) {
                        ripples.push(new Ripple(newX, newY, false));
                    }
                    mouse.lastMoveTime = now;
                }
            }

            mouse.prevX = mouse.x;
            mouse.prevY = mouse.y;
            mouse.x = newX;
            mouse.y = newY;
            mouse.isHovering = true;
        }

        heroSection.addEventListener('mousemove', function (e) {
            updateMousePos(e.clientX, e.clientY);
        }, { passive: true });

        heroSection.addEventListener('mouseenter', function (e) {
            mouse.isHovering = true;
            updateMousePos(e.clientX, e.clientY);
        }, { passive: true });

        heroSection.addEventListener('mouseleave', function () {
            mouse.isHovering = false;
            mouse.x = -1000;
            mouse.y = -1000;
            mouse.prevX = -1000;
            mouse.prevY = -1000;
        }, { passive: true });

        heroSection.addEventListener('touchmove', function (e) {
            if (e.touches && e.touches[0]) {
                updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        heroSection.addEventListener('click', function (e) {
            const rect = heroSection.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            ripples.push(new Ripple(clickX, clickY, true));

            const burstCount = 12 + Math.floor(Math.random() * 6);
            for (let i = 0; i < burstCount; i++) {
                particles.push(new BurstParticle(clickX, clickY, true));
            }
        });

        // Window resize with debounce
        let resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resize();
                initBubbles();
            }, 150);
        }, { passive: true });

        // Intersection Observer
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && !animationFrameId) {
                    render();
                }
            });
        }, { threshold: 0.05 });

        observer.observe(heroSection);

        // Linear interpolation helper
        function lerp(start, end, factor) {
            return start + (end - start) * factor;
        }

        // ==========================================
        // HYDRODYNAMIC FISH SWIMMING PHYSICS UPDATE
        // ==========================================
        function updateFishSwimming(timestamp) {
            if (!fishImg) return;

            // Smooth scroll velocity with decay
            scrollState.smoothVelocity = lerp(scrollState.smoothVelocity, scrollState.velocity, 0.08);
            scrollState.velocity *= 0.92; // decay scroll impulse

            const absScrollVel = Math.abs(scrollState.smoothVelocity);

            // Dynamic swimming tail-beat frequency: accelerates when scrolling or darting
            const baseBeatSpeed = 0.045;
            const scrollMultiplier = Math.min(absScrollVel * 0.012, 0.12);
            const dartMultiplier = fish.isDarting ? 0.15 : 0;
            const currentBeatSpeed = baseBeatSpeed + scrollMultiplier + dartMultiplier;

            fish.phase += currentBeatSpeed;

            // Decay dart velocity
            if (fish.dartVelocity > 0) {
                fish.dartVelocity *= 0.92;
            }

            // Natural Hydrodynamic Undulations:
            // 1. Tail & Fin body wave (sinusoidal angular rotation + skew)
            const tailWagAmplitude = 3.5 + Math.min(absScrollVel * 0.15, 5.0) + (fish.isDarting ? 7.0 : 0);
            const tailAngle = Math.sin(fish.phase) * tailWagAmplitude;
            const skewAngle = Math.cos(fish.phase) * (tailWagAmplitude * 0.6);

            // 2. Buoyancy Floating Oscillations (natural bobbing while treading water)
            const buoyancyY = Math.sin(fish.phase * 0.5) * 14 + Math.cos(fish.phase * 0.25) * 6;
            const buoyancyX = Math.cos(fish.phase * 0.4) * 8;

            // 3. Scroll-Driven Forward & Depth Translation
            // As user scrolls down, fish actively swims forward (leftwards) and dives smoothly
            const p = scrollState.progress;
            const scrollSwimX = -p * (width * 0.16) - (scrollState.smoothVelocity * 0.6) - fish.dartVelocity * 4;
            const scrollSwimY = -p * 60 + buoyancyY;
            const scrollPitchZ = -p * 12 + (scrollState.smoothVelocity * -0.15) + tailAngle;

            // 4. Interactive Mouse Steering
            let mouseSteerRotY = 0;
            let mouseSteerRotX = 0;
            if (mouse.isHovering) {
                const fishRect = fishImg.getBoundingClientRect();
                const heroRect = heroSection.getBoundingClientRect();
                const fishCenterX = fishRect.left - heroRect.left + fishRect.width * 0.4;
                const fishCenterY = fishRect.top - heroRect.top + fishRect.height * 0.5;

                const dx = mouse.x - fishCenterX;
                const dy = mouse.y - fishCenterY;

                // Subtle turning towards cursor
                mouseSteerRotY = Math.max(-10, Math.min(10, dx * 0.015));
                mouseSteerRotX = Math.max(-8, Math.min(8, dy * -0.012));
            }

            // Smooth interpolation (Lerp) for realistic weight & fluid inertia
            fish.x = lerp(fish.x, scrollSwimX + buoyancyX, 0.08);
            fish.y = lerp(fish.y, scrollSwimY, 0.08);
            fish.rotZ = lerp(fish.rotZ, scrollPitchZ, 0.08);
            fish.rotY = lerp(fish.rotY, mouseSteerRotY, 0.06);
            fish.rotX = lerp(fish.rotX, mouseSteerRotX, 0.06);
            fish.skewY = lerp(fish.skewY, skewAngle, 0.1);

            // Apply high-performance 3D GPU Transform
            fishImg.style.transform = `translate3d(${fish.x.toFixed(2)}px, ${fish.y.toFixed(2)}px, 0px) ` +
                                      `rotateZ(${fish.rotZ.toFixed(2)}deg) ` +
                                      `rotateY(${fish.rotY.toFixed(2)}deg) ` +
                                      `rotateX(${fish.rotX.toFixed(2)}deg) ` +
                                      `skewY(${fish.skewY.toFixed(2)}deg) ` +
                                      `scale3d(1, 1, 1)`;

            // Periodic mouth breathing bubbles (every ~4.5 seconds)
            fish.mouthBubbleTimer++;
            if (fish.mouthBubbleTimer > 280) {
                spawnFishMouthBubbles();
                fish.mouthBubbleTimer = 0;
            }

            // Floating Food Pellets Bobbing Physics
            if (pelletsImg) {
                const pelletFloatY = Math.sin(fish.phase * 0.7) * 9 + Math.cos(fish.phase * 0.35) * 4;
                const pelletRot = 10 + Math.sin(fish.phase * 0.5) * 5;
                const pelletScroll = -p * 30;

                pelletsImg.style.transform = `translate3d(0px, ${(pelletFloatY + pelletScroll).toFixed(2)}px, 0px) rotateZ(${pelletRot.toFixed(2)}deg)`;
            }
        }

        // ==========================================
        // MAIN ANIMATION LOOP
        // ==========================================
        function render(timestamp) {
            if (!isVisible) {
                animationFrameId = null;
                return;
            }

            ctx.clearRect(0, 0, width, height);

            // 1. Draw ripples
            for (let i = ripples.length - 1; i >= 0; i--) {
                const rip = ripples[i];
                rip.update();
                rip.draw();
                if (rip.isDead()) {
                    ripples.splice(i, 1);
                }
            }

            // 2. Draw ambient bubbles
            for (let i = 0; i < bubbles.length; i++) {
                bubbles[i].update();
                bubbles[i].draw();
            }

            // 3. Draw burst particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update();
                p.draw();
                if (p.isDead()) {
                    particles.splice(i, 1);
                }
            }

            // 4. Update Swimming Fish & Floating Pellets Physics
            updateFishSwimming(timestamp);

            animationFrameId = requestAnimationFrame(render);
        }

        // Initialize setup & start
        resize();
        initBubbles();
        render();
    }

    // ==========================================
    // ANIMATED STAT COUNTERS ENGINE
    // ==========================================
    function initStatCounters() {
        const statCards = document.querySelectorAll('.stat-card');
        if (!statCards.length) return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const numberEl = card.querySelector('.stat-card_number');
                    if (!numberEl || card.dataset.animated === 'true') return;

                    card.dataset.animated = 'true';
                    const target = parseFloat(card.dataset.target) || 0;
                    const isComma = card.dataset.format === 'comma';
                    const duration = 2200;
                    const startTime = performance.now();

                    function updateCount(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(1, elapsed / duration);
                        // Ease-out cubic for smooth momentum
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const currentVal = Math.floor(easeOut * target);

                        if (isComma) {
                            numberEl.textContent = currentVal.toLocaleString('en-US');
                        } else {
                            numberEl.textContent = currentVal;
                        }

                        if (progress < 1) {
                            requestAnimationFrame(updateCount);
                        } else {
                            numberEl.textContent = isComma ? target.toLocaleString('en-US') : target;
                        }
                    }

                    requestAnimationFrame(updateCount);
                }
            });
        }, { threshold: 0.25 });

        statCards.forEach(card => observer.observe(card));
    }

    // ==========================================
    // LIQUID READING PROGRESS BAR ENGINE
    // ==========================================
    function initLiquidReadingProgress() {
        const progressBar = document.querySelector('.liquid-reading-progress_bar');
        if (!progressBar) return;

        function updateProgress() {
            const scrollY = window.scrollY || window.pageYOffset;
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight <= 0) return;

            const progress = Math.min(100, Math.max(0, (scrollY / totalHeight) * 100));
            progressBar.style.width = progress.toFixed(2) + '%';
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
    }

    // ==========================================
    // FLOATING AQUATIC CHATBOT ENGINE (WHATSAPP +917011976671)
    // ==========================================
    function initFloatingChatbot() {
        if (document.querySelector('.aquatic-chatbot-container')) return;

        const whatsappNumber = "917011976671";
        const container = document.createElement('div');
        container.className = 'aquatic-chatbot-container';
        
        container.innerHTML = `
            <!-- Teaser Greeting Bubble (Hover tooltip) -->
            <div class="aquatic-chat-teaser" id="aquaticChatTeaser">
                <div class="aquatic-chat-teaser-header">
                    <img src="/assets/img/Favicon.webp" alt="JFLEURS" class="aquatic-chat-teaser-avatar">
                    <span class="aquatic-chat-teaser-title">JFLEURS Fish Care</span>
                </div>
                <p class="aquatic-chat-teaser-text">Hi! 🐠 Need advice on the right pellet size or non-clouding formula? Chat with us!</p>
            </div>

            <!-- Chat Window Modal -->
            <div class="aquatic-chat-card" id="aquaticChatCard">
                <div class="aquatic-chat-header">
                    <div class="aquatic-chat-header-info">
                        <div class="aquatic-chat-avatar-wrap">
                            <img src="/assets/img/Favicon.webp" alt="JFLEURS Care">
                            <span class="aquatic-chat-avatar-online"></span>
                        </div>
                        <div>
                            <h4 class="aquatic-chat-title-text">JFLEURS Fish Care</h4>
                            <p class="aquatic-chat-status-text">🟢 Online &bull; Replies in ~2 mins</p>
                        </div>
                    </div>
                    <button class="aquatic-chat-card-close" id="aquaticChatCardClose" aria-label="Close chat">&times;</button>
                </div>

                <div class="aquatic-chat-body">
                    <div class="aquatic-chat-timestamp">Today</div>
                    <div class="aquatic-chat-msg-row">
                        <div class="aquatic-chat-msg-bubble">
                            Hello! 🌊 Welcome to <strong>JFLEURS India</strong>.<br>
                            How can we assist you with your pond fish nutrition today?
                        </div>
                    </div>

                    <div class="aquatic-chat-chips-label">Quick Inquiries:</div>
                    <div class="aquatic-chat-chips-list">
                        <button class="aquatic-chat-chip-btn" data-msg="Hi JFLEURS! I need help choosing the right pellet size (1mm, 2mm, 3mm, 4mm) for my pond fish.">
                            <span>🐠 Which pellet size is right for my fish?</span>
                            <span class="aquatic-chat-chip-arrow">&rarr;</span>
                        </button>
                        <button class="aquatic-chat-chip-btn" data-msg="Hello JFLEURS Team! Could you share more details about your 100% Non-Clouding pond formula & pricing?">
                            <span>✨ How does Non-Clouding formula work?</span>
                            <span class="aquatic-chat-chip-arrow">&rarr;</span>
                        </button>
                        <button class="aquatic-chat-chip-btn" data-msg="Hi JFLEURS! I am interested in placing a Bulk / Wholesale order for pond fish feed.">
                            <span>📦 Bulk / Wholesale pond feed inquiry</span>
                            <span class="aquatic-chat-chip-arrow">&rarr;</span>
                        </button>
                        <button class="aquatic-chat-chip-btn" data-msg="Hello JFLEURS! I would like to consult with a fish nutrition specialist regarding my pond fish care.">
                            <span>💬 Talk to a Fish Nutrition Specialist</span>
                            <span class="aquatic-chat-chip-arrow">&rarr;</span>
                        </button>
                    </div>
                </div>

                <div class="aquatic-chat-footer">
                    <input type="text" class="aquatic-chat-input" id="aquaticChatInput" placeholder="Type your question here..." />
                    <button class="aquatic-chat-send-btn" id="aquaticChatSendBtn" aria-label="Send on WhatsApp">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Floating Toggle Button -->
            <button class="aquatic-chat-toggle" id="aquaticChatToggle" aria-label="Open WhatsApp Chat">
                <span class="aquatic-chat-badge" id="aquaticChatBadge">1</span>
                <!-- WhatsApp SVG -->
                <svg class="aquatic-chat-icon" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M16 2C8.268 2 2 8.268 2 16c0 2.766.804 5.344 2.19 7.514L2.052 29.35a1 1 0 001.218 1.218l5.962-2.112A13.916 13.916 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.43 11.43 0 01-5.836-1.602l-.418-.248-3.796 1.344 1.352-3.722-.27-.43A11.455 11.455 0 014.5 16C4.5 9.659 9.659 4.5 16 4.5S27.5 9.659 27.5 16 22.341 27.5 16 27.5zm6.65-8.623c-.365-.183-2.16-1.066-2.495-1.188-.335-.122-.578-.183-.822.183-.244.366-.944 1.188-1.157 1.432-.213.244-.426.274-.791.091-.366-.183-1.545-.57-2.943-1.816-1.088-.97-1.823-2.168-2.036-2.534-.213-.366-.023-.564.16-.746.165-.164.366-.426.549-.639.183-.213.244-.366.366-.609.122-.244.061-.457-.03-.64-.092-.183-.823-1.98-1.127-2.712-.296-.713-.598-.616-.822-.628l-.701-.012c-.244 0-.64.091-.975.457-.335.366-1.28 1.25-1.28 3.048s1.31 3.535 1.493 3.779c.183.244 2.578 3.937 6.246 5.522.872.378 1.553.603 2.083.772.876.278 1.673.239 2.303.145.703-.105 2.16-.883 2.465-1.737.305-.853.305-1.584.213-1.737-.091-.152-.335-.244-.7-.427z"/>
                </svg>
                <!-- Close SVG -->
                <svg class="aquatic-chat-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span class="aquatic-chat-status-dot"></span>
            </button>
        `;

        document.body.appendChild(container);

        const toggleBtn = container.querySelector('#aquaticChatToggle');
        const teaser = container.querySelector('#aquaticChatTeaser');
        const cardClose = container.querySelector('#aquaticChatCardClose');
        const badge = container.querySelector('#aquaticChatBadge');
        const input = container.querySelector('#aquaticChatInput');
        const sendBtn = container.querySelector('#aquaticChatSendBtn');
        const chips = container.querySelectorAll('.aquatic-chat-chip-btn');

        function openWhatsApp(message) {
            const finalMsg = message && message.trim().length > 0 
                ? message.trim() 
                : "Hello JFLEURS Team! I would like more information regarding your pond fish food products.";
            const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMsg)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }

        // Click teaser to open chat
        teaser.addEventListener('click', () => {
            container.classList.add('is-open');
            if (badge) badge.style.display = 'none';
            setTimeout(() => input.focus(), 200);
        });

        // Toggle chat open/close
        toggleBtn.addEventListener('click', () => {
            const isOpen = container.classList.toggle('is-open');
            if (isOpen) {
                if (badge) badge.style.display = 'none';
                setTimeout(() => input.focus(), 200);
            }
        });

        // Close button inside card
        cardClose.addEventListener('click', () => {
            container.classList.remove('is-open');
        });

        // Quick inquiry chip click
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const msg = chip.getAttribute('data-msg');
                openWhatsApp(msg);
            });
        });

        // Send custom input
        function handleSend() {
            const val = input.value;
            if (val.trim()) {
                openWhatsApp(`Hello JFLEURS Team! Inquiry: ${val}`);
                input.value = '';
                container.classList.remove('is-open');
            } else {
                openWhatsApp();
            }
        }

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSend();
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (container.classList.contains('is-open') && !container.contains(e.target)) {
                container.classList.remove('is-open');
            }
        });
    }

    // ==========================================================================
    // ELEGANT BRAND LOGO PRELOADER CONTROLLER
    // ==========================================================================
    function initPreloader() {
        const preloader = document.getElementById('aquapetsPreloader');
        if (!preloader) return;

        const startTime = (window.__aquapetsPreloaderStartTime) || Date.now();
        const minDisplayTime = 2000; // 2 seconds logo preloader duration
        const maxSafetyTimeout = 3000; // Resilient fallback timeout
        let isDismissed = false;

        function dismissPreloader() {
            if (isDismissed) return;
            isDismissed = true;

            const elapsedTime = Date.now() - startTime;
            const remainingDelay = Math.max(0, minDisplayTime - elapsedTime);

            setTimeout(() => {
                preloader.classList.add('is-loaded');
                document.body.classList.remove('aquapets-preloader-active');

                // Cleanup from DOM after transition completes to preserve memory
                setTimeout(() => {
                    preloader.style.display = 'none';
                    preloader.setAttribute('aria-hidden', 'true');
                }, 750);
            }, remainingDelay);
        }

        // Add preloader active class to lock scroll during entrance
        document.body.classList.add('aquapets-preloader-active');

        // Dismiss smoothly when page is fully ready
        if (document.readyState === 'complete') {
            dismissPreloader();
        } else {
            window.addEventListener('load', dismissPreloader);
        }

        // Fallback safety timeout
        setTimeout(dismissPreloader, maxSafetyTimeout);
    }

    // ==========================================================================
    // REALISTIC SWIMMING FISH CURSOR ENGINE
    // ==========================================================================
    function initFishCursor() {
        // Only initialize on desktop devices with a fine pointer (mouse/trackpad)
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
            return;
        }

        let cursorWrap = document.getElementById('aquaticFishCursor');
        if (!cursorWrap) {
            cursorWrap = document.createElement('div');
            cursorWrap.id = 'aquaticFishCursor';
            cursorWrap.className = 'aquatic-fish-cursor-wrap';
            cursorWrap.setAttribute('aria-hidden', 'true');
            cursorWrap.innerHTML = `
                <div class="fish-cursor-inner">
                    <svg class="fish-svg" viewBox="0 0 70 36" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="fishBodyGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                                <stop offset="0%" stop-color="#ff3b1e" />
                                <stop offset="30%" stop-color="#ff6b35" />
                                <stop offset="65%" stop-color="#ff9950" />
                                <stop offset="90%" stop-color="#ffffff" />
                                <stop offset="100%" stop-color="#ff6b35" />
                            </linearGradient>
                            <linearGradient id="fishBellyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                                <stop offset="0%" stop-color="#ff6b35" stop-opacity="0.9" />
                                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.95" />
                                <stop offset="100%" stop-color="#e03010" stop-opacity="0.9" />
                            </linearGradient>
                            <linearGradient id="fishFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="rgba(255, 255, 255, 0.95)" />
                                <stop offset="60%" stop-color="rgba(255, 120, 80, 0.75)" />
                                <stop offset="100%" stop-color="rgba(239, 84, 56, 0.4)" />
                            </linearGradient>
                            <filter id="fishGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#ff6b35" flood-opacity="0.45" />
                                <feDropShadow dx="0" dy="1" stdDeviation="5" flood-color="#00d2ff" flood-opacity="0.3" />
                            </filter>
                        </defs>

                        <!-- Dorsal Fin Top -->
                        <path class="fish-dorsal" d="M 36,13 Q 26,6 18,11 Q 28,14 36,13 Z" fill="url(#fishFinGrad)" />

                        <!-- Pectoral Fin Left -->
                        <path class="fish-fin-left" id="fishFinLeft" d="M 42,14 Q 45,4 35,5 Q 37,12 42,14 Z" fill="url(#fishFinGrad)" />
                        
                        <!-- Pectoral Fin Right -->
                        <path class="fish-fin-right" id="fishFinRight" d="M 42,22 Q 45,32 35,31 Q 37,24 42,22 Z" fill="url(#fishFinGrad)" />

                        <!-- Articulated Swimming Tail -->
                        <g class="fish-tail-group" id="fishTailGroup">
                            <path d="M 22,14 Q 14,15 10,18 Q 14,21 22,22 Z" fill="url(#fishBodyGrad)" />
                            <path class="fish-caudal" d="M 11,18 C 5,8 -2,10 0,18 C -2,26 5,28 11,18 Z" fill="url(#fishFinGrad)" />
                            <path d="M 10,18 Q 2,12 1,18 Q 2,24 10,18 Z" fill="rgba(255, 255, 255, 0.6)" />
                        </g>

                        <!-- Main Hydrodynamic Fish Body -->
                        <path class="fish-main-body" d="M 62,18 C 58,11 48,10 32,12 C 24,13 18,15 18,18 C 18,21 24,23 32,24 C 48,26 58,25 62,18 Z" fill="url(#fishBodyGrad)" filter="url(#fishGlow)" />
                        
                        <!-- 3D Belly Shimmer -->
                        <path d="M 58,18 C 52,13 42,13 32,14 C 26,15 22,17 22,18 C 22,19 26,21 32,22 C 42,23 52,23 58,18 Z" fill="url(#fishBellyGrad)" opacity="0.85" />

                        <!-- Realistic Gills & Koi Accents -->
                        <path d="M 48,13 Q 50,18 48,23" fill="none" stroke="rgba(255, 255, 255, 0.65)" stroke-width="1.2" stroke-linecap="round" />
                        <path d="M 44,14 Q 46,18 44,22" fill="none" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1" stroke-linecap="round" />

                        <!-- Eyes -->
                        <circle cx="54" cy="14.5" r="2.2" fill="#1a1a1a" />
                        <circle cx="54.6" cy="14" r="0.8" fill="#ffffff" />
                        
                        <circle cx="54" cy="21.5" r="2.2" fill="#1a1a1a" />
                        <circle cx="54.6" cy="21" r="0.8" fill="#ffffff" />

                        <!-- Precision Target Dot at Mouth -->
                        <circle class="fish-mouth-dot" cx="62" cy="18" r="1.5" fill="#ffffff" />
                    </svg>
                </div>
            `;
            document.body.appendChild(cursorWrap);
        }

        const tailGroup = cursorWrap.querySelector('#fishTailGroup');
        const finLeft = cursorWrap.querySelector('#fishFinLeft');
        const finRight = cursorWrap.querySelector('#fishFinRight');

        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let fishX = targetX;
        let fishY = targetY;
        let currentAngle = 0;
        let targetAngle = 0;
        let tailPhase = 0;
        let isInitialized = false;
        let lastBubbleTime = 0;

        function render() {
            const dx = targetX - fishX;
            const dy = targetY - fishY;
            const dist = Math.hypot(dx, dy);

            // Smooth hydrodynamic lerping
            fishX += dx * 0.22;
            fishY += dy * 0.22;

            if (dist > 1.2) {
                targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            }

            // Shortest angle wrap-around interpolation
            let diff = targetAngle - currentAngle;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;
            currentAngle += diff * 0.26;

            // Swimming tail & fin oscillation based on speed
            tailPhase += 0.12 + Math.min(dist * 0.035, 0.45);
            const tailAngle = Math.sin(tailPhase) * (14 + Math.min(dist * 0.65, 26));
            const finAngle = Math.cos(tailPhase * 1.2) * (10 + Math.min(dist * 0.35, 18));

            cursorWrap.style.transform = `translate3d(${fishX}px, ${fishY}px, 0) rotate(${currentAngle}deg)`;
            if (tailGroup) tailGroup.style.transform = `rotate(${tailAngle}deg)`;
            if (finLeft) finLeft.style.transform = `rotate(${finAngle}deg)`;
            if (finRight) finRight.style.transform = `rotate(${-finAngle}deg)`;

            // Micro swimming bubble trail when swimming
            const now = Date.now();
            if (dist > 6 && now - lastBubbleTime > 140) {
                lastBubbleTime = now;
                const rad = currentAngle * Math.PI / 180;
                const tailX = fishX - Math.cos(rad) * 32;
                const tailY = fishY - Math.sin(rad) * 32;
                spawnCursorBubble(tailX, tailY);
            }

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);

        function spawnCursorBubble(x, y) {
            const bubble = document.createElement('div');
            bubble.className = 'aquatic-cursor-bubble';
            const size = Math.random() * 5 + 4;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${x}px`;
            bubble.style.top = `${y}px`;
            document.body.appendChild(bubble);
            setTimeout(() => {
                if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
            }, 550);
        }

        function spawnWaterRipple(x, y) {
            const ripple = document.createElement('div');
            ripple.className = 'aquatic-cursor-ripple';
            const size = 36;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            document.body.appendChild(ripple);
            setTimeout(() => {
                if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }, 550);
        }

        // Pointer move tracking
        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            if (!isInitialized) {
                fishX = targetX;
                fishY = targetY;
                isInitialized = true;
            }
            cursorWrap.classList.add('is-visible');
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            cursorWrap.classList.remove('is-visible');
        });

        document.addEventListener('mouseenter', () => {
            cursorWrap.classList.add('is-visible');
        });

        // Click / Active feedback
        window.addEventListener('mousedown', (e) => {
            cursorWrap.classList.add('is-active');
            spawnWaterRipple(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            cursorWrap.classList.remove('is-active');
        });

        // Interactive hover states on clickable targets
        document.addEventListener('mouseover', (e) => {
            const interactiveEl = e.target.closest('a, button, input, textarea, select, [role="button"], .w-button, .w-dropdown-toggle, .navbar_link, .footer_link, .product_card, .hero-stat-card, .tab-link');
            if (interactiveEl) {
                cursorWrap.classList.add('is-hovering');
            }
        }, { passive: true });

        document.addEventListener('mouseout', (e) => {
            const interactiveEl = e.target.closest('a, button, input, textarea, select, [role="button"], .w-button, .w-dropdown-toggle, .navbar_link, .footer_link, .product_card, .hero-stat-card, .tab-link');
            if (interactiveEl) {
                cursorWrap.classList.remove('is-hovering');
            }
        }, { passive: true });
    }

    // Auto-initialize when DOM is ready
    function startApp() {
        initPreloader();
        initFishCursor();
        initHeroAquatic();
        initStatCounters();
        initLiquidReadingProgress();
        initFloatingChatbot();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }
})();


