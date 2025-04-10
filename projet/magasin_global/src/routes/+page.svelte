<script lang="ts">
  import { Card, Button, Heading, Tabs, TabItem } from 'flowbite-svelte';
  import { ArrowRightOutline, ShoppingBagOutline, UsersOutline, ChartMixedOutline, TruckOutline, CreditCardSolid } from 'flowbite-svelte-icons';
  import type { PageProps } from './$types';
  
  // Get data from page load function
  let { data }: PageProps = $props();
  let summaryStats = $state(data.summaryStats);
  let recentOrders = $state(data.recentOrders || []);
  let topProducts = $state(data.topProducts || []);
  let salesBySource = $state(data.salesBySource || []);
  let loading = $state(data.loading || false);
  let error = $state(data.error);
  
  let activeTab = $state(0);
  
  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  // Format number with commas
  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<div class="p-2 bg-gray-900 min-h-screen">
  <div class="mb-3">
    <Heading tag="h1" class="text-primary-500 mb-2">MAGASIN Global Dashboard</Heading>
    <p class="text-gray-300">Integrated View of Store Operations</p>
  </div>
  
  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-900 text-blue-300 mr-4">
          <UsersOutline class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Clients</p>
          <p class="text-xl font-bold text-white">{formatNumber(summaryStats.clientCount)}</p>
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
          <p class="text-xl font-bold text-white">{formatNumber(summaryStats.productCount)}</p>
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
          <p class="text-xl font-bold text-white">{formatNumber(summaryStats.employeeCount)}</p>
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
          <p class="text-xl font-bold text-white">{formatNumber(summaryStats.totalOrders)}</p>
        </div>
      </div>
    </Card>
    
    <Card padding="sm" class="bg-gray-800 border-gray-700">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-primary-900 text-primary-300 mr-4">
          <CreditCardSolid class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-gray-400">Total Sales</p>
          <p class="text-xl font-bold text-white">{formatCurrency(summaryStats.totalSales)}</p>
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
          <p class="text-xl font-bold text-white">{formatNumber(summaryStats.pendingDeliveries)}</p>
        </div>
      </div>
    </Card>
  </div>
  
  <!-- Navigation to Data Views -->
  <Card class="w-full mb-6 bg-gray-800 border-gray-700" size="xl">
    <Heading tag="h2" class="mb-4 text-white">Data Views</Heading>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
  
  <!-- Analytics Tabs >
  <Card class="bg-gray-800 border-gray-700" size="xl">
    <Heading tag="h2" class="mb-4 text-white">Business Analytics</Heading>
    <Tabs style="underline" >
      <TabItem open title="Sales Analysis">
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">Sales Analysis Chart would appear here</p>
          <-- In a real app, you would add a chart component here ->
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
  </Card-->
</div>