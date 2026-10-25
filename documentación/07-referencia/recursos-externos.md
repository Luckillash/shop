---
title: "Recursos externos: artifacts de diseño, documentación de pasarelas, MCP y Next.js"
description: "Enlaces y rutas a todo lo que está fuera de esta carpeta: los artifacts del diseño Almacén, la documentación de Flow y Transbank del workspace, los servidores MCP y la documentación de Next.js incluida en node_modules."
keywords: ["recursos", "enlaces", "artifacts", "claude.ai", "flow", "transbank", "mcp", "supabase", "vercel", "next docs", "node_modules"]
related: ["01-fundamentos/entorno-local.md", "04-diseno/principios-voz-y-accesibilidad.md"]
source: [".mcp.json", "_archivo/diseno-almacen.md §1, §6"]
estado: "vigente"
---

# Recursos externos

> **Úsalo cuando:** necesitas una fuente que no está en esta carpeta.

## Diseño (artifacts de claude.ai)

| Artifact | URL | Notas |
|---|---|---|
| Design system **Almacén** | https://claude.ai/artifact/8ueRvwVuopKWk3enu498tj | `tokens.json`, `components/bundle.js`, `components/bundle.css`, manual. Versión actual `1792718261-9f4b` |
| **Almacén · Templates de la tienda** | https://claude.ai/artifact/E7sfHjPteptX18QCaikCri | 40 pantallas. **Es la fuente del flujo completo**. Tiene instalada la versión `1792708668-3de7` del design system |
| **Almacén — Flujo de compra** | https://claude.ai/artifact/9otwRsPJLSkA4HHCvjDKCV | Incompleto (4 de 15 pantallas) |

Se leen con la herramienta Artifact (`action: "read"`, opcionalmente con `path`), no con WebFetch.

## Pasarelas (documentación del workspace)

Las rutas son relativas a esta carpeta (`shop/documentación/`).

| Pasarela | Índice | Archivos clave |
|---|---|---|
| Transbank | `../../transbank/documentación/README.md` | `02-guias/webpay-plus.md`, `01-fundamentos/retornos-y-redirecciones.md`, `04-objetos/codigos-y-enumeraciones.md`, `05-pruebas/tarjetas-de-prueba.md`, `07-referencia/trampas-conocidas.md`, `07-referencia/checklist-produccion.md` |
| Flow | `../../flow/documentación/README.md` | `02-guias/pagos-ecommerce.md`, `01-fundamentos/firma-hmac.md`, `01-fundamentos/callbacks.md`, `03-api-reference/payment.md`, `03-api-reference/refund.md`, `07-referencia/trampas-conocidas.md` |

> En los frontmatter de otros archivos, las rutas `../flow/…` y `../transbank/…` son relativas a la **raíz del proyecto** (`shop/`). Desde esta carpeta, agrega un `../`. Ruta absoluta: `C:/Users/lucas/OneDrive/Escritorio/MCPS/{flow,transbank}/documentación/`.

También están disponibles como recursos MCP: `flow-docs://<ruta>` y `tbk-docs://<ruta>`.

## Servidores MCP (`.mcp.json`)

| Servidor | Para qué | Primeras lecturas |
|---|---|---|
| `supabase` | Consultar y migrar la BD, generar tipos, ver logs y advisors, buscar documentación | `search_docs` antes de usar una API de Supabase que no conozcas |
| `vercel` | Desplegar y operar la tienda: proyecto, variables de entorno, dominios/DNS, logs de build y de runtime, cron | `search_vercel_documentation` antes de usar una función de Vercel que no conozcas; `list_projects` para confirmar el proyecto (no adivines IDs) |
| `flow` | Probar la API de Flow en sandbox | `flow-docs://README.md`, `flow-docs://07-referencia/trampas-conocidas.md` |
| `transbank` | Probar Webpay en integración | `tbk-docs://README.md`, `tbk-docs://07-referencia/trampas-conocidas.md` |

## Next.js 16.4

Documentación incluida en el proyecto: `node_modules/next/dist/docs/` (`01-app/` para App Router). **Es obligatoria** (ver `AGENTS.md`). El índice de las guías más útiles está en [01-fundamentos/stack-y-versiones.md](../01-fundamentos/stack-y-versiones.md#regla-obligatoria).

## Documentos originales

`_archivo/avance-del-proyecto.md` y `_archivo/diseno-almacen.md` son los documentos a partir de los que se armó esta estructura. Quedan como referencia histórica: **la fuente vigente son las secciones numeradas**.
