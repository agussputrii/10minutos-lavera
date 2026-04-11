import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  const products = [
    {
      name: "Vaporesso XROS 3",
      description: "Kit de vapeo pod de alta calidad con batería de 1000mAh.",
      price: 45000,
      category: "Equipos",
      image_url: "https://via.placeholder.com/300?text=XROS3",
      offer: true,
      stock: 15
    },
    {
      name: "Elf Bar BC5000",
      description: "Desechable con 5000 caladas y sabores intensos.",
      price: 25000,
      category: "Desechables",
      image_url: "https://via.placeholder.com/300?text=ELFBAR",
      offer: false,
      stock: 0
    },
    {
      name: "Saltnic Mango Peach",
      description: "Sal de nicotina 30mg, sabor tropical refrescante.",
      price: 8000,
      category: "Líquidos",
      image_url: "https://via.placeholder.com/300?text=SALTNIC",
      offer: true,
      stock: 50
    },
    {
      name: "Smok Nord 5",
      description: "Pod mod potente con pantalla y ajuste de wattage.",
      price: 60000,
      category: "Equipos",
      image_url: "https://via.placeholder.com/300?text=NORD5",
      offer: false,
      stock: 8
    },
    {
      name: "Freebase Vanilla Custard",
      description: "Líquido 3mg para vapeo sub-ohm, cremoso y suave.",
      price: 6500,
      category: "Líquidos",
      image_url: "https://via.placeholder.com/300?text=VANILLA",
      offer: false,
      stock: 20
    }
  ];

  const { data, error } = await supabase.from('products').insert(products);

  if (error) {
    console.error('Error insertando productos:', error);
  } else {
    console.log('Productos insertados exitosamente:', data);
  }
}

seed();
