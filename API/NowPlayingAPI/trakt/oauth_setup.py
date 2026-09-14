#!/usr/bin/env python3
"""
Trakt OAuth Setup Script

This script helps you complete the Trakt OAuth authentication process.
Run this script and follow the prompts to authenticate your Trakt account.

Usage:
    python oauth_setup.py

Requirements:
    - Your Django server must be running
    - You must have your Trakt API credentials configured in UserApiKey
    - You need a valid JWT token for authentication
"""

import os
import sys
import django
import requests
import webbrowser
from urllib.parse import urlparse, parse_qs

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NowPlayingAPI.settings')
django.setup()

from django.contrib.auth.models import User


def get_user() -> User:
    """Get user for authentication"""
    print("Available users:")
    users = User.objects.all()
    for i, user in enumerate(users, 1):
        print(f"{i}. {user.username} ({user.email})")

    while True:
        try:
            choice = int(input("\nSelect user number: ")) - 1
            if 0 <= choice < len(users):
                return users[choice]
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Please enter a valid number.")


def get_jwt_token() -> tuple[str | None, str | None]:
    """Get JWT token for the user"""
    base_url = input("Enter your Django server URL (e.g., http://localhost:8000): ").rstrip('/')
    username = input("Enter username: ")
    password = input("Enter password: ")

    login_url = f"{base_url}/auth/login/"
    login_data = {
        "username": username,
        "password": password
    }

    try:
        response = requests.post(login_url, json=login_data)
        response.raise_for_status()
        data = response.json()
        return data.get('access'), base_url
    except requests.RequestException as e:
        print(f"Failed to get JWT token: {e}")
        return None, None


def main() -> None:
    """Run the interactive Trakt OAuth setup flow."""
    print("🎬 Trakt OAuth Setup")
    print("===================")

    print("\n1. Getting authentication token...")
    token, base_url = get_jwt_token()
    if not token:
        print("❌ Failed to get authentication token. Exiting.")
        return

    print("✅ Authentication token obtained!")

    print("\n2. Getting Trakt authentication URL...")
    auth_url_endpoint = f"{base_url}/trakt/authenticate/"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.get(auth_url_endpoint, headers=headers)
        response.raise_for_status()
        auth_data = response.json()
        auth_url = auth_data.get('auth_url')

        if not auth_url:
            print(f"❌ Failed to get auth URL: {auth_data}")
            return

        print(f"✅ Authentication URL: {auth_url}")

    except requests.RequestException as e:
        print(f"❌ Failed to get authentication URL: {e}")
        return

    print("\n3. Opening browser for Trakt authorization...")
    webbrowser.open(auth_url)
    print("🌐 Browser opened. Please authorize your Trakt account.")

    print("\n4. After authorizing, you'll be redirected to a page with an authorization code.")
    redirect_url = input("Please paste the full redirect URL here: ").strip()

    try:
        parsed_url = urlparse(redirect_url)
        query_params = parse_qs(parsed_url.query)
        code = query_params.get('code', [None])[0]
        state = query_params.get('state', [None])[0]

        if not code:
            print("❌ No authorization code found in the URL.")
            return

        print(f"✅ Authorization code extracted: {code[:10]}...")

    except Exception as e:
        print(f"❌ Failed to parse redirect URL: {e}")
        return

    print("\n5. Completing authentication...")
    callback_url = f"{base_url}/trakt/oauth-callback/"
    callback_data = {
        'code': code,
        'state': state
    }

    try:
        response = requests.post(callback_url, json=callback_data, headers=headers)
        response.raise_for_status()
        result = response.json()

        if result.get('success'):
            print("🎉 SUCCESS! Trakt authentication completed!")
            print(f"Token expires at: {result.get('expires_at')}")
            print("\nYou can now use the Trakt API endpoints:")
            print(f"- {base_url}/trakt/fetch-latest-movies/")
            print(f"- {base_url}/trakt/fetch-latest-shows/")
        else:
            print(f"❌ Authentication failed: {result.get('error')}")

    except requests.RequestException as e:
        print(f"❌ Failed to complete authentication: {e}")


if __name__ == "__main__":
    main()
