"""Creator marketplace foundation (Phase 6) — publish a paid quest
template, browse it, purchase it (auto-joins), and the paywall/discovery
exclusion around all of that."""

import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


def _creator_quest_payload(**overrides):
    payload = {
        "quest": {
            "title": "Hidden Seoul Café Crawl",
            "description": "A paid quest template from a creator.",
            "category_key": "category.photography",
            "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
            "start_time": "2026-09-05T14:00:00+00:00",
            "duration_minutes": 120,
            "max_participants": 2,
            "difficulty": "medium",
            "xp_reward": 200,
            "objectives": [],
        },
        "price_amount": 5000,
    }
    payload.update(overrides)
    return payload


async def _become_creator(client, tokens, display_name="Seoul Walker"):
    resp = await client.post("/creators", json={"display_name": display_name}, headers=auth_headers(tokens))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_must_register_as_creator_before_publishing(client, seed_reference_data):
    user = await register(client, email="mkt1@example.com", username="mkt1")
    resp = await client.post("/creators/quests", json=_creator_quest_payload(), headers=auth_headers(user))
    assert resp.status_code == 403


async def test_registering_as_creator_twice_is_rejected(client, seed_reference_data):
    user = await register(client, email="mkt2@example.com", username="mkt2")
    await _become_creator(client, user)
    second = await client.post("/creators", json={"display_name": "Again"}, headers=auth_headers(user))
    assert second.status_code == 409


async def test_creator_quest_excluded_from_discovery_endpoints(client, seed_reference_data):
    creator = await register(client, email="mkt3@example.com", username="mkt3")
    await _become_creator(client, creator)
    published = await client.post(
        "/creators/quests", json=_creator_quest_payload(), headers=auth_headers(creator)
    )
    assert published.status_code == 201, published.text
    quest_id = published.json()["quest"]["id"]

    other = await register(client, email="mkt3b@example.com", username="mkt3b")
    listed = (await client.get("/quests", headers=auth_headers(other))).json()
    assert not any(q["id"] == quest_id for q in listed)

    nearby = (
        await client.get(
            "/quests/nearby", params={"lat": 37.5563, "lng": 126.9236, "radius_km": 5}, headers=auth_headers(other)
        )
    ).json()
    assert not any(q["id"] == quest_id for q in nearby)

    recommended = (await client.get("/quests/recommended", headers=auth_headers(other))).json()
    assert not any(q["id"] == quest_id for q in recommended)


async def test_marketplace_listing_shows_price_and_creator_name(client, seed_reference_data):
    creator = await register(client, email="mkt4@example.com", username="mkt4")
    await _become_creator(client, creator, display_name="Seoul Walker")
    await client.post("/creators/quests", json=_creator_quest_payload(), headers=auth_headers(creator))

    buyer = await register(client, email="mkt4b@example.com", username="mkt4b")
    listing = (await client.get("/marketplace/quests", headers=auth_headers(buyer))).json()
    assert len(listing) == 1
    assert listing[0]["creator_display_name"] == "Seoul Walker"
    assert listing[0]["price_amount"] == "5000.00" or float(listing[0]["price_amount"]) == 5000
    assert listing[0]["already_purchased"] is False


async def test_non_purchaser_gets_402_on_quest_detail_and_direct_join(client, seed_reference_data):
    creator = await register(client, email="mkt5@example.com", username="mkt5")
    await _become_creator(client, creator)
    published = (
        await client.post("/creators/quests", json=_creator_quest_payload(), headers=auth_headers(creator))
    ).json()
    quest_id = published["quest"]["id"]

    stranger = await register(client, email="mkt5b@example.com", username="mkt5b")
    detail = await client.get(f"/quests/{quest_id}", headers=auth_headers(stranger))
    assert detail.status_code == 402

    join = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(stranger))
    assert join.status_code == 402


async def test_purchase_charges_and_autojoins(client, seed_reference_data):
    creator = await register(client, email="mkt6@example.com", username="mkt6")
    await _become_creator(client, creator)
    published = (
        await client.post("/creators/quests", json=_creator_quest_payload(), headers=auth_headers(creator))
    ).json()
    quest_id = published["quest"]["id"]

    buyer = await register(client, email="mkt6b@example.com", username="mkt6b")
    purchase = await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer))
    assert purchase.status_code == 200, purchase.text
    quest = purchase.json()
    assert any(p["user_id"] for p in quest["participants"])  # buyer is now a participant

    # now that they've purchased it, the paywall no longer blocks them
    detail = await client.get(f"/quests/{quest_id}", headers=auth_headers(buyer))
    assert detail.status_code == 200

    listing = (await client.get("/marketplace/quests", headers=auth_headers(buyer))).json()
    assert listing[0]["already_purchased"] is True


async def test_purchase_twice_is_rejected(client, seed_reference_data):
    creator = await register(client, email="mkt7@example.com", username="mkt7")
    await _become_creator(client, creator)
    published = (
        await client.post("/creators/quests", json=_creator_quest_payload(), headers=auth_headers(creator))
    ).json()
    quest_id = published["quest"]["id"]

    buyer = await register(client, email="mkt7b@example.com", username="mkt7b")
    first = await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer))
    assert first.status_code == 200
    second = await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer))
    assert second.status_code == 409


async def test_purchase_respects_capacity(client, seed_reference_data):
    creator = await register(client, email="mkt8@example.com", username="mkt8")
    await _become_creator(client, creator)
    published = (
        await client.post(
            "/creators/quests",
            json=_creator_quest_payload(quest={**_creator_quest_payload()["quest"], "max_participants": 2}),
            headers=auth_headers(creator),
        )
    ).json()
    quest_id = published["quest"]["id"]

    buyer1 = await register(client, email="mkt8a@example.com", username="mkt8a")
    buyer2 = await register(client, email="mkt8b@example.com", username="mkt8b")
    buyer3 = await register(client, email="mkt8c@example.com", username="mkt8c")

    assert (await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer1))).status_code == 200
    assert (await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer2))).status_code == 200
    full = await client.post(f"/marketplace/{quest_id}/purchase", headers=auth_headers(buyer3))
    assert full.status_code == 409
