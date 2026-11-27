import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateHallazgoDto } from "./create-hallazgo.dto";

describe("CreateHallazgoDto", () => {
  it("rejects client-supplied photo URLs so evidence only enters through upload", async () => {
    const dto = plainToInstance(CreateHallazgoDto, {
      inspeccionId: "00000000-0000-4000-8000-000000000001",
      titulo: "Título del hallazgo",
      descripcion: "Descripción suficientemente detallada",
      nivelRiesgo: "MEDIO",
      ubicacionTexto: "Sector A",
      fotosUrls: ["/api/hallazgos/otro/fotos/evidence.webp"],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toContain("fotosUrls");
  });
});

