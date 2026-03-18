import 'dotenv/config';
import app from './app';
import { prisma } from './prisma/client';
import { verificarConexionSMTP } from './utils/email';

const PORT = process.env.PORT ?? 4000;

async function main() {
  // Verificar conexión a la base de datos antes de levantar el server
  try {
    await prisma.$connect();
    console.log('✅ Conexión a PostgreSQL establecida');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    process.exit(1);
  }

  // Verificar conexión SMTP (no bloquea el arranque si falla)
  await verificarConexionSMTP();

  app.listen(PORT, () => {
    console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
    console.log(`📋 Entorno: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

// Manejo de señales para cierre limpio (importante en Docker)
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
