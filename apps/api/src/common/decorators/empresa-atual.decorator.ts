import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * A empresa em que a requisição opera — a própria, pra qualquer usuário
 * normal; a selecionada via header `X-Empresa-Id`, pro SUPER_ADMIN
 * (populada pelo `EmpresaScopeGuard`, que precisa rodar antes deste
 * decorator em qualquer rota que o use).
 *
 * Lança se não houver empresa em contexto — é o caso do SUPER_ADMIN sem
 * `X-Empresa-Id` numa rota que exige uma empresa selecionada.
 */
export const EmpresaAtual = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest();
  if (request.empresaId === null || request.empresaId === undefined) {
    throw new BadRequestException('Selecione uma empresa.');
  }
  return request.empresaId;
});

/**
 * Mesma origem que `@EmpresaAtual()`, mas não lança quando não há empresa
 * selecionada — uso em endpoints de listagem onde SUPER_ADMIN sem
 * `X-Empresa-Id` legitimamente quer ver tudo, não um erro.
 */
export const EmpresaAtualOuNula = createParamDecorator((_data: unknown, ctx: ExecutionContext): number | null => {
  const request = ctx.switchToHttp().getRequest();
  return request.empresaId ?? null;
});
