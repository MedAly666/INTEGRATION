// Clear existing data (optional)
MATCH (n) DETACH DELETE n;

// Create Agencies
CREATE (a1:Agence {id_agence: 1, ville: 'Paris', adresse: '123 Avenue des Champs-Élysées, 75008 Paris'})
CREATE (a2:Agence {id_agence: 2, ville: 'Lyon', adresse: '45 Rue de la République, 69002 Lyon'})
CREATE (a3:Agence {id_agence: 3, ville: 'Marseille', adresse: '78 La Canebière, 13001 Marseille'});

// Create Employees
CREATE (e1:Employé {id_employe: 1, nom: 'Martin Dupont', email: 'martin.dupont@example.com', poste: 'Directeur', salaire: 85000})
CREATE (e2:Employé {id_employe: 2, nom: 'Sophie Laurent', email: 'sophie.laurent@example.com', poste: 'Directeur Commercial', salaire: 75000})
CREATE (e3:Employé {id_employe: 3, nom: 'Thomas Petit', email: 'thomas.petit@example.com', poste: 'Responsable Logistique', salaire: 60000})
CREATE (e4:Employé {id_employe: 4, nom: 'Julie Moreau', email: 'julie.moreau@example.com', poste: 'Chargée de Clientèle', salaire: 45000})
CREATE (e5:Employé {id_employe: 5, nom: 'Luc Bernard', email: 'luc.bernard@example.com', poste: 'Directeur', salaire: 82000})
CREATE (e6:Employé {id_employe: 6, nom: 'Claire Durand', email: 'claire.durand@example.com', poste: 'Conseillère Commerciale', salaire: 42000});

// Create Suppliers
CREATE (f1:Fournisseur {id_fournisseur: 1, nom: 'ElectroTech', téléphone: '01 45 67 89 10', adresse: '56 Rue de l\'Innovation, 92100 Boulogne'})
CREATE (f2:Fournisseur {id_fournisseur: 2, nom: 'MobileFrance', téléphone: '02 34 56 78 90', adresse: '12 Boulevard Digital, 69003 Lyon'})
CREATE (f3:Fournisseur {id_fournisseur: 3, nom: 'InfoSolutions', téléphone: '03 22 33 44 55', adresse: '78 Avenue Technologique, 31000 Toulouse'})
CREATE (f4:Fournisseur {id_fournisseur: 4, nom: 'AccessoiresPro', téléphone: '04 55 66 77 88', adresse: '34 Rue des Composants, 44000 Nantes'});

// Create Products
CREATE (p1:Produit {id_produit: 1, description: 'Smartphone Galaxy S22', prix: 899.99, catégorie: 'Téléphonie'})
CREATE (p2:Produit {id_produit: 2, description: 'Ordinateur portable XPS 15', prix: 1499.99, catégorie: 'Informatique'})
CREATE (p3:Produit {id_produit: 3, description: 'Tablette iPad Air', prix: 699.99, catégorie: 'Téléphonie'})
CREATE (p4:Produit {id_produit: 4, description: 'Écran 27" 4K', prix: 349.99, catégorie: 'Informatique'})
CREATE (p5:Produit {id_produit: 5, description: 'Casque sans fil', prix: 199.99, catégorie: 'Audio'})
CREATE (p6:Produit {id_produit: 6, description: 'Clavier mécanique', prix: 129.99, catégorie: 'Périphériques'})
CREATE (p7:Produit {id_produit: 7, description: 'Souris gaming', prix: 89.99, catégorie: 'Périphériques'})
CREATE (p8:Produit {id_produit: 8, description: 'Enceinte bluetooth', prix: 149.99, catégorie: 'Audio'})
CREATE (p9:Produit {id_produit: 9, description: 'Webcam HD', prix: 79.99, catégorie: 'Périphériques'})
CREATE (p10:Produit {id_produit: 10, description: 'Hub USB-C', prix: 49.99, catégorie: 'Connectique'});

// Create Clients
CREATE (c1:Client {id_client: 1, nom: 'Jean Dubois', adresse: '23 Rue du Commerce, 75015 Paris', email: 'jean.dubois@gmail.com', téléphone: '06 12 34 56 78'})
CREATE (c2:Client {id_client: 2, nom: 'Marie Leroy', adresse: '45 Avenue Victor Hugo, 69003 Lyon', email: 'marie.leroy@yahoo.fr', téléphone: '07 23 45 67 89'})
CREATE (c3:Client {id_client: 3, nom: 'Pierre Lefebvre', adresse: '12 Boulevard des Capucines, 13001 Marseille', email: 'p.lefebvre@hotmail.com', téléphone: '06 34 56 78 90'})
CREATE (c4:Client {id_client: 4, nom: 'Emma Garcia', adresse: '78 Rue de la Paix, 44000 Nantes', email: 'emma.garcia@gmail.com', téléphone: '07 45 67 89 01'})
CREATE (c5:Client {id_client: 5, nom: 'Antoine Martin', adresse: '34 Avenue Foch, 67000 Strasbourg', email: 'a.martin@outlook.com', téléphone: '06 56 78 90 12'});

