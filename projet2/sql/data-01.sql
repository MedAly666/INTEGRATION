
-- Insert data into Clients table
INSERT INTO Clients (id_client, nom_complet, adresse, email_contact, numero_telephone) VALUES
(1, 'Marie Dupont', '25 Avenue Victor Hugo, Paris', 'marie.dupont@gmail.com', '01-23-45-67-89'),
(2, 'Jean Martin', '12 Rue de la Paix, Lyon', 'jean.martin@hotmail.fr', '02-34-56-78-90'),
(3, 'Sophie Bernard', '8 Boulevard Saint-Michel, Marseille', 'sophie.bernard@yahoo.fr', '03-45-67-89-01'),
(4, 'Thomas Petit', '45 Rue de la République, Bordeaux', 'thomas.petit@gmail.com', '04-56-78-90-12'),
(5, 'Isabelle Leroy', '67 Avenue Jean Jaurès, Toulouse', 'isabelle.leroy@outlook.fr', '05-67-89-01-23'),
(6, 'Pierre Moreau', '32 Rue des Lilas, Nantes', 'pierre.moreau@gmail.com', '06-78-90-12-34'),
(7, 'Camille Dubois', '19 Rue du Commerce, Strasbourg', 'camille.dubois@yahoo.fr', '07-89-01-23-45'),
(8, 'Antoine Roux', '78 Boulevard Haussmann, Nice', 'antoine.roux@gmail.com', '08-90-12-34-56'),
(9, 'Émilie Laurent', '14 Rue de la Liberté, Montpellier', 'emilie.laurent@hotmail.fr', '09-01-23-45-67'),
(10, 'Lucas Girard', '53 Avenue Foch, Lille', 'lucas.girard@outlook.fr', '09-87-65-43-21');

-- Insert data into Fournisseurs table
INSERT INTO Fournisseurs (id_fournisseur, nom_fournisseur, numero_telephone, adresse) VALUES
(1, 'ÉlectroTech', '01-11-22-33-44', '14 Rue de l\'Industrie, Paris'),
(2, 'InfoPlus', '02-22-33-44-55', '27 Boulevard des Technologies, Lyon'),
(3, 'MédiaPro', '03-33-44-55-66', '8 Avenue des Communications, Marseille'),
(4, 'MobileFrance', '04-44-55-66-77', '42 Rue de l\'Innovation, Toulouse'),
(5, 'AccessoiresPro', '05-55-66-77-88', '19 Rue des Composants, Bordeaux');

-- Insert data into Produits table
INSERT INTO Produits (id_produit, prix_cout, description, categorie) VALUES
(1, 799.99, 'Ordinateur Portable Pro 15"', 'Informatique'),
(2, 499.99, 'Smartphone Galaxy X', 'Téléphonie'),
(3, 199.99, 'Tablette TouchTab 10', 'Informatique'),
(4, 129.99, 'Imprimante LaserJet Color', 'Périphériques'),
(5, 89.99, 'Casque Audio Bluetooth Pro', 'Audio'),
(6, 249.99, 'Moniteur UltraHD 27"', 'Écrans'),
(7, 59.99, 'Clavier Mécanique RGB', 'Périphériques'),
(8, 39.99, 'Souris Gaming Pro', 'Périphériques'),
(9, 349.99, 'Console GameStation 5', 'Gaming'),
(10, 149.99, 'Enceinte Bluetooth Stéréo', 'Audio'),
(11, 79.99, 'Disque Dur Externe 2TB', 'Stockage'),
(12, 29.99, 'Clé USB 128GB', 'Stockage'),
(13, 899.99, 'Télévision SmartTV 55"', 'TV/Vidéo'),
(14, 199.99, 'Barre de Son Surround', 'Audio'),
(15, 299.99, 'Appareil Photo Numérique', 'Photo');

-- First create Employees with NULL agency references
INSERT INTO Employees (id_employe, nom_complet, email, poste, agence_ref) VALUES
(1, 'Alexandre Durand', 'alexandre.durand@entreprise.fr', 'Directeur Régional', NULL),
(2, 'Nathalie Simon', 'nathalie.simon@entreprise.fr', 'Directrice', NULL),
(3, 'François Lefebvre', 'francois.lefebvre@entreprise.fr', 'Directeur', NULL),
(4, 'Julie Bertrand', 'julie.bertrand@entreprise.fr', 'Responsable Ventes', NULL),
(5, 'Olivier Martin', 'olivier.martin@entreprise.fr', 'Conseiller Commercial', NULL),
(6, 'Christine Leroy', 'christine.leroy@entreprise.fr', 'Conseillère Commerciale', NULL),
(7, 'Philippe Morel', 'philippe.morel@entreprise.fr', 'Technicien SAV', NULL),
(8, 'Stéphanie Dubois', 'stephanie.dubois@entreprise.fr', 'Responsable Logistique', NULL),
(9, 'David Fontaine', 'david.fontaine@entreprise.fr', 'Conseiller Commercial', NULL),
(10, 'Caroline Rousseau', 'caroline.rousseau@entreprise.fr', 'Comptable', NULL);

-- Create Agences with temporary NULL manager references
INSERT INTO Agences (id_agence, ville, adresse, responsable_ref) VALUES
(1, 'Paris', '28 Rue du Commerce, 75015 Paris', NULL),
(2, 'Lyon', '45 Avenue Berthelot, 69007 Lyon', NULL),
(3, 'Marseille', '19 Boulevard Michelet, 13008 Marseille', NULL),
(4, 'Toulouse', '52 Rue Alsace Lorraine, 31000 Toulouse', NULL);

