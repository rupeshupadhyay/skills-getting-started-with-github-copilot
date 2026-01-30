import copy
import urllib.parse

import pytest
from httpx import AsyncClient, ASGITransport

from src import app as app_module
from src.app import app


@pytest.fixture(autouse=True)
def reset_activities():
    # Keep tests isolated by restoring the original in-memory data
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original)


@pytest.mark.asyncio
async def test_get_activities():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/activities")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        assert "Chess Club" in data


@pytest.mark.asyncio
async def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "testuser@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # signup
        r = await ac.post(f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}")
        assert r.status_code == 200
        assert "Signed up" in r.json().get("message", "")

        # participant should appear in activities
        r = await ac.get("/activities")
        assert email in r.json()[activity]["participants"]

        # unregister
        r = await ac.request("DELETE", f"/activities/{urllib.parse.quote(activity)}/unregister?email={urllib.parse.quote(email)}")
        assert r.status_code == 200
        assert "Unregistered" in r.json().get("message", "")

        # participant should no longer be present
        r = await ac.get("/activities")
        assert email not in r.json()[activity]["participants"]


@pytest.mark.asyncio
async def test_signup_duplicate_fails():
    activity = "Programming Class"
    email = "duplicate@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}")
        assert r.status_code == 200
        r = await ac.post(f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}")
        assert r.status_code == 400


@pytest.mark.asyncio
async def test_unregister_not_signed_up_fails():
    activity = "Gym Class"
    email = "notregistered@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.request("DELETE", f"/activities/{urllib.parse.quote(activity)}/unregister?email={urllib.parse.quote(email)}")
        assert r.status_code == 400
