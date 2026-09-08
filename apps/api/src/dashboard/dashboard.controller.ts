import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { DashboardService } from './dashboard.service';
import { FiltrosDashboardDto } from './dto/filtros-dashboard.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('saude')
  saude(@Query() filtros: FiltrosDashboardDto, @EmpresaAtual() empresaId: number) {
    return this.dashboardService.saudeEstoque(filtros, empresaId);
  }

  @Get('qualidade')
  qualidade(@Query() filtros: FiltrosDashboardDto, @EmpresaAtual() empresaId: number) {
    return this.dashboardService.qualidadeInventario(filtros, empresaId);
  }

  @Get('operacao')
  operacao(@Query() filtros: FiltrosDashboardDto, @EmpresaAtual() empresaId: number) {
    return this.dashboardService.operacao(filtros, empresaId);
  }

  @Get('sem-movimento')
  semMovimento(@EmpresaAtual() empresaId: number) {
    return this.dashboardService.semMovimento(empresaId);
  }
}
