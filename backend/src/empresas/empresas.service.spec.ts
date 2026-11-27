import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EmpresasService } from "./empresas.service";

describe("EmpresasService contextual access", () => {
  it("does not expose a shared company through another organization context", async () => {
    const prisma = {
      empresa: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
      },
      organizacionEmpresa: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new EmpresasService(prisma as never);

    await expect(
      service.findOne("company-shared", "context-b", "organization-b"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.empresa.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "company-shared",
          organizaciones: expect.objectContaining({
            some: expect.objectContaining({
              id: "context-b",
              organizacionId: "organization-b",
            }),
          }),
        }),
      }),
    );
  });

  it("does not create an orphan company without an authenticated organization", async () => {
    const prisma = { organizacionMiembro: { findFirst: jest.fn() } };
    const service = new EmpresasService(prisma as never);

    await expect(
      service.create({ nombre: "Empresa inválida" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizacionMiembro.findFirst).not.toHaveBeenCalled();
  });
});

