import { json } from '@sveltejs/kit';
import { getClients, getProducts, getEmployees, getOrders, getDeliveries, executeQuery } from '$lib/mariadb';

// Helper for BigInt serialization
function handleBigInt(data: any): any {
  if (Array.isArray(data)) {
    return data.map(handleBigInt);
  } else if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'bigint' ? Number(value) : handleBigInt(value),
      ])
    );
  }
  return typeof data === 'bigint' ? Number(data) : data;
}

export async function GET() {
  try {
    // Get counts using Promise.all for parallel execution
    const [
      clientsCount,
      productsCount,
      employeesCount,
      ordersData,
      pendingDeliveries
    ] = await Promise.all([
      // Get client count
      executeQuery('SELECT COUNT(*) as count FROM Clients'),
      
      // Get product count
      executeQuery('SELECT COUNT(*) as count FROM Produits'),
      
      // Get employee count
      executeQuery('SELECT COUNT(*) as count FROM Employees'),
      
      // Get orders data (count and total sales)
      executeQuery(`
        SELECT 
          COUNT(*) as count,
          SUM(montant) as total_sales
        FROM Commandes
      `),
      
      // Get pending deliveries count
      executeQuery(`
        SELECT COUNT(*) as count 
        FROM Livraisons 
        WHERE statut = 'pending'
      `)
    ]);

    // Construct the summary stats object
    const summaryStats = {
      clientCount: Number(clientsCount[0].count),
      productCount: Number(productsCount[0].count),
      employeeCount: Number(employeesCount[0].count),
      totalOrders: Number(ordersData[0].count),
      totalSales: Number(ordersData[0].total_sales || 0),
      pendingDeliveries: Number(pendingDeliveries[0].count)
    };
    
    // Get recent orders for display
    const recentOrders = handleBigInt(await getOrders(5, 0));
    
    // Get top selling products
    const topProducts = handleBigInt(await executeQuery(`
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
      LIMIT 5
    `));
    
    // Get sales by source system
    const salesBySource = handleBigInt(await executeQuery(`
      SELECT 
        source_system,
        COUNT(*) as order_count,
        SUM(montant) as total_sales
      FROM Commandes
      GROUP BY source_system
      ORDER BY total_sales DESC
    `));

    return json({
      summaryStats,
      recentOrders,
      topProducts,
      salesBySource
    });
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    return json({ 
      error: `Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}