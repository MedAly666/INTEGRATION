<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Heading, Select } from 'flowbite-svelte';
  
  let selectedYear = '2024';
  let sourceSystems = ['All', 'SQL', 'NEO4J', 'XML'];
  let selectedSource = 'All';
  
  // Mock data - would come from database in production
  let salesData = [
    { month: '2024-01', order_count: 124, total_sales: 12560.45, unique_customers: 98, source_system: 'SQL', average_order_value: 101.29 },
    { month: '2024-01', order_count: 85, total_sales: 9720.30, unique_customers: 64, source_system: 'NEO4J', average_order_value: 114.36 },
    { month: '2024-01', order_count: 42, total_sales: 3150.75, unique_customers: 38, source_system: 'XML', average_order_value: 75.02 },
    { month: '2024-02', order_count: 136, total_sales: 14230.80, unique_customers: 102, source_system: 'SQL', average_order_value: 104.64 },
    { month: '2024-02', order_count: 92, total_sales: 10480.50, unique_customers: 71, source_system: 'NEO4J', average_order_value: 113.92 },
    { month: '2024-02', order_count: 38, total_sales: 2860.25, unique_customers: 32, source_system: 'XML', average_order_value: 75.27 },
    // Add more mock data as needed
  ];
  
  $: filteredSalesData = salesData.filter(item => {
    const yearMatches = item.month.startsWith(selectedYear);
    const sourceMatches = selectedSource === 'All' || item.source_system === selectedSource;
    return yearMatches && sourceMatches;
  });
  
  $: totalSales = filteredSalesData.reduce((sum, item) => sum + item.total_sales, 0);
  $: totalOrders = filteredSalesData.reduce((sum, item) => sum + item.order_count, 0);
  $: averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  onMount(() => {
    // In a real app, you would fetch data here:
    // fetch('/api/analytics/sales').then(r => r.json()).then(data => salesData = data);
    
    // Initialize chart
    renderChart();
  });
  
  function renderChart() {
    // In a real app, you would use a chart library like Chart.js or D3.js
    // For example with Chart.js:
    // 
    // new Chart(document.getElementById('salesChart'), {
    //   type: 'bar',
    //   data: {
    //     labels: filteredSalesData.map(d => d.month),
    //     datasets: [{
    //       label: 'Sales',
    //       data: filteredSalesData.map(d => d.total_sales),
    //       backgroundColor: '#fe795d'
    //     }]
    //   }
    // });
  }
  
  $effect(() => {
    if (typeof window !== 'undefined') {
      renderChart();
    }
  });
</script>

<div>
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
    <div>
      <Heading tag="h1" class="text-primary-500 mb-2">Sales Analysis</Heading>
      <p class="text-gray-300">Monthly sales trends and comparison</p>
    </div>
    
    <div class="flex gap-4 mt-4 md:mt-0">
      <Select bind:value={selectedYear} class="w-40">
        <option value="2023">2023</option>
        <option value="2024">2024</option>
      </Select>
      
      <Select bind:value={selectedSource} class="w-40">
        {#each sourceSystems as source}
          <option value={source}>{source}</option>
        {/each}
      </Select>
    </div>
  </div>
  
  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex flex-col items-center p-2">
        <p class="text-gray-400 text-sm">Total Sales</p>
        <p class="text-white text-2xl font-bold">€{totalSales.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex flex-col items-center p-2">
        <p class="text-gray-400 text-sm">Total Orders</p>
        <p class="text-white text-2xl font-bold">{totalOrders}</p>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex flex-col items-center p-2">
        <p class="text-gray-400 text-sm">Average Order Value</p>
        <p class="text-white text-2xl font-bold">€{averageOrderValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
      </div>
    </Card>
  </div>
  
  <!-- Chart -->
  <Card class="bg-gray-800 border-gray-700">
    <div class="p-4">
      <canvas id="salesChart" class="w-full h-80 bg-gray-900 p-4 rounded"></canvas>
      
      <!-- Placeholder for when charts are not implemented -->
      <div class="absolute inset-0 flex items-center justify-center">
        <p class="text-gray-400">Sales chart would render here with actual library integration</p>
      </div>
    </div>
  </Card>
  
  <!-- Data Table -->
  <Card class="bg-gray-800 border-gray-700 mt-6">
    <table class="w-full text-sm text-left text-gray-300">
      <thead class="text-xs uppercase bg-gray-700 text-gray-300">
        <tr>
          <th class="px-6 py-3">Month</th>
          <th class="px-6 py-3">Source</th>
          <th class="px-6 py-3">Orders</th>
          <th class="px-6 py-3">Sales</th>
          <th class="px-6 py-3">Customers</th>
          <th class="px-6 py-3">Avg Order</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredSalesData as item}
          <tr class="border-b border-gray-700">
            <td class="px-6 py-4">{item.month}</td>
            <td class="px-6 py-4">{item.source_system}</td>
            <td class="px-6 py-4">{item.order_count}</td>
            <td class="px-6 py-4">€{item.total_sales.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            <td class="px-6 py-4">{item.unique_customers}</td>
            <td class="px-6 py-4">€{item.average_order_value.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
</div>