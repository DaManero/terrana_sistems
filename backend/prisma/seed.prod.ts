/**
 * Seed de producción — datos mínimos para arrancar el sistema.
 * Solo crea los roles del sistema y el usuario administrador inicial.
 * El resto de las tablas (categorías, productos, etc.) se cargan desde el panel admin.
 *
 * Ejecutar UNA SOLA VEZ tras el primer deploy:
 *   npx ts-node prisma/seed.prod.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de producción iniciado...');

  // ─── Roles ────────────────────────────────────────────────────────────────

  const roles = await Promise.all([
    prisma.rol.upsert({ where: { nombre: 'Admin' },             update: {}, create: { nombre: 'Admin' } }),
    prisma.rol.upsert({ where: { nombre: 'Operador' },          update: {}, create: { nombre: 'Operador' } }),
    prisma.rol.upsert({ where: { nombre: 'Cliente Mayorista' }, update: {}, create: { nombre: 'Cliente Mayorista' } }),
    prisma.rol.upsert({ where: { nombre: 'Cliente Minorista' }, update: {}, create: { nombre: 'Cliente Minorista' } }),
  ]);
  console.log('✅ Roles creados:', roles.map((r) => r.nombre).join(', '));

  // ─── Usuario Admin ────────────────────────────────────────────────────────

  const rolAdmin = roles.find((r) => r.nombre === 'Admin')!;

  // Contraseña inicial — CAMBIAR INMEDIATAMENTE tras el primer login
  const passwordHash = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@terranagourmet.com.ar' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Terrana',
      email: 'admin@terranagourmet.com.ar',
      password: passwordHash,
      rol_id: rolAdmin.id,
      activo: true,
      aprobado: true,
    },
  });
  console.log('✅ Admin creado:', admin.email);

  console.log('');
  console.log('⚠️  IMPORTANTE: Cambiar la contraseña del admin tras el primer login.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed de producción:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
