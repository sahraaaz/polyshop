#!/usr/bin/env bash
# Wait for the actual application, including throughout a graceful nginx reload.
set -euo pipefail
if [[ ${1:-} == --check ]]; then echo 'Readiness checker loaded; no requests made.'; exit 0; fi
[[ $# -ge 4 ]] || { echo 'Usage: wait-for-app.sh NODE LABEL OUTPUT_DIR CURL_ARGS...' >&2; exit 2; }
node_bin=$1
label=$2
output=$3
shift 3
attempts=${POLYMOLY_HEALTH_ATTEMPTS:-30}
delay=${POLYMOLY_HEALTH_DELAY:-1}
[[ $attempts =~ ^[1-9][0-9]?$ && $attempts -le 60 && $delay =~ ^[01]$ ]] || { echo 'Invalid readiness retry settings.' >&2; exit 2; }
mkdir -p "$output"
status=000
for ((attempt=1; attempt<=attempts; attempt++)); do
  if status=$(curl --silent --show-error --connect-timeout 2 --max-time 5 --max-redirs 3 --max-filesize 131072 \
    --output "$output/body" --write-out '%{http_code}' "$@" 2> "$output/curl-error"); then
    if [[ $status == 200 ]] && "$node_bin" -e '
      try {
        const value = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
        process.exit(value?.status === "ok" && value?.service === "polymoly" ? 0 : 1);
      } catch { process.exit(1); }
    ' "$output/body"; then
      printf '%s verified (attempt %s, HTTP %s).\n' "$label" "$attempt" "$status"
      exit 0
    fi
  fi
  printf 'Waiting for %s: attempt %s/%s, HTTP %s, application response not ready.\n' "$label" "$attempt" "$attempts" "$status" >&2
  if ((attempt < attempts)); then sleep "$delay"; fi
done
printf '%s failed readiness. Last HTTP status: %s. Response and curl error saved in %s.\n' "$label" "$status" "$output" >&2
exit 1
