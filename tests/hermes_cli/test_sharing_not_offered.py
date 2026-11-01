"""Simmuse does not invite anyone to share usage metrics with Nous Research.

The command-line tool has four places that used to ask: the setup wizard's own section, the offer
at the end of every setup flow, the offer before an interactive chat, and the ``hermes tools`` menu
row. All four sit behind one switch, ``SHARING_OFFERED``, which ships off. The backend separately
refuses to upload to Nous Research (see test_shared_metrics_send_config.py).
"""

from __future__ import annotations

import argparse

import pytest

from hermes_cli import setup as wizard
from hermes_cli.observability import shared_metrics_consent as consent
from hermes_cli.observability.shared_metrics_send_config import SHARING_OFFERED
from hermes_cli.setup import SETUP_SECTIONS, setup_telemetry


def _explode(*_args, **_kwargs):
    raise AssertionError("the sharing question must not be asked")


def test_the_switch_ships_off():
    assert SHARING_OFFERED is False


def test_the_wizard_has_no_shared_metrics_section():
    assert "telemetry" not in [key for key, _label, _fn in SETUP_SECTIONS]
    assert "Shared Metrics" not in [label for _key, label, _fn in SETUP_SECTIONS]


def test_the_wizard_section_asks_nothing_and_changes_nothing(monkeypatch, capsys):
    monkeypatch.setattr("hermes_cli.setup.prompt_yes_no", _explode)
    config = {}

    setup_telemetry(config)

    assert config == {}
    assert "not offered in Simmuse" in capsys.readouterr().out


def test_end_of_setup_offer_asks_nothing(monkeypatch):
    monkeypatch.setattr(consent, "offer_consent", _explode)
    monkeypatch.setattr("sys.stdin.isatty", lambda: True, raising=False)

    consent.offer_consent_if_undecided({})


def test_pre_chat_offer_asks_nothing(monkeypatch):
    monkeypatch.setattr(consent, "offer_consent", _explode)

    consent.offer_consent_before_chat(argparse.Namespace())


def test_setup_completion_does_not_ask(monkeypatch):
    monkeypatch.setattr(consent, "offer_consent", _explode)
    monkeypatch.setattr(
        "hermes_cli.observability.shared_metrics_events.record_setup_completed",
        lambda **_kwargs: None,
    )

    wizard._record_setup_completed({})


def test_the_tools_menu_has_no_sharing_row():
    import inspect

    from hermes_cli import tools_config

    source = inspect.getsource(tools_config.tools_command)
    # the row is added only when the switch is on
    assert "_shared_metrics_menu_label(config), SHARING_OFFERED" in source


@pytest.mark.parametrize("module", ["hermes_cli.setup", "hermes_cli.tools_config", "hermes_cli.observability.shared_metrics_consent"])
def test_every_surface_reads_the_same_switch(module):
    import importlib

    assert importlib.import_module(module).SHARING_OFFERED is SHARING_OFFERED
