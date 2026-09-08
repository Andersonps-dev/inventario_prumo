import { Controller, Get } from '@nestjs/common';

/** Endpoint público (sem guard) — usado por scripts de deploy e monitoramento externo. */
@Controller('health')
export class HealthController {
  @Get()
  status() {
    return { status: 'ok' };
  }
}
