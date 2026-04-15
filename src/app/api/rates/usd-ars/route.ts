import { NextRequest, NextResponse } from "next/server";

// Obtiene el valor del DÓLAR OFICIAL (VENTA) desde un servicio público
// que expone exactamente esa cotización en formato JSON.
export async function GET(_req: NextRequest) {
    try {
        // Servicio público que expone "dólar oficial" (compra/venta) en ARS
        // Documentación: https://dolarapi.com/
        const res = await fetch("https://dolarapi.com/v1/dolares/oficial", {
            // Evitamos cacheos agresivos en el edge
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json(
                { rate: 1, error: "No se pudo obtener la cotización (respuesta no válida)." },
                { status: 502 }
            );
        }

        const data: any = await res.json();
        const rate = typeof data?.venta === "number" ? data.venta : null;

        if (!rate || rate <= 0) {
            return NextResponse.json(
                { rate: 1, error: "Datos de cotización inválidos." },
                { status: 502 }
            );
        }

        // "rate" representa cuántos ARS vale 1 USD (dólar oficial venta)
        return NextResponse.json({ rate });
    } catch (e) {
        return NextResponse.json(
            { rate: 1, error: "Error de red al consultar la cotización." },
            { status: 502 }
        );
    }
}
