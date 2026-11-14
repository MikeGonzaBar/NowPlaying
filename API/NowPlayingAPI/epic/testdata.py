"""Recorded-shape fixtures for the Epic adapter tests.

These are trimmed versions of the payloads documented in
``legendary/api/egs.py`` / ``legendary/models/gql.py``. Replace them with real
captured responses from the Phase 0 spike once an account is available; the
tests only depend on the field names, not the values.
"""

TOKEN_RESPONSE = {
    "access_token": "eg1~access-token-1",
    "refresh_token": "eg1~refresh-token-1",
    "token_type": "bearer",
    "expires_in": 7200,
    "expires_at": "2099-01-01T00:00:00.000Z",
    "refresh_expires": 28800,
    "refresh_expires_at": "2099-01-01T08:00:00.000Z",
    "account_id": "account-123",
    "displayName": "Player One",
    "scope": "basic_profile",
}

HADES_NAMESPACE = "ns_hades"
HADES_ITEM_ID = "cat_hades"
CELESTE_NAMESPACE = "ns_celeste"
CELESTE_ITEM_ID = "cat_celeste"

LIBRARY_RECORDS = [
    {
        "recordId": "rec-1",
        "namespace": HADES_NAMESPACE,
        "catalogItemId": HADES_ITEM_ID,
        "appName": "Hades",
        "productId": "prod-hades",
        "productName": "",
        "sandboxName": "Hades",
        "sandboxType": "PUBLIC",
        "recordType": "APPLICATION",
        "acquisitionDate": "2023-05-01T10:00:00.000Z",
    },
    {
        # A second build of the same product must not become a second game.
        "recordId": "rec-1b",
        "namespace": HADES_NAMESPACE,
        "catalogItemId": "cat_hades_build",
        "appName": "7a1f0c1e4b2d4f6a8c0e2b4d6f8a0c2e",
        "productId": "prod-hades",
        "productName": "",
        "sandboxName": "Live",
        "sandboxType": "PUBLIC",
        "recordType": "APPLICATION",
        "acquisitionDate": "2023-05-01T10:00:00.000Z",
    },
    {
        "recordId": "rec-2",
        "namespace": CELESTE_NAMESPACE,
        "catalogItemId": CELESTE_ITEM_ID,
        "appName": "Celeste",
        "productId": "prod-celeste",
        "productName": "",
        "sandboxName": "Live",
        "sandboxType": "PUBLIC",
        "recordType": "APPLICATION",
        "acquisitionDate": "2022-12-25T18:30:00.000Z",
    },
    {
        # Records without a launcher application must never become a game.
        "recordId": "rec-audience",
        "namespace": "ns_audience",
        "catalogItemId": "cat_audience",
        "appName": "",
        "productName": "Audience record",
        "recordType": "APPLICATION",
    },
]

ENTITLEMENTS = [
    {
        "namespace": "ns_unlisted",
        "catalogItemId": "cat_unlisted",
        "entitlementName": "Unlisted Game",
        "entitlementType": "EXECUTABLE",
        "active": True,
        "createdAt": "2021-01-02T03:04:05.000Z",
    },
    {
        "namespace": "ns_audience",
        "catalogItemId": "cat_audience",
        "entitlementName": "Audience",
        "entitlementType": "AUDIENCE",
        "active": True,
    },
]

CATALOG_ITEMS = {
    "cat_hades": {
        "title": "Hades",
        "description": "Defy the god of the dead as you hack and slash out of the Underworld.",
        "developerDisplayName": "Supergiant Games",
        "publisherDisplayName": "Supergiant Games",
        "keyImages": [
            {"type": "DieselStoreFrontWide", "url": "https://cdn.example/hades-wide.jpg"},
            {"type": "OfferImageTall", "url": "https://cdn.example/hades-tall.jpg"},
        ],
        "categories": [{"path": "games"}],
    },
    "cat_celeste": {
        "title": "Celeste",
        "description": "A platformer about climbing a mountain.",
        "developerDisplayName": "Maddy Makes Games",
        "publisherDisplayName": "Maddy Makes Games",
        "keyImages": [
            {"type": "Thumbnail", "url": "https://cdn.example/celeste-thumb.jpg"},
        ],
        "categories": [{"path": "games"}],
    },
    "cat_unlisted": {
        "title": "Unlisted Game",
        "description": "",
        "developerDisplayName": "Someone",
        "publisherDisplayName": "Someone",
        "keyImages": [],
        "categories": [{"path": "games"}],
    },
}

# Celeste deliberately returns no achievement definitions: Epic achievements
# are opt-in per product, so "zero achievements" is a normal outcome.
ACHIEVEMENT_DEFINITIONS = {
    HADES_NAMESPACE: {
        "sandboxId": HADES_NAMESPACE,
        "totalAchievements": 3,
        "achievements": [
            {
                "achievement": {
                    "name": "ACH_FIRST",
                    "hidden": False,
                    "isBase": True,
                    "unlockedDisplayName": "First Blood",
                    "lockedDisplayName": "First Blood",
                    "unlockedDescription": "Win your first run.",
                    "lockedDescription": "Win your first run.",
                    "unlockedIconLink": "https://cdn.example/ach-first.png",
                    "lockedIconLink": "https://cdn.example/ach-first-gray.png",
                    "XP": 50,
                    "rarity": {"percent": 12.5},
                }
            },
            {
                "achievement": {
                    "name": "ACH_SECOND",
                    "hidden": False,
                    "isBase": True,
                    "unlockedDisplayName": "Second Wind",
                    "lockedDisplayName": "Second Wind",
                    "unlockedDescription": "Escape with a second weapon.",
                    "lockedDescription": "Escape with a second weapon equipped.",
                    "unlockedIconLink": "https://cdn.example/ach-second.png",
                    "lockedIconLink": "https://cdn.example/ach-second-gray.png",
                    "XP": 75,
                    "rarity": {"percent": 4.25},
                }
            },
        ],
    },
    CELESTE_NAMESPACE: {
        "sandboxId": CELESTE_NAMESPACE,
        "totalAchievements": 0,
        "achievements": [],
    },
}

PLAYTIME_RESPONSE = [
    # Both builds of Hades report playtime. The larger total must win instead of
    # being summed, because they describe the same play sessions.
    {"accountId": "account-123", "artifactId": "Hades", "totalTime": 7800},
    {
        "accountId": "account-123",
        "artifactId": "7a1f0c1e4b2d4f6a8c0e2b4d6f8a0c2e",
        "totalTime": 9000,
    },
    {"accountId": "account-123", "artifactId": "Celeste", "totalTime": 3600},
    # Not in this account's library: ignored rather than guessed onto a game.
    {"accountId": "account-123", "artifactId": "unknown-artifact", "totalTime": 999},
]

PLAYER_ACHIEVEMENTS = {
    HADES_NAMESPACE: {
        "totalXP": 50,
        "totalUnlocked": 1,
        "playerAchievements": [
            {
                "playerAchievement": {
                    "achievementName": "ACH_FIRST",
                    "unlocked": True,
                    "progress": 100,
                    "unlockDate": "2024-02-03T04:05:06.000Z",
                    "XP": 50,
                }
            },
            {
                "playerAchievement": {
                    "achievementName": "ACH_SECOND",
                    "unlocked": False,
                    "progress": 40,
                    "XP": 0,
                }
            },
        ],
    },
    CELESTE_NAMESPACE: {},
}