// Create Orders
CREATE (o1:Commande {id_commande: 1, date: '2024-02-10', montant: 1599.98, statut: 'Livrée', mode_paiement: 'Carte Bancaire'})
CREATE (o2:Commande {id_commande: 2, date: '2024-02-15', montant: 2199.97, statut: 'En préparation', mode_paiement: 'PayPal'})
CREATE (o3:Commande {id_commande: 3, date: '2024-02-20', montant: 349.99, statut: 'Expédiée', mode_paiement: 'Carte Bancaire'})
CREATE (o4:Commande {id_commande: 4, date: '2024-02-22', montant: 279.98, statut: 'Livrée', mode_paiement: 'Virement'})
CREATE (o5:Commande {id_commande: 5, date: '2024-03-01', montant: 899.99, statut: 'En préparation', mode_paiement: 'Carte Bancaire'});

// Create Invoices
CREATE (f1:Facture {id_facture: 1, montant_total: 1599.98, date: '2024-02-10'})
CREATE (f2:Facture {id_facture: 2, montant_total: 2199.97, date: '2024-02-15'})
CREATE (f3:Facture {id_facture: 3, montant_total: 349.99, date: '2024-02-20'})
CREATE (f4:Facture {id_facture: 4, montant_total: 279.98, date: '2024-02-22'})
CREATE (f5:Facture {id_facture: 5, montant_total: 899.99, date: '2024-03-01'});

// Create Deliveries
CREATE (l1:Livraison {id_livraison: 1, transporteur: 'Chronopost', date_estimee: '2024-02-12', statut: 'Livrée'})
CREATE (l2:Livraison {id_livraison: 2, transporteur: 'DHL', date_estimee: '2024-02-18', statut: 'En préparation'})
CREATE (l3:Livraison {id_livraison: 3, transporteur: 'UPS', date_estimee: '2024-02-23', statut: 'En transit'})
CREATE (l4:Livraison {id_livraison: 4, transporteur: 'Chronopost', date_estimee: '2024-02-24', statut: 'Livrée'})
CREATE (l5:Livraison {id_livraison: 5, transporteur: 'DHL', date_estimee: '2024-03-04', statut: 'En préparation'});

// Create relationships
// Client -> Order relationships
MATCH (c:Client {id_client: 1}), (o:Commande {id_commande: 1})
CREATE (c)-[:PASSE]->(o);

MATCH (c:Client {id_client: 2}), (o:Commande {id_commande: 2})
CREATE (c)-[:PASSE]->(o);

MATCH (c:Client {id_client: 3}), (o:Commande {id_commande: 3})
CREATE (c)-[:PASSE]->(o);

MATCH (c:Client {id_client: 4}), (o:Commande {id_commande: 4})
CREATE (c)-[:PASSE]->(o);

MATCH (c:Client {id_client: 5}), (o:Commande {id_commande: 5})
CREATE (c)-[:PASSE]->(o);

// Order -> Product relationships with quantity
MATCH (o:Commande {id_commande: 1}), (p:Produit {id_produit: 1})
CREATE (o)-[:DETAIL {quantité: 1}]->(p);
MATCH (o:Commande {id_commande: 1}), (p:Produit {id_produit: 5})
CREATE (o)-[:DETAIL {quantité: 3}]->(p);

MATCH (o:Commande {id_commande: 2}), (p:Produit {id_produit: 2})
CREATE (o)-[:DETAIL {quantité: 1}]->(p);
MATCH (o:Commande {id_commande: 2}), (p:Produit {id_produit: 8})
CREATE (o)-[:DETAIL {quantité: 2}]->(p);
MATCH (o:Commande {id_commande: 2}), (p:Produit {id_produit: 10})
CREATE (o)-[:DETAIL {quantité: 4}]->(p);

MATCH (o:Commande {id_commande: 3}), (p:Produit {id_produit: 4})
CREATE (o)-[:DETAIL {quantité: 1}]->(p);

MATCH (o:Commande {id_commande: 4}), (p:Produit {id_produit: 6})
CREATE (o)-[:DETAIL {quantité: 1}]->(p);
MATCH (o:Commande {id_commande: 4}), (p:Produit {id_produit: 9})
CREATE (o)-[:DETAIL {quantité: 2}]->(p);

MATCH (o:Commande {id_commande: 5}), (p:Produit {id_produit: 1})
CREATE (o)-[:DETAIL {quantité: 1}]->(p);

// Product -> Supplier relationships with quantity
MATCH (p:Produit {id_produit: 1}), (f:Fournisseur {id_fournisseur: 2})
CREATE (p)-[:FOURNI_PAR {quantité: 50}]->(f);

MATCH (p:Produit {id_produit: 2}), (f:Fournisseur {id_fournisseur: 1})
CREATE (p)-[:FOURNI_PAR {quantité: 30}]->(f);

