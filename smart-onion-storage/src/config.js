/**
 * Master Storage Configuration & Thresholds
 */
const STORAGE_CONFIG = {
    ROOM: {
        WIDTH: 14.0,
        LENGTH: 18.0,
        HEIGHT: 4.8,
        WALL_THICKNESS: 0.2
    },
    PLAYER: {
        EYE_HEIGHT: 1.65,
        WALK_SPEED: 4.0,
        SPRINT_SPEED: 7.5,
        RADIUS: 0.4
    },
    CURING: {
        NAME: "Curing / Drying Phase",
        TEMP_MIN: 25.0,
        TEMP_MAX: 30.0,
        RH_MIN: 60.0,
        RH_MAX: 70.0,
        AIR_VELOCITY_MIN: 0.5,
        AIR_VELOCITY_MAX: 1.2,
        DEFAULT_DURATION_DAYS: 10
    },
    COLD_STORAGE: {
        NAME: "Long-Term Cold Storage",
        TEMP_MIN: 0.0,
        TEMP_MAX: 2.0,
        RH_MIN: 65.0,
        RH_MAX: 70.0,
        AIR_VELOCITY_MIN: 0.2,
        AIR_VELOCITY_MAX: 0.5,
        CO2_MAX_SAFE_PPM: 1000,
        FREEZING_THRESHOLD_TEMP: -0.8
    },
    RACKS: [
        { id: "A01", x: -4.0, z: -3.5, shelves: 4 },
        { id: "A02", x: -4.0, z: 3.5, shelves: 4 },
        { id: "A03", x: 4.0, z: -3.5, shelves: 4 },
        { id: "A04", x: 4.0, z: 3.5, shelves: 4 }
    ]
};