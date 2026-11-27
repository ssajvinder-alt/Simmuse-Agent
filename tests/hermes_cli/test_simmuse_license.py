import urllib.error

import pytest

from hermes_cli import simmuse_license as lic

PRODUCT = 42


def _ok(action, fields):
    if action == "activate":
        return {"activated": True, "instance": {"id": "inst-1"}, "meta": {"product_id": PRODUCT}}
    if action == "validate":
        return {"valid": True, "meta": {"product_id": PRODUCT}}
    return {"deactivated": True}


def _offline(action, fields):
    raise urllib.error.URLError("no network")


def test_activate_then_validate_roundtrip(monkeypatch):
    monkeypatch.setattr(lic, "_post", _ok)
    assert lic.activate("KEY", "my-pc", PRODUCT).valid
    assert lic.validate(PRODUCT).valid


def test_a_key_for_another_product_is_rejected_and_not_stored(monkeypatch):
    monkeypatch.setattr(lic, "_post", _ok)
    status = lic.activate("KEY", "my-pc", product_id=7)
    assert not status.valid and "different product" in status.reason
    assert not lic.validate(PRODUCT).valid


def test_refused_key_reports_the_servers_reason(monkeypatch):
    monkeypatch.setattr(lic, "_post", lambda a, f: {"activated": False, "error": "license_key not found"})
    assert lic.activate("BAD", "my-pc", PRODUCT).reason == "license_key not found"


def test_offline_grace_holds_then_expires(monkeypatch):
    monkeypatch.setattr(lic, "_post", _ok)
    lic.activate("KEY", "my-pc", PRODUCT)
    checked = lic._load()["checked_at"]
    monkeypatch.setattr(lic, "_post", _offline)
    assert lic.validate(PRODUCT, now=checked + 3600).valid
    expired = lic.validate(PRODUCT, now=checked + lic.OFFLINE_GRACE_SECONDS + 1)
    assert not expired.valid and "grace period" in expired.reason


def test_a_revoked_key_is_not_rescued_by_offline_grace(monkeypatch):
    monkeypatch.setattr(lic, "_post", _ok)
    lic.activate("KEY", "my-pc", PRODUCT)
    monkeypatch.setattr(lic, "_post", lambda a, f: {"valid": False, "error": "license_key is disabled"})
    assert not lic.validate(PRODUCT).valid


def test_deactivate_forgets_the_key(monkeypatch):
    monkeypatch.setattr(lic, "_post", _ok)
    lic.activate("KEY", "my-pc", PRODUCT)
    assert lic.deactivate().valid
    assert lic.validate(PRODUCT).reason == "no licence activated"
