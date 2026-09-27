#!/usr/bin/env python3
"""Exercise saved cohort SQL against synthetic events with SQLite adapters.

This checks query logic without sending synthetic events to PostHog. Live HogQL
execution is still required: SQLite cannot establish PostHog compatibility.
"""

from datetime import datetime, timezone
from pathlib import Path
import re
import sqlite3


class CountIf:
    def __init__(self):
        self.value = 0

    def step(self, condition):
        self.value += bool(condition)

    def finalize(self):
        return self.value


class MinIf:
    def __init__(self):
        self.value = None

    def step(self, value, condition):
        if condition and (self.value is None or value < self.value):
            self.value = value

    def finalize(self):
        # A missing conditional timestamp has a default, not a reliable NULL.
        return self.value if self.value is not None else 0


class ArgMin:
    def __init__(self):
        self.value = None
        self.minimum = None

    def step(self, value, timestamp):
        if self.minimum is None or timestamp < self.minimum:
            self.minimum, self.value = timestamp, value

    def finalize(self):
        return self.value


def epoch(value):
    return int(datetime.fromisoformat(value).replace(tzinfo=timezone.utc).timestamp())


connection = sqlite3.connect(":memory:")
connection.create_aggregate("countIf", 1, CountIf)
connection.create_aggregate("minIf", 2, MinIf)
connection.create_aggregate("argMin", 2, ArgMin)
connection.create_function("toString", 1, lambda value: None if value is None else str(value))
connection.create_function("now", 0, lambda: epoch("2026-09-27 12:00:00"))
connection.create_function("toStartOfDay", 1, lambda value: value // 86400 * 86400)
connection.execute("""CREATE TABLE events (
    event TEXT, timestamp INTEGER, analytics_install_id TEXT, app_build TEXT,
    environment TEXT, is_simulator INTEGER, "$is_testflight" INTEGER,
    launch_kind TEXT, is_replay INTEGER, analytics_schema_version INTEGER,
    distinct_id TEXT
)""")

origin = epoch("2026-09-20 00:00:00")


def add(install_id, event, offset=0, **changes):
    row = dict(event=event, timestamp=origin + offset,
               analytics_install_id=install_id, app_build="190",
               environment="production", is_simulator=0,
               launch_kind="first_run", is_replay=0,
               analytics_schema_version=5, distinct_id="anonymous")
    row["$is_testflight"] = 0
    row.update(changes)
    columns = ",".join('"' + key + '"' for key in row)
    connection.execute(f"INSERT INTO events ({columns}) VALUES ({','.join('?' for _ in row)})", list(row.values()))


ready, shown, tapped, completed = (
    "app_ready", "onboarding_screen_shown", "onboarding_get_started_tapped", "onboarding_completed"
)
for event, offset in [(ready, 0), (shown, 1), (tapped, 2), (completed, 3)]:
    add("guest", event, offset)
    add("guest", event, offset, distinct_id="identified")
add("guest", ready, 3600, distinct_id="identified")
for event, offset in [(ready, 0), (shown, 1), (completed, 2)]:
    add("direct-sign-in", event, offset, distinct_id="identified")
add("missing-target", ready)
for event, offset in [(ready, 0), (shown, 1), (tapped, -1), (completed, -1)]:
    add("wrong-order", event, offset)
for event, offset in [(ready, 0), (shown, 1), (tapped, 86401), (completed, 86402)]:
    add("late-target", event, offset)
add("earlier-install", ready, timestamp=epoch("2026-08-01 00:00:00"))
add("earlier-install", ready)
add("earlier-install", shown, 1)
add("immature", ready, timestamp=epoch("2026-09-26 00:00:00"))
add("testflight", ready, **{"$is_testflight": 1})
add("simulator", ready, is_simulator=1)
add("replay", ready, is_replay=1)
add("unknown-device", ready, is_simulator=None)
add("unknown-testflight", ready, **{"$is_testflight": None})
add(None, ready)
add("", ready)
add("old-schema", ready, analytics_schema_version=2)
add("replay-target", ready)
add("replay-target", shown, 1)
add("replay-target", tapped, 2, is_replay=1)
add("replay-target", completed, 3, is_replay=1)
for event, offset in [(ready, 0), (shown, 1), (tapped, 86400), (completed, 86400)]:
    add("boundary", event, offset)
add("upgraded", ready, app_build="180")
add("upgraded", shown, 1, app_build="180")
add("upgraded", tapped, 2)
add("upgraded", completed, 3, distinct_id="identified")

query_root = Path(__file__).resolve().parents[1] / "docs/audits/queries"
expected = {"cohort": (8, 7, 87.5, 3, 37.5, 4, 50.0),
            "readiness": (8, 7, 87.5),
            "get-started": (8, 3, 37.5),
            "completion": (8, 4, 50.0)}
for report, values in expected.items():
    path = query_root / f"2026-09-27-onboarding-{report}.sql"
    query = path.read_text()
    query = re.sub(r"(?:(\w+)\.)?properties\.([\w$]+)",
                   lambda match: (match[1] + "." if match[1] else "") + '"' + match[2] + '"', query)
    query = re.sub(r"INTERVAL (\d+) DAY", lambda match: str(int(match[1]) * 86400), query)
    rows = connection.execute(query).fetchall()
    total = next(row for row in rows if row[0] == "All builds")
    assert total[1:] == values, (report, total, values)
    assert sum(row[1] for row in rows if row[0] != "All builds") == total[1], rows
    print(f"PASS {report}: {total[1:]}")

print("PASS duplicate events, restarts, identification, direct sign-in, missing targets,")
print("wrong order, 24-hour boundary, late targets, retained history, immature cohorts,")
print("TestFlight, simulator, replay, missing eligibility, missing IDs, schema and build attribution.")
