import mariadb from 'mariadb';

// Create a connection pool
const pool = mariadb.createPool({
    socketPath: '/var/run/mysqld/mysqld.sock',
    host: 'localhost',
    user: 'medaly',
    password: 'root',
    database: 'GLOBAL',
    connectionLimit: 10,
});

// Base query function
export async function executeQuery(query: string, params?: any[]) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, params);
    return rows;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}


// Clients
export async function getClients(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Clients ORDER BY nom_complet LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getClientById(id: string) {
return executeQuery('SELECT * FROM Clients WHERE id_client = ?', [id]);
}

// Employees
export async function getEmployees(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Employees ORDER BY nom_complet LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getEmployeeById(id: string) {
return executeQuery('SELECT * FROM Employees WHERE id_employe = ?', [id]);
}

// Agencies
export async function getAgencies(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Agences ORDER BY ville LIMIT ? OFFSET ?',
  [limit, offset]
);
}

export async function getAgencyById(id: string) {
return executeQuery('SELECT * FROM Agences WHERE id_agence = ?', [id]);
}

// Suppliers
export async function getSuppliers(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Fournisseurs ORDER BY nom_fournisseur LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getSupplierById(id: string) {
return executeQuery('SELECT * FROM Fournisseurs WHERE id_fournisseur = ?', [id]);
}

// Products
export async function getProducts(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Produits ORDER BY description LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getProductById(id: string) {
return executeQuery('SELECT * FROM Produits WHERE id_produit = ?', [id]);
}

export async function getProductsByCategory(category: string, limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Produits WHERE categorie = ? LIMIT ? OFFSET ?', 
  [category, limit, offset]
);
}

// Orders
export async function getOrders(limit = 100, offset = 0) {
return executeQuery(
  'SELECT c.*, cl.nom_complet as client_nom, e.nom_complet as employe_nom ' +
  'FROM Commandes c ' +
  'LEFT JOIN Clients cl ON c.client_ref = cl.id_client ' +
  'LEFT JOIN Employees e ON c.employe_ref = e.id_employe ' +
  'ORDER BY c.date_commande DESC LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getOrderById(id: string) {
return executeQuery(
  'SELECT c.*, cl.nom_complet as client_nom, e.nom_complet as employe_nom ' +
  'FROM Commandes c ' +
  'LEFT JOIN Clients cl ON c.client_ref = cl.id_client ' +
  'LEFT JOIN Employees e ON c.employe_ref = e.id_employe ' +
  'WHERE c.id_commande = ?', 
  [id]
);
}

export async function getOrdersForClient(clientId: string) {
return executeQuery(
  'SELECT c.*, cl.nom_complet as client_nom, e.nom_complet as employe_nom ' +
  'FROM Commandes c ' +
  'LEFT JOIN Clients cl ON c.client_ref = cl.id_client ' +
  'LEFT JOIN Employees e ON c.employe_ref = e.id_employe ' +
  'WHERE c.client_ref = ? ORDER BY c.date_commande DESC', 
  [clientId]
);
}

// Order Details
export async function getOrderDetails(orderId: string) {
return executeQuery(
  'SELECT d.*, p.description, p.prix_cout ' +
  'FROM Details_Commande d ' +
  'JOIN Produits p ON d.id_produit = p.id_produit ' +
  'WHERE d.id_commande = ?', 
  [orderId]
);
}

// Invoices
export async function getInvoices(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Factures ORDER BY date_facture DESC LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getInvoiceById(id: string) {
return executeQuery('SELECT * FROM Factures WHERE id_facture = ?', [id]);
}

// Deliveries
export async function getDeliveries(limit = 100, offset = 0) {
return executeQuery(
  'SELECT * FROM Livraisons ORDER BY data_estimee DESC LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

export async function getDeliveryById(id: string) {
return executeQuery('SELECT * FROM Livraisons WHERE id_livraison = ?', [id]);
}

// Supply Chain
export async function getSupplyChain(limit = 100, offset = 0) {
return executeQuery(
  'SELECT a.*, p.description as produit_description, f.nom_fournisseur ' +
  'FROM Approvisionnement a ' +
  'JOIN Produits p ON a.id_produit = p.id_produit ' +
  'JOIN Fournisseurs f ON a.id_fournisseur = f.id_fournisseur ' +
  'LIMIT ? OFFSET ?', 
  [limit, offset]
);
}

// Product categories
export async function getCategories() {
return executeQuery('SELECT DISTINCT categorie FROM Produits ORDER BY categorie');
}

// Analytics query examples
export async function getSalesBySource() {
return executeQuery(`
  SELECT 
    source_system,
    COUNT(*) as order_count,
    SUM(montant) as total_sales
  FROM Commandes
  GROUP BY source_system
  ORDER BY total_sales DESC
`);
}

export async function getTopSellingProducts(limit = 10) {
return executeQuery(`
  SELECT 
    p.id_produit,
    p.description,
    p.categorie,
    p.source_system,
    SUM(d.quantite) as total_sold
  FROM Details_Commande d
  JOIN Produits p ON d.id_produit = p.id_produit
  GROUP BY p.id_produit, p.description, p.categorie, p.source_system
  ORDER BY total_sold DESC
  LIMIT ?
`, [limit]);
}

export default {
    executeQuery,
    getClients,
    getClientById,
    getEmployees,
    getEmployeeById,
    getAgencies,
    getAgencyById,
    getSuppliers,
    getSupplierById,
    getProducts,
    getProductById,
    getProductsByCategory,
    getOrders,
    getOrderById,
    getOrdersForClient,
    getOrderDetails,
    getInvoices,
    getInvoiceById,
    getDeliveries,
    getDeliveryById,
    getSupplyChain,
    getCategories,
    getSalesBySource,
    getTopSellingProducts
};