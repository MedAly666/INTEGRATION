<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte';
	import {  ChartPieSolid, UsersOutline, ShoppingBagOutline, TruckOutline, ReceiptOutline,  FileInvoiceSolid, ChartMixedOutline } from 'flowbite-svelte-icons';
	
	let { children } = $props();

	let spanClass = 'flex-1 ms-3 whitespace-nowrap text-white hover:text-grey-400';
	let activeClass = 'flex items-center p-2 text-base font-normal text-primary-900 bg-primary-200 dark:bg-primary-700 rounded-lg dark:text-white hover:bg-primary-100 dark:hover:bg-gray-700';
	let nonActiveClass = 'flex items-center p-2 text-base font-normal text-green-900 rounded-lg dark:text-white hover:bg-green-100 dark:hover:bg-green-700';

	let activeUrl = $derived( page.url.pathname );

  </script>
  
  <div class="dark flex h-screen bg-gray-900">
	<Sidebar class="z-40 w-64" {activeClass} {nonActiveClass} {activeUrl}>
	  <SidebarWrapper class="bg-gray-800 h-full">
		<div class="px-4 py-6 border-b border-gray-700">
		  <h2 class="text-xl font-bold text-white">MAGASIN GLOBAL</h2>
		  <p class="text-sm text-white">Integrated Data View</p>
		</div>
		
		<SidebarGroup>
			<SidebarItem label="Dashboard" href="/" >
			  <svelte:fragment slot="icon">
				<ChartPieSolid class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<SidebarItem label="Clients" href="/clients" >
			  <svelte:fragment slot="icon">
				<UsersOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<SidebarItem label="Employees" href="/employees">
			  <svelte:fragment slot="icon">
				<UsersOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<SidebarItem label="Products" href="/products" >
			  <svelte:fragment slot="icon">
				<ShoppingBagOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<SidebarItem label="Suppliers" href="/suppliers" >
			  <svelte:fragment slot="icon">
				<TruckOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<SidebarItem label="Orders" href="/orders" >
			  <svelte:fragment slot="icon">
				<ReceiptOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>

			<SidebarItem label="Invoices" href="/invoices">
			  <svelte:fragment slot="icon">
				<FileInvoiceSolid class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>

			<SidebarItem label="Supply Chain" href="/supplies">
			  <svelte:fragment slot="icon">
				<TruckOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem>
			
			<!--SidebarItem label="Analytics" href="/analytics">
			  <svelte:fragment slot="icon">
				<ChartMixedOutline class="w-5 h-5 " />
			  </svelte:fragment>
			</SidebarItem-->
		  </SidebarGroup>




		
	  </SidebarWrapper>
	</Sidebar>
	
	<main class="w-full overflow-auto bg-gray-900 text-white p-2">
	  {@render children()}
	</main>
  </div>
  
  