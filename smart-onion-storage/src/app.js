/**
 * Master Application Coordinator, First-Person Engine & User Interface
 */
class SmartStorageApp {
    constructor() {
        this.container = document.getElementById("canvas-container");
        this.sim = new StorageSimulationEngine();

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.sceneBuilder = null;

        this.moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.clock = new THREE.Clock();

        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.hoveredObject = null;
        this.isOverview = false;
        this.inspectionLightActive = false;

        this.initThree();
        this.initEventListeners();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0e1318);
        this.scene.fog = new THREE.FogExp2(0x0e1318, 0.035);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, STORAGE_CONFIG.PLAYER.EYE_HEIGHT, 7.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(this.ambientLight);

        this.ceilingLights = new THREE.Group();
        const lightPositions = [
            [-3, 4.2, -4], [3, 4.2, -4],
            [-3, 4.2, 4], [3, 4.2, 4]
        ];
        lightPositions.forEach(([x, y, z]) => {
            const pLight = new THREE.PointLight(0xffeedd, 0.65, 12);
            pLight.position.set(x, y, z);
            this.ceilingLights.add(pLight);
        });
        this.scene.add(this.ceilingLights);

        this.controls = new THREE.PointerLockControls(this.camera, document.body);
        this.sceneBuilder = new StorageSceneBuilder(this.scene);
    }

    initEventListeners() {
        const blocker = document.getElementById("blocker");
        const btnEnter = document.getElementById("btn-enter");

        btnEnter.addEventListener("click", () => {
            this.controls.lock();
        });

        this.controls.addEventListener("lock", () => {
            blocker.style.display = "none";
        });

        this.controls.addEventListener("unlock", () => {
            blocker.style.display = "none";
        });

        window.addEventListener("keydown", (e) => this.onKeyDown(e));
        window.addEventListener("keyup", (e) => this.onKeyUp(e));
        window.addEventListener("resize", () => this.onWindowResize());

        // Separate canvas 3D clicks from DOM clicks
        window.addEventListener("click", (e) => {
            if (
                e.target.closest("#dashboard-panel") ||
                e.target.closest("#inspector-modal") ||
                e.target.closest("#top-bar") ||
                e.target.closest("#blocker")
            ) {
                return;
            }

            if (this.controls.isLocked) {
                this.onClick();
            } else if (!this.isOverview) {
                this.controls.lock();
            }
        });

        // Top Header Buttons
        document.getElementById("btn-view-toggle").addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleCameraMode();
        });

        document.getElementById("btn-light-toggle").addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleInspectionLight();
        });

        document.getElementById("btn-door-toggle").addEventListener("click", (e) => {
            e.stopPropagation();
            this.sceneBuilder.toggleDoor();
        });

        // Auto / Manual Mode Toggle
        document.getElementById("btn-mode-toggle").addEventListener("click", (e) => {
            e.stopPropagation();
            this.sim.mode = this.sim.mode === "AUTO" ? "MANUAL" : "AUTO";
            e.target.innerText = `MODE: ${this.sim.mode}`;
        });

        // Stage Toggle
        document.getElementById("btn-stage-toggle").addEventListener("click", (e) => {
            e.stopPropagation();
            const nextStage = this.sim.stage === "COLD_STORAGE" ? "CURING" : "COLD_STORAGE";
            this.sim.setStage(nextStage);
            e.target.innerText = nextStage === "COLD_STORAGE" ? "SWITCH TO CURING" : "SWITCH TO COLD STORAGE";

            const badge = document.getElementById("stage-badge");
            badge.innerText = `STAGE: ${nextStage.replace("_", " ")}`;
            badge.className = `badge ${nextStage === "COLD_STORAGE" ? "cold-stage" : "curing-stage"}`;

            document.getElementById("target-temp-lbl").innerText = nextStage === "COLD_STORAGE" ? "Target: 0.0 - 2.0°C" : "Target: 25.0 - 30.0°C";
            document.getElementById("target-rh-lbl").innerText = nextStage === "COLD_STORAGE" ? "Target: 65.0 - 70.0%" : "Target: 60.0 - 70.0%";
        });

        // Scenario Demo Buttons
        document.querySelectorAll(".btn-scenario").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const scenario = e.target.getAttribute("data-scenario");
                this.sim.triggerScenario(scenario);
            });
        });

        // Inspector Close
        document.getElementById("btn-close-inspect").addEventListener("click", (e) => {
            e.stopPropagation();
            document.getElementById("inspector-modal").classList.add("hidden");
        });
    }

    onKeyDown(e) {
        switch (e.code) {
            case "KeyW": this.moveState.forward = true; break;
            case "KeyS": this.moveState.backward = true; break;
            case "KeyA": this.moveState.left = true; break;
            case "KeyD": this.moveState.right = true; break;
            case "ShiftLeft":
            case "ShiftRight": this.moveState.sprint = true; break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case "KeyW": this.moveState.forward = false; break;
            case "KeyS": this.moveState.backward = false; break;
            case "KeyA": this.moveState.left = false; break;
            case "KeyD": this.moveState.right = false; break;
            case "ShiftLeft":
            case "ShiftRight": this.moveState.sprint = false; break;
        }
    }

    toggleCameraMode() {
        this.isOverview = !this.isOverview;
        if (this.isOverview) {
            this.controls.unlock();
            this.camera.position.set(0, 16, 14);
            this.camera.lookAt(0, 1.5, 0);
        } else {
            this.camera.position.set(0, STORAGE_CONFIG.PLAYER.EYE_HEIGHT, 7.5);
            this.controls.lock();
        }
    }

    toggleInspectionLight() {
        this.inspectionLightActive = !this.inspectionLightActive;
        this.ambientLight.intensity = this.inspectionLightActive ? 0.9 : 0.35;
        this.ceilingLights.children.forEach(light => {
            light.intensity = this.inspectionLightActive ? 1.6 : 0.65;
        });
    }

    updateMovement(delta) {
        if (!this.controls.isLocked || this.isOverview) return;

        const speed = this.moveState.sprint ? STORAGE_CONFIG.PLAYER.SPRINT_SPEED : STORAGE_CONFIG.PLAYER.WALK_SPEED;
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
        this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
        this.direction.normalize();

        if (this.moveState.forward || this.moveState.backward) this.velocity.z -= this.direction.z * speed * 8.0 * delta;
        if (this.moveState.left || this.moveState.right) this.velocity.x -= this.direction.x * speed * 8.0 * delta;

        const prevPos = this.camera.position.clone();

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);

        this.camera.position.y = STORAGE_CONFIG.PLAYER.EYE_HEIGHT;

        const playerRadius = STORAGE_CONFIG.PLAYER.RADIUS;
        const playerBox = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - playerRadius, 0, this.camera.position.z - playerRadius),
            new THREE.Vector3(this.camera.position.x + playerRadius, 2.0, this.camera.position.z + playerRadius)
        );

        for (let collider of this.sceneBuilder.colliders) {
            if (playerBox.intersectsBox(collider)) {
                this.camera.position.copy(prevPos);
                this.velocity.set(0, 0, 0);
                break;
            }
        }
    }

    updateRaycasting() {
        this.raycaster.setFromCamera(this.centerScreen, this.camera);
        const intersects = this.raycaster.intersectObjects(this.sceneBuilder.interactiveObjects, true);

        const reticle = document.getElementById("reticle");
        const hoverTag = document.getElementById("hover-tag");

        if (intersects.length > 0 && intersects[0].distance < 4.5) {
            const obj = intersects[0].object;
            const data = obj.userData;
            this.hoveredObject = data;

            reticle.classList.add("active");
            hoverTag.style.opacity = "1";
            hoverTag.innerText = data.name || data.id || "INTERACTIVE OBJECT";
        } else {
            this.hoveredObject = null;
            reticle.classList.remove("active");
            hoverTag.style.opacity = "0";
        }
    }

    onClick() {
        if (!this.hoveredObject) return;
        const modal = document.getElementById("inspector-modal");
        const title = document.getElementById("inspect-title");
        const content = document.getElementById("inspect-content");
        const data = this.hoveredObject;

        title.innerText = data.name || "OBJECT TELEMETRY";
        modal.classList.remove("hidden");

        if (data.type === "ONION") {
            content.innerHTML = `
        <div class="inspect-row"><span class="inspect-label">Entity:</span><span class="inspect-value">${data.id}</span></div>
        <div class="inspect-row"><span class="inspect-label">Location:</span><span class="inspect-value">${data.shelf}</span></div>
        <div class="inspect-row"><span class="inspect-label">Storage Age:</span><span class="inspect-value">${data.ageDays} Days</span></div>
        <div class="inspect-row"><span class="inspect-label">Bulb Weight:</span><span class="inspect-value">${data.weightGrams}g</span></div>
        <div class="inspect-row"><span class="inspect-label">Skin Integrity:</span><span class="inspect-value">Firm / Cured</span></div>
        <div class="inspect-row"><span class="inspect-label">Local Spoilage Risk:</span><span class="inspect-value">${this.sim.state.spoilageRisk.toFixed(1)}%</span></div>
      `;
        } else if (data.type === "SHELF") {
            const rackStats = this.sim.getRackReading(data.rackId);
            content.innerHTML = `
        <div class="inspect-row"><span class="inspect-label">Rack Section:</span><span class="inspect-value">${data.rackId}</span></div>
        <div class="inspect-row"><span class="inspect-label">Shelf Number:</span><span class="inspect-value">${data.shelfIndex}</span></div>
        <div class="inspect-row"><span class="inspect-label">Onions Stored:</span><span class="inspect-value">32 Units</span></div>
        <div class="inspect-row"><span class="inspect-label">Shelf Temperature:</span><span class="inspect-value">${rackStats.temperature}°C</span></div>
        <div class="inspect-row"><span class="inspect-label">Shelf RH:</span><span class="inspect-value">${rackStats.relativeHumidity}%</span></div>
        <div class="inspect-row"><span class="inspect-label">Condition:</span><span class="inspect-value" style="color:var(--success)">${rackStats.status}</span></div>
      `;
        } else if (data.type === "FAN") {
            content.innerHTML = `
        <div class="inspect-row"><span class="inspect-label">Fan ID:</span><span class="inspect-value">${data.id}</span></div>
        <div class="inspect-row"><span class="inspect-label">Operational Speed:</span><span class="inspect-value">${this.sim.state.fanSpeed.toFixed(0)}%</span></div>
        <div class="inspect-row"><span class="inspect-label">Air Velocity:</span><span class="inspect-value">${this.sim.state.airVelocity.toFixed(2)} m/s</span></div>
        <div class="inspect-row"><span class="inspect-label">State:</span><span class="inspect-value">${this.sim.state.fanSpeed > 0 ? 'ACTIVE (Venting)' : 'IDLE'}</span></div>
      `;
        } else if (data.type === "DOOR") {
            this.sceneBuilder.toggleDoor();
            content.innerHTML = `<p>Door status toggled.</p>`;
        } else {
            content.innerHTML = `
        <div class="inspect-row"><span class="inspect-label">Device:</span><span class="inspect-value">${data.id}</span></div>
        <div class="inspect-row"><span class="inspect-label">Status:</span><span class="inspect-value">ONLINE / MONITORING</span></div>
        <div class="inspect-row"><span class="inspect-label">Last Transmission:</span><span class="inspect-value">0.1s ago</span></div>
      `;
        }
    }

    updateUI() {
        const s = this.sim.state;
        document.getElementById("quick-temp").innerText = `${s.temperature.toFixed(1)}°C`;
        document.getElementById("quick-rh").innerText = `${s.relativeHumidity.toFixed(1)}%`;
        document.getElementById("quick-af").innerText = `${s.airVelocity.toFixed(2)} m/s`;
        document.getElementById("quick-co2").innerText = `${Math.round(s.co2)} ppm`;

        const riskLabel = document.getElementById("quick-risk");
        riskLabel.innerText = `${s.spoilageRisk < 8 ? 'LOW' : s.spoilageRisk < 18 ? 'MODERATE' : 'HIGH'} (${s.spoilageRisk.toFixed(1)}%)`;
        riskLabel.className = `stat-val ${s.spoilageRisk < 8 ? 'risk-low' : 'risk-warn'}`;

        document.getElementById("dash-temp").innerText = `${s.temperature.toFixed(1)}°C`;
        document.getElementById("dash-rh").innerText = `${s.relativeHumidity.toFixed(1)}%`;
        document.getElementById("dash-af").innerText = `${s.airVelocity.toFixed(2)} m/s`;
        document.getElementById("dash-co2").innerText = `${Math.round(s.co2)} ppm`;
        document.getElementById("dash-cond").innerText = `${s.condensationRisk > 0 ? s.condensationRisk.toFixed(0) + '%' : 'NONE (0%)'}`;
        document.getElementById("dash-risk").innerText = `${s.spoilageRisk.toFixed(1)}%`;

        document.getElementById("bar-cooling").style.width = `${s.coolingLoad}%`;
        document.getElementById("txt-cooling").innerText = `${Math.round(s.coolingLoad)}%`;
        document.getElementById("bar-vent").style.width = `${s.fanSpeed}%`;
        document.getElementById("txt-vent").innerText = `${Math.round(s.fanSpeed)}%`;
        document.getElementById("bar-dehum").style.width = `${s.dehumidifierActive ? 100 : 0}%`;
        document.getElementById("txt-dehum").innerText = s.dehumidifierActive ? "ACTIVE" : "OFF";

        document.getElementById("ai-recommendation").innerText = this.sim.aiAdvice;
        const statusPill = document.getElementById("system-status-pill");
        if (s.spoilageRisk > 20 || s.condensationRisk > 50) {
            statusPill.innerText = "CRITICAL";
            statusPill.className = "pill pill-danger";
        } else if (s.spoilageRisk > 8 || s.temperature > 3.0) {
            statusPill.innerText = "WARNING";
            statusPill.className = "pill pill-warn";
        } else {
            statusPill.innerText = "OPTIMAL";
            statusPill.className = "pill pill-optimal";
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();

        this.sim.update(delta);
        this.updateMovement(delta);
        this.sceneBuilder.updateAnimations(delta, this.sim.state);
        this.updateRaycasting();
        this.updateUI();

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new SmartStorageApp();
});