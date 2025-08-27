-- Create default factions for American Roleplay server

-- Government Factions
INSERT INTO factions (name, tag, type, max_members, money, spawn_x, spawn_y, spawn_z) VALUES
('Los Santos Police Department', 'LSPD', 'Government', 50, 100000, 425.1, -979.5, 30.7),
('Blaine County Sheriff Office', 'BCSO', 'Government', 30, 75000, 1853.2, 3686.0, 34.3),
('San Andreas Fire Department', 'SAFD', 'Government', 25, 60000, 216.0, -1644.0, 29.8),
('Los Santos Medical Center', 'LSMC', 'Government', 20, 80000, 338.5, -1394.5, 32.5),
('Department of Justice', 'DOJ', 'Government', 15, 120000, -544.7, -204.2, 38.2),
('City Hall', 'CITY', 'Government', 10, 200000, -544.7, -204.2, 38.2),

-- Criminal Organizations
('Grove Street Families', 'GSF', 'Gang', 25, 50000, -2522.2, -624.3, 132.8),
('Ballas', 'BALLAS', 'Gang', 25, 45000, 105.5, -1885.2, 24.3),
('Vagos', 'VAGOS', 'Gang', 25, 40000, 331.3, -2012.9, 22.3),
('Marabunta Grande', 'MG13', 'Gang', 20, 35000, 1432.1, -1888.2, 71.6),
('Los Santos Triads', 'TRIAD', 'Mafia', 20, 80000, -1004.8, -478.2, 50.0),
('Russian Bratva', 'BRATVA', 'Mafia', 15, 90000, -1158.4, -1519.9, 10.6),
('Italian Cosa Nostra', 'COSA', 'Mafia', 18, 100000, -1288.1, -1115.5, 6.8),

-- Business Organizations
('Weazel News', 'WN', 'Business', 15, 60000, -598.9, -930.9, 23.9),
('Dynasty 8 Real Estate', 'D8', 'Business', 12, 80000, -716.9, 261.3, 84.1),
('Maze Bank', 'MAZE', 'Business', 20, 150000, -1368.9, -503.7, 33.2),
('Los Santos Customs', 'LSC', 'Business', 25, 70000, -347.3, -133.2, 39.0),
('Cluckin Bell', 'CB', 'Business', 30, 40000, -146.8, -256.9, 43.6),
('Burger Shot', 'BS', 'Business', 30, 45000, -1193.9, -768.0, 17.3),

-- Other Organizations
('Los Santos Taxi', 'TAXI', 'Other', 40, 30000, 895.4, -179.3, 74.7),
('Trucking Company', 'TRUCK', 'Other', 35, 50000, 1240.5, -3257.0, 5.9),
('Motorcycle Club', 'MC', 'Other', 20, 60000, 982.1, -123.8, 74.1);
