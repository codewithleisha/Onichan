/**
 * 3D Industrial Storage Scene, Structural Shelving & Equipment
 */
class StorageSceneBuilder {
    constructor(scene) {
        this.scene = scene;
        this.interactiveObjects = [];
        this.fans = [];
        this.airflowParticles = null;
        this.door = null;
        this.doorOpen = false;
        this.colliders = [];

        this.materials = this.createMaterials();
        this.buildArchitecture();
        this.buildRacksAndOnions();
        this.buildHVACAndEquipment();
        this.buildSensors();
        this.buildVisualAirflow();
    }

    createMaterials() {
        return {
            concreteFloor: new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.7, metalness: 0.1 }),
            insulatedWall: new THREE.MeshStandardMaterial({ color: 0xd6d9dc, roughness: 0.8, metalness: 0.05 }),
            metalRack: new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.4, metalness: 0.8 }),
            galvanizedDuct: new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.3, metalness: 0.7 }),
            fanBlades: new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.2, metalness: 0.5 }),
            sensorHousing: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 }),
            sensorLens: new THREE.MeshBasicMaterial({ color: 0x10b981 }),
            onionSkin1: new THREE.MeshStandardMaterial({ color: 0xc87d3b, roughness: 0.55, metalness: 0.05 }),
            onionSkin2: new THREE.MeshStandardMaterial({ color: 0xb56529, roughness: 0.6, metalness: 0.05 }),
            onionSkin3: new THREE.MeshStandardMaterial({ color: 0xd99b59, roughness: 0.5, metalness: 0.05 }),
            onionStem: new THREE.MeshStandardMaterial({ color: 0x825a2c, roughness: 0.9 })
        };
    }

    buildArchitecture() {
        const W = STORAGE_CONFIG.ROOM.WIDTH;
        const L = STORAGE_CONFIG.ROOM.LENGTH;
        const H = STORAGE_CONFIG.ROOM.HEIGHT;

        const floorGeo = new THREE.PlaneGeometry(W, L);
        const floor = new THREE.Mesh(floorGeo, this.materials.concreteFloor);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const ceiling = new THREE.Mesh(floorGeo, this.materials.insulatedWall);
        ceiling.position.y = H;
        ceiling.rotation.x = Math.PI / 2;
        this.scene.add(ceiling);

        const wallMat = this.materials.insulatedWall;
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
        backWall.position.set(0, H / 2, -L / 2);
        this.scene.add(backWall);

        const frontWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 1.2, H), wallMat);
        frontWallLeft.position.set(-(W / 4 + 0.6), H / 2, L / 2);
        frontWallLeft.rotation.y = Math.PI;
        this.scene.add(frontWallLeft);

        const frontWallRight = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 1.2, H), wallMat);
        frontWallRight.position.set((W / 4 + 0.6), H / 2, L / 2);
        frontWallRight.rotation.y = Math.PI;
        this.scene.add(frontWallRight);

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
        leftWall.position.set(-W / 2, H / 2, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
        rightWall.position.set(W / 2, H / 2, 0);
        rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(rightWall);

        const doorGroup = new THREE.Group();
        doorGroup.position.set(-1.2, 0, L / 2);
        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.1), this.materials.metalRack);
        doorPanel.position.set(1.2, 1.6, 0);
        doorGroup.add(doorPanel);
        doorGroup.userData = { type: "DOOR", id: "MAIN_DOOR", name: "Heavy Insulated Access Door" };
        this.scene.add(doorGroup);
        this.door = doorGroup;
        this.interactiveObjects.push(doorPanel);

        this.colliders.push(new THREE.Box3(new THREE.Vector3(-W / 2, 0, -L / 2 - 1), new THREE.Vector3(W / 2, H, -L / 2)));
        this.colliders.push(new THREE.Box3(new THREE.Vector3(-W / 2 - 1, 0, -L / 2), new THREE.Vector3(-W / 2, H, L / 2)));
        this.colliders.push(new THREE.Box3(new THREE.Vector3(W / 2, 0, -L / 2), new THREE.Vector3(W / 2 + 1, H, L / 2)));
    }

    buildRacksAndOnions() {
        STORAGE_CONFIG.RACKS.forEach((rackConf) => {
            const rackGroup = new THREE.Group();
            rackGroup.position.set(rackConf.x, 0, rackConf.z);

            const rackW = 2.4;
            const rackD = 5.0;
            const rackH = 3.6;
            const shelfCount = rackConf.shelves;
            const shelfSpacing = rackH / shelfCount;

            const postGeo = new THREE.BoxGeometry(0.08, rackH, 0.08);
            const postPositions = [
                [-rackW / 2, rackH / 2, -rackD / 2], [rackW / 2, rackH / 2, -rackD / 2],
                [-rackW / 2, rackH / 2, rackD / 2], [rackW / 2, rackH / 2, rackD / 2],
                [-rackW / 2, rackH / 2, 0], [rackW / 2, rackH / 2, 0]
            ];
            postPositions.forEach(([px, py, pz]) => {
                const post = new THREE.Mesh(postGeo, this.materials.metalRack);
                post.position.set(px, py, pz);
                rackGroup.add(post);
            });

            for (let s = 0; s < shelfCount; s++) {
                const shelfY = 0.4 + s * shelfSpacing;
                const shelfMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(rackW - 0.05, 0.05, rackD - 0.05),
                    this.materials.metalRack
                );
                shelfMesh.position.set(0, shelfY, 0);
                shelfMesh.userData = {
                    type: "SHELF",
                    rackId: rackConf.id,
                    shelfIndex: s + 1,
                    name: `Rack ${rackConf.id} — Shelf 0${s + 1}`
                };
                rackGroup.add(shelfMesh);
                this.interactiveObjects.push(shelfMesh);

                this.populateShelfWithOnions(rackGroup, rackConf.id, s + 1, shelfY + 0.03, rackW - 0.2, rackD - 0.2);
            }

            this.scene.add(rackGroup);

            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(rackConf.x - rackW / 2 - 0.1, 0, rackConf.z - rackD / 2 - 0.1),
                new THREE.Vector3(rackConf.x + rackW / 2 + 0.1, rackH, rackConf.z + rackD / 2 + 0.1)
            ));
        });
    }

    populateShelfWithOnions(parentGroup, rackId, shelfNum, yPos, width, depth) {
        const rows = 4;
        const cols = 8;
        const xStep = width / cols;
        const zStep = depth / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const onionGroup = new THREE.Group();
                const posX = -width / 2 + (c + 0.5) * xStep + (Math.random() - 0.5) * 0.06;
                const posZ = -depth / 2 + (r + 0.5) * zStep + (Math.random() - 0.5) * 0.06;

                const bulbScale = 0.09 + Math.random() * 0.025;
                const bulbGeo = new THREE.SphereGeometry(bulbScale, 16, 14);
                bulbGeo.scale(1.0, 1.15, 1.0);

                const skinMats = [this.materials.onionSkin1, this.materials.onionSkin2, this.materials.onionSkin3];
                const chosenMat = skinMats[Math.floor(Math.random() * skinMats.length)];
                const bulbMesh = new THREE.Mesh(bulbGeo, chosenMat);
                bulbMesh.position.y = bulbScale * 1.05;
                bulbMesh.castShadow = true;
                onionGroup.add(bulbMesh);

                const stemGeo = new THREE.ConeGeometry(bulbScale * 0.22, 0.06, 8);
                const stemMesh = new THREE.Mesh(stemGeo, this.materials.onionStem);
                stemMesh.position.y = bulbScale * 2.15;
                stemMesh.rotation.z = (Math.random() - 0.5) * 0.35;
                onionGroup.add(stemMesh);

                onionGroup.position.set(posX, yPos, posZ);
                onionGroup.rotation.y = Math.random() * Math.PI * 2;

                const onionId = `${rackId}-S0${shelfNum}-O${(r * cols + c + 1).toString().padStart(2, '0')}`;
                onionGroup.userData = {
                    type: "ONION",
                    id: onionId,
                    name: `Cured Allium Cepa (${onionId})`,
                    shelf: `Rack ${rackId} - Shelf 0${shelfNum}`,
                    ageDays: 35 + Math.floor(Math.random() * 15),
                    weightGrams: 140 + Math.floor(Math.random() * 60)
                };

                parentGroup.add(onionGroup);
                this.interactiveObjects.push(bulbMesh);
                bulbMesh.userData = onionGroup.userData;
            }
        }
    }

    buildHVACAndEquipment() {
        const chillerGroup = new THREE.Group();
        chillerGroup.position.set(0, 3.8, -STORAGE_CONFIG.ROOM.LENGTH / 2 + 0.6);
        const chillerBody = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 0.8), this.materials.galvanizedDuct);
        chillerGroup.add(chillerBody);
        chillerGroup.userData = { type: "COOLER", id: "EVAP_01", name: "Industrial Evaporator Coil Unit" };
        this.scene.add(chillerGroup);
        this.interactiveObjects.push(chillerBody);
        chillerBody.userData = chillerGroup.userData;

        const fanPositions = [
            { id: "F01", x: -4.0, y: 3.6, z: STORAGE_CONFIG.ROOM.LENGTH / 2 - 0.1 },
            { id: "F02", x: 4.0, y: 3.6, z: STORAGE_CONFIG.ROOM.LENGTH / 2 - 0.1 },
            { id: "F03", x: -STORAGE_CONFIG.ROOM.WIDTH / 2 + 0.1, y: 3.6, z: -4.0, rotY: Math.PI / 2 },
            { id: "F04", x: STORAGE_CONFIG.ROOM.WIDTH / 2 - 0.1, y: 3.6, z: -4.0, rotY: -Math.PI / 2 }
        ];

        fanPositions.forEach(f => {
            const fanHousing = new THREE.Group();
            fanHousing.position.set(f.x, f.y, f.z);
            if (f.rotY) fanHousing.rotation.y = f.rotY;

            const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 24), this.materials.metalRack);
            frame.rotation.x = Math.PI / 2;
            fanHousing.add(frame);

            const bladeGroup = new THREE.Group();
            for (let b = 0; b < 4; b++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.02), this.materials.fanBlades);
                blade.position.y = 0.22;
                const pivot = new THREE.Group();
                pivot.rotation.z = (b * Math.PI) / 2;
                pivot.add(blade);
                bladeGroup.add(pivot);
            }
            fanHousing.add(bladeGroup);
            this.fans.push({ group: bladeGroup, id: f.id });

            fanHousing.userData = { type: "FAN", id: f.id, name: `Ventilation Exhaust Fan ${f.id}` };
            this.scene.add(fanHousing);
            this.interactiveObjects.push(frame);
            frame.userData = fanHousing.userData;
        });
    }

    buildSensors() {
        const sensorList = [
            { type: "TEMP_SENSOR", id: "T01", pos: [-4.0, 2.0, -1.0], label: "Temp Sensor T01" },
            { type: "TEMP_SENSOR", id: "T02", pos: [-4.0, 2.0, 6.0], label: "Temp Sensor T02" },
            { type: "TEMP_SENSOR", id: "T03", pos: [4.0, 2.0, -1.0], label: "Temp Sensor T03" },
            { type: "TEMP_SENSOR", id: "T04", pos: [4.0, 2.0, 6.0], label: "Temp Sensor T04" },
            { type: "HUMIDITY_SENSOR", id: "H01", pos: [-4.0, 2.8, 1.0], label: "RH Sensor H01" },
            { type: "HUMIDITY_SENSOR", id: "H02", pos: [4.0, 2.8, 1.0], label: "RH Sensor H02" },
            { type: "CO2_SENSOR", id: "C01", pos: [0, 1.5, 0], label: "CO₂ Ambient Sensor C01" },
            { type: "AIRFLOW_SENSOR", id: "AF01", pos: [0, 2.5, -4.0], label: "Air Velocity Anemometer AF01" },
            { type: "CONDENSATION_SENSOR", id: "CS01", pos: [4.0, 0.5, -3.5], label: "Dew Condensation Sensor CS01" }
        ];

        sensorList.forEach(s => {
            const sensorBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.08), this.materials.sensorHousing);
            sensorBox.position.set(...s.pos);

            const lightLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), this.materials.sensorLens);
            lightLed.position.set(0, 0.06, 0.045);
            sensorBox.add(lightLed);

            sensorBox.userData = { type: s.type, id: s.id, name: s.label };
            this.scene.add(sensorBox);
            this.interactiveObjects.push(sensorBox);
        });
    }

    buildVisualAirflow() {
        const particleCount = 180;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * STORAGE_CONFIG.ROOM.WIDTH * 0.8;
            positions[i + 1] = 0.5 + Math.random() * 3.5;
            positions[i + 2] = (Math.random() - 0.5) * STORAGE_CONFIG.ROOM.LENGTH * 0.8;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0x93c5fd,
            size: 0.04,
            transparent: true,
            opacity: 0.45
        });

        this.airflowParticles = new THREE.Points(geometry, material);
        this.scene.add(this.airflowParticles);
    }

    updateAnimations(delta, simState) {
        const rotationSpeed = (simState.fanSpeed / 100) * 25 * delta;
        this.fans.forEach(f => {
            f.group.rotation.z += rotationSpeed;
        });

        if (this.airflowParticles) {
            const positions = this.airflowParticles.geometry.attributes.position.array;
            const speed = simState.airVelocity * delta * 2.0;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += speed;
                if (positions[i + 2] > STORAGE_CONFIG.ROOM.LENGTH / 2) {
                    positions[i + 2] = -STORAGE_CONFIG.ROOM.LENGTH / 2;
                }
            }
            this.airflowParticles.geometry.attributes.position.needsUpdate = true;
        }
    }

    toggleDoor() {
        this.doorOpen = !this.doorOpen;
        this.door.rotation.y = this.doorOpen ? Math.PI / 2 : 0;
    }
}