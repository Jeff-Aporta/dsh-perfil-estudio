---
name: vps-rapido
description: >-
  Ajustes rápidos en el VPS del estudio: servicios, logs, el bot de Telegram (telegram.mjs), la inspiración que llega por
  Telegram, subidas a R2, la fábrica y el taller. Usar cuando el autor diga "el bot no responde", "no llegó el video",
  "súbelo a R2", "revisa el VPS", "reinicia", o cuando haya que cambiar algo del VPS sin romper la paridad con el PC.
---

# VPS: arreglos rápidos y seguros

- Acceso: `ssh -i ~/.ssh/granja_render root@166.1.85.205` (en el VPS el repo vive en `/opt/estudio-videos`).
- Regla de oro: lo que se edita en el VPS se trae al repo del PC (`D:/VPS/estudio-videos/vps/…`) y se commitea, o la
  próxima sincronización (`tools/sync-bots.mjs aplicar`) lo pisa. Antes de editar: `cp archivo archivo.bak-AAAAMMDD-motivo`.
- Ningún secreto se imprime nunca (ni en logs ni en el chat).

## Servicios (systemd)
| Servicio | Qué hace | Ver / reiniciar |
|---|---|---|
| `telegram-cadena` | Bot de Telegram del VPS (`/opt/estudio-videos/telegram.mjs`): avisos, videos, chat, inspiración | `journalctl -u telegram-cadena -n 50 --no-pager` · `systemctl restart telegram-cadena` |
| `fabrica-kit` | Dibuja y mezcla la cola `fabrica/cola` | `journalctl -u fabrica-kit -n 50` |
| `taller-dsh` | Guiones y correcciones con DSH (`taller/cola`) | `journalctl -u taller-dsh -n 50` |
| `estado-cadena` | `estado-cadena.json` y http :8792 | |

## Telegram
- Historial: `/opt/estudio-videos/telegram/historial.jsonl` (in/out). Adjuntos recibidos: `telegram/media/`.
- Cada mensaje que el bot procesa lleva reacción de recepción (👀) y de cierre; los videos del autor también.
- **Video del autor = inspiración automática**: se guarda (`tools/inspiracion.mjs registrar`), se transcribe con Whisper
  local y se sube a R2 en `inspiracion/<archivo>` con `r2-subir-uno.sh`.
- Límite de la Bot API: solo se pueden BAJAR archivos de hasta 20 MB.
- **Todo video que produzca el VPS se manda por Telegram de inmediato**, sin excepción (ledger `telegram/enviados.jsonl`).

## R2 (bucket `estudio-videos`, borra a los 10 días)
- Subir uno: `/opt/estudio-videos/r2-subir-uno.sh <archivo> <clave>` (usa `wrangler r2 object put … --remote`; el token OAuth NO sirve en la API REST de objetos: da 401).
- Si falla por sesión vencida: el autor corre `wrangler login` en el VPS; el navegador del PC no llega al `localhost:8976` del VPS, así que el autor pega la URL del callback y se completa con `curl "<url>"` dentro del VPS.
- Bajar en el PC: `python r2-videos.py bajar inspiracion D:/VPS/estudio-videos/datos/inspiracion/telegram`
  (necesita credenciales S3 en `.env`; si no hay, `scp` desde el VPS).

## Diagnóstico en 1 minuto
```
systemctl is-active telegram-cadena fabrica-kit taller-dsh
tail -5 /opt/estudio-videos/telegram/historial.jsonl
find /opt/estudio-videos/kit/projects -path "*/out/*.mp4" -newermt "$(date +%F)"
```
