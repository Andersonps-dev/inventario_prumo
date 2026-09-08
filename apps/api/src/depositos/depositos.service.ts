import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnderecosService } from '../enderecos/enderecos.service';
import { CriarDepositoDto, AtualizarDepositoDto } from './dto/deposito.dto';

@Injectable()
export class DepositosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enderecosService: EnderecosService,
  ) {}

  listar(empresaId: number) {
    return this.prisma.deposito.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  }

  async obterPadrao(empresaId: number) {
    const deposito = await this.prisma.deposito.findFirst({
      where: { ativo: true, empresaId },
      orderBy: { id: 'asc' },
    });
    if (!deposito) throw new BadRequestException('Nenhum depósito ativo cadastrado. Cadastre um depósito antes de continuar.');
    return deposito;
  }

  async criar(dto: CriarDepositoDto, empresaId: number) {
    const deposito = await this.prisma.deposito.create({ data: { ...dto, empresaId } });
    await this.enderecosService.criarSentinela(deposito.id, empresaId);
    return deposito;
  }

  async atualizar(id: number, dto: AtualizarDepositoDto, empresaId: number) {
    const existente = await this.prisma.deposito.findUnique({ where: { id } });
    if (!existente || existente.empresaId !== empresaId) throw new NotFoundException('Depósito não encontrado.');
    return this.prisma.deposito.update({ where: { id }, data: dto });
  }

  /** Valida um depositoId escolhido explicitamente pelo cliente (não o
   * default de `obterPadrao`) — sem isso, um depósito "inativado" (que
   * some das telas de criação) ainda aceitava operações via um valor já
   * selecionado antes de inativar, contradizendo o aviso de inativação. */
  async exigirAtivo(id: number, empresaId: number) {
    const deposito = await this.prisma.deposito.findUnique({ where: { id } });
    if (!deposito || deposito.empresaId !== empresaId) throw new NotFoundException('Depósito não encontrado.');
    if (!deposito.ativo) throw new BadRequestException('Este depósito está inativo.');
    return deposito;
  }
}
