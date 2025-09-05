#!/bin/sh
set -e

SOCK=/var/run/docker.sock
CMD="$*"

if [ -S "$SOCK" ]; then
  GID=$(stat -c '%g' "$SOCK")
  if [ "$GID" = "0" ]; then
    echo "[docker-gid] docker.sock group is root(0); add jenkins to root group"
    usermod -aG root jenkins || true
  else
    if getent group docker >/dev/null 2>&1; then
      groupmod -o -g "$GID" docker || true
    else
      groupadd -g "$GID" docker || true
    fi
    usermod -aG docker jenkins || true
  fi
fi

ls -l "$SOCK" 2>/dev/null || true
id jenkins || true

exec su -s /bin/bash jenkins -c "$CMD"
