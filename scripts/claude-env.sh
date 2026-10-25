#!/usr/bin/env bash
# Hook SessionStart de Claude Code: deja node y pnpm (instalados con fnm) en el PATH de cada
# comando Bash de la sesión. Algunas cuentas de Claude usan otro HOME y no cargan ~/.bashrc.
[ -n "${CLAUDE_ENV_FILE:-}" ] || exit 0

home_real="$(getent passwd "$(id -u)" | cut -d: -f6)"
for base in "${FNM_DIR:-}" "$HOME/.local/share/fnm" "$home_real/.local/share/fnm"; do
  [ -n "$base" ] || continue
  bin="$(ls -d "$base"/node-versions/*/installation/bin 2>/dev/null | sort -V | tail -1)"
  if [ -n "$bin" ] && [ -x "$bin/pnpm" ]; then
    echo "export PATH=\"$bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    exit 0
  fi
done
exit 0