-- Update Employees with agency references
UPDATE Employees SET agence_ref = 1 WHERE id_employe IN (1, 4, 5, 6);
UPDATE Employees SET agence_ref = 2 WHERE id_employe IN (2, 7, 8);
UPDATE Employees SET agence_ref = 3 WHERE id_employe IN (3, 9);
UPDATE Employees SET agence_ref = 4 WHERE id_employe IN (10);

-- Update Agences with manager references
UPDATE Agences SET responsable_ref = 1 WHERE id_agence = 1;
UPDATE Agences SET responsable_ref = 2 WHERE id_agence = 2;
UPDATE Agences SET responsable_ref = 3 WHERE id_agence = 3;
UPDATE Agences SET responsable_ref = 4 WHERE id_agence = 4;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Insert data into Commandes table
INSERT INTO Commandes (id_commande, date_commande, montant, statut, mode_paiement, client_ref, employe_ref) VALUES
(1, '2023-01-15', 1299.97, 'Livrée', 'Carte de Crédit', 1, 5),
(2, '2023-02-03', 349.99, 'Livrée', 'PayPal', 2, 6),
(3, '2023-02-10', 929.98, 'Livrée', 'Virement', 3, 9),
(4, '2023-03-05', 199.99, 'Livrée', 'Carte de Crédit', 4, 5),
(5, '2023-03-18', 1249.98, 'Livrée', 'PayPal', 5, 6),
(6, '2023-04-02', 169.98, 'Livrée', 'Carte de Crédit', 6, 9),
(7, '2023-04-25', 899.99, 'Livrée', 'Virement', 7, 5),
(8, '2023-05-10', 449.98, 'Livrée', 'Carte de Crédit', 8, 6),
(9, '2023-05-22', 299.99, 'En cours', 'PayPal', 9, 9),
(10, '2023-06-05', 239.98, 'En cours', 'Carte de Crédit', 10, 5),
(11, '2023-06-18', 1099.98, 'En cours', 'Virement', 1, 6),
(12, '2023-06-29', 479.98, 'En préparation', 'Carte de Crédit', 2, 9),
(13, '2023-07-12', 349.99, 'En préparation', 'PayPal', 3, 5),
(14, '2023-07-24', 229.98, 'En préparation', 'Carte de Crédit', 4, 6),
(15, '2023-08-02', 899.99, 'En préparation', 'Virement', 5, 9);

-- Insert data into Details_Commande table
INSERT INTO Details_Commande (id_commande, id_produit, quantite) VALUES
(1, 1, 1), (1, 7, 1), (1, 8, 1),
(2, 9, 1),
(3, 2, 1), (3, 5, 1), (3, 14, 1),
(4, 3, 1),
(5, 1, 1), (5, 10, 3),
(6, 7, 1), (6, 12, 2),
(7, 13, 1),
(8, 2, 1),
(9, 15, 1),
(10, 7, 2), (10, 8, 3),
(11, 6, 2), (11, 14, 2),
(12, 2, 1),
(13, 9, 1),
(14, 10, 1), (14, 11, 1),
(15, 13, 1);

-- Insert data into Factures table
INSERT INTO Factures (id_facture, montant_total, date_facture, commande_ref) VALUES
(1, 1299.97, '2023-01-15', 1),
(2, 349.99, '2023-02-03', 2),
(3, 929.98, '2023-02-10', 3),
(4, 199.99, '2023-03-05', 4),
(5, 1249.98, '2023-03-18', 5),
(6, 169.98, '2023-04-02', 6),
(7, 899.99, '2023-04-25', 7),
(8, 449.98, '2023-05-10', 8),
(9, 299.99, '2023-05-22', 9),
(10, 239.98, '2023-06-05', 10),
(11, 1099.98, '2023-06-18', 11),
(12, 479.98, '2023-06-29', 12),
(13, 349.99, '2023-07-12', 13),
(14, 229.98, '2023-07-24', 14),
(15, 899.99, '2023-08-02', 15);

-- Insert data into Livraisons table
INSERT INTO Livraisons (id_livraison, transporteur, date_estimee, statut, commande_ref) VALUES
(1, 'Chronopost', '2023-01-18', 'Livré', 1),
(2, 'DHL', '2023-02-06', 'Livré', 2),
(3, 'UPS', '2023-02-13', 'Livré', 3),
(4, 'Chronopost', '2023-03-08', 'Livré', 4),
(5, 'DHL', '2023-03-21', 'Livré', 5),
(6, 'UPS', '2023-04-05', 'Livré', 6),
(7, 'Chronopost', '2023-04-28', 'Livré', 7),
(8, 'DHL', '2023-05-13', 'Livré', 8),
(9, 'UPS', '2023-05-25', 'En transit', 9),
(10, 'Chronopost', '2023-06-08', 'En transit', 10),
(11, 'DHL', '2023-06-21', 'En préparation', 11),
(12, 'UPS', '2023-07-02', 'En préparation', 12),
(13, 'Chronopost', '2023-07-15', 'Non expédié', 13),
(14, 'DHL', '2023-07-27', 'Non expédié', 14),
(15, 'UPS', '2023-08-05', 'Non expédié', 15);

-- Insert data into Approvisionnement table
INSERT INTO Approvisionnement (id_produit, id_fournisseur, quantite) VALUES
(1, 1, 50),
(2, 4, 75),
(3, 1, 40),
(4, 1, 30),
(5, 4, 60),
(6, 1, 25),
(7, 5, 80),
(8, 5, 100),
(9, 2, 35),
(10, 3, 45),
(11, 1, 55),
(12, 1, 120),
(13, 3, 20),
(14, 3, 30),
(15, 2, 25);