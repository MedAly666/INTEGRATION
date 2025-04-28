<script lang="ts">
  import { Card, Button, Heading, Tabs, TabItem } from 'flowbite-svelte';
  import { ArrowRightOutline, ShoppingBagOutline, UsersOutline, ChartMixedOutline, TruckOutline, MoneyOutline } from 'flowbite-svelte-icons';
  import { onMount } from 'svelte';
  
  let activeTab = 0;
  
  // Mock data - replace with actual database calls in production
  let summaryStats = {
    clientCount: 248,
    productCount: 532,
    employeeCount: 87,
    totalOrders: 1432,
    totalSales: 156789.45,
    pendingDeliveries: 28
  };
  
  onMount(() => {
    // In a real app, you would fetch data here
    // Example: fetch('/api/dashboard-summary').then(r => r.json()).then(data => summaryStats = data);
  });
</script>

<div class="p-4 bg-gray-900 min-h-screen">
  <div class="mb-6">
    <Heading tag="h1" class="text-primary-500 mb-2">MAGASIN Global Dashboard</Heading>
    <p class="text-gray-300">Integrated View of Store Operations</p>
  </div>
  
  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-900 text-blue-300 mr-4">
          <UsersOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Clients</p>
          <p class="text-xl font-bold text-white">{summaryStats.clientCount}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-green-900 text-green-300 mr-4">
          <ShoppingBagOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Products</p>
          <p class="text-xl font-bold text-white">{summaryStats.productCount}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-purple-900 text-purple-300 mr-4">
          <UsersOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Employees</p>
          <p class="text-xl font-bold text-white">{summaryStats.employeeCount}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-yellow-900 text-yellow-300 mr-4">
          <ChartMixedOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Orders</p>
          <p class="text-xl font-bold text-white">{summaryStats.totalOrders}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-primary-900 text-primary-300 mr-4">
          <MoneyOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Sales</p>
          <p class="text-xl font-bold text-white">€{summaryStats.totalSales.toLocaleString()}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-red-900 text-red-300 mr-4">
          <TruckOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Pending Deliveries</p>
          <p class="text-xl font-bold text-white">{summaryStats.pendingDeliveries}</p>
        </div>
      </div>
    </Card>
  </div>
  
  <!-- Navigation to Data Views -->
  <Card class="mb-6 bg-gray-800 border-gray-700">
    <Heading tag="h2" class="mb-4 text-white">Data Views</Heading>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Button href="/clients" color="dark" class="flex justify-between items-center">
        Clients <ArrowRightOutline />
      </Button>
      
      <Button href="/employees" color="dark" class="flex justify-between items-center">
        Employees <ArrowRightOutline />
      </Button>
      
      <Button href="/products" color="dark" class="flex justify-between items-center">
        Products <ArrowRightOutline />
      </Button>
      
      <Button href="/suppliers" color="dark" class="flex justify-between items-center">
        Suppliers <ArrowRightOutline />
      </Button>
      
      <Button href="/orders" color="dark" class="flex justify-between items-center">
        Orders <ArrowRightOutline />
      </Button>
      
      <Button href="/invoices" color="dark" class="flex justify-between items-center">
        Invoices <ArrowRightOutline />
      </Button>
    </div>
  </Card>
  
  <!-- Analytics Tabs -->
  <Card class="bg-gray-800 border-gray-700">
    <Heading tag="h2" class="mb-4 text-white">Business Analytics</Heading>
    <Tabs style="underline" bind:activeTab>
      <TabItem open title="Sales Analysis">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Sales Analysis Chart would appear here</p>
          <!-- In a real app, you would add a chart component here -->
        </div>
      </TabItem>
      
      <TabItem title="Inventory Status">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Inventory Status Chart would appear here</p>
        </div>
      </TabItem>
      
      <TabItem title="Employee Performance">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Employee Performance Chart would appear here</p>
        </div>
      </TabItem>
      
      <TabItem title="Customer Activity">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Customer Activity Chart would appear here</p>
        </div>
      </TabItem>
      
      <TabItem title="Product Popularity">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Product Popularity Chart would appear here</p>
        </div>
      </TabItem>
    </Tabs>
  </Card>
</div>