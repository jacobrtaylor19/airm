# Change Management — Provisum

## Principles

1. All changes go through the CI/CD pipeline (no manual deploys)
2. Every change is tracked in version control (Git)
3. Changes are reviewed before reaching production
4. Rollback is always possible

---

## Change Categories

| Category | Description | Approval | Examples |
|----------|-------------|----------|---------|
| **Standard** | Routine, pre-approved changes | No additional approval | Dependency updates (Dependabot), minor UI tweaks, documentation |
| **Normal** | Requires review before merge | PR review + CI pass | New features, schema changes, security patches, API changes |
| **Emergency** | Hotfix for P1/P2 incidents | Post-hoc review within 24h | Security vulnerability fix, production crash fix |

---

## Process

### Standard Changes
1. Create branch from `main`
2. Make changes
3. Push — CI runs automatically (build + lint + security audit)
4. CI must pass before merge
5. Merge to `main` → auto-deploy to Render

### Normal Changes
1. Create branch from `main`
2. Make changes
3. Create Pull Request
4. CI must pass
5. Code review (when team > 1; currently self-review with documented rationale)
6. Merge to `main` → auto-deploy to Render

### Emergency Changes
1. Create branch from `main`
2. Apply minimal fix
3. CI must pass (no bypassing)
4. Merge directly to `main` with `[HOTFIX]` prefix in commit message
5. Post-hoc PR review within 24 hours
6. Document in incident postmortem

---

## Rollback Procedure

### Render Instant Rollback
1. Go to Render dashboard → Deploys tab
2. Find the last known good deploy
3. Click "Rollback to this deploy"
4. Verify application health via `/api/health` endpoint

### Git-Based Rollback
```bash
git revert <commit-hash>
git push origin main
# Triggers auto-deploy
```

### Database Rollback
If a schema change or data migration caused issues:
1. Stop the application (scale to 0 on Render)
2. Run `scripts/restore.sh <latest-backup.enc>`
3. Restart the application
4. Verify data integrity

---

## Change Log

All changes are tracked in `CHANGELOG.md` at the project root.

### Changelog Format
```markdown
## [version] — YYYY-MM-DD
### Added
- New features

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Security
- Security-related changes
```
