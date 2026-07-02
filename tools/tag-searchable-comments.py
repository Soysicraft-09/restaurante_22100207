"""Agrega etiquetas BUSCAR a comentarios fuente para facilitar búsquedas por dominio."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = (ROOT / "src", ROOT / "backend" / "src", ROOT / "tools")
SOURCE_EXTENSIONS = {".ts", ".js", ".html", ".css", ".scss", ".mjs", ".cjs", ".py"}

KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("PAYPAL", ("paypal", "client id", "client secret", "sdk", "oauth")),
    ("TICKET", ("ticket", "recibo", "receipt", "xml", "pdf")),
    ("CORREO", ("correo", "email", "smtp", "nodemailer")),
    ("AUTENTICACION", ("autentic*", "sesion", "login", "jwt", "token", "credencial*", "password", "contrasena")),
    ("ADMIN", ("admin", "rol")),
    ("USUARIO", ("usuario", "perfil", "registro", "bitacora", "historial")),
    ("CARRITO", ("carrito", "cart", "compra")),
    ("CHECKOUT", ("checkout", "entrega", "delivery")),
    ("PAGO", ("pago", "cobro", "tarjeta", "transferencia", "monto")),
    ("PEDIDO", ("pedido", "orden", "folio", "tracking")),
    ("PRODUCTO", ("producto", "platillo", "menu", "catalogo", "inventario", "seed")),
    ("FAVORITOS", ("favorito",)),
    ("BASE_DATOS", ("mysql", "base de datos", "tabla", "pool", "migracion")),
    ("API", ("api", "backend", "http", "express", "cors", "endpoint", "ruta")),
    ("ANGULAR", ("angular", "signal", "componente", "router", "provider", "typescript")),
    ("FORMULARIO", ("formulario", "campo", "input", "validacion")),
    ("INTERFAZ", ("ui", "vista", "pantalla", "visual", "estilo", "css", "hover", "boton", "enlace", "tarjeta", "hero", "nav")),
    ("PRUEBAS", ("prueba*", "test", "spec", "simulad*")),
    ("CONFIGURACION", ("configuracion", "entorno", ".env", "variable")),
    ("ERRORES", ("error*", "falla*", "fallback", "respaldo", "corrupt*")),
    ("RENDIMIENTO", ("cache", "carrera*", "timer*", "persist*")),
)

PATH_DEFAULTS: tuple[tuple[str, str], ...] = (
    ("paypal", "PAYPAL"),
    ("receipt", "TICKET"),
    ("auth", "AUTENTICACION"),
    ("usuario", "USUARIO"),
    ("carrito", "CARRITO"),
    ("producto", "PRODUCTO"),
    ("catalogo", "CATALOGO"),
    ("environment", "CONFIGURACION"),
    ("config", "CONFIGURACION"),
    (".spec.", "PRUEBAS"),
    (".css", "INTERFAZ"),
    (".html", "INTERFAZ"),
)

COMMENT_START = re.compile(r"^(?P<indent>\s*)(?P<marker>//+|/\*+|<!--)(?P<body>.*)$")
SEARCH_TAG = re.compile(r"\[BUSCAR:\s*[A-Z_ ]+\]")


def contains_term(text: str, term: str) -> bool:
    suffix = r"\w*" if term.endswith("*") else ""
    word = re.escape(term.rstrip("*"))
    return re.search(rf"(?<!\w){word}{suffix}(?!\w)", text) is not None


def tags_for(path: Path, body: str) -> list[str]:
    normalized = body.casefold()
    tags = [tag for tag, terms in KEYWORDS if any(contains_term(normalized, term) for term in terms)]
    if tags:
        return tags[:4]

    relative_path = path.relative_to(ROOT).as_posix().casefold()
    for fragment, tag in PATH_DEFAULTS:
        if fragment in relative_path:
            return [tag]
    return ["CODIGO"]


def tag_line(path: Path, line: str, *, retag: bool) -> str:
    match = COMMENT_START.match(line)
    if not match:
        return line

    marker = match.group("marker")
    body = match.group("body")
    if SEARCH_TAG.search(body):
        if not retag:
            return line
        body = SEARCH_TAG.sub("", body, count=1).lstrip()
    tags = " ".join(tags_for(path, body))
    return f"{match.group('indent')}{marker} [BUSCAR: {tags}] {body}"


def source_files() -> list[Path]:
    files: list[Path] = []
    for source_root in SOURCE_ROOTS:
        if not source_root.exists():
            continue
        files.extend(
            path
            for path in source_root.rglob("*")
            if path.is_file()
            and path.suffix.casefold() in SOURCE_EXTENSIONS
            and path.resolve() != Path(__file__).resolve()
        )
    return sorted(files)


def process_file(path: Path, *, check: bool, retag: bool) -> int:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    updated = "".join(
        tag_line(path, line.rstrip("\r\n"), retag=retag) + line[len(line.rstrip("\r\n")) :]
        for line in lines
    )

    if updated == original:
        return 0
    if check:
        print(path.relative_to(ROOT).as_posix())
        return 1

    path.write_text(updated, encoding="utf-8", newline="")
    return 1


def main() -> int:
    check = "--check" in sys.argv
    retag = "--retag" in sys.argv
    changed = sum(process_file(path, check=check, retag=retag) for path in source_files())
    if check and changed:
        print(f"Faltan etiquetas BUSCAR en {changed} archivo(s).")
        return 1
    print(f"{'Auditoría completada' if check else 'Etiquetado completado'}: {changed} archivo(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
