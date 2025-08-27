-- Create faction invites table

CREATE TABLE IF NOT EXISTS faction_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faction_id INT NOT NULL,
  character_id INT NOT NULL,
  invited_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES characters(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_faction_invites_character ON faction_invites(character_id);
CREATE INDEX idx_faction_invites_faction ON faction_invites(faction_id);
CREATE INDEX idx_faction_invites_expires ON faction_invites(expires_at);
