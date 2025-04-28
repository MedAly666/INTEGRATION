<script lang="ts">
  import '../app.css';
  import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
  import {  ChartPieSolid, UsersOutline, ShoppingBagOutline, TruckOutline, ReceiptOutline, ChartMixedOutline } from 'flowbite-svelte-icons';
  
  let { children } = $props();
  let activeUrl = '';
  
  $effect(() => {
    if (typeof window !== 'undefined') {
      activeUrl = window.location.pathname;
    }
  });
</script>

<div class="flex h-screen bg-gray-900">
  <Sidebar class="z-40 w-64">
    <SidebarWrapper class="bg-gray-800 h-full">
      <div class="px-4 py-6 border-b border-gray-700">
        <h2 class="text-xl font-bold text-white">MAGASIN GLOBAL</h2>
        <p class="text-sm text-gray-400">Integrated Data View</p>
      </div>
      
      <SidebarGroup>
        <SidebarItem label="Dashboard" href="/" active={activeUrl === '/'}>
          <svelte:fragment slot="icon">
            <ChartPieSolid class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Clients" href="/clients" active={activeUrl.includes('/clients')}>
          <svelte:fragment slot="icon">
            <UsersOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Employees" href="/employees" active={activeUrl.includes('/employees')}>
          <svelte:fragment slot="icon">
            <UsersOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Products" href="/products" active={activeUrl.includes('/products')}>
          <svelte:fragment slot="icon">
            <ShoppingBagOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Suppliers" href="/suppliers" active={activeUrl.includes('/suppliers')}>
          <svelte:fragment slot="icon">
            <TruckOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Orders" href="/orders" active={activeUrl.includes('/orders')}>
          <svelte:fragment slot="icon">
            <ReceiptOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
        
        <SidebarItem label="Analytics" href="/analytics" active={activeUrl.includes('/analytics')}>
          <svelte:fragment slot="icon">
            <ChartMixedOutline class="w-5 h-5 text-gray-400" />
          </svelte:fragment>
        </SidebarItem>
      </SidebarGroup>
    </SidebarWrapper>
  </Sidebar>
  
  <main class="flex-1 overflow-auto bg-gray-900 text-white p-4">
    {@render children()}
  </main>
</div>

