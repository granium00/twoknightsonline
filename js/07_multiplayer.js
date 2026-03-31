// ------------------------------------------------------------
//   Online mode: lobby rooms + host authoritative match
// ------------------------------------------------------------
const socket = typeof io !== "undefined" ? io() : null;
let isHost = false;
let localPlayerIndex = null;
let currentRoomCode = "";
let onlineMatchStarted = false;
let lobbyState = null;
let applyingRemoteState = false;
let lastStateFingerprint = "";
let lastEmitAt = 0;
let performingRemoteAction = false;

const lobbyOverlay = document.getElementById("lobbyOverlay");
const lobbyStatusText = document.getElementById("lobbyStatusText");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomInput = document.getElementById("joinRoomInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const lobbyRoomCodeWrap = document.getElementById("lobbyRoomCodeWrap");
const lobbyRoomCode = document.getElementById("lobbyRoomCode");
const copyRoomCodeBtn = document.getElementById("copyRoomCodeBtn");
const heroSlot0Btn = document.getElementById("heroSlot0Btn");
const heroSlot1Btn = document.getElementById("heroSlot1Btn");
const heroSlot0Status = document.getElementById("heroSlot0Status");
const heroSlot1Status = document.getElementById("heroSlot1Status");
const debugOverlayText = document.getElementById("debugOverlayText");

let lastNetworkEvent = "boot";
let lastStateUpdateAt = 0;
let lastHostActionAt = 0;
let lastClientActionAt = 0;

function shallowClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function updateDebugOverlay() {
  if (!debugOverlayText) return;
  const lines = [
    `room=${currentRoomCode || "-"}`,
    `started=${onlineMatchStarted}`,
    `isHost=${isHost}`,
    `localPlayerIndex=${localPlayerIndex}`,
    `currentPlayerIndex=${typeof currentPlayerIndex !== "undefined" ? currentPlayerIndex : "-"}`,
    `movesRemaining=${typeof movesRemaining !== "undefined" ? movesRemaining : "-"}`,
    `lastDie=${typeof lastDie1 !== "undefined" ? lastDie1 : "-"}:${typeof lastDie2 !== "undefined" ? lastDie2 : "-"}`,
    `lastRoll=${typeof lastRoll !== "undefined" ? lastRoll : "-"}`,
    `applyingRemoteState=${applyingRemoteState}`,
    `performingRemoteAction=${performingRemoteAction}`,
    `lastEvent=${lastNetworkEvent}`,
    `stateUpdateAt=${lastStateUpdateAt || "-"}`,
    `hostActionAt=${lastHostActionAt || "-"}`,
    `clientActionAt=${lastClientActionAt || "-"}`
  ];
  debugOverlayText.textContent = lines.join("\n");
}

function markNetworkEvent(label) {
  lastNetworkEvent = label;
  updateDebugOverlay();
}

function updatePanelTitles() {
  playerPanels.forEach((panel, index) => {
    const title = panel?.querySelector(".player-name");
    if (!title || !players[index]) return;
    title.innerHTML = `<span class="player-color" data-color="${index}"></span>${players[index].name}`;
  });
  const dots = Array.from(document.querySelectorAll(".player-color"));
  dots.forEach((dot, index) => {
    const player = players[index];
    if (player) {
      dot.style.background = player.color;
    }
  });
}

function lockGameUi(locked) {
  document.body.classList.toggle("lobby-open", locked);
  if (lobbyOverlay) {
    lobbyOverlay.style.display = locked ? "flex" : "none";
  }
  updateDebugOverlay();
}

function setLobbyStatus(text) {
  if (lobbyStatusText) {
    lobbyStatusText.textContent = text;
  }
}

function updateHeroButton(button, statusElem, hero) {
  if (!button || !statusElem) return;
  const roomExists = Boolean(currentRoomCode);
  const taken = Boolean(hero?.taken);
  const isYours = Boolean(hero?.isYours);
  button.disabled = !roomExists || (taken && !isYours) || onlineMatchStarted;
  button.classList.toggle("taken", taken && !isYours);
  button.classList.toggle("selected", isYours);
  if (isYours) {
    statusElem.textContent = "Chosen by you";
  } else if (taken) {
    statusElem.textContent = "Taken";
  } else {
    statusElem.textContent = "Free";
  }
}

function applyLobbyState(nextState) {
  lobbyState = nextState || null;
  if (!nextState?.started) {
    onlineMatchStarted = false;
    isHost = false;
    lastStateFingerprint = "";
  }
  currentRoomCode = nextState?.roomCode || currentRoomCode || "";
  if (lobbyRoomCodeWrap) {
    lobbyRoomCodeWrap.style.display = currentRoomCode ? "flex" : "none";
  }
  if (lobbyRoomCode) {
    lobbyRoomCode.textContent = currentRoomCode || "------";
  }

  const hero0 = nextState?.heroes?.find(hero => hero.index === 0);
  const hero1 = nextState?.heroes?.find(hero => hero.index === 1);
  updateHeroButton(heroSlot0Btn, heroSlot0Status, hero0);
  updateHeroButton(heroSlot1Btn, heroSlot1Status, hero1);

  if (!currentRoomCode) {
    setLobbyStatus("Create a room or join by code, then choose a hero.");
    lockGameUi(true);
    return;
  }
  if (nextState?.started) {
    setLobbyStatus("Match is starting...");
    updateDebugOverlay();
    return;
  }
  if (typeof nextState?.yourSlot === "number" && nextState.yourSlot >= 0) {
    const freeHeroes = (nextState.heroes || []).filter(hero => !hero.taken).length;
    if (freeHeroes > 0) {
      setLobbyStatus(`Room ${currentRoomCode}. Waiting for the second player or second hero choice.`);
    } else {
      setLobbyStatus(`Room ${currentRoomCode}. Both heroes chosen, starting match.`);
    }
  } else {
    setLobbyStatus(`You joined room ${currentRoomCode}. Choose a free hero.`);
  }
  lockGameUi(true);
  updateDebugOverlay();
}

function showRoomError(message) {
  setLobbyStatus(message || "Room error.");
  if (!onlineMatchStarted) {
    lockGameUi(true);
  }
  updateDebugOverlay();
}

function buildState() {
  return {
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: p.x,
      y: p.y,
      resources: shallowClone(p.resources),
      pocket: shallowClone(p.pocket),
      income: shallowClone(p.income),
      attack: p.attack,
      hasSword: p.hasSword,
      hasArmor: p.hasArmor,
      hasWorkshopSword: p.hasWorkshopSword,
      barbarianKills: p.barbarianKills,
      slowTurnsRemaining: p.slowTurnsRemaining,
      noDoubleTurnsRemaining: p.noDoubleTurnsRemaining,
      poisonCount: p.poisonCount,
      invisPotionCount: p.invisPotionCount,
      luckPotionCount: p.luckPotionCount,
      invisTurnsRemaining: p.invisTurnsRemaining,
      luckTurnsRemaining: p.luckTurnsRemaining,
      cloverCount: p.cloverCount,
      trollClubCount: p.trollClubCount,
      flowerCount: p.flowerCount,
      tokenCount: p.tokenCount,
      ringCount: p.ringCount,
      terrorRingCount: p.terrorRingCount,
      rainbowStoneCount: p.rainbowStoneCount,
      heroHiltCount: p.heroHiltCount,
      stoneBonusRollsRemaining: p.stoneBonusRollsRemaining,
      stunnedTurnsRemaining: p.stunnedTurnsRemaining,
      barbarianRewards: shallowClone(p.barbarianRewards)
    })),
    currentPlayerIndex,
    movesRemaining,
    lastRoll,
    lastRollText,
    lastDie1,
    lastDie2,
    extraTurnPending,
    extraTurnReason,
    justRolledDouble,
    robberAmbushThisSession,
    robbersEnabled,
    turnCounter,
    turnsUntilResources,
    turnsUntilTreasure,
    treasureTurnsRemaining,
    flowerTurnsRemaining,
    masterNextSpawnTurn,
    masterTurnsRemaining,
    masterActive,
    barbarianPhaseStarted,
    barbarianCells: shallowClone(barbarianCells),
    barbarianRespawnTimers: shallowClone(barbarianRespawnTimers),
    robberEvent: shallowClone(robberEvent),
    guardAccess: shallowClone(guardAccess),
    gameEnded,
    gameTimerSeconds,
    resourceByPos: Object.values(resourceByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      typeKey: entry.type?.key || entry.typeKey
    })),
    specialByPos: Object.values(specialByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      label: entry.label,
      extraClass: entry.extraClass,
      ownerIndex: entry.ownerIndex,
      featureKey: entry.featureKey,
      sourceCastleKey: entry.sourceCastleKey,
      disabled: entry.disabled,
      type: entry.type,
      mageId: entry.mageId
    })),
    treasure: treasure ? { key: treasure.key, x: treasure.x, y: treasure.y } : null,
    flowerArtifact: flowerArtifact ? { key: flowerArtifact.key, x: flowerArtifact.x, y: flowerArtifact.y } : null,
    cloverArtifact: cloverArtifact ? { key: cloverArtifact.key, x: cloverArtifact.x, y: cloverArtifact.y } : null,
    cloverTurnsRemaining,
    nextCloverSpawnTurn,
    stoneByPos: Object.values(stoneByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      turnsRemaining: entry.turnsRemaining
    })),
    rainbowByPos: Object.values(rainbowByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      turnsRemaining: entry.turnsRemaining
    })),
    portalState: portalState ? {
      active: portalState.active,
      keys: Array.isArray(portalState.keys) ? shallowClone(portalState.keys) : [],
      turnsRemaining: portalState.turnsRemaining,
      nextSpawnTurn: portalState.nextSpawnTurn
    } : null,
    mageSlot: {
      active: mageSlot.active,
      turnsRemaining: mageSlot.turnsRemaining,
      key: mageSlot.key,
      x: mageSlot.x,
      y: mageSlot.y,
      nextSpawnTurn: mageSlot.nextSpawnTurn
    },
    trollState: shallowClone(trollState),
    trollCaves: TROLL_CAVES.map(cave => ({
      key: cave.key,
      x: cave.x,
      y: cave.y,
      looted: cave.looted
    })),
    mercenaries: shallowClone(mercenaries),
    mercenaryIdCounter,
    thieves: shallowClone(thieves),
    thiefIdCounter,
    lastBattleResult: shallowClone(lastBattleResult),
    lastBattleId,
    reachableKeys: Array.from(reachableKeys),
    castleOwnersByKey: shallowClone(castleOwnersByKey),
    castleStatsByKey: shallowClone(castleStatsByKey)
  };
}

