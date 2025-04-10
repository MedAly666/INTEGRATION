import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    // Fetch dashboard data from API endpoint
    const response = await fetch('/api/dashboard');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      ...data,
      loading: false,
      error: null
    };
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    
    // Return default values if there's an error
    return {
      summaryStats: {
        clientCount: 0,
        productCount: 0,
        employeeCount: 0,
        totalOrders: 0,
        totalSales: 0,
        pendingDeliveries: 0
      },
      recentOrders: [],
      topProducts: [],
      salesBySource: [],
      loading: false,
      error: err instanceof Error ? err.message : 'An unknown error occurred'
    };
  }
};