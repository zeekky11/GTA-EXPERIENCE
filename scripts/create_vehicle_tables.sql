-- Vehicle tables
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    model VARCHAR(50) NOT NULL,
    plate VARCHAR(8) UNIQUE NOT NULL,
    color_primary JSON NOT NULL,
    color_secondary JSON NOT NULL,
    position JSON NOT NULL,
    rotation JSON NOT NULL,
    fuel DECIMAL(5,2) DEFAULT 100.00,
    engine_health DECIMAL(7,2) DEFAULT 1000.00,
    body_health DECIMAL(7,2) DEFAULT 1000.00,
    locked BOOLEAN DEFAULT TRUE,
    impounded BOOLEAN DEFAULT FALSE,
    insurance_expires DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (owner_id) REFERENCES characters(id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id),
    INDEX idx_plate (plate),
    INDEX idx_impounded (impounded)
);

CREATE TABLE IF NOT EXISTS vehicle_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    player_id INT NOT NULL,
    key_type ENUM('owner', 'spare') DEFAULT 'spare',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vehicle_player (vehicle_id, player_id),
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_player (player_id)
);

CREATE TABLE IF NOT EXISTS vehicle_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    component INT NOT NULL,
    value INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vehicle_component (vehicle_id, component),
    INDEX idx_vehicle (vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_impounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    reason TEXT NOT NULL,
    impounded_by INT NOT NULL,
    impounded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    released_by INT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (impounded_by) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (released_by) REFERENCES characters(id) ON DELETE SET NULL,
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_impounded_by (impounded_by)
);
