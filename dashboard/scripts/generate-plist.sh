#!/bin/bash
# OPTIONAL, macOS only. Creates the launchd job file from the template
# dashboard/launchd/local.office-manager.plist.template, filling in the paths of this Mac. It installs
# nothing: the result goes to stdout or to --output, and the installation (copying to ~/Library/LaunchAgents
# and launchctl bootstrap) is done by the owner, following dashboard/README.md.
#
# Usage: generate-plist.sh [--repo DIR] [--hour 0-23] [--minute 0-59] [--path PATH] [--output FILE]
#   --repo     the office clone the job should update (default: the clone this script is in)
#   --hour     start hour, local time (default 7)
#   --minute   start minute (default 30)
#   --path     PATH for the job (default: the directories of `claude` and `node` in the current shell + system ones)
#   --output   output file (default: stdout)

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../launchd/local.office-manager.plist.template"

REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOUR=7
MINUTE=30
PATHS=""
OUTPUT=""

while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || { echo "Missing value for $1" >&2; exit 2; }
  case "$1" in
    --repo) REPO="$2" ;;
    --hour) HOUR="$2" ;;
    --minute) MINUTE="$2" ;;
    --path) PATHS="$2" ;;
    --output) OUTPUT="$2" ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift 2
done

number_in_range() {
  case "$1" in ''|*[!0-9]*) return 1 ;; esac
  [ "$((10#$1))" -le "$2" ]
}
number_in_range "$HOUR" 23 || { echo "--hour must be a number 0-23, got \"${HOUR}\"" >&2; exit 2; }
number_in_range "$MINUTE" 59 || { echo "--minute must be a number 0-59, got \"${MINUTE}\"" >&2; exit 2; }

case "$REPO" in
  /*) ;;
  *) echo "--repo must be an absolute path, got \"${REPO}\"" >&2; exit 2 ;;
esac
REPO="${REPO%/}"

if [ -z "$PATHS" ]; then
  PATHS="/usr/bin:/bin:/usr/sbin:/sbin"
  for tool in node claude; do
    if found="$(command -v "$tool" 2>/dev/null)" && [ -n "$found" ]; then
      dir="$(dirname "$found")"
      case ":$PATHS:" in
        *":$dir:"*) ;;
        *) PATHS="$dir:$PATHS" ;;
      esac
    else
      echo "Note: \"${tool}\" not found in the PATH of this shell; pass --path or set OFFICE_MANAGER_PATH" >&2
    fi
  done
fi

# The values go into XML and into sed: reject characters that would need escaping.
for value in "$REPO" "$HOME" "$PATHS"; do
  case "$value" in
    *'&'*|*'<'*|*'>'*|*'|'*|*'\'*)
      echo "The path contains a forbidden character (& < > | \\): $value" >&2
      exit 2
      ;;
  esac
done

TMP="$(mktemp "${TMPDIR:-/tmp}/office-manager-plist.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

sed -e "s|__REPO__|$REPO|g" -e "s|__HOME__|$HOME|g" -e "s|__PATH__|$PATHS|g" "$TEMPLATE" > "$TMP"
/usr/bin/plutil -replace StartCalendarInterval.Hour -integer "$((10#$HOUR))" "$TMP"
/usr/bin/plutil -replace StartCalendarInterval.Minute -integer "$((10#$MINUTE))" "$TMP"
/usr/bin/plutil -lint -s "$TMP" >&2

if grep -q '__[A-Z]*__' "$TMP"; then
  echo "Unfilled placeholders are left in the result" >&2
  exit 1
fi

if [ -n "$OUTPUT" ]; then
  cp "$TMP" "$OUTPUT"
  echo "Wrote $OUTPUT (time $((10#$HOUR)):$(printf '%02d' "$((10#$MINUTE))"), repo $REPO)" >&2
else
  cat "$TMP"
fi
