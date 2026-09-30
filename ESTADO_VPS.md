# Estado del VPS — diagnóstico 2026-09-29

Servidor `diegoprojects` (Ubuntu, kernel 5.4) · proyecto en `/projectos_/saasVinz`.

## Contexto

El despliegue falló al aplicar la migración `a7c9e1f3b248` (campos del catálogo de planes) con:

```
psycopg2.errors.DiskFull: could not extend file ... No space left on device
```

La causa fue el disco lleno por **28 imágenes Docker `<none>`** (versiones antiguas del backend y frontend que deja cada despliegue, ~1,1 GB por despliegue). La migración corre en una transacción, así que al fallar se revirtió completa: no quedó nada a medias.

Se liberó espacio con `docker image prune -f` y `docker builder prune -f`. PostgreSQL se recuperó solo.

## Diagnóstico actual

| Recurso | Estado | Comentario |
|---|---|---|
| **Disco** | ✅ 68 % (12 GB libres de 38 GB) | Antes estaba lleno; ya hay margen |
| **CPU** | ✅ 2 núcleos, 97 % libre | Carga muy baja, sin problema |
| **RAM** | ⚠️ 1,9 GB total, ~535 MB disponibles | Justa, pero suficiente para lo que corre hoy |
| **Swap** | ⚠️ 515 MB en uso de 4 GB | Normal con 2 GB de RAM; no es grave |
| **PostgreSQL** | ✅ healthy, usa 52 MB | Se recuperó sin problemas |
| **Contenedores Vinzer** | ✅ ~430 MB en total | El backend es el que más consume (233 MB) |

Consumo por contenedor en ejecución:

| Contenedor | CPU | RAM |
|---|---|---|
| vinzer_backend | 0,26 % | 233 MB |
| vinzer_frontend | 0,00 % | 84 MB |
| vinzer_postgres | 2,96 % | 53 MB |
| reverse-proxy | 0,20 % | 31 MB |
| letsencrypt-helper | 0,21 % | 13 MB |
| vinzer_pgadmin | 0,03 % | 13 MB |
| vinzer_redis | 0,47 % | 3 MB |

## Tareas pendientes

### 1. Confirmar que la migración se aplicó

```bash
docker logs vinzer_backend 2>&1 | grep -i "a7c9e1f3b248\|upgrade\|error" | tail -10
```

Debe aparecer `Running upgrade d4f6a8c0e257 -> a7c9e1f3b248`. Si no aparece, reiniciar el backend:

```bash
docker compose restart backend
```

### 2. Liberar ~5 GB de proyectos detenidos

Estos contenedores llevan **2 meses o más apagados**, y sus imágenes ocupan alrededor de 5 GB:

- n8n (dos copias: `n8n_app`, `n8n_postgress-postn8n-1`, `n8n_postgress-postgres-1`)
- evolution-api (`evolution_api`, `evolution_postgres`, `evolution_redis`)
- `klass-bot-chatdocente-1`
- `dl-web-web_dl-1`
- `luque_site_web`
- `musing_panini` (hello-world)

Docker no los cuenta como liberables porque los contenedores detenidos todavía usan esas imágenes. Si ya no se necesitan:

```bash
docker rm dl-web-web_dl-1 evolution_api evolution_postgres evolution_redis n8n_app \
  klass-bot-chatdocente-1 n8n_postgress-postn8n-1 n8n_postgress-postgres-1 luque_site_web musing_panini
docker image prune -a -f
```

Esto borra los contenedores y sus imágenes, pero **no sus volúmenes**: los datos de n8n o evolution (flujos, conversaciones) siguen guardados y se pueden volver a levantar. `prune -a` es seguro aquí porque primero se borran esos contenedores y los de Vinzer están corriendo.

### 3. Limitar los logs de Docker (ya ocupan más de 1,3 GB)

Son la causa más probable de que el disco se vuelva a llenar. Los cinco logs más grandes suman 130 MB + 152 MB + 234 MB + 306 MB + 498 MB.

**Solución permanente:** limitar los logs en `docker-compose.yml` a un máximo de 3 archivos de 10 MB por servicio (se aplica en el próximo despliegue).

**Para liberar ese espacio ahora mismo:**

```bash
sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'
```

### 4. Opcional: revisar `/root` (2,1 GB)

Suele ser caché de npm o pip, o archivos descargados:

```bash
sudo du -xh --max-depth=1 /root | sort -h | tail
```

### 5. Evitar que vuelvan a acumularse imágenes

Agregar al final del script de despliegue:

```bash
docker image prune -f
```

## Lo que NO hay que hacer

- **No usar `docker volume prune`, `docker system prune --volumes` ni `docker compose down -v`.** Borrarían el volumen `postgres_data`, que es donde vive la base de datos.
- **No borrar nada dentro de `pgdata` ni archivos `pg_wal`** para ganar espacio: corrompería la base.
- **No usar `docker image prune -a` mientras existan contenedores detenidos que se quieran conservar**: borraría sus imágenes.

## Sobre la RAM

Hoy alcanza porque los otros proyectos están apagados. Si se vuelven a encender n8n y evolution-api, 2 GB se van a quedar cortos y convendría subir el VPS a 4 GB.

## Comandos útiles de monitoreo

```bash
df -h                  # espacio en disco
free -h                # RAM y swap
docker system df       # espacio usado por Docker
docker stats           # consumo en vivo por contenedor (salir con Ctrl+C)
htop                   # CPU y RAM en vivo (instalar con: sudo apt install htop)
```