function emitStateNow(force = false) {
  if (!socket || !onlineMatchStarted || !isHost || applyingRemoteState) return;
  const now = Date.now();
  if (!force && now - lastEmitAt < 150) return;
  const state = buildState();
  const fingerprint = JSON.stringify(state);
  if (!force && fingerprint === lastStateFingerprint) return;
  lastStateFingerprint = fingerprint;
  lastEmitAt = now;
  markNetworkEvent(`emitState:${force ? "force" : "tick"}`);
  socket.emit("hostState", state);
}

function resetDynamicCells() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      if (nodeByPos[key]) continue;
      setCellToInactive(x, y, { skipTreasureCleanup: true });
    }
  }

  Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
  Object.keys(specialByPos).forEach(key => delete specialByPos[key]);
  Object.keys(stoneByPos).forEach(key => delete stoneByPos[key]);
  Object.keys(rainbowByPos).forEach(key => delete rainbowByPos[key]);
  if (typeof initPortalState === "function") {
    initPortalState();
  } else if (typeof portalState !== "undefined" && portalState) {
    portalState.active = false;
    portalState.keys = [];
    portalState.turnsRemaining = 0;
    portalState.nextSpawnTurn = null;
  }
  barbarianCells.length = 0;
  barbarianRespawnTimers.length = 0;
  mercenaries.length = 0;
  thieves.length = 0;
  treasure = null;
  flowerArtifact = null;
  cloverArtifact = null;
  masterActive = false;
  mageSlot.active = false;
  mageSlot.key = null;
  mageSlot.x = null;
  mageSlot.y = null;
  if (mageSlot.timerElem) {
    mageSlot.timerElem.remove();
    mageSlot.timerElem = null;
  }
  if (trollState.prevKey) clearTrollTokenAt(trollState.prevKey);
  if (trollState.key) clearTrollTokenAt(trollState.key);
}

