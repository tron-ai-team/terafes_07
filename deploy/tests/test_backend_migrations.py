"""Unit tests for additive-only Flyway migration verification."""

import importlib.util
from pathlib import Path
import sys
import types
import unittest


# The Ubuntu controller imports Unix-only modules; stub them for hermetic logic tests.
for name in ("fcntl", "pwd"):
    sys.modules.setdefault(name, types.ModuleType(name))
if "pwd" in sys.modules and not hasattr(sys.modules["pwd"], "getpwuid"):
    sys.modules["pwd"].getpwuid = lambda _uid: types.SimpleNamespace(pw_dir="/tmp")

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "backend_production", HERE.parent / "scripts" / "backend-production.py"
)
CONTROLLER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONTROLLER)


def jar_path(name):
    return CONTROLLER.MIGRATION_PREFIX + name


def hashes(*names):
    return {jar_path(name): f"digest-{name}" for name in names}


class CompareMigrationHashesTest(unittest.TestCase):
    def test_identical_sets_pass(self):
        current = hashes("V1__initial.sql", "V2__auth.sql")
        CONTROLLER.compare_migration_hashes(current, dict(current))

    def test_additive_forward_migrations_pass(self):
        current = hashes("V1__initial.sql", "V18__career.sql")
        candidate = hashes(
            "V1__initial.sql",
            "V18__career.sql",
            "V19__candidate_profile_master.sql",
            "V20__cv_builder_soft_delete.sql",
            "V21__career_job_source_cache.sql",
        )
        CONTROLLER.compare_migration_hashes(current, candidate)

    def test_modified_historical_migration_is_rejected(self):
        current = hashes("V1__initial.sql", "V18__career.sql")
        candidate = dict(current)
        candidate[jar_path("V18__career.sql")] = "tampered"
        with self.assertRaises(CONTROLLER.ReleaseError) as raised:
            CONTROLLER.compare_migration_hashes(current, candidate)
        self.assertIn("modified", str(raised.exception))
        self.assertIn("V18__career.sql", str(raised.exception))

    def test_removed_historical_migration_is_rejected(self):
        current = hashes("V1__initial.sql", "V18__career.sql")
        candidate = hashes("V1__initial.sql", "V19__new.sql")
        with self.assertRaises(CONTROLLER.ReleaseError) as raised:
            CONTROLLER.compare_migration_hashes(current, candidate)
        self.assertIn("removed", str(raised.exception))
        self.assertIn("V18__career.sql", str(raised.exception))

    def test_unexpected_non_forward_migration_is_rejected(self):
        current = hashes("V1__initial.sql", "V18__career.sql")
        candidate = hashes("V1__initial.sql", "V18__career.sql", "V10__sneaky.sql")
        with self.assertRaises(CONTROLLER.ReleaseError) as raised:
            CONTROLLER.compare_migration_hashes(current, candidate)
        self.assertIn("Unexpected Flyway migration", str(raised.exception))
        self.assertIn("V10__sneaky.sql", str(raised.exception))

    def test_unexpected_filename_is_rejected(self):
        current = hashes("V1__initial.sql")
        candidate = {jar_path("V1__initial.sql"): "digest-V1__initial.sql",
                     jar_path("notes.txt"): "nope"}
        with self.assertRaises(CONTROLLER.ReleaseError) as raised:
            CONTROLLER.compare_migration_hashes(current, candidate)
        self.assertIn("Unexpected Flyway migration file", str(raised.exception))

    def test_duplicate_version_is_rejected(self):
        current = hashes("V1__initial.sql")
        candidate = {
            jar_path("V1__initial.sql"): current[jar_path("V1__initial.sql")],
            jar_path("V19__one.sql"): "a",
            jar_path("V19__two.sql"): "b",
        }
        with self.assertRaises(CONTROLLER.ReleaseError) as raised:
            CONTROLLER.compare_migration_hashes(current, candidate)
        self.assertIn("Duplicate Flyway migration version", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
