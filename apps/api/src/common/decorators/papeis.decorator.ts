import { SetMetadata } from '@nestjs/common';
import { Papel } from '@prisma/client';

export const PAPEIS_KEY = 'papeis';
export const Papeis = (...papeis: Papel[]) => SetMetadata(PAPEIS_KEY, papeis);