function applyResourceEntry(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  const type = resourceTypes.find(t => t.key === entry.typeKey);
  if (!type) return;
  cell.classList.remove("inactive");
  cell.classList.add("resource", "important");
  cell.textContent = "";
  const iconDef = RESOURCE_ICONS[type.key];
  if (iconDef) {
    const icon = setCellIcon(cell, iconDef.file, iconDef.alt);
    if (icon) icon.classList.add("resource-icon");
  } else {
    cell.textContent = type.label;
  }
  resourceByPos[key] = { type, x: entry.x, y: entry.y, key };
}

function applySpecialEntry(entry) {
  const success = setSpecialCell(
    entry.x,
    entry.y,
    entry.label,
    entry.extraClass || null,
    entry.ownerIndex ?? null,
    entry.featureKey ?? null,
    entry.sourceCastleKey ?? null,
    entry.type ? { type: entry.type, mageId: entry.mageId } : {}
  );
  if (!success) return;
  if (entry.disabled) setSpecialCellDisabled(entry.key, true);
  const cell = grid[entry.key];
  if (!cell) return;
  if (entry.extraClass === "mage") {
    setCellIcon(cell, "mage.png", "Mage");
  }
  if (entry.extraClass === "portal") {
    setCellIcon(cell, "portal.png", "Portal");
  }
  if (entry.extraClass === "troll-cave") {
    setCellIcon(cell, "troll_cave.png", "Troll cave");
  }
}