MATCH (p:Produit {id_produit: 3}), (f:Fournisseur {id_fournisseur: 2})
CREATE (p)-[:FOURNI_PAR {quantité: 40}]->(f);

MATCH (p:Produit {id_produit: 4}), (f:Fournisseur {id_fournisseur: 3})
CREATE (p)-[:FOURNI_PAR {quantité: 25}]->(f);

MATCH (p:Produit {id_produit: 5}), (f:Fournisseur {id_fournisseur: 4})
CREATE (p)-[:FOURNI_PAR {quantité: 60}]->(f);

MATCH (p:Produit {id_produit: 6}), (f:Fournisseur {id_fournisseur: 3})
CREATE (p)-[:FOURNI_PAR {quantité: 45}]->(f);

MATCH (p:Produit {id_produit: 7}), (f:Fournisseur {id_fournisseur: 3})
CREATE (p)-[:FOURNI_PAR {quantité: 50}]->(f);

MATCH (p:Produit {id_produit: 8}), (f:Fournisseur {id_fournisseur: 4})
CREATE (p)-[:FOURNI_PAR {quantité: 35}]->(f);

MATCH (p:Produit {id_produit: 9}), (f:Fournisseur {id_fournisseur: 3})
CREATE (p)-[:FOURNI_PAR {quantité: 40}]->(f);

MATCH (p:Produit {id_produit: 10}), (f:Fournisseur {id_fournisseur: 1})
CREATE (p)-[:FOURNI_PAR {quantité: 70}]->(f);

// Order -> Invoice relationships
MATCH (o:Commande {id_commande: 1}), (f:Facture {id_facture: 1})
CREATE (o)-[:FACTURE]->(f);

MATCH (o:Commande {id_commande: 2}), (f:Facture {id_facture: 2})
CREATE (o)-[:FACTURE]->(f);

MATCH (o:Commande {id_commande: 3}), (f:Facture {id_facture: 3})
CREATE (o)-[:FACTURE]->(f);

MATCH (o:Commande {id_commande: 4}), (f:Facture {id_facture: 4})
CREATE (o)-[:FACTURE]->(f);

MATCH (o:Commande {id_commande: 5}), (f:Facture {id_facture: 5})
CREATE (o)-[:FACTURE]->(f);

// Order -> Delivery relationships
MATCH (o:Commande {id_commande: 1}), (l:Livraison {id_livraison: 1})
CREATE (o)-[:LIVREE_PAR]->(l);

MATCH (o:Commande {id_commande: 2}), (l:Livraison {id_livraison: 2})
CREATE (o)-[:LIVREE_PAR]->(l);

MATCH (o:Commande {id_commande: 3}), (l:Livraison {id_livraison: 3})
CREATE (o)-[:LIVREE_PAR]->(l);

MATCH (o:Commande {id_commande: 4}), (l:Livraison {id_livraison: 4})
CREATE (o)-[:LIVREE_PAR]->(l);

MATCH (o:Commande {id_commande: 5}), (l:Livraison {id_livraison: 5})
CREATE (o)-[:LIVREE_PAR]->(l);

// Employee -> Order relationships (Order management)
MATCH (e:Employé {id_employe: 4}), (o:Commande {id_commande: 1})
CREATE (e)-[:GERE]->(o);

MATCH (e:Employé {id_employe: 4}), (o:Commande {id_commande: 3})
CREATE (e)-[:GERE]->(o);

MATCH (e:Employé {id_employe: 6}), (o:Commande {id_commande: 2})
CREATE (e)-[:GERE]->(o);

MATCH (e:Employé {id_employe: 6}), (o:Commande {id_commande: 4})
CREATE (e)-[:GERE]->(o);

MATCH (e:Employé {id_employe: 6}), (o:Commande {id_commande: 5})
CREATE (e)-[:GERE]->(o);

// Employee -> Agency relationships
MATCH (e:Employé {id_employe: 1}), (a:Agence {id_agence: 1})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

MATCH (e:Employé {id_employe: 2}), (a:Agence {id_agence: 1})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

MATCH (e:Employé {id_employe: 3}), (a:Agence {id_agence: 2})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

MATCH (e:Employé {id_employe: 4}), (a:Agence {id_agence: 2})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

MATCH (e:Employé {id_employe: 5}), (a:Agence {id_agence: 3})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

MATCH (e:Employé {id_employe: 6}), (a:Agence {id_agence: 3})
CREATE (e)-[:TRAVAILLE_DANS]->(a);

// Agency -> Director (Employee) relationships
MATCH (a:Agence {id_agence: 1}), (e:Employé {id_employe: 1})
CREATE (a)-[:DIRIGEE_PAR]->(e);

MATCH (a:Agence {id_agence: 2}), (e:Employé {id_employe: 2})
CREATE (a)-[:DIRIGEE_PAR]->(e);

MATCH (a:Agence {id_agence: 3}), (e:Employé {id_employe: 5})
CREATE (a)-[:DIRIGEE_PAR]->(e);