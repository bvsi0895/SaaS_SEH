-- PostgreSQL requires a commit boundary before a newly-added enum value is used.
ALTER TYPE "EstadoInspeccion" ADD VALUE IF NOT EXISTS 'PENDIENTE';

