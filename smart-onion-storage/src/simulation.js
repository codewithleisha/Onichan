/**
 * Environmental Simulation Engine & AI Diagnostics
 */
class StorageSimulationEngine {
    constructor() {
        this.stage = "COLD_STORAGE";
        this.mode = "AUTO";
        this.curingDay = 5;
        this.curingTotalDays = 10;

        this.state = {
            temperature: 1.4,
            relativeHumidity: 67.2,
            airVelocity: 0.32,
            co2: 520,
            condensationRisk: 0.0,
            spoilageRisk: 4.2,
            coolingLoad: 45,
            fanSpeed: 38,
            dehumidifierActive: false,
            sensorHealth: { T01: true, T02: true, T03: true, T04: true, H01: true, H02: true }
        };

        this.rackMicroclimates = {
            A01: { tempOffset: -0.1, rhOffset: -0.8, co2Offset: -10 },
            A02: { tempOffset: 0.1, rhOffset: 0.2, co2Offset: 5 },
            A03: { tempOffset: 0.3, rhOffset: 1.4, co2Offset: 25 },
            A04: { tempOffset: 0.0, rhOffset: -0.2, co2Offset: 0 }
        };

        this.aiAdvice = "System operating within optimal thresholds.";
    }

    setStage(newStage) {
        this.stage = newStage;
        if (newStage === "CURING") {
            this.state.temperature = 26.5;
            this.state.relativeHumidity = 64.0;
            this.state.fanSpeed = 65;
        } else {
            this.state.temperature = 1.4;
            this.state.relativeHumidity = 67.0;
            this.state.fanSpeed = 38;
        }
    }

    triggerScenario(type) {
        switch (type) {
            case "TEMP_SPIKE":
                this.state.temperature = 4.8;
                break;
            case "HIGH_HUMIDITY":
                this.state.relativeHumidity = 82.5;
                break;
            case "CONDENSATION":
                this.state.temperature = 3.2;
                this.state.relativeHumidity = 88.0;
                this.state.condensationRisk = 85.0;
                break;
            case "CO2_BUILDUP":
                this.state.co2 = 1450;
                this.state.fanSpeed = 10;
                break;
            case "SENSOR_FAULT":
                this.state.sensorHealth.T02 = false;
                break;
            case "NORMAL":
            default:
                this.state.sensorHealth.T02 = true;
                this.state.condensationRisk = 0;
                if (this.stage === "COLD_STORAGE") {
                    this.state.temperature = 1.4;
                    this.state.relativeHumidity = 67.2;
                    this.state.co2 = 520;
                } else {
                    this.state.temperature = 26.5;
                    this.state.relativeHumidity = 64.0;
                }
                break;
        }
    }

    update(delta) {
        const config = this.stage === "CURING" ? STORAGE_CONFIG.CURING : STORAGE_CONFIG.COLD_STORAGE;

        if (this.mode === "AUTO") {
            if (this.state.temperature > config.TEMP_MAX) {
                this.state.coolingLoad = Math.min(100, this.state.coolingLoad + delta * 20);
                this.state.temperature -= delta * (this.state.coolingLoad / 100) * 0.4;
            } else if (this.state.temperature < config.TEMP_MIN) {
                this.state.coolingLoad = Math.max(0, this.state.coolingLoad - delta * 25);
                this.state.temperature += delta * 0.15;
            } else {
                this.state.coolingLoad = 45;
            }

            if (this.state.relativeHumidity > config.RH_MAX) {
                this.state.fanSpeed = Math.min(100, this.state.fanSpeed + delta * 15);
                this.state.dehumidifierActive = true;
                this.state.relativeHumidity -= delta * 0.6;
            } else if (this.state.relativeHumidity < config.RH_MIN) {
                this.state.fanSpeed = Math.max(20, this.state.fanSpeed - delta * 10);
                this.state.dehumidifierActive = false;
                this.state.relativeHumidity += delta * 0.2;
            } else {
                this.state.dehumidifierActive = false;
                this.state.fanSpeed = (this.stage === "CURING") ? 60 : 35;
            }

            this.state.airVelocity = 0.1 + (this.state.fanSpeed / 100) * 0.65;

            if (this.state.co2 > 800) {
                this.state.fanSpeed = Math.max(this.state.fanSpeed, 75);
                this.state.co2 = Math.max(450, this.state.co2 - delta * 40);
            } else {
                this.state.co2 = Math.min(650, this.state.co2 + delta * 3);
            }
        }

        const dewPoint = this.state.temperature - ((100 - this.state.relativeHumidity) / 5);
        const dewDelta = this.state.temperature - dewPoint;
        if (dewDelta < 1.5 || this.state.relativeHumidity > 84) {
            this.state.condensationRisk = Math.min(100, (85 - this.state.relativeHumidity) * -5);
        } else {
            this.state.condensationRisk = Math.max(0, this.state.condensationRisk - delta * 10);
        }

        let penalty = 0;
        if (this.state.temperature > config.TEMP_MAX) penalty += (this.state.temperature - config.TEMP_MAX) * 2.5;
        if (this.state.temperature < config.TEMP_MIN) penalty += (config.TEMP_MIN - this.state.temperature) * 4.0;
        if (this.state.relativeHumidity > config.RH_MAX) penalty += (this.state.relativeHumidity - config.RH_MAX) * 0.8;
        if (this.state.condensationRisk > 10) penalty += this.state.condensationRisk * 0.15;
        if (this.state.co2 > 1000) penalty += 2.0;

        const targetRisk = 3.5 + penalty;
        this.state.spoilageRisk += (targetRisk - this.state.spoilageRisk) * (delta * 0.1);

        this.evaluateAIDiagnostics(config);
    }

    evaluateAIDiagnostics(config) {
        if (!this.state.sensorHealth.T02) {
            this.aiAdvice = "⚠️ Sensor Fault: T02 offline. Operating in redundant cross-reference telemetry mode via T01/T03.";
            return;
        }
        if (this.state.condensationRisk > 30) {
            this.aiAdvice = "🔴 CRITICAL: Dew point convergence detected. Ramping fans to 90% and engaging dry-air purge.";
            return;
        }
        if (this.state.relativeHumidity > config.RH_MAX) {
            this.aiAdvice = `⚠️ RH elevated at ${this.state.relativeHumidity.toFixed(1)}%. Increasing ventilation to vent latent respiration moisture.`;
            return;
        }
        if (this.state.temperature > config.TEMP_MAX) {
            this.aiAdvice = `⚠️ Thermal load high (${this.state.temperature.toFixed(1)}°C). Boosting chiller cycle to prevent bulb sprouting.`;
            return;
        }
        if (this.stage === "CURING") {
            this.aiAdvice = `🌿 CURING STAGE ACTIVE (Day ${this.curingDay}/${this.curingTotalDays}): Circulating warm, dry air to seal bulb necks.`;
        } else {
            this.aiAdvice = "🟢 STABLE: Environmental parameters nominal for dormant long-term preservation.";
        }
    }

    getRackReading(rackId) {
        const micro = this.rackMicroclimates[rackId] || { tempOffset: 0, rhOffset: 0, co2Offset: 0 };
        return {
            temperature: (this.state.temperature + micro.tempOffset).toFixed(1),
            relativeHumidity: (this.state.relativeHumidity + micro.rhOffset).toFixed(1),
            co2: Math.round(this.state.co2 + micro.co2Offset),
            status: this.state.spoilageRisk < 10 ? "OPTIMAL" : "WARNING"
        };
    }
}