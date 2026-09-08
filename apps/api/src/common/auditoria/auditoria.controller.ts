import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PapeisGuard } from '../guards/papeis.guard';
import { EmpresaScopeGuard } from '../guards/empresa-scope.guard';
import { Papeis } from '../decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../decorators/usuario-atual.decorator';
import { EmpresaAtualOuNula } from '../decorators/empresa-atual.decorator';
import { AuditoriaService } from './auditoria.service';
import { FiltrosAuditoriaDto } from './dto/filtros-auditoria.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Papeis('ADMIN', 'SUPER_ADMIN')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  listar(
    @Query() filtros: FiltrosAuditoriaDto,
    @EmpresaAtualOuNula() empresaId: number | null,
    @UsuarioAtual() ator: UsuarioAutenticado,
  ) {
    return this.auditoriaService.listar(filtros, empresaId, ator.papel === 'SUPER_ADMIN');
  }
}
