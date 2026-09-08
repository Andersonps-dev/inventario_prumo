import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Seed de demonstração bloqueado em produção (NODE_ENV=production). ' +
        'Ele cria uma empresa/senha de exemplo — use scripts/promote-super-admin.ts ' +
        'para criar o primeiro SUPER_ADMIN real em vez disso.',
    );
  }

  const empresa = await prisma.empresa.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Empresa padrão' },
  });

  const deposito = await prisma.deposito.upsert({
    where: { empresaId_nome: { empresaId: empresa.id, nome: 'Principal' } },
    update: {},
    create: { empresaId: empresa.id, nome: 'Principal' },
  });

  const senhaPadrao = process.env.SEED_ADMIN_SENHA ?? 'prumo123';
  if (!process.env.SEED_ADMIN_SENHA) {
    console.warn(
      'Aviso: usando a senha de demonstração padrão (prumo123) para todos os usuários semeados. ' +
        'Defina SEED_ADMIN_SENHA para um valor próprio se este ambiente for acessível por outras pessoas.',
    );
  }
  const senhaHash = await bcrypt.hash(senhaPadrao, 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@prumo.local' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@prumo.local',
      senhaHash,
      papel: 'SUPER_ADMIN',
      empresaId: null,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'supervisor@prumo.local' },
    update: {},
    create: {
      nome: 'Supervisora Marina',
      email: 'supervisor@prumo.local',
      senhaHash,
      papel: 'ADMIN',
      empresaId: empresa.id,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'contador@prumo.local' },
    update: {},
    create: {
      nome: 'Contador João',
      email: 'contador@prumo.local',
      senhaHash,
      papel: 'CONTADOR',
      empresaId: empresa.id,
    },
  });

  await prisma.produto.upsert({
    where: { empresaId_sku: { empresaId: empresa.id, sku: 'PAR-001' } },
    update: {},
    create: {
      empresaId: empresa.id,
      sku: 'PAR-001',
      nome: 'Parafuso M6 40mm',
      unidade: 'UN',
      precoCusto: 0.35,
      estoqueMinimo: 100,
    },
  });
  await prisma.produto.upsert({
    where: { empresaId_sku: { empresaId: empresa.id, sku: 'TIN-014' } },
    update: {},
    create: {
      empresaId: empresa.id,
      sku: 'TIN-014',
      nome: 'Tinta acrílica 18L',
      unidade: 'UN',
      precoCusto: 189.9,
      estoqueMinimo: 10,
    },
  });

  console.log('Seed concluído.', { empresa: empresa.nome, deposito: deposito.nome });
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
