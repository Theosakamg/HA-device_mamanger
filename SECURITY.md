# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within HA Device Manager, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

**Please do not open public issues for security vulnerabilities.**

## Security Considerations

### ⚠️ Authentication (v0.1.0 - Development Mode)

**IMPORTANT**: The current v0.1.0 release is a Proof of Concept (POC) with authentication **disabled** for development purposes.

In `custom_components/ha_device_manager/api.py`, all views have:
```python
requires_auth = False  # Development mode only
```

**For production deployment:**
1. This should be changed to `requires_auth = True`
2. Or implement environment-based configuration
3. Or wait for future releases with proper authentication handling

### Current Security Status

✅ **Secured:**
- No hardcoded credentials in source code
- Secrets excluded via `.gitignore` (`.env`, `*.key`, `*.pem`)
- Pre-commit hooks detect private keys (`detect-private-key`)
- Database operations use parameterized queries (SQL injection protection)

⚠️ **Development Mode:**
- API endpoints accessible without authentication
- Intended for local development environments only
- Not recommended for production without modifications

🔒 **Recommended for Production:**
- Enable `requires_auth = True` in all API views
- Use Home Assistant's built-in authentication system
- Deploy behind reverse proxy with HTTPS
- Restrict network access to trusted sources
- Regular security audits and updates

## Best Practices

When deploying HA Device Manager:

1. **Review Authentication:** Check all `requires_auth` settings in `api.py`
2. **Use HTTPS:** Always use encrypted connections in production
3. **Update Dependencies:** Keep all dependencies up to date
4. **Monitor Logs:** Watch for unusual API access patterns
5. **Backup Database:** Regular backups of `ha_device_manager.db`

## Future Security Improvements

Planned for future releases:
- [ ] Environment-based authentication configuration
- [ ] API rate limiting
- [ ] Audit logging for CRUD operations
- [ ] Input validation enhancements
- [ ] CSRF token support
- [ ] Role-based access control (RBAC)

## Development Security

For contributors:
- Pre-commit hooks enforce security checks
- GitHub Actions CI validates all code
- Dependencies scanned for known vulnerabilities
- Code review required for all changes

## Contact

For security concerns, contact: [GitHub Issues](https://github.com/Theosakamg/ha_device_manager/issues) (public) or maintainer email (private vulnerabilities)

---

**Last Updated:** 2024-01-01  
**Version:** 0.1.0
