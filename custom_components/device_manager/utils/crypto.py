"""Symmetric encryption utilities using Fernet (AES-128-CBC + HMAC-SHA256).

Fernet guarantees that any message encrypted cannot be manipulated or read
without the key. Encryption is reversible using the same key.
"""

import logging

from cryptography.fernet import Fernet, InvalidToken

_LOGGER = logging.getLogger(__name__)


def generate_key() -> str:
    """Generate a new URL-safe base64-encoded Fernet key (44 chars).

    Returns:
        A 44-character URL-safe base64 string suitable for Fernet.
    """
    return Fernet.generate_key().decode()


def encrypt(plain: str, key: str) -> str:
    """Encrypt a plaintext string using Fernet (AES-128-CBC + HMAC-SHA256).

    Args:
        plain: The plaintext string to encrypt. Returns ``""`` if empty.
        key: The Fernet key – URL-safe base64, 44 characters.

    Returns:
        A Fernet token (base64-encoded) or ``""`` if *plain* is empty.
    """
    if not plain:
        return ""
    try:
        f = Fernet(key.encode())
        return f.encrypt(plain.encode()).decode()
    except Exception as err:  # noqa: BLE001
        _LOGGER.error("Encryption failed: %s", err)
        return ""


def decrypt(cipher: str, key: str) -> str:
    """Decrypt a Fernet-encrypted string back to plaintext.

    Args:
        cipher: The Fernet token to decrypt. Returns ``""`` if empty.
        key: The Fernet key – URL-safe base64, 44 characters.

    Returns:
        The original plaintext, or ``""`` if decryption fails or *cipher*
        is empty (e.g. value was never encrypted / field is blank).
    """
    if not cipher:
        return ""
    try:
        f = Fernet(key.encode())
        return f.decrypt(cipher.encode()).decode()
    except InvalidToken:
        _LOGGER.warning("Decryption failed: invalid token (bad key or corrupted data)")
        return ""
    except Exception as err:  # noqa: BLE001
        _LOGGER.error("Decryption failed: %s", err)
        return ""
