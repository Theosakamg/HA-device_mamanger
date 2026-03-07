import asyncio
import logging

from .common import FirmwareFactory
from .contract import _FLD_ID, _FLD_MAC
from .discovery import GlobalManager
from .utility import (Sanitizer, Initializer)

from custom_components.device_manager.services.database_manager import DatabaseManager
from custom_components.device_manager.repositories import DeviceRepository

_DEPLOY_DONE = "done"
_DEPLOY_FAIL = "fail"


def base_config(device, logger, ff):
    Sanitizer.entity_sanity(device)

    logger.info(f"\033[0;34mCheck Device: {device[_FLD_MAC]}\x1b[0m")
    fwm_count = 0
    for fwm in ff.get_firmware_managers():
        if device[_FLD_MAC] and fwm.is_found(device):
            fwm_count += 1

    return fwm_count > 0


def _persist_deploy_results(
    db_path, results: dict[int, str], logger
) -> None:
    """Persist per-device deploy status to the database (sync wrapper)."""

    async def _update_all():
        db = DatabaseManager(db_path)
        repo = DeviceRepository(db)
        try:
            for device_id, status in results.items():
                try:
                    await repo.update_deploy_status(device_id, status)
                except Exception as e:
                    logger.error(
                        f"Failed to persist deploy status for device {device_id}: {e}"
                    )
        finally:
            await db.close()

    try:
        asyncio.run(_update_all())
    except Exception as e:
        logger.error(f"Failed to persist deploy results: {e}")


def deploy(db_path):
    Initializer()
    logger = logging.getLogger(__name__)
    logger.info('Initialize App...')

    gm = GlobalManager(db_path)
    ff = FirmwareFactory(gm)

    count = 0
    success = 0
    error = 0
    deploy_results: dict[int, str] = {}

    logger.info('Run App...')

    for __dev in gm.get_devices():
        count += 1
        device_id = __dev.get(_FLD_ID)
        logger.debug(f'Process new device: {__dev[_FLD_MAC]}')

        try:
            matched = base_config(__dev, logger, ff)
            if matched:
                success += 1
            if device_id is not None:
                deploy_results[device_id] = _DEPLOY_DONE
        except Exception as e:
            logger.error(e)
            error += 1
            if device_id is not None:
                deploy_results[device_id] = _DEPLOY_FAIL

    for fwm in ff.get_firmware_managers():
        logger.debug(f"Post process for {fwm.__class__} Manager.")

    if deploy_results:
        logger.info(f"Persisting deploy status for {len(deploy_results)} devices...")
        _persist_deploy_results(db_path, deploy_results, logger)

    logger.info(
        f"Goodbye ! {count} Total Device"
        f" process, but success: {success} - error: {error}."
    )


def scan(db_path):
    Initializer()
    logger = logging.getLogger(__name__)
    logger.info('Initialize Scan...')

    gm = GlobalManager(db_path)
    gm.update_devices_ip()

