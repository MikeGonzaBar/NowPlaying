# NowPlaying

## What is it about?

NowPlaying is a portfolio project designed to showcase your latest entertainment activities. Instead of hosting coding projects, it displays the following:

- The latest games you've played, the time spent playing them, and the achievements you've earned.
- The movies and shows you've streamed.
- The songs you've listened to.

## Supported Apps

### Games

- **Steam**: ✅ Supported - Full integration with game list and achievements.
- **PlayStation**: ✅ Supported - ⚠️ Manual cookie manipulation required for the npsso token.
- **Xbox**: ❌ Not implemented.
- **Nintendo**: ❌ Not supported.
- **RetroAchievements**: ✅ Supported - Including games from PS2, PS1, Nintendo DS, and other retro consoles.

### Movies

- **Trakt**: ✅ Supported - Integration through [Trakt](https://trakt.tv/) for both movies and TV shows.
  - ⚠️ No direct streaming platform integrations are available.

### Music

- **Spotify**: ✅ Supported - Tracks recently played songs.
- **Apple Music**: ❌ Not supported.
- **YouTube Music**: ❌ Not supported.

## Project Structure

- **API**: Django-based backend that connects to various services and stores data.
- **UI**: React-based frontend built with TypeScript, Vite, and Material-UI.

## Setup and Configuration

### API Configuration

To set up the required API integrations for this project, refer to the [API Configuration Guide](./API/README.md).

### UI Configuration

To set up the UI for this project, refer to the [UI Configuration Guide](./UI/README.md).

## Deployment

The project includes Docker configuration for easy deployment using Docker Compose.
