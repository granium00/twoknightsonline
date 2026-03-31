# Multiplayer Rebuild Plan

## Goal

Rebuild online play into a stable turn-based flow without breaking the existing game logic.

## Best Target Architecture

The safest long-term option for this project is:

1. `Room + lobby` on the server.
2. `Server authoritative turn state`.
3. `Client-side local UI`, but not authoritative game rules.
4. `Private player view projection` for each client.
5. `Turn commit flow` instead of constant click mirroring.

This is better than the current `host authoritative click relay`, because the current model:

- mirrors DOM actions instead of game intents,
- sends full snapshots too often,
- depends on host timing,
- exposes temporary turn UI states,
- makes desync and visual jumps much more likely.

## Recommended Game Flow

1. Player creates or joins a lobby.
2. Both players choose hero/side in the lobby.
3. Server locks the roster and starts the match.
4. Server sends each player:
   - full public state,
   - private state only for that player,
   - current turn owner,
   - turn phase.
5. Active player performs actions locally.
6. Turn ends only when:
   - the player presses `Сделать ход`, or
   - the game can auto-finish because no blocking dialog was opened.
7. Server applies the turn result and broadcasts the next authoritative state.

## State Split

The important rebuild step is to split data into 3 layers:

- `Public state`
  - map objects,
  - pawn positions,
  - castle ownership,
  - public battle results,
  - public pickup notifications,
  - timers and turn owner.

- `Private state per player`
  - available move field,
  - local dialogs,
  - local choices in city, shop, mage, castle, guard,
  - local inventory-only interactions when they should stay private.

- `Transient UI state`
  - which modal is open,
  - which button is disabled,
  - pending local selection,
  - hover/highlight state.

Transient UI state should never be the source of truth for multiplayer sync.

## Public vs Private Dialog Rules

Private only:

- all shop dialogs,
- city dialog,
- mage dialog,
- guard dialog,
- castle management dialog,
- local move/highlight field,
- local inventory dialogs,
- private resource pickup dialog details.

Public to both players:

- battle result between players,
- public pickup feed:
  - resources,
  - army,
  - gold,
  - mystic flower,
  - clover,
  - rainbow stone,
  - other visible match-impact rewards.

## Safe Migration Order

Do not move everything at once. Migrate in phases:

### Phase 1

- Add `Сделать ход`.
- Block turn handoff while a dialog is open.
- Hide reachable cells from the non-active player.
- Keep existing gameplay rules intact.

### Phase 2

- Add server rooms and lobby state.
- Add hero selection before match start.
- Replace `host / guest` semantics with `room player 0 / room player 1`.

### Phase 3

- Stop syncing raw DOM click side effects.
- Send only player intents:
  - roll,
  - move,
  - buy,
  - use item,
  - confirm guard choice,
  - finish turn.

### Phase 4

- Move rule resolution to a shared game engine module.
- Server executes authoritative rules.
- Client renders state only.

### Phase 5

- Add per-player state projection and public event feed.
- Broadcast only allowed data to each client.

## Practical Recommendation For This Codebase

Because the project is currently built from global browser scripts, the least risky path is:

1. Extract pure game-rule helpers into a shared engine file.
2. Keep DOM rendering in the browser only.
3. Gradually replace direct DOM-driven logic with intent handlers.
4. Move random rolls and rule outcomes to the authoritative side last, after extraction.

This preserves current content and reduces the chance of breaking battles, resources, or map systems.

## What Was Implemented Now

This repository now has the first safe foundation step:

- `Сделать ход` button,
- turn does not switch while a blocking dialog is open,
- turn can still auto-finish when no dialog appeared,
- reachable cells are not rendered for the non-active player.

That gives a stable base for the later lobby and server-authoritative rebuild.
