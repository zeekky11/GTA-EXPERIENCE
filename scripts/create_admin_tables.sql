-- Admin and moderation tables
CREATE TABLE IF NOT EXISTS admin_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    level INT NOT NULL DEFAULT 0,
    permissions JSON NOT NULL,
    set_by INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (set_by) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_player (player_id),
    INDEX idx_level (level),
    INDEX idx_active (active)
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id INT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE SET NULL,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS player_bans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    banned_by INT NOT NULL,
    reason TEXT NOT NULL,
    expires_at DATETIME NULL,
    active BOOLEAN DEFAULT TRUE,
    unbanned_by INT NULL,
    unban_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unbanned_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (unbanned_by) REFERENCES characters(id) ON DELETE SET NULL,
    INDEX idx_player (player_id),
    INDEX idx_active (active),
    INDEX idx_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS player_mutes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    muted_by INT NOT NULL,
    reason TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    unmuted_by INT NULL,
    unmute_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unmuted_at TIMESTAMP NULL,
    FOREIGN KEY (player_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (muted_by) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (unmuted_by) REFERENCES characters(id) ON DELETE SET NULL,
    INDEX idx_player (player_id),
    INDEX idx_active (active),
    INDEX idx_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS player_warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    warned_by INT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (warned_by) REFERENCES characters(id) ON DELETE CASCADE,
    INDEX idx_player (player_id),
    INDEX idx_warned_by (warned_by),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS player_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    reported_id INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'closed') DEFAULT 'open',
    assigned_admin INT NULL,
    resolution TEXT NULL,
    closed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_admin) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES characters(id) ON DELETE SET NULL,
    INDEX idx_reporter (reporter_id),
    INDEX idx_reported (reported_id),
    INDEX idx_status (status),
    INDEX idx_assigned (assigned_admin)
);

-- Insert default admin permissions
INSERT INTO admin_levels (player_id, level, permissions, set_by) VALUES 
(1, 10, '["*"]', 1) -- Super admin with all permissions
ON DUPLICATE KEY UPDATE level = 10, permissions = '["*"]';
