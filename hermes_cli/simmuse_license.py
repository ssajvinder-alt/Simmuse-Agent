"""Licence-key client for Simmuse Pro (Lemon Squeezy licence API).

Standalone: nothing in core imports this yet. It activates a key for this machine, re-validates it,
and keeps a short offline grace period so a dropped connection never locks a paying user out.
The licence endpoints take no API key, so no secret is stored. The Lemon Squeezy product id is
passed in by the caller so a key bought for another product is rejected.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from hermes_constants import get_hermes_home

API = "https://api.lemonsqueezy.com/v1/licenses"
OFFLINE_GRACE_SECONDS = 7 * 24 * 3600


@dataclass(frozen=True)
class LicenseStatus:
    valid: bool
    reason: str = ""


def _state_path() -> Path:
    return get_hermes_home() / "simmuse_license.json"


def _post(action: str, fields: dict[str, str]) -> dict:
    """POST a licence call; a non-2xx reply still carries a JSON body that explains itself."""
    request = urllib.request.Request(
        f"{API}/{action}",
        data=urllib.parse.urlencode(fields).encode(),
        headers={"Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return json.load(error)


def _load() -> dict:
    try:
        return json.loads(_state_path().read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return {}


def _save(state: dict) -> None:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state), encoding="utf-8")


def _wrong_product(reply: dict, product_id: int) -> bool:
    return (reply.get("meta") or {}).get("product_id") != product_id


def activate(license_key: str, instance_name: str, product_id: int) -> LicenseStatus:
    """Bind ``license_key`` to this machine. Network failure is reported, never swallowed."""
    try:
        reply = _post("activate", {"license_key": license_key, "instance_name": instance_name})
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return LicenseStatus(False, f"could not reach the licence server: {error}")
    if not reply.get("activated"):
        return LicenseStatus(False, reply.get("error") or "the licence server refused this key")
    if _wrong_product(reply, product_id):
        return LicenseStatus(False, "this key is for a different product")
    _save({"key": license_key, "instance_id": reply["instance"]["id"], "checked_at": time.time()})
    return LicenseStatus(True)


def validate(product_id: int, now: float | None = None) -> LicenseStatus:
    """Re-check the stored key. Offline, the last good check holds for ``OFFLINE_GRACE_SECONDS``."""
    now = time.time() if now is None else now
    state = _load()
    if not state.get("key"):
        return LicenseStatus(False, "no licence activated")
    try:
        reply = _post("validate", {"license_key": state["key"], "instance_id": state["instance_id"]})
    except (urllib.error.URLError, TimeoutError, ValueError):
        if now - state.get("checked_at", 0) <= OFFLINE_GRACE_SECONDS:
            return LicenseStatus(True, "offline: using the last successful check")
        return LicenseStatus(False, "could not reach the licence server and the offline grace period ended")
    if not reply.get("valid") or _wrong_product(reply, product_id):
        return LicenseStatus(False, reply.get("error") or "licence is not valid")
    _save({**state, "checked_at": now})
    return LicenseStatus(True)


def deactivate() -> LicenseStatus:
    """Free this machine's seat and forget the key."""
    state = _load()
    if not state.get("key"):
        return LicenseStatus(False, "no licence activated")
    try:
        reply = _post("deactivate", {"license_key": state["key"], "instance_id": state["instance_id"]})
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return LicenseStatus(False, f"could not reach the licence server: {error}")
    if not reply.get("deactivated"):
        return LicenseStatus(False, reply.get("error") or "the licence server refused to deactivate")
    _state_path().unlink(missing_ok=True)
    return LicenseStatus(True)
