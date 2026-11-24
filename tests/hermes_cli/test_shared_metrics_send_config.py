"""Tests for shared-metrics send configuration resolution."""

from __future__ import annotations

import logging

import pytest

from hermes_cli.config import DEFAULT_CONFIG
from hermes_cli.observability.shared_metrics_send_config import (
    DEFAULT_ENDPOINT,
    resolve_send_config,
)


def _config(**shared):
    return {"telemetry": {"shared_metrics": shared}}


class TestDefaults:
    def test_send_is_registered_disabled_by_default(self):
        shared = DEFAULT_CONFIG["telemetry"]["shared_metrics"]
        assert shared["enabled"] is False
        assert shared["send"] is False

    def test_default_endpoint_is_production(self):
        shared = DEFAULT_CONFIG["telemetry"]["shared_metrics"]
        assert shared["endpoint"] == DEFAULT_ENDPOINT
        assert DEFAULT_ENDPOINT.startswith("https://")

    def test_empty_config_sends_nothing(self):
        resolved = resolve_send_config({})
        assert resolved.enabled is False
        assert resolved.send is False

    def test_none_config_is_tolerated(self):
        assert resolve_send_config(None).send is False


class TestSendRequiresCollection:
    def test_collection_alone_does_not_send(self):
        resolved = resolve_send_config(_config(enabled=True))
        assert resolved.enabled is True
        assert resolved.send is False

    def test_send_with_collection_sends(self):
        # Not the default endpoint: that one is Nous Research's and is never uploaded to.
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint="https://metrics.example.test/v1")
        )
        assert resolved.send is True

    def test_send_without_collection_is_refused(self):
        resolved = resolve_send_config(_config(enabled=False, send=True))
        assert resolved.send is False
        # send must never imply enabled
        assert resolved.enabled is False




class TestEndpointPrecedence:
    def test_config_endpoint_overrides_default(self):
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint="https://example.test/v1")
        )
        assert resolved.endpoint == "https://example.test/v1"

    def test_no_environment_variable_can_redirect_telemetry(self, monkeypatch):
        """A consent hazard: an inherited env var must not silently retarget.

        AGENTS.md also reserves HERMES_* for secrets, not behaviour.
        """
        for name in (
            "HERMES_TELEMETRY_ENDPOINT",
            "TELEMETRY_ENDPOINT",
            "HERMES_SHARED_METRICS_ENDPOINT",
        ):
            monkeypatch.setenv(name, "https://attacker.test/v1")
        resolved = resolve_send_config(_config(enabled=True, send=True))
        assert resolved.endpoint == DEFAULT_ENDPOINT

    def test_blank_endpoint_falls_back_to_production(self):
        resolved = resolve_send_config(_config(enabled=True, send=True, endpoint="   "))
        assert resolved.endpoint == DEFAULT_ENDPOINT

    def test_endpoint_is_stripped(self):
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint="  https://staging.test/v1  ")
        )
        assert resolved.endpoint == "https://staging.test/v1"


class TestTransportSafety:
    def test_plaintext_endpoint_is_refused(self, caplog):
        with caplog.at_level(logging.ERROR):
            resolved = resolve_send_config(
                _config(enabled=True, send=True, endpoint="http://example.test/v1")
            )
        assert resolved.send is False, "telemetry must not go out in clear text"
        assert any("https" in r.getMessage() for r in caplog.records)

    @pytest.mark.parametrize(
        "endpoint",
        [
            "http://localhost:8099/v1/telemetry",
            "http://127.0.0.1:8099/v1/telemetry",
        ],
    )
    def test_loopback_http_is_allowed_for_testing(self, endpoint):
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint=endpoint)
        )
        assert resolved.send is True

    def test_nonsense_scheme_is_refused(self):
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint="ftp://example.test/v1")
        )
        assert resolved.send is False

    @pytest.mark.parametrize(
        "endpoint",
        [
            "ftp://localhost/v1/telemetry",
            "gopher://localhost/v1/telemetry",
            "ws://127.0.0.1/v1/telemetry",
        ],
    )
    def test_a_non_http_scheme_on_loopback_is_still_refused(self, endpoint):
        """The scheme is allowlisted, not merely checked for plaintext http.

        Gap found by mutation testing: replacing the `http` scheme test with
        `if True` survived the whole suite, because every non-http scheme case
        pointed at a REMOTE host, where the loopback branch rejects it anyway.
        Only a non-http scheme aimed at loopback distinguishes an allowlist
        from a plaintext-only check.
        """
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint=endpoint)
        )
        assert resolved.send is False

    def test_unsafe_endpoint_does_not_block_collection(self):
        resolved = resolve_send_config(
            _config(enabled=True, send=True, endpoint="http://example.test/v1")
        )
        assert resolved.enabled is True


class TestNousUploadIsDisabled:
    """Simmuse never uploads usage metrics to Nous Research, whatever the config says."""

    def test_default_endpoint_is_never_sent_to_even_when_requested(self):
        resolved = resolve_send_config(_config(enabled=True, send=True))
        assert resolved.endpoint == DEFAULT_ENDPOINT
        assert resolved.send is False
        # collection stays a local, separate choice
        assert resolved.enabled is True

    @pytest.mark.parametrize(
        "endpoint",
        [
            "https://telemetry.nousresearch.com/v1/telemetry",
            "https://TELEMETRY.NousResearch.com/v1/telemetry",
            "https://staging.telemetry.nousresearch.com/v1/telemetry",
            "https://nousresearch.com/ingest",
        ],
    )
    def test_any_nousresearch_host_is_refused(self, endpoint):
        resolved = resolve_send_config(_config(enabled=True, send=True, endpoint=endpoint))
        assert resolved.send is False

    @pytest.mark.parametrize(
        "endpoint",
        [
            "https://metrics.example.test/v1",
            "https://notnousresearch.com/v1",
            "https://nousresearch.com.evil.test/v1",
            "http://localhost:8099/v1/telemetry",
        ],
    )
    def test_other_hosts_are_not_caught_by_the_rule(self, endpoint):
        resolved = resolve_send_config(_config(enabled=True, send=True, endpoint=endpoint))
        assert resolved.send is True

    def test_it_says_so_once_in_the_log(self, caplog):
        import hermes_cli.observability.shared_metrics_send_config as mod

        mod._warned_nous_upload_disabled = False
        with caplog.at_level(logging.WARNING):
            resolve_send_config(_config(enabled=True, send=True))
            resolve_send_config(_config(enabled=True, send=True))
        notes = [r for r in caplog.records if "disabled in Simmuse" in r.getMessage()]
        assert len(notes) == 1