function applyTreasure(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("treasure", "important");
  cell.textContent = "";
  setCellIcon(cell, "treasure.png", "Treasure");
  treasure = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyFlower(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("flower", "important");
  cell.textContent = "";
  setCellIcon(cell, FLOWER_ICON.file, FLOWER_ICON.alt);
  flowerArtifact = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyClover(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("clover", "important");
  cell.textContent = "";
  setCellIcon(cell, "clover.png", "Clover");
  cloverArtifact = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyStone(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "stone.png", "Stone");
  stoneByPos[key] = { key, x: entry.x, y: entry.y, turnsRemaining: entry.turnsRemaining };
}

function applyRainbow(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("rainbow-stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "rainbow_stone.png", "Rainbow stone");
  rainbowByPos[key] = { key, x: entry.x, y: entry.y, turnsRemaining: entry.turnsRemaining };
}

function applyMaster() {
  const key = MASTER_CELL.key;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("master", "important");
  cell.textContent = "";
  setCellIcon(cell, "grand_master.png", "Master");
}

function applyMageSlot(slot) {
  if (!slot || !slot.active || !slot.key) return;
  const cell = grid[slot.key];
  if (!cell) return;
  setSpecialCell(slot.x, slot.y, mageSlot.label, "mage", null, null, null, { type: "mage", mageId: mageSlot.id });
  setCellIcon(cell, "mage.png", "Mage");
  mageSlot.active = true;
  mageSlot.key = slot.key;
  mageSlot.x = slot.x;
  mageSlot.y = slot.y;
  mageSlot.turnsRemaining = slot.turnsRemaining;
  updateMageTimer(mageSlot);
}

function applyBarbarianCell(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("important", "barbarian");
  cell.textContent = "";
  cell.title = "BARBARIANS";
  cell.setAttribute("data-barbarian", "true");
  setCellIcon(cell, "barbarian_village.png", "Barbarians");
}

function applyMercenary(entry) {
  setCellToMercenary(entry.x, entry.y);
}

function applyThief(entry) {
  setCellToThief(entry.x, entry.y);
}

function applyState(state) {
  applyingRemoteState = true;
  lastStateUpdateAt = Date.now();
  markNetworkEvent("applyState");

  currentPlayerIndex = state.currentPlayerIndex ?? currentPlayerIndex;
  movesRemaining = state.movesRemaining ?? movesRemaining;
  lastRoll = state.lastRoll ?? lastRoll;
  lastRollText = state.lastRollText ?? lastRollText;
  lastDie1 = state.lastDie1 ?? lastDie1;
  lastDie2 = state.lastDie2 ?? lastDie2;
  extraTurnPending = state.extraTurnPending ?? extraTurnPending;
  extraTurnReason = state.extraTurnReason ?? extraTurnReason;
  justRolledDouble = state.justRolledDouble ?? justRolledDouble;
  robberAmbushThisSession = state.robberAmbushThisSession ?? robberAmbushThisSession;
  robbersEnabled = state.robbersEnabled ?? robbersEnabled;
  turnCounter = state.turnCounter ?? turnCounter;
  turnsUntilResources = state.turnsUntilResources ?? turnsUntilResources;
  turnsUntilTreasure = state.turnsUntilTreasure ?? turnsUntilTreasure;
  treasureTurnsRemaining = state.treasureTurnsRemaining ?? treasureTurnsRemaining;
  flowerTurnsRemaining = state.flowerTurnsRemaining ?? flowerTurnsRemaining;
  masterNextSpawnTurn = state.masterNextSpawnTurn ?? masterNextSpawnTurn;
  masterTurnsRemaining = state.masterTurnsRemaining ?? masterTurnsRemaining;
  masterActive = state.masterActive ?? masterActive;
  barbarianPhaseStarted = state.barbarianPhaseStarted ?? barbarianPhaseStarted;
  robberEvent = state.robberEvent ?? robberEvent;
  gameEnded = state.gameEnded ?? gameEnded;
  gameTimerSeconds = state.gameTimerSeconds ?? gameTimerSeconds;
  const incomingBattleId = state.lastBattleId ?? lastBattleId;
  const incomingBattleResult = state.lastBattleResult ?? lastBattleResult;

  state.players?.forEach((data, idx) => {
    if (!players[idx]) return;
    Object.assign(players[idx], data);
  });

  Object.keys(castleOwnersByKey).forEach(key => delete castleOwnersByKey[key]);
  Object.assign(castleOwnersByKey, state.castleOwnersByKey || {});
  Object.keys(castleStatsByKey).forEach(key => delete castleStatsByKey[key]);
  Object.assign(castleStatsByKey, state.castleStatsByKey || {});

  if (Array.isArray(state.guardAccess)) {
    guardAccess.length = 0;
    guardAccess.push(...state.guardAccess);
  }

  if (Array.isArray(state.trollCaves)) {
    state.trollCaves.forEach(cave => {
      const idx = getTrollCaveIndexByKey(cave.key);
      if (idx >= 0) TROLL_CAVES[idx].looted = cave.looted;
    });
  }

  resetDynamicCells();
  (state.specialByPos || []).forEach(applySpecialEntry);
  (state.resourceByPos || []).forEach(applyResourceEntry);

  if (state.treasure) applyTreasure(state.treasure);
  if (state.flowerArtifact) applyFlower(state.flowerArtifact);
  if (state.cloverArtifact) applyClover(state.cloverArtifact);
  cloverTurnsRemaining = state.cloverTurnsRemaining ?? cloverTurnsRemaining;
  nextCloverSpawnTurn = state.nextCloverSpawnTurn ?? nextCloverSpawnTurn;

  (state.stoneByPos || []).forEach(applyStone);
  (state.rainbowByPos || []).forEach(applyRainbow);

  if (state.portalState && typeof portalState !== "undefined" && portalState) {
    portalState.active = Boolean(state.portalState.active);
    portalState.keys = Array.isArray(state.portalState.keys) ? state.portalState.keys.slice() : [];
    portalState.turnsRemaining = state.portalState.turnsRemaining ?? portalState.turnsRemaining;
    portalState.nextSpawnTurn = state.portalState.nextSpawnTurn ?? portalState.nextSpawnTurn;
  }

  if (state.masterActive) applyMaster();

  if (state.mageSlot) {
    mageSlot.nextSpawnTurn = state.mageSlot.nextSpawnTurn ?? mageSlot.nextSpawnTurn;
    applyMageSlot(state.mageSlot);
  }

  if (state.trollState) {
    trollState = Object.assign(trollState, state.trollState);
    trollState.prevKey = null;
    updateTrollVisual();
  }

  barbarianCells.length = 0;
  (state.barbarianCells || []).forEach(entry => {
    applyBarbarianCell(entry);
    barbarianCells.push(entry);
  });
  barbarianRespawnTimers.length = 0;
  if (Array.isArray(state.barbarianRespawnTimers)) {
    barbarianRespawnTimers.push(...state.barbarianRespawnTimers);
  }

  mercenaries.length = 0;
  (state.mercenaries || []).forEach(entry => {
    applyMercenary(entry);
    mercenaries.push(entry);
  });
  mercenaryIdCounter = state.mercenaryIdCounter ?? mercenaryIdCounter;

  thieves.length = 0;
  (state.thieves || []).forEach(entry => {
    applyThief(entry);
    thieves.push(entry);
  });
  thiefIdCounter = state.thiefIdCounter ?? thiefIdCounter;

  clearReachable();
  reachableKeys = new Set(state.reachableKeys || []);
  showReachable();

  updatePanelTitles();
  updatePawns();
  players.forEach((_, idx) => {
    updatePlayerResources(idx);
    updateInventory(idx);
  });
  updateTurnUI();
  updateStatusPanel();
  if (incomingBattleId !== lastBattleId) {
    lastBattleId = incomingBattleId;
    lastBattleResult = incomingBattleResult;
    if (lastBattleResult) {
      showBattleModal(lastBattleResult, true);
    }
  }
  if (typeof updateRobberToggleButtons === "function") {
    updateRobberToggleButtons();
  }
  if (typeof updateRobberModalVisibility === "function") {
    updateRobberModalVisibility();
  }
  if (gameTimerDisplay) {
    gameTimerDisplay.textContent = `TIME: ${formatTime(gameTimerSeconds)}`;
  }

  applyingRemoteState = false;
  updateDebugOverlay();
}

function getActionFromEvent(e) {
  const target = e.target;
  if (!target) return null;

  if (game && game.contains(target)) {
    const rect = game.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor(clickX / cellSize);
    const gridY = Math.floor(clickY / cellSize);
    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      return { type: "game_click", x: gridX, y: gridY };
    }
  }

  const clickable = target.closest(
    "#rollBtn, #endTurnBtn, #newGameBtn, button, [data-buy], [data-lavka-buy], [data-workshop-buy], [data-hire], [data-city-reward], [data-city-exchange], [data-castle-feature], [data-castle-storage]"
  );
  if (!clickable) return null;

  if (clickable.id) {
    return { type: "dom_click", id: clickable.id };
  }

  const dataKeys = [
    "buy",
    "lavkaBuy",
    "workshopBuy",
    "hire",
    "cityReward",
    "cityExchange",
    "castleFeature",
    "castleStorage"
  ];
  for (const key of dataKeys) {
    const dataValue = clickable.dataset[key];
    if (dataValue) {
      return { type: "dom_click", dataKey: key, dataValue };
    }
  }

  return null;
}

function performHostAction(action) {
  if (!action) return;
  performingRemoteAction = true;
  lastHostActionAt = Date.now();
  markNetworkEvent(`performHostAction:${action.type}`);
  if (action.type === "game_click") {
    const rect = game.getBoundingClientRect();
    const clickX = rect.left + (action.x + 0.5) * cellSize;
    const clickY = rect.top + (action.y + 0.5) * cellSize;
    const evt = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: clickX,
      clientY: clickY
    });
    game.dispatchEvent(evt);
    performingRemoteAction = false;
    updateDebugOverlay();
    return;
  }
  if (action.type === "dom_click") {
    let el = null;
    if (action.id) {
      el = document.getElementById(action.id);
    } else if (action.dataKey) {
      const attr = action.dataKey.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      el = document.querySelector(`[data-${attr}="${action.dataValue}"]`);
    }
    if (el) el.click();
  }
  performingRemoteAction = false;
  updateDebugOverlay();
}

