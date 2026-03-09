/**
 * Seed inicial de la base de datos.
 * Carga los datos mínimos para que el sistema funcione:
 *   - Roles
 *   - Usuario Admin
 *   - Categorías base
 *   - Métodos de envío
 *
 * Ejecutar con: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Roles ────────────────────────────────────────────────────────────────

  const roles = await Promise.all([
    prisma.rol.upsert({ where: { nombre: 'Admin' }, update: {}, create: { nombre: 'Admin' } }),
    prisma.rol.upsert({ where: { nombre: 'Operador' }, update: {}, create: { nombre: 'Operador' } }),
    prisma.rol.upsert({ where: { nombre: 'Cliente Mayorista' }, update: {}, create: { nombre: 'Cliente Mayorista' } }),
    prisma.rol.upsert({ where: { nombre: 'Cliente Minorista' }, update: {}, create: { nombre: 'Cliente Minorista' } }),
  ]);
  console.log('✅ Roles creados:', roles.map((r) => r.nombre).join(', '));

  // ─── Usuario Admin ────────────────────────────────────────────────────────

  const rolAdmin = roles.find((r) => r.nombre === 'Admin')!;
  const passwordHash = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@terrana.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Terrana',
      email: 'admin@terrana.com',
      password: passwordHash,
      rol_id: rolAdmin.id,
      activo: true,
      aprobado: true,
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // ─── Categorías ───────────────────────────────────────────────────────────

  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { nombre: 'Aceites' }, update: {}, create: { nombre: 'Aceites' } }),
    prisma.categoria.upsert({ where: { nombre: 'Aceitunas' }, update: {}, create: { nombre: 'Aceitunas' } }),
    prisma.categoria.upsert({ where: { nombre: 'Pastas' }, update: {}, create: { nombre: 'Pastas' } }),
    prisma.categoria.upsert({ where: { nombre: 'Acetos Balsámicos' }, update: {}, create: { nombre: 'Acetos Balsámicos' } }),
    prisma.categoria.upsert({ where: { nombre: 'Condimentos' }, update: {}, create: { nombre: 'Condimentos' } }),
  ]);
  console.log('✅ Categorías creadas:', categorias.map((c) => c.nombre).join(', '));

  // ─── Orígenes ─────────────────────────────────────────────────────────────

  await Promise.all([
    prisma.origen.upsert({ where: { nombre: 'Argentina' }, update: {}, create: { nombre: 'Argentina' } }),
    prisma.origen.upsert({ where: { nombre: 'España' }, update: {}, create: { nombre: 'España' } }),
    prisma.origen.upsert({ where: { nombre: 'Italia' }, update: {}, create: { nombre: 'Italia' } }),
    prisma.origen.upsert({ where: { nombre: 'Grecia' }, update: {}, create: { nombre: 'Grecia' } }),
    prisma.origen.upsert({ where: { nombre: 'Chile' }, update: {}, create: { nombre: 'Chile' } }),
  ]);
  console.log('✅ Orígenes creados');

  // ─── Métodos de envío ─────────────────────────────────────────────────────

  await Promise.all([
    prisma.metodoEnvio.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nombre: 'Retiro en el local',
        descripcion: 'Pasá a buscar tu pedido en nuestro local',
        costo: 0,
        activo: true,
      },
    }),
    prisma.metodoEnvio.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nombre: 'Envío a domicilio (Moto)',
        descripcion: 'Entrega en el día para CABA y GBA',
        costo: 1500,
        gratis_desde: 20000,
        activo: true,
      },
    }),
  ]);
  console.log('✅ Métodos de envío creados');

  // ─── Etiquetas ────────────────────────────────────────────────────────────

  await Promise.all([
    prisma.etiqueta.upsert({ where: { slug: 'sin-tacc' }, update: {}, create: { nombre: 'Sin TACC', slug: 'sin-tacc', color: '#6b8560' } }),
    prisma.etiqueta.upsert({ where: { slug: 'organico' }, update: {}, create: { nombre: 'Orgánico', slug: 'organico', color: '#4a5c3f' } }),
    prisma.etiqueta.upsert({ where: { slug: 'nuevo' }, update: {}, create: { nombre: 'Nuevo', slug: 'nuevo', color: '#3a6b8a' } }),
    prisma.etiqueta.upsert({ where: { slug: 'mas-vendido' }, update: {}, create: { nombre: 'Más vendido', slug: 'mas-vendido', color: '#594d0e' } }),
    prisma.etiqueta.upsert({ where: { slug: 'oferta' }, update: {}, create: { nombre: 'Oferta', slug: 'oferta', color: '#9b3a2f' } }),
    prisma.etiqueta.upsert({ where: { slug: 'importado' }, update: {}, create: { nombre: 'Importado', slug: 'importado', color: '#4a4535' } }),
  ]);
  console.log('✅ Etiquetas creadas');

  // ─── Marcas ───────────────────────────────────────────────────────────────

  const marcas = await Promise.all([
    prisma.marca.upsert({ where: { nombre: 'Terrana' },       update: {}, create: { nombre: 'Terrana' } }),
    prisma.marca.upsert({ where: { nombre: 'Frantoio' },      update: {}, create: { nombre: 'Frantoio' } }),
    prisma.marca.upsert({ where: { nombre: 'De Cecco' },      update: {}, create: { nombre: 'De Cecco' } }),
    prisma.marca.upsert({ where: { nombre: 'Monari' },        update: {}, create: { nombre: 'Monari' } }),
    prisma.marca.upsert({ where: { nombre: 'Kalamata Gold' }, update: {}, create: { nombre: 'Kalamata Gold' } }),
  ]);
  console.log('✅ Marcas creadas:', marcas.map((m) => m.nombre).join(', '));

  // ─── Presentaciones ───────────────────────────────────────────────────────

  const presentaciones = await Promise.all([
    prisma.presentacion.upsert({ where: { nombre: 'Botella 250ml' },  update: {}, create: { nombre: 'Botella 250ml' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Botella 500ml' },  update: {}, create: { nombre: 'Botella 500ml' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Botella 750ml' },  update: {}, create: { nombre: 'Botella 750ml' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Frasco 200g' },    update: {}, create: { nombre: 'Frasco 200g' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Frasco 350g' },    update: {}, create: { nombre: 'Frasco 350g' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Paquete 250g' },   update: {}, create: { nombre: 'Paquete 250g' } }),
    prisma.presentacion.upsert({ where: { nombre: 'Paquete 500g' },   update: {}, create: { nombre: 'Paquete 500g' } }),
  ]);
  console.log('✅ Presentaciones creadas:', presentaciones.map((p) => p.nombre).join(', '));

  // ─── Orígenes (IDs para lookup) ───────────────────────────────────────────

  const origenes = await prisma.origen.findMany();
  const origenById = (nombre: string) => origenes.find((o) => o.nombre === nombre)!.id;

  const catById   = (nombre: string) => categorias.find((c) => c.nombre === nombre)!.id;
  const marcaById = (nombre: string) => marcas.find((m) => m.nombre === nombre)!.id;
  const presById  = (nombre: string) => presentaciones.find((p) => p.nombre === nombre)!.id;

  // ─── Productos ────────────────────────────────────────────────────────────

  const productosData = [
    {
      nombre: 'Aceite de Oliva Extra Virgen',
      descripcion: 'Primera extracción en frío. Cosecha temprana. Frutado intenso con notas de almendra verde.',
      uso_recomendado: 'Ideal para aderezar ensaladas, carpaccios y consumir en crudo.',
      categoria_id: catById('Aceites'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Botella 500ml'),
      origen_id: origenById('Argentina'),
      costo: 2800,
      precio_venta_may: 3900,
      precio_venta_min: 5200,
      stock: 80,
    },
    {
      nombre: 'Aceite de Oliva Arbequina',
      descripcion: 'Varietal 100% Arbequina. Suave y afrutado, aroma a manzana verde y almendra.',
      uso_recomendado: 'Perfecto para pescados, mariscos y pastas suaves.',
      categoria_id: catById('Aceites'),
      marca_id: marcaById('Frantoio'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('España'),
      costo: 2200,
      precio_venta_may: 3100,
      precio_venta_min: 4200,
      precio_promo: 3800,
      stock: 60,
    },
    {
      nombre: 'Aceite de Oliva con Trufa Negra',
      descripcion: 'Aceite de oliva extra virgen infusionado con trufa negra (Tuber melanosporum).',
      uso_recomendado: 'Unas gotas sobre pasta, risotto, huevos o carnes a la parrilla.',
      categoria_id: catById('Aceites'),
      marca_id: marcaById('Frantoio'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('Italia'),
      costo: 4500,
      precio_venta_may: 6200,
      precio_venta_min: 8500,
      stock: 30,
    },
    {
      nombre: 'Aceite de Oliva con Limón Siciliano',
      descripcion: 'Olivas y limones cosechados y prensados juntos. Agradablemente cítrico.',
      uso_recomendado: 'Ensaladas, mariscos, pollo a la plancha.',
      categoria_id: catById('Aceites'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('Italia'),
      costo: 3200,
      precio_venta_may: 4400,
      precio_venta_min: 6000,
      stock: 45,
    },
    {
      nombre: 'Aceitunas Verdes Rellenas con Pimiento',
      descripcion: 'Aceitunas Manzanilla descarozadas y rellenas con pasta de pimiento rojo asado.',
      uso_recomendado: 'Tabla de fiambres, martinis, aperitivo.',
      categoria_id: catById('Aceitunas'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 350g'),
      origen_id: origenById('Argentina'),
      costo: 1100,
      precio_venta_may: 1600,
      precio_venta_min: 2200,
      stock: 120,
    },
    {
      nombre: 'Aceitunas Negras Curadas en Aceite',
      descripcion: 'Aceitunas negras tipo arauco curadas en seco y conservadas en aceite de oliva con hierbas.',
      uso_recomendado: 'Antipasto, ensaladas, focaccia.',
      categoria_id: catById('Aceitunas'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 350g'),
      origen_id: origenById('Argentina'),
      costo: 1000,
      precio_venta_may: 1450,
      precio_venta_min: 1980,
      stock: 100,
    },
    {
      nombre: 'Aceitunas Kalamata DOP',
      descripcion: 'Aceitunas griegas Kalamata con Denominación de Origen. Sabor intenso y almendrado.',
      uso_recomendado: 'Ensalada griega, tapas, quesos.',
      categoria_id: catById('Aceitunas'),
      marca_id: marcaById('Kalamata Gold'),
      presentacion_id: presById('Frasco 350g'),
      origen_id: origenById('Grecia'),
      costo: 1800,
      precio_venta_may: 2600,
      precio_venta_min: 3500,
      stock: 55,
    },
    {
      nombre: 'Aceitunas Mixtas Marinadas',
      descripcion: 'Mix de aceitunas verdes y negras marinadas en aceite, ajo, romero y cáscara de naranja.',
      uso_recomendado: 'Aperitivo, tabla de fiambres y quesos.',
      categoria_id: catById('Aceitunas'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 350g'),
      origen_id: origenById('Argentina'),
      costo: 1300,
      precio_venta_may: 1850,
      precio_venta_min: 2500,
      stock: 75,
    },
    {
      nombre: 'Pasta Tagliatelle al Huevo',
      descripcion: 'Tagliatelle artesanal elaborado con sémola de trigo candeal y huevo fresco. Secado lento a baja temperatura.',
      uso_recomendado: 'Salsas a base de carne, bolognesa, ragù.',
      categoria_id: catById('Pastas'),
      marca_id: marcaById('De Cecco'),
      presentacion_id: presById('Paquete 250g'),
      origen_id: origenById('Italia'),
      costo: 1600,
      precio_venta_may: 2200,
      precio_venta_min: 3000,
      stock: 90,
    },
    {
      nombre: 'Pasta Pappardelle',
      descripcion: 'Cintas anchas de pasta al huevo. Textura perfecta para salsas untuosas.',
      uso_recomendado: 'Conejo al vino, jabalí, hongos porcini.',
      categoria_id: catById('Pastas'),
      marca_id: marcaById('De Cecco'),
      presentacion_id: presById('Paquete 250g'),
      origen_id: origenById('Italia'),
      costo: 1700,
      precio_venta_may: 2350,
      precio_venta_min: 3200,
      stock: 70,
    },
    {
      nombre: 'Pasta Rigatoni di Gragnano IGP',
      descripcion: 'Pasta trafilata al bronzo de Gragnano con Indicación Geográfica Protegida. Superficie rugosa que retiene la salsa.',
      uso_recomendado: 'Amatriciana, arrabbiata, salsas ricas.',
      categoria_id: catById('Pastas'),
      marca_id: marcaById('De Cecco'),
      presentacion_id: presById('Paquete 500g'),
      origen_id: origenById('Italia'),
      costo: 1400,
      precio_venta_may: 1950,
      precio_venta_min: 2650,
      stock: 110,
    },
    {
      nombre: 'Pasta Linguine',
      descripcion: 'Linguine artesanal, trafilato al bronzo. El clásico de la cocina ligur.',
      uso_recomendado: 'Pesto genovés, vongole, mariscos.',
      categoria_id: catById('Pastas'),
      marca_id: marcaById('De Cecco'),
      presentacion_id: presById('Paquete 500g'),
      origen_id: origenById('Italia'),
      costo: 1350,
      precio_venta_may: 1900,
      precio_venta_min: 2580,
      stock: 95,
    },
    {
      nombre: 'Pasta Orzo',
      descripcion: 'Pasta en forma de arroz. Versátil y muy utilizada en la cocina mediterránea.',
      uso_recomendado: 'Sopas, ensaladas tibias, guarnición.',
      categoria_id: catById('Pastas'),
      marca_id: marcaById('De Cecco'),
      presentacion_id: presById('Paquete 500g'),
      origen_id: origenById('Italia'),
      costo: 1200,
      precio_venta_may: 1700,
      precio_venta_min: 2300,
      stock: 80,
    },
    {
      nombre: 'Aceto Balsámico de Módena IGP',
      descripcion: 'Vinagre balsámico de Módena con Indicación Geográfica Protegida. 4 años de envejecimiento.',
      uso_recomendado: 'Ensaladas, carnes, fresas, helado de vainilla.',
      categoria_id: catById('Acetos Balsámicos'),
      marca_id: marcaById('Monari'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('Italia'),
      costo: 2100,
      precio_venta_may: 2900,
      precio_venta_min: 4000,
      stock: 50,
    },
    {
      nombre: 'Aceto Balsámico Añejado 10 años',
      descripcion: 'Balsámico denso y complejo. 10 años de añejamiento en barricas de roble y cerezo.',
      uso_recomendado: 'Unas gotas sobre parmesano, foie gras o frutillas.',
      categoria_id: catById('Acetos Balsámicos'),
      marca_id: marcaById('Monari'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('Italia'),
      costo: 5500,
      precio_venta_may: 7500,
      precio_venta_min: 10200,
      stock: 20,
    },
    {
      nombre: 'Crema Balsámica de Módena',
      descripcion: 'Reducción de aceto balsámico. Textura sedosa, sabor dulce-ácido equilibrado.',
      uso_recomendado: 'Decoración de platos, bruschetta, carpaccio.',
      categoria_id: catById('Acetos Balsámicos'),
      marca_id: marcaById('Monari'),
      presentacion_id: presById('Botella 250ml'),
      origen_id: origenById('Italia'),
      costo: 1800,
      precio_venta_may: 2500,
      precio_venta_min: 3400,
      stock: 60,
    },
    {
      nombre: 'Mostaza Antigua con Granos Enteros',
      descripcion: 'Mostaza artesanal elaborada con granos de mostaza amarilla y negra, vinagre de vino y cúrcuma.',
      uso_recomendado: 'Salsas frías, sánguches gourmet, carnes asadas.',
      categoria_id: catById('Condimentos'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 200g'),
      origen_id: origenById('Argentina'),
      costo: 900,
      precio_venta_may: 1300,
      precio_venta_min: 1800,
      stock: 85,
    },
    {
      nombre: 'Chimichurri en Seco Premium',
      descripcion: 'Blend de hierbas y especias deshidratadas. Receta tradicional con orégano, ají molido y laurel.',
      uso_recomendado: 'Carnes a la parrilla, marinadas, aderezos.',
      categoria_id: catById('Condimentos'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 200g'),
      origen_id: origenById('Argentina'),
      costo: 700,
      precio_venta_may: 1000,
      precio_venta_min: 1400,
      stock: 150,
    },
    {
      nombre: 'Sal en Escamas con Hierbas Mediterráneas',
      descripcion: 'Sal en escamas pura con mezcla de tomillo, romero y lavanda.',
      uso_recomendado: 'Finishing salt para carnes, vegetales asados, pescados.',
      categoria_id: catById('Condimentos'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 200g'),
      origen_id: origenById('Argentina'),
      costo: 850,
      precio_venta_may: 1200,
      precio_venta_min: 1650,
      stock: 70,
    },
    {
      nombre: 'Pesto Genovés Artesanal',
      descripcion: 'Pesto elaborado con albahaca fresca, piñones, parmesano, aceite de oliva extra virgen y ajo.',
      uso_recomendado: 'Pasta al pesto, bruschetta, base de pizza.',
      categoria_id: catById('Condimentos'),
      marca_id: marcaById('Terrana'),
      presentacion_id: presById('Frasco 200g'),
      origen_id: origenById('Argentina'),
      costo: 1500,
      precio_venta_may: 2100,
      precio_venta_min: 2900,
      precio_promo: 2600,
      stock: 40,
    },
  ];

  let productosCreados = 0;
  for (const prod of productosData) {
    await prisma.producto.upsert({
      where: { id: (await prisma.producto.findFirst({ where: { nombre: prod.nombre } }))?.id ?? 0 },
      update: {},
      create: prod as any,
    });
    productosCreados++;
  }
  console.log(`✅ ${productosCreados} productos creados`);

  console.log('\n✨ Seed completado');
  console.log('   Admin: admin@terrana.com / admin1234');
  console.log('   ⚠️  Cambiá la contraseña en producción\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
