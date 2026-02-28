import json
from pathlib import Path
import importlib.util

# Load device module by file path to avoid importing package __init__ (which requires homeassistant)
DEVICE_PY = Path(__file__).resolve().parents[1] / 'device.py'
spec = importlib.util.spec_from_file_location('device_module', str(DEVICE_PY))
assert spec is not None, f"Could not load spec from {DEVICE_PY}"
device_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None, "Spec has no loader"
spec.loader.exec_module(device_module)

Device = device_module.Device
compute_derived_fields = device_module.compute_derived_fields
normalize_function = device_module.normalize_function
normalize_firmware = device_module.normalize_firmware

FIXTURES = Path(__file__).parent / "fixtures" / "devices.json"


def load_fixtures():
    return json.loads(FIXTURES.read_text(encoding='utf8'))


def test_compute_derived_fields_from_fixtures():
    fixtures = load_fixtures()
    for f in fixtures:
        dev = Device(
            mac=f.get('mac'),
            state=f.get('state'),
            level=f.get('level'),
            room_fr=f.get('room_fr'),
            position_fr=f.get('position_fr'),
            function=f.get('function'),
            room_slug=f.get('room_slug'),
            position_slug=f.get('position_slug'),
            firmware=f.get('firmware'),
            model=f.get('model'),
            ip=str(f.get('ip')) if f.get('ip') is not None else None,
            interlock=f.get('interlock'),
            mode=f.get('mode'),
            target=f.get('target'),
            ha_device_class=f.get('ha_device_class'),
            extra=f.get('extra'),
        )

        derived = compute_derived_fields(dev)
        exp = f.get('expected', {})
        assert derived.get('hostname') == exp.get('hostname')
        assert derived.get('mqtt_topic') == exp.get('mqtt_topic')
        assert derived.get('link') == exp.get('link')
        assert derived.get('dns') == exp.get('dns')
        assert derived.get('count_topic') == exp.get('count_topic')
        assert derived.get('enabled') == exp.get('enabled')


def test_normalizers():
    assert normalize_function('Button') == 'button'
    assert normalize_function('DoorBell') == 'doorbell'
    assert normalize_function('Unknown Func') == 'unknown-func'

    assert normalize_firmware('Tasmota') == 'tasmota'
    assert normalize_firmware('Embedded') == 'embeded'
    assert normalize_firmware('WLED') == 'wled'
