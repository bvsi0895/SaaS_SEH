import { SetMetadata } from '@nestjs/common';

export const ALLOW_COMMERCIAL_RECOVERY = 'allow-commercial-recovery';

/** Permite consultar/regularizar la cuenta aunque el acceso operativo esté bloqueado. */
export const AllowCommercialRecovery = () => SetMetadata(ALLOW_COMMERCIAL_RECOVERY, true);

