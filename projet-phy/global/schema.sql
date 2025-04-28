-- DB: GLOBAL

-- ========================================================
-- CLIENTS VIEW
-- ========================================================
CREATE OR REPLACE VIEW Clients AS
SELECT 
    CONCAT('SQL_', id_client) AS id_client,
    nom_complet,
    adresse,
    email_contact,
    numero_telephone,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Clients
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_client) AS id_client,
    nom AS nom_complet,
    adresse,
    email AS email_contact,
    telephone AS numero_telephone,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.client
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_client,
    nom AS nom_complet,
    NULL AS adresse,
    courriel AS email_contact,
    telephone AS numero_telephone,
    'XML' AS source_system
FROM 
    MAGASIN_XML.clients;

-- ========================================================
-- EMPLOYEES VIEW
-- ========================================================
CREATE OR REPLACE VIEW Employees AS
SELECT 
    CONCAT('SQL_', id_employe) AS id_employe,
    nom_complet,
    email,
    poste,
    CONCAT('SQL_', agence_ref) AS agence_ref,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Employees
    
UNION ALL

SELECT 
    CONCAT('NEO_', e.id_employe) AS id_employe,
    e.nom AS nom_complet,
    e.email,
    e.poste,
    CONCAT('NEO_', ea.id_agence) AS agence_ref,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.employe e
    LEFT JOIN MAGASIN_NEO4J.employe_agence ea ON e.id_employe = ea.id_employe
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_employe,
    nom AS nom_complet,
    email,
    NULL AS poste,
    NULL AS agence_ref,
    'XML' AS source_system
FROM 
    MAGASIN_XML.employes;

-- ========================================================
-- AGENCES VIEW
-- ========================================================
CREATE OR REPLACE VIEW Agences AS
SELECT 
    CONCAT('SQL_', id_agence) AS id_agence,
    ville,
    adresse,
    CONCAT('SQL_', responsable_ref) AS responsable_ref,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Agences
    
UNION ALL

SELECT 
    CONCAT('NEO_', a.id_agence) AS id_agence,
    a.ville,
    a.adresse,
    CONCAT('NEO_', ad.id_employe) AS responsable_ref,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.agence a
    LEFT JOIN MAGASIN_NEO4J.agence_directeur ad ON a.id_agence = ad.id_agence;

-- ========================================================
-- FOURNISSEURS VIEW
-- ========================================================
CREATE OR REPLACE VIEW Fournisseurs AS
SELECT 
    CONCAT('SQL_', id_fournisseur) AS id_fournisseur,
    nom_fournisseur,
    adresse,
    numero_telephone,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Fournisseurs
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_fournisseur) AS id_fournisseur,
    nom AS nom_fournisseur,
    adresse,
    telephone AS numero_telephone,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.fournisseur
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_fournisseur,
    nom AS nom_fournisseur,
    adresse,
    telephone AS numero_telephone,
    'XML' AS source_system
FROM 
    MAGASIN_XML.fournisseurs;

-- ========================================================
-- PRODUITS VIEW
-- ========================================================
CREATE OR REPLACE VIEW Produits AS
SELECT 
    CONCAT('SQL_', id_produit) AS id_produit,
    description,
    prix_cout,
    categorie,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Produits
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_produit) AS id_produit,
    description,
    prix AS prix_cout,
    categorie,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.produit
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_produit,
    description,
    prix AS prix_cout,
    categorie,
    'XML' AS source_system
FROM 
    MAGASIN_XML.produits;

-- ========================================================
-- COMMANDES VIEW
-- ========================================================
CREATE OR REPLACE VIEW Commandes AS
SELECT 
    CONCAT('SQL_', id_commande) AS id_commande,
    date_commande,
    montant,
    statut,
    mode_paiement,
    CONCAT('SQL_', client_ref) AS client_ref,
    CONCAT('SQL_', employe_ref) AS employe_ref,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Commandes
    
UNION ALL

SELECT 
    CONCAT('NEO_', c.id_commande) AS id_commande,
    c.date AS date_commande,
    c.montant,
    c.statut,
    c.mode_paiement,
    CONCAT('NEO_', c.id_client) AS client_ref,
    CONCAT('NEO_', ec.id_employe) AS employe_ref,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.commande c
    LEFT JOIN MAGASIN_NEO4J.employe_commande ec ON c.id_commande = ec.id_commande
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_commande,
    date AS date_commande,
    montant,
    statut,
    mode_paiement,
    CONCAT('XML_', clientID) AS client_ref,
    CONCAT('XML_', employeID) AS employe_ref,
    'XML' AS source_system
FROM 
    MAGASIN_XML.commandes;

-- ========================================================
-- DETAILS_COMMANDE VIEW
-- ========================================================
CREATE OR REPLACE VIEW Details_Commande AS
SELECT 
    CONCAT('SQL_', id_commande) AS id_commande,
    CONCAT('SQL_', id_produit) AS id_produit,
    quantite,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Details_Commande
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_commande) AS id_commande,
    CONCAT('NEO_', id_produit) AS id_produit,
    quantite,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.commande_produit
    
UNION ALL

SELECT 
    CONCAT('XML_', id_commande) AS id_commande,
    CONCAT('XML_', id_produit) AS id_produit,
    nombre AS quantite,
    'XML' AS source_system
FROM 
    MAGASIN_XML.paniers;

-- ========================================================
-- FACTURES VIEW
-- ========================================================
CREATE OR REPLACE VIEW Factures AS
SELECT 
    CONCAT('SQL_', id_facture) AS id_facture,
    montant_total,
    date_facture,
    CONCAT('SQL_', commande_ref) AS commande_ref,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Factures
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_facture) AS id_facture,
    montant_total,
    date AS date_facture,
    CONCAT('NEO_', id_commande) AS commande_ref,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.facture
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_facture,
    montant AS montant_total,
    date AS date_facture,
    CONCAT('XML_', commandeID) AS commande_ref,
    'XML' AS source_system
FROM 
    MAGASIN_XML.factures;

-- ========================================================
-- LIVRAISONS VIEW
-- ========================================================
CREATE OR REPLACE VIEW Livraisons AS
SELECT 
    CONCAT('SQL_', id_livraison) AS id_livraison,
    transporteur,
    data_estimee,
    statut,
    CONCAT('SQL_', commande_ref) AS commande_ref,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Livraisons
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_livraison) AS id_livraison,
    transporteur,
    date_estimee AS data_estimee,
    statut,
    CONCAT('NEO_', id_commande) AS commande_ref,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.livraison
    
UNION ALL

SELECT 
    CONCAT('XML_', id) AS id_livraison,
    transporteur,
    NULL AS data_estimee,
    statut,
    CONCAT('XML_', commandeID) AS commande_ref,
    'XML' AS source_system
FROM 
    MAGASIN_XML.livraisons;

-- ========================================================
-- APPROVISIONNEMENT VIEW
-- ========================================================
CREATE OR REPLACE VIEW Approvisionnement AS
SELECT 
    CONCAT('SQL_', id_produit) AS id_produit,
    CONCAT('SQL_', id_fournisseur) AS id_fournisseur,
    quantite,
    'SQL' AS source_system
FROM 
    MAGASIN_SQL.Approvisionnement
    
UNION ALL

SELECT 
    CONCAT('NEO_', id_produit) AS id_produit,
    CONCAT('NEO_', id_fournisseur) AS id_fournisseur,
    quantite,
    'NEO4J' AS source_system
FROM 
    MAGASIN_NEO4J.produit_fournisseur;

-- Note: No equivalent table for Approvisionnement in XML data source,
-- but we could derive one from the product-supplier relationship if needed
