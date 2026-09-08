import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Promove um usuário existente a SUPER_ADMIN — ou, se o email ainda não
 * existir (caso de um deploy novo, banco vazio, sem nenhum usuário pra
 * promover), cria o primeiro SUPER_ADMIN do zero. É o único jeito de
 * "entrar" num Prumo recém-implantado, já que não existe cadastro público.
 */
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npm run promote-super-admin -- <email> [nome]');
    process.exit(1);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    if (usuario.papel === 'SUPER_ADMIN') {
      console.log(`"${email}" já é SUPER_ADMIN.`);
      return;
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { papel: 'SUPER_ADMIN', empresaId: null },
    });
    console.log(`"${email}" promovido a SUPER_ADMIN (deixou de pertencer a uma empresa específica).`);
    return;
  }

  const nome = process.argv[3] ?? 'Super Admin';
  const senhaGerada = !process.env.SUPER_ADMIN_SENHA;
  const senha = process.env.SUPER_ADMIN_SENHA ?? randomBytes(9).toString('base64url');
  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.usuario.create({
    data: { email, nome, senhaHash, papel: 'SUPER_ADMIN', empresaId: null },
  });

  console.log(`Criado SUPER_ADMIN "${email}".`);
  if (senhaGerada) {
    console.log(`Senha gerada: ${senha}`);
    console.log('Troque essa senha assim que fizer o primeiro login.');
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
