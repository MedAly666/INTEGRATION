<script lang="ts">
  import type { PageProps } from './$types';
  import { Heading, Button, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { FilterOutline, ArrowDownOutline } from 'flowbite-svelte-icons';
  import DataTable from '$lib/components/DataTable.svelte';
  import type { Produit } from "$lib/types/database";
  import { goto } from '$app/navigation';

  let { data }: PageProps = $props();
  // State
  let products = $state(data.products as Produit[]); // Extend Produit with optional fields
  let loading = $state(data.loading as boolean);
  let selectedSource = $state('all');
  let selectedCategory = $state('all');
  let categories = $state<string[]>([]);

  // Column configuration - matching the database schema
  const columns = [
    { key: 'id_produit', label: 'Product ID', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'prix_cout', label: 'Price', sortable: true, format: formatPrice },
    { key: 'categorie', label: 'Category', sortable: true, badge: 'category' },
    { key: 'source_system', label: 'Source', sortable: true, badge: 'source' }
  ];

  // Badge color configuration
  const badgeColors = {
    source: {
      'SQL': 'blue',
      'NEO4J': 'green',
      'XML': 'purple'
    },
    category: {
      'Electronics': 'purple',
      'Clothing': 'blue',
      'Furniture': 'green',
      'Books': 'yellow',
      'Toys': 'red'
    }
  };
  

  // Handle product row click
  function handleProductClick(event: CustomEvent<Produit>) {
    const product = event.detail;
    goto(`/products/${product.id_produit}`);
  }

  // Formatting helper functions
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  
</script>

<div class="space-y-6">
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
    <div>
      <Heading tag="h1" class="text-primary-500 mb-2">Products</Heading>
      <p class="text-gray-300">View and manage all products from integrated systems</p>
    </div>
  </div>
  

  <DataTable 
    title="Products List"
    data={products}
    columns={columns}
    loading={loading}
    searchable={true}
    paginated={true}
    pageSize={15}
    emptyMessage="No products found"
    badgeColors={badgeColors}
    on:rowClick={handleProductClick}
    striped={true}
    hover={true}
  />
</div>
