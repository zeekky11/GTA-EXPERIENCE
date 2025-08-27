-- Create default jobs for American Roleplay server
-- This script should be run after the main database setup

-- Government Jobs
INSERT INTO jobs (name, description, salary_per_hour, required_level, max_employees, is_government, spawn_x, spawn_y, spawn_z) VALUES
('Police Officer', 'Protect and serve the citizens of Los Santos', 150, 5, 20, TRUE, 425.1, -979.5, 30.7),
('Sheriff Deputy', 'Law enforcement for Blaine County', 140, 4, 15, TRUE, 1853.2, 3686.0, 34.3),
('Paramedic', 'Emergency medical services', 130, 3, 12, TRUE, 338.5, -1394.5, 32.5),
('Firefighter', 'Fire suppression and rescue operations', 135, 3, 10, TRUE, 216.0, -1644.0, 29.8),
('Judge', 'Preside over court proceedings', 300, 15, 3, TRUE, -544.7, -204.2, 38.2),
('District Attorney', 'Prosecute criminal cases', 250, 12, 2, TRUE, -544.7, -204.2, 38.2),
('Public Defender', 'Defend citizens in court', 200, 10, 3, TRUE, -544.7, -204.2, 38.2),
('Mayor', 'Lead the city government', 500, 20, 1, TRUE, -544.7, -204.2, 38.2),

-- Civilian Jobs
('Taxi Driver', 'Transport passengers around the city', 80, 1, -1, FALSE, 895.4, -179.3, 74.7),
('Bus Driver', 'Public transportation services', 85, 2, 8, FALSE, 453.3, -602.3, 28.6),
('Mechanic', 'Repair and maintain vehicles', 100, 3, 15, FALSE, -347.3, -133.2, 39.0),
('Trucker', 'Long-distance cargo transportation', 120, 4, -1, FALSE, 1240.5, -3257.0, 5.9),
('Delivery Driver', 'Package and food delivery services', 75, 1, -1, FALSE, -425.5, -2789.5, 6.0),
('Store Clerk', 'Work in retail establishments', 60, 1, -1, FALSE, 373.9, 328.1, 103.6),
('Security Guard', 'Private security services', 90, 2, -1, FALSE, -141.3, -620.9, 168.8),
('Construction Worker', 'Building and infrastructure development', 95, 2, -1, FALSE, -598.3, -1735.8, 22.4),
('Garbage Collector', 'Waste management services', 85, 1, 10, FALSE, -354.0, -1513.9, 27.7),
('Fisherman', 'Commercial fishing operations', 70, 1, -1, FALSE, -1816.9, -1193.5, 14.3),

-- Entertainment & Service Jobs
('News Reporter', 'Broadcast news and events', 110, 5, 8, FALSE, -598.9, -930.9, 23.9),
('DJ/Radio Host', 'Entertainment broadcasting', 95, 3, 6, FALSE, -598.9, -930.9, 23.9),
('Bartender', 'Serve drinks and manage bars', 70, 2, -1, FALSE, -565.9, 276.6, 83.1),
('Chef', 'Prepare food in restaurants', 85, 3, -1, FALSE, -1193.9, -768.0, 17.3),
('Real Estate Agent', 'Property sales and rentals', 150, 8, 12, FALSE, -716.9, 261.3, 84.1),
('Lawyer', 'Legal representation services', 200, 10, -1, FALSE, -544.7, -204.2, 38.2),
('Bank Teller', 'Banking and financial services', 90, 4, 8, FALSE, 150.3, -1040.5, 29.4),
('Insurance Agent', 'Insurance sales and claims', 105, 6, 10, FALSE, -1368.9, -503.7, 33.2),

-- Specialized Jobs
('Pilot', 'Aircraft transportation services', 200, 12, 6, FALSE, -1336.1, -3044.3, 13.9),
('Boat Captain', 'Maritime transportation', 130, 8, 4, FALSE, -1816.9, -1193.5, 14.3),
('Tow Truck Driver', 'Vehicle recovery services', 110, 5, 8, FALSE, 408.9, -1625.1, 29.3),
('Locksmith', 'Lock and security services', 120, 6, 5, FALSE, -347.3, -133.2, 39.0),
('Photographer', 'Professional photography services', 80, 3, -1, FALSE, -598.9, -930.9, 23.9),
('Personal Trainer', 'Fitness and health services', 75, 2, -1, FALSE, -1201.2, -1570.1, 4.6);

-- Update spawn positions to be more realistic (these are example coordinates)
-- In a real server, these would be actual job-specific locations