function forceStartHostTurn() {
  if (!onlineMatchStarted || !isHost) return;
  if (typeof doRoll !== "function") return;
  if (movesRemaining > 0) return;
  markNetworkEvent("forceStartHostTurn");
  doRoll();
  emitStateNow(true);
}

if (createRoomBtn && socket) {
  createRoomBtn.addEventListener("click", () => {
    socket.emit("createRoom");
  });
}

if (joinRoomBtn && joinRoomInput && socket) {
  joinRoomBtn.addEventListener("click", () => {
    const roomCode = joinRoomInput.value.trim().toUpperCase();
    if (!roomCode) {
      showRoomError("Enter room code.");
      return;
    }
    socket.emit("joinRoom", { roomCode });
  });
}

if (joinRoomInput) {
  joinRoomInput.addEventListener("input", () => {
    joinRoomInput.value = joinRoomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
}

if (copyRoomCodeBtn) {
  copyRoomCodeBtn.addEventListener("click", async () => {
    if (!currentRoomCode) return;
    try {
      await navigator.clipboard.writeText(currentRoomCode);
      setLobbyStatus(`Code ${currentRoomCode} copied.`);
    } catch (err) {
      setLobbyStatus(`Room code: ${currentRoomCode}`);
    }
  });
}

if (heroSlot0Btn && socket) {
  heroSlot0Btn.addEventListener("click", () => {
    socket.emit("selectHero", { heroIndex: 0 });
  });
}

if (heroSlot1Btn && socket) {
  heroSlot1Btn.addEventListener("click", () => {
    socket.emit("selectHero", { heroIndex: 1 });
  });
}

lockGameUi(Boolean(socket));

if (socket) {
  socket.on("roomCreated", payload => {
    markNetworkEvent("roomCreated");
    currentRoomCode = payload?.roomCode || currentRoomCode;
    if (lobbyRoomCode) {
      lobbyRoomCode.textContent = currentRoomCode || "------";
    }
    setLobbyStatus(`Room ${currentRoomCode} created. Send the code to the second player.`);
    updateDebugOverlay();
  });

  socket.on("roomJoined", payload => {
    markNetworkEvent("roomJoined");
    currentRoomCode = payload?.roomCode || currentRoomCode;
    setLobbyStatus(`You joined room ${currentRoomCode}. Choose a hero.`);
    updateDebugOverlay();
  });

  socket.on("roomError", payload => {
    markNetworkEvent("roomError");
    showRoomError(payload?.message || "Room error.");
    updateDebugOverlay();
  });

  socket.on("lobbyState", payload => {
    markNetworkEvent("lobbyState");
    applyLobbyState(payload);
    updateDebugOverlay();
  });

  socket.on("matchStarted", payload => {
    markNetworkEvent("matchStarted");
    onlineMatchStarted = true;
    isHost = Boolean(payload?.isHost);
    localPlayerIndex = Number.isInteger(payload?.localPlayerIndex) ? payload.localPlayerIndex : null;
    currentRoomCode = payload?.roomCode || currentRoomCode;
    lastStateFingerprint = "";
    lastEmitAt = 0;
    setLobbyStatus("Match started.");
    lockGameUi(false);
    updatePanelTitles();
    resetGameState();
    updateDebugOverlay();
    if (isHost) {
      setTimeout(() => emitStateNow(true), 0);
      setTimeout(() => {
        forceStartHostTurn();
      }, 150);
      setTimeout(() => {
        if (lastDie1 === null && lastDie2 === null && movesRemaining <= 0) {
          forceStartHostTurn();
        }
      }, 900);
    }
  });

  socket.on("hostAction", action => {
    if (!onlineMatchStarted) return;
    lastHostActionAt = Date.now();
    markNetworkEvent(`hostAction:${action.type}`);
    performHostAction(action);
    if (isHost) {
      setTimeout(() => emitStateNow(true), 0);
    }
  });

  socket.on("stateUpdate", state => {
    if (!onlineMatchStarted || isHost) return;
    if (!state || applyingRemoteState) return;
    lastStateUpdateAt = Date.now();
    markNetworkEvent("stateUpdate");
    applyState(state);
  });

  document.addEventListener("click", e => {
    if (!onlineMatchStarted) return;
    if (isHost || applyingRemoteState || performingRemoteAction) return;
    const action = getActionFromEvent(e);
    if (!action) return;
    if (typeof canLocalPlayerAct === "function" && !canLocalPlayerAct()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    lastClientActionAt = Date.now();
    markNetworkEvent(`clientAction:${action.type}`);
    e.preventDefault();
    e.stopImmediatePropagation();
    socket.emit("clientAction", action);
  }, true);

  document.addEventListener("click", e => {
    if (!onlineMatchStarted) return;
    if (!isHost || applyingRemoteState || performingRemoteAction) return;
    const action = getActionFromEvent(e);
    if (action && typeof canLocalPlayerAct === "function" && !canLocalPlayerAct()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (action) {
      lastHostActionAt = Date.now();
      markNetworkEvent(`hostLocalAction:${action.type}`);
      socket.emit("hostAction", action);
    }
    setTimeout(() => emitStateNow(), 0);
  }, true);

  setInterval(() => {
    emitStateNow();
    updateDebugOverlay();
  }, 400);
}

updateDebugOverlay();
