import sys
from pathlib import Path

# Ensure repo root is on sys.path so `custom_components` package can be imported
repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo_root))

from custom_components.device_manager.tests.test_device import load_fixtures, test_compute_derived_fields_from_fixtures, test_normalizers  # noqa
from custom_components.device_manager.tests.test_import import test_csv_import_to_db  # noqa


def run():
    failures = 0
    try:
        test_compute_derived_fields_from_fixtures()
        print('test_compute_derived_fields_from_fixtures: PASS')
    except AssertionError as e:
        failures += 1
        print('test_compute_derived_fields_from_fixtures: FAIL')
        print(e)

    try:
        test_normalizers()
        print('test_normalizers: PASS')
    except AssertionError as e:
        failures += 1
        print('test_normalizers: FAIL')
        print(e)

    try:
        test_csv_import_to_db()
        print('test_csv_import_to_db: PASS')
    except AssertionError as e:
        failures += 1
        print('test_csv_import_to_db: FAIL')
        print(e)

    if failures:
        print(f"{failures} test(s) failed")
        sys.exit(1)
    print('All tests passed')


if __name__ == '__main__':
    run()
