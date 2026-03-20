// ────────────────────────────────────────
//   ПЕШКИ
// ────────────────────────────────────────
const startNode = importantNodes.find(n => n.id === 6) || {x: 0, y: 0};
const players = [
  {
    id: 0,
    name: "Игрок 1",
    color: "#4cc9f0",
    x: startNode.x,
    y: startNode.y,
    resources: {gold: 0, army: 0, influence: 0, resources: 0},
    pocket: {gold: 0, army: 0, resources: 0},
    income: {resources: 0},
    attack: 6,
    hasSword: false,
    hasArmor: false,
    hasWorkshopSword: false,
    barbarianKills: 0,
    slowTurnsRemaining: 0,
    noDoubleTurnsRemaining: 0,
    poisonCount: 0,
    flowerCount: 0,
    ringCount: 0,
    terrorRingCount: 0,
    rainbowStoneCount: 0,
    heroHiltCount: 0,
    stoneBonusRollsRemaining: 0,
    stunnedTurnsRemaining: 0,
    barbarianRewards: {r5: false, r10: false, r20: false}
  },
  {
    id: 1,
    name: "Игрок 2",
    color: "#ff595e",
    x: startNode.x,
    y: startNode.y,
    resources: {gold: 0, army: 0, influence: 0, resources: 0},
    pocket: {gold: 0, army: 0, resources: 0},
    income: {resources: 0},
    attack: 6,
    hasSword: false,
    hasArmor: false,
    hasWorkshopSword: false,
    barbarianKills: 0,
    slowTurnsRemaining: 0,
    noDoubleTurnsRemaining: 0,
    poisonCount: 0,
    flowerCount: 0,
    ringCount: 0,
    terrorRingCount: 0,
    rainbowStoneCount: 0,
    heroHiltCount: 0,
    stoneBonusRollsRemaining: 0,
    stunnedTurnsRemaining: 0,
    barbarianRewards: {r5: false, r10: false, r20: false}
  }
];
const pawns = players.map((player, index) => {
  const pawn = document.createElement("div");
  pawn.className = "pawn";
  pawn.textContent = "";
  pawn.style.boxShadow = `0 0 12px ${player.color}88`;
  const icon = document.createElement("img");
  icon.className = "icon";
  icon.src = index === 0 ? "assets/icons/player_1.png" : "assets/icons/player_2.png";
  icon.alt = index === 0 ? "Игрок 1" : "Игрок 2";
  icon.style.filter = `drop-shadow(0 0 10px ${player.color}aa)`;
  pawn.appendChild(icon);
  game.appendChild(pawn);
  return pawn;
});
const MAGE_SLOW_COST = 750;
const MAGE_NO_DOUBLE_COST = 750;
const MAGE_POISON_COST = 7500;
const MAGE_SLOW_DURATION = 15;
const MAGE_NO_DOUBLE_DURATION = 15;
const MAGE_SLOW_PENALTY = 3;
const POISON_INFLUENCE_THRESHOLD = 2000;
playerColorDots.forEach((dot, index) => {
  const player = players[index];
  if (player) dot.style.background = player.color;
});
const guardAccess = players.map(() => false);
let pendingGuardMove = null;
let pendingGuardPlayerIndex = null;
const INVENTORY_ITEMS = [
  {key: "poison", label: "Яд", icon: "poison.png", count: player => player.poisonCount || 0},
  {key: "flower", label: "Таинственный цветок", icon: "mystic_flower.png", count: player => player.flowerCount || 0},
  {key: "ring", label: "Кольцо убеждения", icon: "ring_persuasion.png", count: player => player.ringCount || 0},
  {key: "terror-ring", label: "Кольцо ужаса", icon: "ring_terror.png", count: player => player.terrorRingCount || 0},
  {key: "rainbow-stone", label: "Радужный камень", icon: "rainbow_stone.png", count: player => player.rainbowStoneCount || 0},
  {key: "hero-hilt", label: "Рукоять меча героя", icon: "hero_hilt.png", count: player => player.heroHiltCount || 0},
  {key: "sword", label: "Меч героя", icon: "sword.png", count: player => (player.hasSword ? 1 : 0)}
];

function updateInventory(playerIndex) {
  const panel = inventoryPanels[playerIndex];
  const player = players[playerIndex];
  if (!panel || !player) return;
  const itemsRoot = panel.querySelector(".inventory-items");
  if (!itemsRoot) return;
  itemsRoot.innerHTML = "";
  INVENTORY_ITEMS.forEach(item => {
    const count = item.count ? item.count(player) : 0;
    if (!count) return;
    const entry = document.createElement("div");
    entry.className = "inventory-item";
    const icon = document.createElement("img");
    icon.className = "inventory-icon";
    icon.src = `assets/icons/${item.icon}`;
    icon.alt = item.label;
    const label = document.createElement("span");
    label.textContent = count > 1 ? `${item.label} ×${count}` : item.label;
    entry.appendChild(icon);
    entry.appendChild(label);
    itemsRoot.appendChild(entry);
  });
}

function updatePlayerResources(playerIndex) {
  const player = players[playerIndex];
  const panel = playerPanels[playerIndex];
  if (!player || !panel) return;
  panel.querySelector('[data-stat="gold"]').textContent = player.resources.gold;
  panel.querySelector('[data-stat="army"]').textContent = player.resources.army;
  panel.querySelector('[data-stat="influence"]').textContent = player.resources.influence;
  panel.querySelector('[data-stat="resources"]').textContent = player.resources.resources;
  panel.querySelector('[data-stat="pocket-gold"]').textContent = player.pocket.gold;
  panel.querySelector('[data-stat="pocket-army"]').textContent = player.pocket.army;
  panel.querySelector('[data-stat="pocket-resources"]').textContent = player.pocket.resources;
  const incomeSpan = panel.querySelector('[data-income="resources"]');
  if (incomeSpan) {
    incomeSpan.textContent = `+${player.income.resources}`;
  }
  const attackSpan = panel.querySelector('[data-stat="attack"]');
  if (attackSpan) {
    attackSpan.textContent = player.attack;
  }
  const killsSpan = panel.querySelector('[data-stat="barbarian-kills"]');
  if (killsSpan) {
    killsSpan.textContent = player.barbarianKills || 0;
  }
  const castleKey = getFirstOwnedCastleKey(playerIndex);
  const stats = castleKey ? ensureCastleStats(castleKey) : null;
  const storedArmy = stats ? (stats.storageArmy || 0) : 0;
  const armySpan = panel.querySelector('[data-stat="army"]');
  if (armySpan) {
    armySpan.textContent = String(storedArmy);
  }
  updateInventory(playerIndex);
}

function depositPocketCurrencyToPlayer(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const parts = [];
  if (player.pocket.gold > 0) {
    player.resources.gold += player.pocket.gold;
    parts.push(`+${player.pocket.gold} золота`);
    player.pocket.gold = 0;
  }
  if (player.pocket.resources > 0) {
    player.resources.resources += player.pocket.resources;
    parts.push(`+${player.pocket.resources} ресурсов`);
    player.pocket.resources = 0;
  }
  if (parts.length) {
    updatePlayerResources(playerIndex);
    showPickupToast(`В замок: ${parts.join(", ")}`);
  }
}
players.forEach((_, index) => {
  recalcPlayerResourceIncome(index);
  updatePlayerResources(index);
});

function showPickupToast(text) {
  pickupText.textContent = text;
  pickupToast.style.display = "flex";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    pickupToast.style.display = "none";
  }, 2000);
}

function showDoubleToast() {
  if (!doubleToast) return;
  const text = doubleToast.querySelector(".double-toast-text");
  doubleToast.style.display = "flex";
  if (text) {
    text.classList.remove("animate");
    void text.offsetWidth;
    text.classList.add("animate");
  }
  setTimeout(() => {
    doubleToast.style.display = "none";
    if (text) text.classList.remove("animate");
  }, 2700);
  if (!doubleSound) {
    doubleSound = document.getElementById("doubleSound") || new Audio("assets/sfx/double.mp3");
  }
  doubleSound.currentTime = 0;
  doubleSound.play().catch(() => {});
}

function simulateArmyExchange(attackerCurrent, defenderCurrent, attackerInitial, defenderInitial) {
  const attackerThreshold = Math.max(1, Math.round(attackerInitial * 0.07));
  const defenderThreshold = Math.max(1, Math.round(defenderInitial * 0.07));
  let attackerRemaining = attackerCurrent;
  let defenderRemaining = defenderCurrent;
  while (attackerRemaining > attackerThreshold && defenderRemaining > defenderThreshold &&
    attackerRemaining > 0 && defenderRemaining > 0) {
    const attackerLossCap = Math.max(1, attackerRemaining - attackerThreshold);
    const defenderLossCap = Math.max(1, defenderRemaining - defenderThreshold);
    const attackerLoss = Math.min(attackerLossCap, Math.floor(Math.random() * 3) + 1);
    const defenderLoss = Math.min(defenderLossCap, Math.floor(Math.random() * 3) + 1);
    attackerRemaining = Math.max(attackerThreshold, attackerRemaining - attackerLoss);
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - defenderLoss);
    if (attackerRemaining === attackerThreshold && defenderRemaining === defenderThreshold) {
      break;
    }
  }
  return {attackerRemaining, defenderRemaining, attackerThreshold, defenderThreshold};
}

const worldDangerModal = document.getElementById("worldDangerModal");
const worldDangerClose = document.getElementById("worldDangerClose");
let worldDangerShown = false;
const devTurnInput = document.getElementById("devTurnInput");
const devTurnApply = document.getElementById("devTurnApply");
const devSkipInput = document.getElementById("devSkipInput");
const devSkipApply = document.getElementById("devSkipApply");
const testModeBtn = document.getElementById("testModeBtn");

function showWorldDangerModal() {
  if (!worldDangerModal) return;
  worldDangerModal.style.display = "flex";
}

function hideWorldDangerModal() {
  if (!worldDangerModal) return;
  worldDangerModal.style.display = "none";
}

if (worldDangerClose) {
  worldDangerClose.addEventListener("click", hideWorldDangerModal);
}
if (worldDangerModal) {
  worldDangerModal.addEventListener("click", event => {
    if (event.target === worldDangerModal) {
      hideWorldDangerModal();
    }
  });
}

const mageModal = document.getElementById("mageModal");
const mageCancelBtn = document.getElementById("mageCancelBtn");
const mageActionButtons = mageModal ? Array.from(mageModal.querySelectorAll("[data-mage-action]")) : [];
let pendingMageSlot = null;
let pendingMagePlayerIndex = null;
let pendingStoneKey = null;
let pendingStonePlayerIndex = null;
let pendingMasterPlayerIndex = null;

function getMageActionCost(action) {
  if (action === "slow") return MAGE_SLOW_COST;
  if (action === "no-double") return MAGE_NO_DOUBLE_COST;
  if (action === "poison") return MAGE_POISON_COST;
  if (action === "flower-gold") return 1000;
  return null;
}

function updateMageActionButtons(playerIndex) {
  if (!mageActionButtons.length) return;
  const player = players[playerIndex];
  mageActionButtons.forEach(btn => {
    const action = btn.dataset.mageAction;
    const baseCost = getMageActionCost(action);
    if (!player || (baseCost === null && action !== "flower-infl")) {
      btn.disabled = true;
      return;
    }
    if (action === "flower-infl") {
      btn.disabled = (player.flowerCount || 0) <= 0;
      return;
    }
    if (action === "flower-gold") {
      btn.disabled = (player.flowerCount || 0) <= 0;
      return;
    }
    const cost = getDiscountedGoldCost(player, baseCost);
    if (action === "slow" || action === "no-double") {
      setTradePrice(btn, goldPriceHtml(cost));
    }
    if (action === "poison") {
      setTradePrice(
        btn,
        `<img class="price-icon" src="assets/icons/icon-gold.png" alt="Золото" />Цена: ${cost} золота + ` +
          `<img class="price-icon" src="assets/icons/mystic_flower.png" alt="Таинственный цветок" />Таинственный цветок`
      );
    }
    const needsFlower = action === "poison";
    const hasFlower = (player.flowerCount || 0) > 0;
    btn.disabled = getTotalGold(player) < cost || (needsFlower && !hasFlower);
  });
}

function getOpponentIndex(playerIndex) {
  return (playerIndex + 1) % players.length;
}

function openMageModal(slot, playerIndex) {
  if (!mageModal || !slot) return;
  pendingMageSlot = slot;
  pendingMagePlayerIndex = playerIndex;
  updateMageActionButtons(playerIndex);
  mageModal.style.display = "flex";
}

function closeMageModal() {
  if (!mageModal) return;
  pendingMageSlot = null;
  pendingMagePlayerIndex = null;
  mageModal.style.display = "none";
}

function handleMageAction(action) {
  if (!pendingMageSlot || pendingMagePlayerIndex === null) return;
  const player = players[pendingMagePlayerIndex];
  if (!player) return;
  const opponent = players[getOpponentIndex(pendingMagePlayerIndex)];
  if (action === "flower-infl") {
    if ((player.flowerCount || 0) <= 0) {
      showPickupToast("Нужен таинственный цветок.");
      return;
    }
    player.flowerCount -= 1;
    player.resources.influence += 300;
    updatePlayerResources(pendingMagePlayerIndex);
    showPickupToast("Таинственный цветок обменян на 300 влияния.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "flower-infl");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
    return;
  }
  if (action === "flower-gold") {
    if ((player.flowerCount || 0) <= 0) {
      showPickupToast("Нужен таинственный цветок.");
      return;
    }
    player.flowerCount -= 1;
    player.pocket.gold += 1000;
    updatePlayerResources(pendingMagePlayerIndex);
    showPickupToast("Таинственный цветок обменян на 1000 золота.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "flower-gold");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
    return;
  }
  const baseCost = getMageActionCost(action);
  const cost = baseCost === null ? null : getDiscountedGoldCost(player, baseCost);
  if (cost === null || getTotalGold(player) < cost) {
    showPickupToast("Не хватает золота.");
    return;
  }
  if (action === "poison" && (player.flowerCount || 0) <= 0) {
    showPickupToast("Нужен таинственный цветок.");
    return;
  }
  spendGold(player, cost);
  if (action === "slow") {
    if (opponent) opponent.slowTurnsRemaining = MAGE_SLOW_DURATION;
    showPickupToast("Противник замедлен на 25 ходов.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "slow");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
  } else if (action === "no-double") {
    if (opponent) opponent.noDoubleTurnsRemaining = MAGE_NO_DOUBLE_DURATION;
    showPickupToast("Двойной ход отменен на 25 ходов.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "no-double");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
  } else if (action === "poison") {
    player.flowerCount = Math.max(0, (player.flowerCount || 0) - 1);
    player.poisonCount = (player.poisonCount || 0) + 1;
    showPickupToast("Яд добавлен в инвентарь.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "poison");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
  }
  updatePlayerResources(pendingMagePlayerIndex);
}

mageActionButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    handleMageAction(btn.dataset.mageAction);
  });
});

if (mageCancelBtn) {
  mageCancelBtn.addEventListener("click", closeMageModal);
}

if (mageModal) {
  mageModal.addEventListener("click", event => {
    if (event.target === mageModal) {
      closeMageModal();
    }
  });
}

function openStoneModal(key, playerIndex) {
  if (!stoneModal) return;
  pendingStoneKey = key;
  pendingStonePlayerIndex = playerIndex;
  stoneModal.style.display = "flex";
}

function closeStoneModal() {
  if (!stoneModal) return;
  pendingStoneKey = null;
  pendingStonePlayerIndex = null;
  stoneModal.style.display = "none";
}

function openStoneResultModal(text) {
  if (!stoneResultModal || !stoneResultText) return;
  stoneResultText.textContent = text;
  stoneResultModal.style.display = "flex";
}

function closeStoneResultModal() {
  if (!stoneResultModal) return;
  stoneResultModal.style.display = "none";
}

function openTrollCaveModal(text) {
  if (!trollCaveModal || !trollCaveText) return;
  trollCaveText.textContent = text;
  trollCaveModal.style.display = "flex";
}

function closeTrollCaveModal() {
  if (!trollCaveModal) return;
  trollCaveModal.style.display = "none";
}

function applyStoneEffect(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const effects = ["gold", "influence", "army", "ring", "bonus-rolls", "slow-curse", "plague"];
  const choice = effects[Math.floor(Math.random() * effects.length)];
  if (choice === "gold") {
    player.pocket.gold += 500;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Вы получили 500 золота в карман.");
    return;
  }
  if (choice === "influence") {
    player.resources.influence += 150;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Вы получили 150 влияния.");
    return;
  }
  if (choice === "army") {
    player.pocket.army += 15;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Люди тянутся к вам: вы получили 15 войск в карман.");
    return;
  }
  if (choice === "ring") {
    player.ringCount = (player.ringCount || 0) + 1;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Камень раскалывается, и вы находите Кольцо убеждения.");
    return;
  }
  if (choice === "slow-curse") {
    player.slowTurnsRemaining = Math.max(player.slowTurnsRemaining || 0, 12);
    updatePlayerResources(playerIndex);
    openStoneResultModal("На вас проклятие замедления: -3 к броску на 12 ходов.");
    return;
  }
  if (choice === "plague") {
    let lost = 0;
    if (player.pocket.army > 0) {
      lost = Math.min(10, player.pocket.army);
      player.pocket.army -= lost;
    } else {
      const castleKey = getFirstOwnedCastleKey(playerIndex);
      if (castleKey) {
        const stats = ensureCastleStats(castleKey);
        const stored = stats.storageArmy || 0;
        if (stored > 0) {
          lost = Math.min(10, stored);
          stats.storageArmy = stored - lost;
          if (castleModalKey === castleKey && castleModalPlayerIndex === playerIndex) {
            refreshCastleModal(castleKey, playerIndex);
          }
        }
      }
    }
    updatePlayerResources(playerIndex);
    openStoneResultModal(lost > 0
      ? `Чума постигла ваши войска: потеряно ${lost} войск.`
      : "Чума постигла ваши войска, но потерь нет.");
    return;
  }
  player.stoneBonusRollsRemaining = 5;
  updatePlayerResources(playerIndex);
  openStoneResultModal("Вы ходите 5 раз подряд.");
}

if (stoneTouchBtn) {
  stoneTouchBtn.addEventListener("click", () => {
    if (pendingStoneKey) {
      clearStone(pendingStoneKey);
    }
    if (pendingStoneKey && pendingStonePlayerIndex !== null) {
      applyStoneEffect(pendingStonePlayerIndex);
    }
    closeStoneModal();
  });
}

if (stoneCloseBtn) {
  stoneCloseBtn.addEventListener("click", closeStoneModal);
}

if (stoneModal) {
  stoneModal.addEventListener("click", event => {
    if (event.target === stoneModal) {
      closeStoneModal();
    }
  });
}

if (stoneResultClose) {
  stoneResultClose.addEventListener("click", closeStoneResultModal);
}

if (stoneResultModal) {
  stoneResultModal.addEventListener("click", event => {
    if (event.target === stoneResultModal) {
      closeStoneResultModal();
    }
  });
}

if (trollCaveClose) {
  trollCaveClose.addEventListener("click", closeTrollCaveModal);
}

if (trollCaveModal) {
  trollCaveModal.addEventListener("click", event => {
    if (event.target === trollCaveModal) {
      closeTrollCaveModal();
    }
  });
}

function openMasterModal(playerIndex) {
  if (!masterModal || !masterBuyHilt) return;
  const player = players[playerIndex];
  const totalResources = getTotalResources(player);
  masterBuyHilt.disabled = !player || totalResources < 1500;
  if (masterBuyGold) {
    masterBuyGold.disabled = !player || totalResources < 800;
  }
  if (masterBuyTerrorRing) {
    masterBuyTerrorRing.disabled = !player || (player.ringCount || 0) <= 0;
  }
  masterModal.style.display = "flex";
  pendingMasterPlayerIndex = playerIndex;
}

function closeMasterModal() {
  if (!masterModal) return;
  masterModal.style.display = "none";
  pendingMasterPlayerIndex = null;
}

if (masterBuyHilt) {
  masterBuyHilt.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player) return;
    const totalResources = getTotalResources(player);
    if (totalResources < 1500) return;
    spendResources(player, 1500);
    player.heroHiltCount = (player.heroHiltCount || 0) + 1;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Рукоять меча героя получена.");
    flashPrice(masterBuyHilt, 1500, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

if (masterBuyGold) {
  masterBuyGold.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player) return;
    const totalResources = getTotalResources(player);
    if (totalResources < 800) return;
    spendResources(player, 800);
    player.pocket.gold += 1500;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Получено 1500 золота.");
    flashPrice(masterBuyGold, 800, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

if (masterBuyTerrorRing) {
  masterBuyTerrorRing.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player || (player.ringCount || 0) <= 0) return;
    player.ringCount -= 1;
    player.terrorRingCount = (player.terrorRingCount || 0) + 1;
    player.attack += 15;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Кольцо ужаса получено.");
    flashPrice(masterBuyTerrorRing, 1, "assets/icons/ring_persuasion.png", "Кольцо убеждения");
  });
}

if (masterCloseBtn) {
  masterCloseBtn.addEventListener("click", closeMasterModal);
}

if (masterModal) {
  masterModal.addEventListener("click", event => {
    if (event.target === masterModal) {
      closeMasterModal();
    }
  });
}

const cityPoisonBtn = document.querySelector('[data-city-poison="apply-poison"]');

function applyDevTurnValue() {
  if (!devTurnInput) return;
  const raw = Number(devTurnInput.value);
  if (!Number.isFinite(raw)) return;
  turnCounter = Math.max(0, Math.floor(raw));
  updateTurnUI();
}

function skipDevTurns() {
  if (!devSkipInput) return;
  const raw = Number(devSkipInput.value);
  if (!Number.isFinite(raw)) return;
  const count = Math.max(0, Math.floor(raw));
  for (let i = 0; i < count; i += 1) {
    if (gameEnded) break;
    endTurn();
  }
}

if (devTurnApply) {
  devTurnApply.addEventListener("click", applyDevTurnValue);
}
if (devSkipApply) {
  devSkipApply.addEventListener("click", skipDevTurns);
}

function enableTestMode() {
  testModeEnabled = true;
  players.forEach((player, index) => {
    player.resources.gold = 0;
    player.resources.army = 0;
    player.resources.influence = 0;
    player.resources.resources = 0;
    player.pocket.gold = 20000;
    player.pocket.army = 200;
    player.pocket.resources = 5000;
    updatePlayerResources(index);
  });
  showPickupToast("Тестовый режим включен.");
}

if (testModeBtn) {
  testModeBtn.addEventListener("click", enableTestMode);
}

function recalcPlayerResourceIncome(playerIndex) {
  const player = players[playerIndex];
  if (!player) return 0;
  let total = 0;
  Object.entries(castleOwnersByKey).forEach(([key, owner]) => {
    if (owner === playerIndex) {
      const stats = ensureCastleStats(key);
      if (stats.lumber && !isSpecialFeatureDisabled(playerIndex, "lumber", key)) {
        total += CASTLE_FEATURES.lumber.income;
      }
      if (stats.mine && !isSpecialFeatureDisabled(playerIndex, "mine", key)) {
        total += CASTLE_FEATURES.mine.income;
      }
      if (stats.clay && !isSpecialFeatureDisabled(playerIndex, "clay", key)) {
        total += CASTLE_FEATURES.clay.income;
      }
    }
  });
  player.income.resources = total;
  const panel = playerPanels[playerIndex];
  if (panel) {
    const incomeSpan = panel.querySelector('[data-income="resources"]');
    if (incomeSpan) {
      incomeSpan.textContent = `+${total}`;
    }
  }
  return total;
}

function collectCastleIncomes(playerIndex) {
  const player = players[playerIndex];
  if (!player) return 0;
  const income = recalcPlayerResourceIncome(playerIndex);
  if (income > 0) {
    player.resources.resources += income;
    updatePlayerResources(playerIndex);
  }
  return income;
}

let barracksPlayerIndex = null;
let lavkaPlayerIndex = null;
let workshopPlayerIndex = null;
let hirePlayerIndex = null;

const mercenaries = [];
let mercenaryIdCounter = 1;
let repairPending = null;
let gameEnded = false;

function showGameOver(winnerIndex) {
  gameEnded = true;
  if (rollBtn) rollBtn.disabled = true;
  const winnerLabel = typeof winnerIndex === "number" ? `Победил Игрок ${winnerIndex + 1}` : "Игра окончена";
  if (gameOverText) gameOverText.textContent = winnerLabel;
  if (gameOverModal) gameOverModal.style.display = "flex";
}

function getCastleBaseKeyForPos(x, y) {
  const castles = importantNodes.filter(node => node.type === "castle");
  for (const castle of castles) {
    if (x >= castle.x && x <= castle.x + 1 && y >= castle.y && y <= castle.y + 1) {
      return `${castle.x},${castle.y}`;
    }
  }
  return null;
}

function getDragonBaseKeyForPos(x, y) {
  const dragons = importantNodes.filter(node => node.type === "dragon");
  for (const dragon of dragons) {
    if (x >= dragon.x && x <= dragon.x + 1 && y >= dragon.y && y <= dragon.y + 1) {
      return `${dragon.x},${dragon.y}`;
    }
  }
  return null;
}

let gameTimerSeconds = 0;
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

if (gameTimerDisplay) {
  gameTimerDisplay.textContent = `ВРЕМЯ: ${formatTime(gameTimerSeconds)}`;
  setInterval(() => {
    if (gameEnded) return;
    gameTimerSeconds += 1;
    gameTimerDisplay.textContent = `ВРЕМЯ: ${formatTime(gameTimerSeconds)}`;
  }, 1000);
}

function getTotalGold(player) {
  return (player.resources.gold || 0) + (player.pocket.gold || 0);
}

function getDiscountedGoldCost(player, baseCost) {
  if (!player || !player.ringCount) return baseCost;
  const discounted = Math.round(baseCost * 0.85);
  return Math.max(0, discounted);
}

function setTradePrice(btn, html) {
  if (!btn) return;
  const price = btn.querySelector(".trade-price");
  if (price) {
    price.innerHTML = html;
  }
}

function goldPriceHtml(cost) {
  return `<img class="price-icon" src="assets/icons/icon-gold.png" alt="Золото" />Цена: ${cost} золота`;
}

function flashPrice(btn, amountText, iconSrc, iconAlt) {
  if (!btn) return;
  const target = btn.querySelector(".trade-price") || btn;
  const flash = document.createElement("span");
  flash.className = "price-flash";
  flash.innerHTML =
    `<span class="price-minus">-${amountText}</span>` +
    `<img class="price-icon" src="${iconSrc}" alt="${iconAlt || ""}" />`;
  target.appendChild(flash);
  setTimeout(() => {
    flash.remove();
  }, 900);
}

function spendGold(player, amount) {
  let remaining = Math.max(0, amount);
  const fromPocket = Math.min(player.pocket.gold || 0, remaining);
  player.pocket.gold -= fromPocket;
  remaining -= fromPocket;
  if (remaining > 0) {
    player.resources.gold = Math.max(0, (player.resources.gold || 0) - remaining);
  }
}

function getTotalResources(player) {
  return (player.resources.resources || 0) + (player.pocket.resources || 0);
}

function spendResources(player, amount) {
  let remaining = Math.max(0, amount);
  const fromPocket = Math.min(player.pocket.resources || 0, remaining);
  player.pocket.resources -= fromPocket;
  remaining -= fromPocket;
  if (remaining > 0) {
    player.resources.resources = Math.max(0, (player.resources.resources || 0) - remaining);
  }
}

function getFirstOwnedCastleKey(playerIndex) {
  return Object.keys(castleOwnersByKey).find(key => castleOwnersByKey[key] === playerIndex) || null;
}

function addArmyToOwnedCastle(playerIndex, amount) {
  const castleKey = getFirstOwnedCastleKey(playerIndex);
  if (!castleKey) return false;
  const stats = ensureCastleStats(castleKey);
  stats.storageArmy = (stats.storageArmy || 0) + amount;
  if (castleModalKey === castleKey && castleModalPlayerIndex === playerIndex) {
    refreshCastleModal(castleKey, playerIndex);
  }
  return true;
}

function grantPurchasedArmy(playerIndex, amount) {
  const player = players[playerIndex];
  if (player) {
    player.pocket.army += amount;
    showPickupToast(`В карман: +${amount} войск`);
  }
  return "pocket";
}

function ensureSwordIconOnCastle(playerIndex) {
  const key = getFirstOwnedCastleKey(playerIndex);
  if (!key) return false;
  const cell = grid[key];
  if (!cell) return false;
  if (cell.querySelector(".castle-sword")) return true;
  const icon = document.createElement("div");
  icon.className = "castle-sword";
  icon.textContent = "М";
  cell.appendChild(icon);
  return true;
}

function openBarracks(playerIndex) {
  barracksPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const cost50 = getDiscountedGoldCost(player, 2000);
  const cost130 = getDiscountedGoldCost(player, 4000);
  barracksButtons.forEach(btn => {
    const type = btn.getAttribute("data-buy");
    if (type === "army-50") btn.disabled = gold < cost50;
    if (type === "army-130") btn.disabled = gold < cost130;
    if (type === "army-100-infl") btn.disabled = player.pocket.army < 100;
    if (type === "army-50") setTradePrice(btn, goldPriceHtml(cost50));
    if (type === "army-130") setTradePrice(btn, goldPriceHtml(cost130));
  });
  barracksModal.style.display = "flex";
}

function closeBarracks() {
  barracksModal.style.display = "none";
  barracksPlayerIndex = null;
}

barracksClose.addEventListener("click", closeBarracks);
barracksModal.addEventListener("click", (e) => {
  if (e.target === barracksModal) closeBarracks();
});

barracksButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (barracksPlayerIndex === null) return;
    const player = players[barracksPlayerIndex];
    const type = btn.getAttribute("data-buy");
    if (type === "army-50") {
      const cost = getDiscountedGoldCost(player, 2000);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      grantPurchasedArmy(barracksPlayerIndex, 50);
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "army-130") {
      const cost = getDiscountedGoldCost(player, 4000);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      grantPurchasedArmy(barracksPlayerIndex, 130);
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "army-100-infl") {
      if (player.pocket.army < 100) return;
      player.pocket.army -= 100;
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 100, "assets/icons/icon-army.png", "Войска");
    }
    updatePlayerResources(barracksPlayerIndex);
    openBarracks(barracksPlayerIndex);
  });
});

function openLavka(playerIndex) {
  lavkaPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const cost50 = getDiscountedGoldCost(player, 800);
  const cost100 = getDiscountedGoldCost(player, 1200);
  lavkaButtons.forEach(btn => {
    const type = btn.getAttribute("data-lavka-buy");
    if (type === "res-50") btn.disabled = gold < cost50;
    if (type === "res-100") btn.disabled = gold < cost100;
    if (type === "res-1000-infl") btn.disabled = getTotalResources(player) < 1000;
    if (type === "res-50") setTradePrice(btn, goldPriceHtml(cost50));
    if (type === "res-100") setTradePrice(btn, goldPriceHtml(cost100));
  });
  lavkaModal.style.display = "flex";
}

function closeLavka() {
  lavkaModal.style.display = "none";
  lavkaPlayerIndex = null;
}

lavkaClose.addEventListener("click", closeLavka);
lavkaModal.addEventListener("click", (e) => {
  if (e.target === lavkaModal) closeLavka();
});

lavkaButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (lavkaPlayerIndex === null) return;
    const player = players[lavkaPlayerIndex];
    const type = btn.getAttribute("data-lavka-buy");
    if (type === "res-50") {
      const cost = getDiscountedGoldCost(player, 800);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.resources.resources += 50;
      showPickupToast("+50 ресурсов");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "res-100") {
      const cost = getDiscountedGoldCost(player, 1200);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.resources.resources += 100;
      showPickupToast("+100 ресурсов");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "res-1000-infl") {
      if (getTotalResources(player) < 1000) return;
      spendResources(player, 1000);
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 1000, "assets/icons/icon-resources.png", "Ресурсы");
    }
    updatePlayerResources(lavkaPlayerIndex);
    openLavka(lavkaPlayerIndex);
  });
});

function openWorkshop(playerIndex) {
  workshopPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const costArmor = getDiscountedGoldCost(player, 1500);
  const costSword = getDiscountedGoldCost(player, 2500);
  const costHeroSword = getDiscountedGoldCost(player, 5000);
  workshopButtons.forEach(btn => {
    const type = btn.getAttribute("data-workshop-buy");
    if (type === "armor") btn.disabled = gold < costArmor || player.hasArmor === true;
    if (type === "sword") btn.disabled = gold < costSword || player.hasWorkshopSword === true;
    if (type === "hero-sword") btn.disabled = gold < costHeroSword || player.hasSword === true || (player.rainbowStoneCount || 0) <= 0 || (player.heroHiltCount || 0) <= 0;
    if (type === "rainbow-infl") btn.disabled = (player.rainbowStoneCount || 0) <= 0;
    if (type === "armor") setTradePrice(btn, goldPriceHtml(costArmor));
    if (type === "sword") setTradePrice(btn, goldPriceHtml(costSword));
    if (type === "hero-sword") {
      setTradePrice(
        btn,
        `${goldPriceHtml(costHeroSword)} + <img class="price-icon" src="assets/icons/rainbow_stone.png" alt="Радужный камень" />Радужный камень + <img class="price-icon" src="assets/icons/hero_hilt.png" alt="Рукоять" />Рукоять`
      );
    }
  });
  workshopModal.style.display = "flex";
}

function closeWorkshop() {
  workshopModal.style.display = "none";
  workshopPlayerIndex = null;
}

workshopClose.addEventListener("click", closeWorkshop);
workshopModal.addEventListener("click", (e) => {
  if (e.target === workshopModal) closeWorkshop();
});

workshopButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (workshopPlayerIndex === null) return;
    const player = players[workshopPlayerIndex];
    const type = btn.getAttribute("data-workshop-buy");
    if (type === "armor" && !player.hasArmor) {
      const cost = getDiscountedGoldCost(player, 1500);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.hasArmor = true;
      player.attack += 7;
      showPickupToast("Доспехи: +7 атаки");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "sword" && !player.hasWorkshopSword) {
      const cost = getDiscountedGoldCost(player, 2500);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.hasWorkshopSword = true;
      player.attack += 12;
      showPickupToast("Меч: +12 атаки");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "hero-sword" && !player.hasSword) {
      const cost = getDiscountedGoldCost(player, 5000);
      if (getTotalGold(player) < cost || (player.rainbowStoneCount || 0) <= 0 || (player.heroHiltCount || 0) <= 0) return;
      spendGold(player, cost);
      player.rainbowStoneCount -= 1;
      player.heroHiltCount -= 1;
      player.hasSword = true;
      ensureSwordIconOnCastle(workshopPlayerIndex);
      showPickupToast("Меч героя приобретен");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
      flashPrice(btn, 1, "assets/icons/rainbow_stone.png", "Радужный камень");
      flashPrice(btn, 1, "assets/icons/hero_hilt.png", "Рукоять");
    }
    if (type === "rainbow-infl") {
      if ((player.rainbowStoneCount || 0) <= 0) return;
      player.rainbowStoneCount -= 1;
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 1, "assets/icons/rainbow_stone.png", "Радужный камень");
    }
    updatePlayerResources(workshopPlayerIndex);
    openWorkshop(workshopPlayerIndex);
  });
});

function getHireBasePosition() {
  const hireNode = importantNodes.find(n => n.id === 6);
  if (!hireNode) return null;
  return { x: hireNode.x, y: hireNode.y };
}

function getMercenaryAtKey(key) {
  return mercenaries.find(entry => entry.key === key) || null;
}

function setCellToMercenary(x, y) {
  const key = `${x},${y}`;
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("important", "mercenary");
  cell.textContent = "";
  setCellIcon(cell, "mercenary_unit.png", "Наёмники");
  return true;
}

function clearMercenaryCell(x, y) {
  setCellToInactive(x, y);
}

function findHireSpawnCell() {
  const base = getHireBasePosition();
  if (!base) return null;
  const candidates = [
    { x: base.x + 1, y: base.y },
    { x: base.x - 1, y: base.y },
    { x: base.x, y: base.y + 1 },
    { x: base.x, y: base.y - 1 }
  ];
  for (const pos of candidates) {
    if (pos.x < 0 || pos.x >= COLS || pos.y < 0 || pos.y >= ROWS) continue;
    const key = `${pos.x},${pos.y}`;
    const cell = grid[key];
    if (!cell) continue;
    if (!cell.classList.contains("inactive")) continue;
    if (blockedCellKeys.has(key)) continue;
    return pos;
  }
  return null;
}

function findEnemySpecialCell(playerIndex, featureKey) {
  const candidates = Object.entries(specialByPos)
    .map(([key, entry]) => ({ key, entry }))
    .filter(({ entry }) => entry.ownerIndex !== null && entry.ownerIndex !== playerIndex)
    .filter(({ entry }) => entry.featureKey === featureKey)
    .filter(({ entry }) => entry.disabled !== true);
  if (candidates.length === 0) return null;
  return candidates[0];
}

function spawnMercenary(playerIndex, featureKey, strength, baseCost) {
  const target = findEnemySpecialCell(playerIndex, featureKey);
  if (!target) {
    showPickupToast("Нет доступной вражеской клетки для атаки.");
    return false;
  }
  const spawnPos = findHireSpawnCell();
  if (!spawnPos) {
    showPickupToast("Нет места рядом для наёмников.");
    return false;
  }
  const player = players[playerIndex];
  const cost = getDiscountedGoldCost(player, baseCost);
  if (getTotalGold(player) < cost) {
    showPickupToast("Не хватает золота.");
    return false;
  }
  spendGold(player, cost);
  updatePlayerResources(playerIndex);

  const key = `${spawnPos.x},${spawnPos.y}`;
  setCellToMercenary(spawnPos.x, spawnPos.y);
  mercenaries.push({
    id: mercenaryIdCounter++,
    key,
    x: spawnPos.x,
    y: spawnPos.y,
    ownerIndex: playerIndex,
    targetKey: target.key,
    featureKey,
    strength
  });
  showPickupToast("Наёмники отправлены.");
  return true;
}

function openHire(playerIndex) {
  hirePlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const costLumber = getDiscountedGoldCost(player, 500);
  const costMine = getDiscountedGoldCost(player, 750);
  const costClay = getDiscountedGoldCost(player, 1200);
  hireButtons.forEach(btn => {
    const type = btn.getAttribute("data-hire");
    const hasTarget = Boolean(findEnemySpecialCell(playerIndex, type));
    if (type === "lumber") btn.disabled = gold < costLumber || !hasTarget;
    if (type === "mine") btn.disabled = gold < costMine || !hasTarget;
    if (type === "clay") btn.disabled = gold < costClay || !hasTarget;
    if (type === "lumber") setTradePrice(btn, goldPriceHtml(costLumber));
    if (type === "mine") setTradePrice(btn, goldPriceHtml(costMine));
    if (type === "clay") setTradePrice(btn, goldPriceHtml(costClay));
  });
  hireModal.style.display = "flex";
}

function closeHire() {
  hireModal.style.display = "none";
  hirePlayerIndex = null;
}

hireClose.addEventListener("click", closeHire);
hireModal.addEventListener("click", (e) => {
  if (e.target === hireModal) closeHire();
});

  hireButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (hirePlayerIndex === null) return;
      const type = btn.getAttribute("data-hire");
      const player = players[hirePlayerIndex];
      const costLumber = getDiscountedGoldCost(player, 500);
      const costMine = getDiscountedGoldCost(player, 750);
      const costClay = getDiscountedGoldCost(player, 1200);
      if (type === "lumber") {
      const ok = spawnMercenary(hirePlayerIndex, "lumber", 15, 500);
      if (ok) flashPrice(btn, costLumber, "assets/icons/icon-gold.png", "Золото");
      }
      if (type === "mine") {
      const ok = spawnMercenary(hirePlayerIndex, "mine", 25, 750);
      if (ok) flashPrice(btn, costMine, "assets/icons/icon-gold.png", "Золото");
      }
      if (type === "clay") {
      const ok = spawnMercenary(hirePlayerIndex, "clay", 50, 1200);
      if (ok) flashPrice(btn, costClay, "assets/icons/icon-gold.png", "Золото");
      }
      openHire(hirePlayerIndex);
    });
  });

function openRepairModal(entry, playerIndex) {
  if (!entry || !repairModal || !repairConfirm) return;
  let cost = 0;
  let label = "ресурс";
  if (entry.featureKey === "lumber") {
    cost = 25;
    label = "лесопилку";
  }
  if (entry.featureKey === "mine") {
    cost = 50;
    label = "шахту";
  }
  if (entry.featureKey === "clay") {
    cost = 100;
    label = "глиняный карьер";
  }
  const player = players[playerIndex];
  const total = getTotalResources(player);
  if (repairText) {
    repairText.textContent = `Починить ${label} за ${cost} ресурсов?`;
  }
  setTradePrice(repairConfirm, `<img class="price-icon" src="assets/icons/icon-resources.png" alt="Ресурсы" />Цена: ${cost} ресурсов`);
  repairConfirm.disabled = total < cost;
  repairModal.style.display = "flex";
  repairPending = { key: entry.key || `${entry.x},${entry.y}`, cost, playerIndex, entry };
}

function closeRepairModal() {
  if (repairModal) repairModal.style.display = "none";
  repairPending = null;
}

if (repairCancel) {
  repairCancel.addEventListener("click", closeRepairModal);
}
if (repairModal) {
  repairModal.addEventListener("click", (e) => {
    if (e.target === repairModal) closeRepairModal();
  });
}
  if (repairConfirm) {
  repairConfirm.addEventListener("click", () => {
    if (!repairPending) return;
    const player = players[repairPending.playerIndex];
    if (!player) return;
    if (getTotalResources(player) < repairPending.cost) return;
    spendResources(player, repairPending.cost);
    setSpecialCellDisabled(repairPending.key, false);
    if (repairPending.entry && repairPending.entry.featureKey) {
      applySpecialFeatureIcon(repairPending.entry.x, repairPending.entry.y, repairPending.entry.featureKey);
    }
    recalcPlayerResourceIncome(repairPending.playerIndex);
    updatePlayerResources(repairPending.playerIndex);
    showPickupToast("Ресурс восстановлен.");
    closeRepairModal();
    flashPrice(repairConfirm, repairPending.cost, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

function openContextForKey(key, playerIndex) {
  const [x, y] = key.split(",").map(Number);
  const castleKey = getCastleBaseKeyForPos(x, y) || key;
  const node = nodeByPos[castleKey];
  if (masterActive && key === MASTER_CELL.key) {
    openMasterModal(playerIndex);
    return;
  }
  const mageSlot = getMageSlotByKey(key);
  if (mageSlot && mageSlot.active) {
    openMageModal(mageSlot, playerIndex);
    return;
  }
  if (node && node.type === "castle") {
    const owner = castleOwnersByKey[castleKey];
    if (typeof owner === "number" && owner !== playerIndex) {
      const player = players[playerIndex];
      if (!player || player.pocket.army <= 0) {
        showPickupToast("В кармане нет войск для боя.");
        return;
      }
      const result = resolveCastleBattle(playerIndex, castleKey);
      showBattleModal(result);
      if (result.healthRemaining <= 0) {
        showGameOver(playerIndex);
      } else if (result.winnerIndex === playerIndex) {
        const ownedKey = getFirstOwnedCastleKey(playerIndex);
        if (ownedKey && ownedKey !== castleKey) {
          showPickupToast("Нельзя захватить второй замок.");
        } else {
          castleOwnersByKey[castleKey] = playerIndex;
          node.elem.classList.add("owned");
          node.elem.style.background = player.color;
          node.elem.style.borderColor = player.color;
          recalcPlayerResourceIncome(playerIndex);
        }
      }
      if (typeof owner === "number") {
        recalcPlayerResourceIncome(owner);
      }
      endTurn();
      return;
    }
  }
  if (node && node.type === "castle" && castleOwnersByKey[castleKey] === playerIndex) {
    showCastleModal(castleKey, playerIndex);
    return;
  }
  const specialEntry = specialByPos[key];
  if (specialEntry && specialEntry.disabled && specialEntry.ownerIndex === playerIndex) {
    openRepairModal({ ...specialEntry, key }, playerIndex);
    return;
  }
  if (node && node.id === 2) return openBarracks(playerIndex);
  if (node && node.id === 9) return openLavka(playerIndex);
  if (node && node.id === 19) return openWorkshop(playerIndex);
  if (node && node.id === 15) return openCity(playerIndex);
  if (node && node.id === 6) return openHire(playerIndex);
}

function isMercenaryStepAllowed(nx, ny, targetKey) {
  const key = `${nx},${ny}`;
  if (blockedCellKeys.has(key)) return false;
  if (key === targetKey) return true;
  const cell = grid[key];
  if (!cell || !cell.classList.contains("inactive")) return false;
  if (resourceByPos[key]) return false;
  if (specialByPos[key]) return false;
  if (players.some(p => p.x === nx && p.y === ny)) return false;
  if (mercenaries.some(m => m.key === key)) return false;
  return true;
}

function findMercenaryPath(startKey, targetKey, maxDepth = 25) {
  const [sx, sy] = startKey.split(",").map(Number);
  const [tx, ty] = targetKey.split(",").map(Number);
  const queue = [{ x: sx, y: sy }];
  const prev = new Map();
  const startId = `${sx},${sy}`;
  prev.set(startId, null);
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  let depth = 0;
  while (queue.length && depth <= maxDepth) {
    const nextQueue = [];
    for (const node of queue) {
      const key = `${node.x},${node.y}`;
      if (key === targetKey) {
        const path = [];
        let cur = key;
        while (cur && cur !== startId) {
          path.push(cur);
          cur = prev.get(cur);
        }
        path.reverse();
        return path;
      }
      for (const { dx, dy } of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nkey = `${nx},${ny}`;
        if (prev.has(nkey)) continue;
        if (!isMercenaryStepAllowed(nx, ny, targetKey)) continue;
        prev.set(nkey, key);
        nextQueue.push({ x: nx, y: ny });
      }
    }
    queue.splice(0, queue.length, ...nextQueue);
    depth += 1;
  }
  return null;
}

function moveMercenary(mercenary) {
  const target = mercenary.targetKey;
  if (mercenary.key === target) return;
  const path = findMercenaryPath(mercenary.key, target, 80);
  if (!path || path.length === 0) return;
  const steps = Math.min(5, path.length);
  for (let i = 0; i < steps; i += 1) {
    const [nx, ny] = path[i].split(",").map(Number);
    clearMercenaryCell(mercenary.x, mercenary.y);
    mercenary.x = nx;
    mercenary.y = ny;
    mercenary.key = `${nx},${ny}`;
    if (mercenary.key === target) break;
    setCellToMercenary(nx, ny);
  }
}

function disableTargetResource(targetKey) {
  const entry = specialByPos[targetKey];
  if (!entry) return;
  setSpecialCellDisabled(targetKey, true);
  const cell = grid[targetKey];
  if (cell) {
    cell.classList.remove("mercenary", "inactive");
    cell.classList.add("important", "special");
    if (entry.extraClass) cell.classList.add(entry.extraClass);
    cell.textContent = entry.label;
  }
  if (typeof entry.ownerIndex === "number") {
    recalcPlayerResourceIncome(entry.ownerIndex);
  }
}

function advanceMercenaries() {
  for (let i = mercenaries.length - 1; i >= 0; i--) {
    const mercenary = mercenaries[i];
    if (!specialByPos[mercenary.targetKey] || specialByPos[mercenary.targetKey].disabled) {
      clearMercenaryCell(mercenary.x, mercenary.y);
      mercenaries.splice(i, 1);
      continue;
    }
    moveMercenary(mercenary);
    if (mercenary.key === mercenary.targetKey) {
      disableTargetResource(mercenary.targetKey);
      showPickupToast("Наёмники вывели ресурс из строя.");
      mercenaries.splice(i, 1);
    }
  }
}

function openCity(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const totalGold = (player.resources.gold || 0) + (player.pocket.gold || 0);
  const kills = player.barbarianKills || 0;
  if (cityKillsInfo) {
    cityKillsInfo.textContent = `Убито лагерей варваров: ${kills}`;
  }
  cityRewardButtons.forEach(btn => {
    const amount = btn.getAttribute("data-city-reward");
    if (amount === "5") {
      btn.disabled = kills < 5 || player.barbarianRewards.r5 === true;
    }
    if (amount === "10") {
      btn.disabled = kills < 10 || player.barbarianRewards.r10 === true;
    }
    if (amount === "20") {
      btn.disabled = kills < 20 || player.barbarianRewards.r20 === true;
    }
  });
  cityExchangeButtons.forEach(btn => {
    const amount = btn.getAttribute("data-city-exchange");
    if (amount === "100") {
      const cost = getDiscountedGoldCost(player, 1000);
      btn.disabled = totalGold < cost;
      setTradePrice(btn, goldPriceHtml(cost));
    }
    if (amount === "300") {
      const cost = getDiscountedGoldCost(player, 2500);
      btn.disabled = totalGold < cost;
      setTradePrice(btn, goldPriceHtml(cost));
    }
  });
  if (cityPoisonBtn) {
    cityPoisonBtn.disabled = (player.poisonCount || 0) <= 0;
  }
  cityModal.style.display = "flex";
  cityPlayerIndex = playerIndex;
}

function closeCity() {
  cityModal.style.display = "none";
  cityPlayerIndex = null;
}

let cityPlayerIndex = null;
cityClose.addEventListener("click", closeCity);
cityModal.addEventListener("click", (e) => {
  if (e.target === cityModal) closeCity();
});

cityRewardButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (cityPlayerIndex === null) return;
    const player = players[cityPlayerIndex];
    const amount = btn.getAttribute("data-city-reward");
    if (amount === "5" && player.barbarianKills >= 5 && !player.barbarianRewards.r5) {
      player.barbarianRewards.r5 = true;
      player.resources.gold += 1500;
      showPickupToast("Награда: +1500 золота");
    }
    if (amount === "10" && player.barbarianKills >= 10 && !player.barbarianRewards.r10) {
      player.barbarianRewards.r10 = true;
      player.resources.gold += 3000;
      showPickupToast("Награда: +3000 золота");
    }
    if (amount === "20" && player.barbarianKills >= 20 && !player.barbarianRewards.r20) {
      player.barbarianRewards.r20 = true;
      player.resources.gold += 5000;
      showPickupToast("Награда: +5000 золота");
    }
    updatePlayerResources(cityPlayerIndex);
    openCity(cityPlayerIndex);
  });
});

cityExchangeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (cityPlayerIndex === null) return;
    const player = players[cityPlayerIndex];
    const amount = btn.getAttribute("data-city-exchange");
    if (amount === "100") {
      const cost = getDiscountedGoldCost(player, 1000);
      if ((player.resources.gold + player.pocket.gold) < cost) return;
      spendGold(player, cost);
      player.resources.influence += 100;
      showPickupToast("+100 влияния");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (amount === "300") {
      const cost = getDiscountedGoldCost(player, 2500);
      if ((player.resources.gold + player.pocket.gold) < cost) return;
      spendGold(player, cost);
      player.resources.influence += 300;
      showPickupToast("+300 влияния");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    updatePlayerResources(cityPlayerIndex);
    openCity(cityPlayerIndex);
  });
});

function handleCityPoisonUse() {
  if (cityPlayerIndex === null) return;
  const player = players[cityPlayerIndex];
  if (!player || !player.poisonCount) {
    showPickupToast("У вас нет яда.");
    return;
  }
  if (player.resources.influence >= POISON_INFLUENCE_THRESHOLD) {
    player.poisonCount = Math.max(0, (player.poisonCount || 0) - 1);
    updatePlayerResources(cityPlayerIndex);
    closeCity();
    showPickupToast("Яд отравил короля.");
    showGameOver(cityPlayerIndex);
  } else {
    showPickupToast(`Нужно ${POISON_INFLUENCE_THRESHOLD} влияния, чтобы яд сработал.`);
  }
}

if (cityPoisonBtn) {
  cityPoisonBtn.addEventListener("click", handleCityPoisonUse);
}

function updateGuardModalButtons(playerIndex, unlocked) {
  const player = players[playerIndex];
  if (!player) return;
  guardBribeBtn.disabled = unlocked || getTotalGold(player) < 500;
  guardInfluenceBtn.disabled = unlocked || player.resources.influence < 300;
  guardPassBtn.disabled = !unlocked;
}

function showGuardModalFor(playerIndex, x, y, unlocked) {
  pendingGuardMove = {x, y};
  pendingGuardPlayerIndex = playerIndex;
  updateGuardModalButtons(playerIndex, Boolean(unlocked));
  guardModal.style.display = "flex";
}

function hideGuardModal() {
  guardModal.style.display = "none";
  pendingGuardMove = null;
  pendingGuardPlayerIndex = null;
}

  function handleGuardDecision(type) {
    if (!pendingGuardMove || pendingGuardPlayerIndex === null) return;
    const player = players[pendingGuardPlayerIndex];
    if (!player) return;
    let success = false;
    if (type === "gold" && getTotalGold(player) >= 500) {
      spendGold(player, 500);
      success = true;
      flashPrice(guardBribeBtn, 500, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "influence" && player.resources.influence >= 300) {
      success = true;
    }
    if (!success) return;
    guardAccess[pendingGuardPlayerIndex] = true;
    updatePlayerResources(pendingGuardPlayerIndex);
    const move = pendingGuardMove;
    hideGuardModal();
    finalizeMove(move.x, move.y);
  }

  guardBribeBtn.addEventListener("click", () => handleGuardDecision("gold"));
  guardInfluenceBtn.addEventListener("click", () => handleGuardDecision("influence"));
  guardPassBtn.addEventListener("click", () => {
    if (!pendingGuardMove || pendingGuardPlayerIndex === null) return;
    const move = pendingGuardMove;
    hideGuardModal();
    finalizeMove(move.x, move.y);
  });
  guardModalCancel.addEventListener("click", hideGuardModal);
  guardModal.addEventListener("click", (event) => {
    if (event.target === guardModal) {
      hideGuardModal();
    }
  });

  function showRobberModal() {
    if (!robberModal) return;
    updateRobberModalContent();
    robberModal.style.display = "flex";
  }

  function hideRobberModal() {
    if (!robberModal) return;
    robberModal.style.display = "none";
    if (robberBribeBtn) {
      robberBribeBtn.disabled = true;
    }
  }

  function handleRobberFight() {
    if (!robberEvent) return;
    const fighterIndex = robberEvent.playerIndex ?? currentPlayerIndex;
    const result = resolveRobberBattle(fighterIndex, robberEvent.army);
    hideRobberModal();
    robberEvent = null;
    currentPlayerIndex = fighterIndex;
    updateTurnUI();
    showBattleModal(result);
    scheduleAutoRoll();
  }

function handleRobberBribe() {
  if (!robberEvent) return;
  const playerIndex = robberEvent.playerIndex ?? currentPlayerIndex;
  const player = players[playerIndex];
  const cost = robberEvent.bribeCost || 0;
  if (!player || getTotalGold(player) < cost) return;
  spendGold(player, cost);
  updatePlayerResources(playerIndex);
  showPickupToast(`Разбойникам отдано ${cost} золота, бой отменён`);
  flashPrice(robberBribeBtn, cost, "assets/icons/icon-gold.png", "Золото");
  robberEvent = null;
  hideRobberModal();
  updateTurnUI();
  scheduleAutoRoll();
}

  function updateRobberModalContent() {
    if (!robberEvent) return;
    if (robberCount) {
      robberCount.textContent = robberEvent.army;
    }
    if (robberBribeInfo) {
      robberBribeInfo.textContent = robberEvent.bribeCost;
    }
    if (robberBribeBtn) {
      const playerIndex = robberEvent.playerIndex ?? currentPlayerIndex;
      const player = players[playerIndex];
      robberBribeBtn.disabled = !player || getTotalGold(player) < robberEvent.bribeCost;
    }
  }

function processRobberAmbushChance() {
  if (robberAmbushThisSession) return false;
  if (robberEvent || movesRemaining > 0) return false;
  if (turnCounter < 10) return false;
  const currentPlayer = players[currentPlayerIndex];
  if (currentPlayer) {
    const castleKey = getCastleBaseKeyForPos(currentPlayer.x, currentPlayer.y);
    if (castleKey && castleOwnersByKey[castleKey] === currentPlayerIndex) {
      return false;
    }
  }
  if (Math.random() >= ROBBER_CHANCE) return false;
  const baseArmy = Math.floor(Math.random() * 26) + 10;
  const strengthMultiplier = turnCounter >= 150 ? 1.5 : 1;
  const army = Math.max(1, Math.ceil(baseArmy * strengthMultiplier));
  const bribeCost =
      150 + Math.round(((army - 5) / 10) * (250 - 150));
  robberEvent = {playerIndex: currentPlayerIndex, army, bribeCost};
  robberAmbushThisSession = true;
    if (rollBtn) rollBtn.disabled = true;
    updateRobberModalContent();
    showRobberModal();
    return true;
  }

  if (robberFightBtn) {
    robberFightBtn.addEventListener("click", handleRobberFight);
  }
  if (robberBribeBtn) {
    robberBribeBtn.addEventListener("click", handleRobberBribe);
  }

function resolveRobberBattle(playerIndex, armySize) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = armySize;
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Разбойники";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Разбойники";
    winnerIndex = null;
  }
  const playerWon = winnerIndex === playerIndex;
  const rewardMultiplier = turnCounter >= 150 ? 1.7 : 1;
  const goldReward = playerWon
    ? Math.floor(Math.random() * (ROBBER_GOLD_REWARD_MAX - ROBBER_GOLD_REWARD_MIN + 1)) + ROBBER_GOLD_REWARD_MIN
    : 0;
  const resourceReward = playerWon
    ? Math.floor(Math.random() * (ROBBER_RESOURCE_REWARD_MAX - ROBBER_RESOURCE_REWARD_MIN + 1)) +
      ROBBER_RESOURCE_REWARD_MIN
    : 0;
  const scaledGoldReward = Math.floor(goldReward * rewardMultiplier);
  const scaledResourceReward = Math.floor(resourceReward * rewardMultiplier);
  let penaltyGold = 0;
  let penaltyResources = 0;
  if (playerWon) {
    player.pocket.gold += scaledGoldReward;
    player.pocket.resources += scaledResourceReward;
    updatePlayerResources(playerIndex);
  } else {
    penaltyGold = Math.floor(player.pocket.gold * ROBBER_LOSS_PENALTY);
    penaltyResources = Math.floor(player.pocket.resources * ROBBER_LOSS_PENALTY);
    player.pocket.gold = Math.max(0, player.pocket.gold - penaltyGold);
    player.pocket.resources = Math.max(0, player.pocket.resources - penaltyResources);
    player.resources.influence -= ROBBER_INFLUENCE_LOSS;
    showPickupToast(
      `Разбойники: -${penaltyGold} золота, -${penaltyResources} ресурсов, влияние -${ROBBER_INFLUENCE_LOSS}`
    );
    updatePlayerResources(playerIndex);
  }
  return {
    type: "robber",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    goldReward: scaledGoldReward,
    resourceReward: scaledResourceReward,
    penaltyGold,
    penaltyResources,
    influenceLoss: playerWon ? 0 : ROBBER_INFLUENCE_LOSS
  };
}

function resolveTrollBattle(playerIndex, trollArmy) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, trollArmy);
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "\u0422\u0440\u043e\u043b\u043b\u0438";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "\u0422\u0440\u043e\u043b\u043b\u0438";
    winnerIndex = null;
  }
  updatePlayerResources(playerIndex);
  return {
    type: "troll",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    defenderInitial: initialDefArmy
  };
}

function rollTrollCaveLoot(playerIndex) {
  const player = players[playerIndex];
  if (!player) return null;
  const scaleSteps = Math.floor((turnCounter || 0) / 75);
  const scale = 1 + (0.5 * scaleSteps);
  const gold = Math.floor(Math.random() * 301 * scale);
  const resources = Math.floor(Math.random() * 51 * scale);
  const influenceLoss = Math.floor(Math.random() * 51);
  const gotRainbow = Math.random() < 0.05;
  const gotFlower = Math.random() < 0.05;
  player.pocket.gold += gold;
  player.pocket.resources += resources;
  player.resources.influence -= influenceLoss;
  if (gotRainbow) {
    player.rainbowStoneCount = (player.rainbowStoneCount || 0) + 1;
  }
  if (gotFlower) {
    player.flowerCount = (player.flowerCount || 0) + 1;
  }
  updatePlayerResources(playerIndex);
  const parts = [
    `\u0417\u043e\u043b\u043e\u0442\u043e: +${gold}`,
    `\u0420\u0435\u0441\u0443\u0440\u0441\u044b: +${resources}`,
    `\u0412\u043b\u0438\u044f\u043d\u0438\u0435: -${influenceLoss}`
  ];
  if (gotRainbow) parts.push("\u0420\u0430\u0434\u0443\u0436\u043d\u044b\u0439 \u043a\u0430\u043c\u0435\u043d\u044c: \u043d\u0430\u0439\u0434\u0435\u043d");
  if (gotFlower) parts.push("\u0422\u0430\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0446\u0432\u0435\u0442\u043e\u043a: \u043d\u0430\u0439\u0434\u0435\u043d");
  return parts.join(". ");
}

function stealResources(winnerIndex, loserIndex) {
  const winner = players[winnerIndex];
  const loser = players[loserIndex];
    const stolen = {gold: 0, army: 0, resources: 0};
    ["gold", "army", "resources"].forEach(type => {
      const amount = Math.floor(loser.pocket[type] * 0.8);
      if (amount <= 0) return;
      loser.pocket[type] -= amount;
      winner.pocket[type] += amount;
      stolen[type] = amount;
    });
    updatePlayerResources(loserIndex);
    updatePlayerResources(winnerIndex);
  return stolen;
}

function resolveBarbarianBattle(playerIndex, barbarian) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = barbarian.army;
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Варвары";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Варвары";
    winnerIndex = null;
  }
  const playerWon = winnerIndex === playerIndex;
  const rewardMultiplier = turnCounter >= 150 ? 1.7 : 1;
  const influenceReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 35, 60) * rewardMultiplier) : 0;
  const goldReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 200, 350) * rewardMultiplier) : 0;
  const resourceReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 20, 35) * rewardMultiplier) : 0;
  let penaltyGold = 0;
  let penaltyResources = 0;
  if (playerWon) {
    player.resources.influence += influenceReward;
    player.pocket.gold += goldReward;
    player.pocket.resources += resourceReward;
    updatePlayerResources(playerIndex);
  } else {
    penaltyGold = Math.floor(player.pocket.gold * 0.5);
    penaltyResources = Math.floor(player.pocket.resources * 0.5);
    player.pocket.gold = Math.max(0, player.pocket.gold - penaltyGold);
    player.pocket.resources = Math.max(0, player.pocket.resources - penaltyResources);
    showPickupToast(`В карман: потери ${penaltyGold} золота, ${penaltyResources} ресурсов`);
    updatePlayerResources(playerIndex);
  }
  return {
    type: "barbarian",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    influenceReward,
    goldReward,
    resourceReward,
    penaltyGold,
    penaltyResources,
    defenderInitial: initialDefArmy
  };
}

function resolveDragonBattle(playerIndex, dragonArmy = 75) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, dragonArmy);
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Дракон";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Дракон";
    winnerIndex = null;
  }
  updatePlayerResources(playerIndex);
  return {
    type: "dragon",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    defenderInitial: initialDefArmy
  };
}

function resolveBattle(attackerIndex, defenderIndex) {
  const attacker = players[attackerIndex];
  const defender = players[defenderIndex];
  const initialDefArmy = Math.max(0, defender.pocket.army);
  const initialAttArmy = Math.max(0, attacker.pocket.army);

  let attackerRemaining = initialAttArmy;
  let defenderRemaining = initialDefArmy;

  // Личная атака защитника срабатывает первой
  const defenderStrike = Math.max(0, defender.attack || 0);
  if (defenderStrike > 0 && attackerRemaining > 0) {
    attackerRemaining = Math.max(0, attackerRemaining - defenderStrike);
  }

  // Затем личная атака атакующего
  const attackerStrike = Math.max(0, attacker.attack || 0);
  if (attackerStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - attackerStrike);
  }

  // Затем идут удары войск: по очереди, случайный урон 1–3
  while (attackerRemaining > 3 && defenderRemaining > 3) {
    const defHit = Math.floor(Math.random() * 3) + 1;
    attackerRemaining = Math.max(0, attackerRemaining - defHit);
    if (attackerRemaining <= 3) break;
    const attHit = Math.floor(Math.random() * 3) + 1;
    defenderRemaining = Math.max(0, defenderRemaining - attHit);
  }

  attacker.pocket.army = Math.max(0, attackerRemaining);
  defender.pocket.army = Math.max(0, defenderRemaining);

  let winnerIndex = attackerIndex;
  if (defenderRemaining > attackerRemaining) {
    winnerIndex = defenderIndex;
  }
  const loserIndex = winnerIndex === attackerIndex ? defenderIndex : attackerIndex;
  const stolen = stealResources(winnerIndex, loserIndex);

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName: players[winnerIndex].name,
    winnerIndex,
    defenderIndex,
    attackerIndex,
    stolen
  };
}

function resolveMercenaryBattle(playerIndex, mercenary) {
  const player = players[playerIndex];
  if (!player || !mercenary) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, mercenary.strength);
  const attackerThreshold = Math.max(1, Math.round(initialAttArmy * 0.1));
  const defenderThreshold = Math.max(1, Math.round(initialDefArmy * 0.1));
  let defenderRemaining = initialDefArmy;
  let attackersUsed = 0;
  const availableAttackers = initialAttArmy;
  while (attackersUsed < availableAttackers && defenderRemaining > defenderThreshold) {
    const maxKillAllowed = Math.max(1, defenderRemaining - defenderThreshold);
    const kills = Math.min(Math.floor(Math.random() * 3) + 1, maxKillAllowed);
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - kills);
    attackersUsed += 1;
  }
  const attackerRemaining = Math.max(0, availableAttackers - attackersUsed);
  player.pocket.army = attackerRemaining;

  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Наёмники";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Наёмники";
    winnerIndex = null;
  }
  mercenary.strength = Math.max(0, defenderRemaining);
  updatePlayerResources(playerIndex);
  return {
    type: "mercenary",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex
  };
}

function resolveCastleBattle(attackerIndex, castleKey) {
  const attacker = players[attackerIndex];
  const stats = ensureCastleStats(castleKey);
  const defenderOwner = castleOwnersByKey[castleKey];
  const initialDefArmy = Math.max(0, stats.storageArmy || 0);
  const initialAttArmy = Math.max(0, attacker.pocket.army || 0);
  let defenderRemaining = initialDefArmy;
  let attackerRemaining = initialAttArmy;
  const defenderThreshold = initialDefArmy > 0 ? Math.ceil(initialDefArmy * 0.25) : 0;

  const attackerStrike = Math.max(0, attacker.attack || 0);
  if (attackerStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - attackerStrike);
  }

  while (attackerRemaining > 3 && defenderRemaining > defenderThreshold) {
    const defHit = Math.floor(Math.random() * 3) + 1;
    attackerRemaining = Math.max(0, attackerRemaining - defHit);
    if (attackerRemaining <= 3) break;
    const attHit = Math.floor(Math.random() * 3) + 1;
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - attHit);
  }

  let armorRemaining = stats.armorCurrent;
  let healthRemaining = stats.healthCurrent;
  const shouldFightArmor =
    (initialDefArmy === 0 || defenderRemaining <= defenderThreshold) &&
    attackerRemaining > 0 &&
    armorRemaining > 0;
  if (shouldFightArmor) {
    while (attackerRemaining > 0 && armorRemaining > 0) {
      const armorHit = Math.floor(Math.random() * 3) + 1;
      armorRemaining = Math.max(0, armorRemaining - armorHit);
      if (armorRemaining <= 0) break;
      const defHit = Math.floor(Math.random() * 3) + 1;
      attackerRemaining = Math.max(0, attackerRemaining - defHit);
    }
  }

  if (armorRemaining <= 0 && attackerRemaining > 0 && healthRemaining > 0) {
    const perUnit = 0.4 + Math.random() * 0.2;
    const damage = attackerRemaining * perUnit;
    healthRemaining = Math.max(0, Math.round((healthRemaining - damage) * 10) / 10);
  }

  attacker.pocket.army = Math.max(0, attackerRemaining);
  stats.storageArmy = Math.max(0, defenderRemaining);
  stats.armorCurrent = Math.max(0, armorRemaining);
  stats.healthCurrent = Math.max(0, healthRemaining);

  let winner = "Замок";
  let winnerIndex = null;
  if (stats.storageArmy <= 0 && stats.armorCurrent <= 0 && stats.healthCurrent <= 0) {
    winner = attacker.name;
    winnerIndex = attackerIndex;
  } else if (attackerRemaining <= 3) {
    winner = "Замок";
    winnerIndex = null;
  }

  updatePlayerResources(attackerIndex);
  return {
    type: "castle",
    attackerIndex,
    attackerName: attacker.name,
    defenderOwner,
    castleKey,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    armorRemaining: stats.armorCurrent,
    healthRemaining: stats.healthCurrent,
    winnerName: winner,
    winnerIndex
  };
}

function buildBattleSummaryLines(result) {
    if (result.type === "barbarian") {
      const rewardLine =
        result.winnerIndex === result.attackerIndex && result.influenceReward
          ? `Награда: +${result.influenceReward} влияние, +${result.goldReward} золота, +${result.resourceReward} ресурсов`
          : null;
      const penaltyLine =
        result.penaltyGold || result.penaltyResources
          ? `Проигравший потерял ${result.penaltyGold || 0} золота и ${result.penaltyResources || 0} ресурсов`
          : null;
      return [
        "<strong>ИТОГИ БОЯ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Варвары: Потеряли ${result.defenderLost} войск`,
        `Варвары: Изначально ${result.defenderInitial} войск`,
        " ",
        `Победитель : ${result.winnerName}`,
        rewardLine,
        penaltyLine
      ].filter(Boolean);
    }
    if (result.type === "troll") {
      return [
        "<strong>\u0411\u041e\u0419 \u0421 \u0422\u0420\u041e\u041b\u041b\u042f\u041c\u0418</strong>",
        `${result.attackerName}: \u041f\u043e\u0442\u0435\u0440\u044f\u043b ${result.attackerLost} \u0432\u043e\u0439\u0441\u043a`,
        `\u0422\u0440\u043e\u043b\u043b\u0438: \u041f\u043e\u0442\u0435\u0440\u044f\u043b\u0438 ${result.defenderLost} \u0432\u043e\u0439\u0441\u043a`,
        `\u0422\u0440\u043e\u043b\u043b\u0438: \u0418\u0437\u043d\u0430\u0447\u0430\u043b\u044c\u043d\u043e ${result.defenderInitial} \u0432\u043e\u0439\u0441\u043a`,
        "\u00A0",
        `\u041f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "dragon") {
      return [
        "<strong>БОЙ С ДРАКОНОМ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Дракон: Потерял ${result.defenderLost} войск`,
        `Дракон: Изначально ${result.defenderInitial} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "robber") {
      const penaltyLine =
        result.penaltyGold || result.penaltyResources
          ? `Проигравший потерял ${result.penaltyGold || 0} золота, ${result.penaltyResources || 0} ресурсов и влияние -${result.influenceLoss || 0}`
          : null;
      const rewardLine =
        result.goldReward || result.resourceReward
          ? `Награда: +${result.goldReward} золота, +${result.resourceReward} ресурсов`
          : null;
      return [
        "<strong>НА ВАС НАПАЛИ РАЗБОЙНИКИ</strong>",
        "<strong>ИТОГИ БОЯ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Разбойники: Потеряли ${result.defenderLost} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`,
        rewardLine,
        penaltyLine
      ].filter(Boolean);
    }
    if (result.type === "mercenary") {
      return [
        "<strong>БОЙ С НАЁМНИКАМИ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Наёмники: Потеряли ${result.defenderLost} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "castle") {
      return [
        "<strong>БОЙ ЗА ЗАМОК</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Гарнизон: Потерял ${result.defenderLost} войск`,
        `Броня замка: ${result.armorRemaining}`,
        `Здоровье замка: ${result.healthRemaining}`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    const lines = [];
    if (result.defenderAutoKilled > 0) {
      lines.push(`Обороняющийся сразу убил ${result.defenderAutoKilled} войск.`);
    }
    lines.push(
      `Игрок ${result.attackerIndex + 1}: Потерял ${result.attackerLost} войск`,
      `Игрок ${result.defenderIndex + 1}: Потерял ${result.defenderLost} войск`,
      "\u00A0",
      `Победитель : ${result.winnerName}`
    );
    const stolenParts = [];
    if (result.stolen) {
      if (result.stolen.gold) stolenParts.push(`${result.stolen.gold} золота`);
      if (result.stolen.army) stolenParts.push(`${result.stolen.army} войск`);
      if (result.stolen.resources) stolenParts.push(`${result.stolen.resources} ресурсов`);
    }
    if (stolenParts.length) {
      lines.push(`Победитель забрал ${stolenParts.join(", ")} из кармана проигравшего.`);
    }
    return lines;
  }

function showBattleModal(result) {
  if (!battleModal || !battleSummary) return;
  const lines = buildBattleSummaryLines(result);
  battleSummary.innerHTML = lines.map(line => `<p>${line}</p>`).join("");
  battleModal.style.display = "flex";
}

  function hideBattleModal() {
    if (battleModal) battleModal.style.display = "none";
  }

  battleClose.addEventListener("click", hideBattleModal);
  battleModal.addEventListener("click", (event) => {
    if (event.target === battleModal) {
      hideBattleModal();
    }
  });

function refreshCastleModal(key, playerIndex) {
  if (!castleModal) return;
  const stats = ensureCastleStats(key);
  const player = players[playerIndex];
  castleLevelValue.textContent = stats.level;
  castleArmorValue.textContent = `Броня: ${stats.armorCurrent}`;
  castleHealthValue.textContent = `Здоровье: ${stats.healthCurrent}`;
  const wallBadge = typeof castleWallBadge !== "undefined"
    ? castleWallBadge
    : document.getElementById("castleWallBadge");
  if (wallBadge) {
    wallBadge.style.display = "inline-flex";
    wallBadge.style.visibility = stats.wall ? "visible" : "hidden";
  }
  if (castleNextBonus) {
    const nextLevel = Math.min(3, stats.level + 1);
    if (stats.level >= 3) {
      castleNextBonus.textContent = "Следующий уровень: максимум";
    } else {
      const nextInfo = CASTLE_LEVELS[nextLevel] || CASTLE_LEVELS[stats.level];
      const curInfo = CASTLE_LEVELS[stats.level] || CASTLE_LEVELS[1];
      const armorDelta = Math.max(0, (nextInfo.armor || 0) - (curInfo.armor || 0));
      const healthDelta = Math.max(0, (nextInfo.health || 0) - (curInfo.health || 0));
      castleNextBonus.textContent = `Следующий уровень: +${armorDelta} брони, +${healthDelta} здоровья`;
    }
  }
  const playerResources = player ? player.resources.resources : 0;
  const upgradeCost = stats.level >= 2 ? 750 : 500;
  castleUpgradeBtn.disabled = stats.level >= 3 || playerResources < upgradeCost;
  if (castleUpgradeCostLabel) {
    castleUpgradeCostLabel.textContent = String(upgradeCost);
  }
    castleFeatureButtons.forEach(btn => {
      const feature = btn.dataset.castleFeature;
      const def = CASTLE_FEATURES[feature];
      if (!def) return;
      const purchased = stats[feature];
      btn.disabled = purchased || playerResources < (def?.cost || 0);
      const statusElem = castleFeatureStatusElems[feature];
      if (statusElem) {
        statusElem.textContent = purchased ? "Куплено" : "";
      }
    });
    if (castleWithdrawArmy) {
      const storage = stats.storageArmy || 0;
      castleWithdrawArmy.textContent = storage;
      if (castleWithdrawBtn) {
        castleWithdrawBtn.disabled = storage <= 0;
      }
      if (castleWithdrawInput) {
        castleWithdrawInput.value = "0";
        castleWithdrawInput.max = storage;
      }
    }
    if (castleDepositInput && castleDepositBtn) {
      const pocketArmy = player ? player.pocket.army : 0;
      castleDepositInput.value = "0";
      castleDepositInput.max = pocketArmy;
      castleDepositBtn.disabled = pocketArmy <= 0;
    }
    if (castleStorageDisplay) {
      castleStorageDisplay.textContent = stats.storageArmy || 0;
    }
  }

  function showCastleModal(key, playerIndex) {
    if (!castleModal) return;
    castleModalKey = key;
    castleModalPlayerIndex = playerIndex;
    refreshCastleModal(key, playerIndex);
    castleModal.style.display = "flex";
  }

  function hideCastleModal() {
    if (castleModal) castleModal.style.display = "none";
    castleModalKey = null;
    castleModalPlayerIndex = null;
  }

function buyCastleFeature(featureKey) {
  if (!castleModalKey || castleModalPlayerIndex === null) return;
  const stats = ensureCastleStats(castleModalKey);
  const player = players[castleModalPlayerIndex];
  const featureDef = CASTLE_FEATURES[featureKey];
  if (!featureDef || stats[featureKey]) return;
  if (!player || player.resources.resources < featureDef.cost) return;
  player.resources.resources -= featureDef.cost;
  stats[featureKey] = true;
  ensureCastleStats(castleModalKey);
  updatePlayerResources(castleModalPlayerIndex);
  updateCastleBadge(castleModalKey);
  applyCastleFeatureSpecialCell(castleModalKey, featureKey);
  showPickupToast(`Покупка: ${featureDef.label}`);
  recalcPlayerResourceIncome(castleModalPlayerIndex);
  refreshCastleModal(castleModalKey, castleModalPlayerIndex);
  const btn = castleFeatureButtons.find(b => b.dataset.castleFeature === featureKey);
  flashPrice(btn, featureDef.cost, "assets/icons/icon-resources.png", "Ресурсы");
}

  const CASTLE_FEATURE_SPECIALS = {
    11: {
      lumber: { x: 0, y: 22, label: "ЛЕС", extraClass: "forest" }, // E661
      mine: { x: 0, y: 24, label: "ШАХ", extraClass: "resource" }, // E721
      clay: { x: 2, y: 24, label: "ГЛИН", extraClass: "resource" } // E723
    },
    17: {
      lumber: { x: 29, y: 2, label: "ЛЕС", extraClass: "forest" }, // E90
      mine: { x: 29, y: 0, label: "ШАХ", extraClass: "resource" }, // E30
      clay: { x: 27, y: 0, label: "ГЛИН", extraClass: "resource" } // E28
    }
  };

function applyCastleFeatureSpecialCell(castleKey, featureKey) {
  const node = nodeByPos[castleKey];
  if (!node || node.type !== "castle") return;
  const cfg = CASTLE_FEATURE_SPECIALS[node.id]?.[featureKey];
  if (!cfg) return;
  if (typeof setSpecialCell !== "function") return;
  const placed = setSpecialCell(cfg.x, cfg.y, cfg.label, cfg.extraClass, castleModalPlayerIndex, featureKey, castleKey);
  if (!placed) return;
  applySpecialFeatureIcon(cfg.x, cfg.y, featureKey);
}

function applySpecialFeatureIcon(x, y, featureKey) {
  const cell = grid[`${x},${y}`];
  const iconByFeature = {
    lumber: { file: "lumber.png", alt: "Лесопилка" },
    mine: { file: "mine.png", alt: "Шахта" },
    clay: { file: "clay.png", alt: "Глиняный карьер" }
  };
  const iconDef = iconByFeature[featureKey];
  if (cell && iconDef && typeof setCellIcon === "function") {
    cell.textContent = "";
    setCellIcon(cell, iconDef.file, iconDef.alt);
  }
}

  castleFeatureButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const feature = btn.dataset.castleFeature;
      buyCastleFeature(feature);
    });
  });

  if (castleDepositBtn) {
    castleDepositBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      const stats = ensureCastleStats(castleModalKey);
      let amount = 0;
      if (castleDepositInput) {
        amount = Math.floor(Math.max(0, Number(castleDepositInput.value) || 0));
      }
      const available = player ? player.pocket.army : 0;
      amount = Math.min(amount, available);
      if (amount <= 0 || !player) return;
      player.pocket.army -= amount;
      stats.storageArmy = (stats.storageArmy || 0) + amount;
      updatePlayerResources(castleModalPlayerIndex);
      recalcPlayerResourceIncome(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast(`В замок: +${amount} войск`);
    });
  }
  if (castleWithdrawBtn) {
    castleWithdrawBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      const stats = ensureCastleStats(castleModalKey);
      const available = stats.storageArmy || 0;
      let amount = 0;
      if (castleWithdrawInput) {
        amount = Math.floor(Math.max(0, Number(castleWithdrawInput.value) || 0));
      }
      amount = Math.min(amount, available);
      if (amount <= 0 || !player) return;
      stats.storageArmy = available - amount;
      player.pocket.army += amount;
      updatePlayerResources(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast(`В карман: +${amount} войск`);
    });
  }

  castleUpgradeBtn.addEventListener("click", () => {
    if (!castleModalKey || castleModalPlayerIndex === null) return;
    const stats = castleStatsByKey[castleModalKey];
    const player = players[castleModalPlayerIndex];
    const upgradeCost = stats && stats.level >= 2 ? 750 : 500;
    if (!stats || stats.level >= 3 || player.resources.resources < upgradeCost) return;
    player.resources.resources -= upgradeCost;
    stats.level += 1;
    ensureCastleStats(castleModalKey);
    updatePlayerResources(castleModalPlayerIndex);
    updateCastleBadge(castleModalKey);
    refreshCastleModal(castleModalKey, castleModalPlayerIndex);
    recalcPlayerResourceIncome(castleModalPlayerIndex);
    flashPrice(castleUpgradeBtn, upgradeCost, "assets/icons/icon-resources.png", "Ресурсы");
  });

  castleModalClose.addEventListener("click", hideCastleModal);
  castleModal.addEventListener("click", (event) => {
    if (event.target === castleModal) {

      hideCastleModal();
    }
  });

function updatePawn(player, index) {
  const pawn = pawns[index];
  const pawnSize = Math.max(16, Math.round(cellSize * 0.7));
  pawn.style.width = pawnSize + "px";
  pawn.style.height = pawnSize + "px";
  pawn.style.borderWidth = Math.max(2, Math.round(cellSize * 0.07)) + "px";
  pawn.style.fontSize = Math.max(12, Math.round(cellSize * 0.38)) + "px";
  const centerX = player.x * cellSize + cellSize / 2;
  const centerY = player.y * cellSize + cellSize / 2;
  pawn.style.left = centerX + "px";
  pawn.style.top  = centerY + "px";
  pawn.style.transform = "translate(-50%, -50%)";
  pawn.style.zIndex = 10 + index;
}
function updatePawns() {
  players.forEach(updatePawn);
}
updatePawns();

let currentPlayerIndex = 0;
let movesRemaining = 0;
let lastRoll = null;
let lastRollText = "-";
let lastDie1 = null;
let lastDie2 = null;
let extraTurnPending = false;
let extraTurnReason = null;
let justRolledDouble = false;
let robberAmbushThisSession = false;
let reachableKeys = new Set();
let autoRollTimer = null;
let doubleSound = null;
let audioUnlocked = false;
let testModeEnabled = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (!doubleSound) {
    doubleSound = document.getElementById("doubleSound") || new Audio("assets/sfx/double.mp3");
  }
  doubleSound.play().then(() => {
    doubleSound.pause();
    doubleSound.currentTime = 0;
  }).catch(() => {});
}
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

function clearReachable() {
  reachableKeys.forEach(key => {
    const cell = grid[key];
    if (cell) cell.classList.remove("reachable");
  });
  reachableKeys.clear();
}

const MOVES_DIRS = [
  {dx: 1, dy: 0},
  {dx: -1, dy: 0},
  {dx: 0, dy: 1},
  {dx: 0, dy: -1}
];

function showReachable() {
  clearReachable();
  if (movesRemaining <= 0) return;
  const currentPlayer = players[currentPlayerIndex];
  const queue = [{x: currentPlayer.x, y: currentPlayer.y, steps: 0}];
  const visited = new Set([`${currentPlayer.x},${currentPlayer.y}`]);

  while (queue.length) {
    const {x, y, steps} = queue.shift();
    const key = `${x},${y}`;
    const isGuardCell = guardKey && key === guardKey;
    if (steps > 0) {
      const cell = grid[key];
      if (cell) {
        cell.classList.add("reachable");
        reachableKeys.add(key);
      }
    }
    if (steps === movesRemaining) continue;
    const player = players[currentPlayerIndex];
    const canAttemptGuard = guardAccess[currentPlayerIndex];
    if (isGuardCell && !canAttemptGuard) continue;
    for (const {dx, dy} of MOVES_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const node = nodeByPos[key];
      if (node && node.id === 15 && player.resources.influence < 500) continue;
      if (blockedCellKeys.has(key)) continue;
      visited.add(key);
      queue.push({x: nx, y: ny, steps: steps + 1});
    }
  }
}

function finalizeMove(gridX, gridY) {
  const key = `${gridX},${gridY}`;
  const currentPlayer = players[currentPlayerIndex];
  currentPlayer.x = gridX;
  currentPlayer.y = gridY;
  movesRemaining = 0;
  updatePawns();

  const castleKey = getCastleBaseKeyForPos(gridX, gridY) || key;
  const node = nodeByPos[castleKey];
  if (node && node.type === "castle") {
    const previousOwner = castleOwnersByKey[castleKey];
    if (typeof previousOwner === "number" && previousOwner !== currentPlayerIndex) {
      const battleResult = resolveCastleBattle(currentPlayerIndex, castleKey);
      showBattleModal(battleResult);
      if (battleResult.healthRemaining <= 0) {
        showGameOver(currentPlayerIndex);
      }
      if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
        const ownedKey = getFirstOwnedCastleKey(currentPlayerIndex);
        if (ownedKey && ownedKey !== castleKey) {
          showPickupToast("Нельзя захватить второй замок.");
          castleOwnersByKey[castleKey] = undefined;
          node.elem.classList.remove("owned");
          node.elem.style.background = "";
          node.elem.style.borderColor = "";
          updateCastleBadge(castleKey);
        } else {
          castleOwnersByKey[castleKey] = currentPlayerIndex;
          node.elem.classList.add("owned");
          node.elem.style.background = currentPlayer.color;
          node.elem.style.borderColor = currentPlayer.color;
          recalcPlayerResourceIncome(currentPlayerIndex);
        }
      }
      if (typeof previousOwner === "number") {
        recalcPlayerResourceIncome(previousOwner);
      }
      endTurn();
      return;
    }
    if (previousOwner !== currentPlayerIndex) {
      const ownedKey = getFirstOwnedCastleKey(currentPlayerIndex);
      if (ownedKey && ownedKey !== castleKey) {
        showPickupToast("Нельзя захватить второй замок.");
      } else {
        castleOwnersByKey[castleKey] = currentPlayerIndex;
        node.elem.classList.add("owned");
        node.elem.style.background = currentPlayer.color;
        node.elem.style.borderColor = currentPlayer.color;
        if (typeof previousOwner === "number") {
          recalcPlayerResourceIncome(previousOwner);
        }
      }
    }
    if (castleOwnersByKey[castleKey] === currentPlayerIndex) {
      depositPocketCurrencyToPlayer(currentPlayerIndex);
      recalcPlayerResourceIncome(currentPlayerIndex);
      showCastleModal(castleKey, currentPlayerIndex);
    }
  }
  const dragonKey = getDragonBaseKeyForPos(gridX, gridY);
  if (dragonKey) {
    if (!currentPlayer.hasSword) {
      showPickupToast("Без меча героя нельзя вступить в бой с драконом.");
      endTurn();
      return;
    }
    const battleResult = resolveDragonBattle(currentPlayerIndex, 75);
    showBattleModal(battleResult);
    if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
      showGameOver(currentPlayerIndex);
    }
    endTurn();
    return;
  }
  const barbarianCell = barbarianCells.find(cell => cell.key === key);
  if (barbarianCell) {
    const battleResult = resolveBarbarianBattle(currentPlayerIndex, barbarianCell);
    if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
      currentPlayer.barbarianKills = (currentPlayer.barbarianKills || 0) + 1;
    }
    removeBarbarianCell(key);
    scheduleBarbarianRespawn();
    showBattleModal(battleResult);
    endTurn();
    return;
  }
  const trollHere = typeof isTrollAtKey === "function" && isTrollAtKey(key);
  if (trollHere) {
    const trollArmy = Math.floor(Math.random() * 21) + 30;
    const battleResult = resolveTrollBattle(currentPlayerIndex, trollArmy);
    showBattleModal(battleResult);
    endTurn();
    return;
  }
  const specialEntry = specialByPos[key];
  if (specialEntry && specialEntry.disabled && specialEntry.ownerIndex === currentPlayerIndex) {
    openRepairModal({ ...specialEntry, key }, currentPlayerIndex);
  }
  if (specialEntry && specialEntry.type === "troll-cave") {
    const trollInCave = typeof isTrollInCaveAtKey === "function" && isTrollInCaveAtKey(key);
    if (!trollInCave) {
      const caveIndex = typeof getTrollCaveIndexByKey === "function" ? getTrollCaveIndexByKey(key) : -1;
      const alreadyLooted = caveIndex >= 0 && TROLL_CAVES && TROLL_CAVES[caveIndex]?.looted;
      if (alreadyLooted) {
        openTrollCaveModal("\u041f\u0435\u0449\u0435\u0440\u0430 \u043f\u0443\u0441\u0442\u0430.");
      } else {
        const lootText = rollTrollCaveLoot(currentPlayerIndex);
        if (caveIndex >= 0 && typeof markTrollCaveLooted === "function") {
          markTrollCaveLooted(caveIndex, true);
        }
        if (lootText) {
          openTrollCaveModal(lootText);
        }
      }
      endTurn();
      return;
    }
  }
  if (specialEntry && specialEntry.type === "mage") {
    const mageSlot = getMageSlotById(specialEntry.mageId);
    if (mageSlot && mageSlot.active) {
      openMageModal(mageSlot, currentPlayerIndex);
    }
  }
  if (node && node.id === 2) {
    openBarracks(currentPlayerIndex);
  }
  if (node && node.id === 9) {
    openLavka(currentPlayerIndex);
  }
  if (node && node.id === 19) {
    openWorkshop(currentPlayerIndex);
  }
  if (node && node.id === 15) {
    openCity(currentPlayerIndex);
  }
  if (node && node.id === 6) {
    openHire(currentPlayerIndex);
  }

  if (stoneByPos[key]) {
    openStoneModal(key, currentPlayerIndex);
  }
  if (rainbowByPos[key]) {
    currentPlayer.rainbowStoneCount = (currentPlayer.rainbowStoneCount || 0) + 1;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast("Радужный камень добавлен в инвентарь.");
    clearRainbowStone(key);
  }
  if (masterActive && key === MASTER_CELL.key) {
    openMasterModal(currentPlayerIndex);
  }

  const resourceNode = resourceByPos[key];
  if (resourceNode) {
    const {type, x, y} = resourceNode;
    let amount = Math.floor(Math.random() * (type.max - type.min + 1)) + type.min;
    if (turnCounter >= 150) {
      amount = Math.floor(amount * 1.75);
    }
    currentPlayer.pocket[type.key] += amount;
    updatePlayerResources(currentPlayerIndex);
    delete resourceByPos[key];
    setCellToInactive(x, y);
    const label = type.key === "gold" ? "золота" : type.key === "army" ? "войск" : "ресурсов";
    showPickupToast(`В карман: +${amount} ${label}`);
  }

  if (treasure && treasure.key === key) {
    const goldReward = Math.floor(Math.random() * (1200 - 700 + 1)) + 700;
    currentPlayer.pocket.gold += goldReward;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast(`Сокровище: +${goldReward} золота в карман`);
    clearTreasure();
  }
  if (flowerArtifact && flowerArtifact.key === key) {
    currentPlayer.flowerCount = (currentPlayer.flowerCount || 0) + 1;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast("Таинственный цветок добавлен в инвентарь.");
    clearFlower();
  }
  endTurn();
}

function updateTurnUI() {
  const currentPlayer = players[currentPlayerIndex];
  if (turnInfo) {
    turnInfo.textContent = "";
    turnInfo.style.display = "none";
  }
  if (movesInfo) {
    movesInfo.textContent = "";
    movesInfo.style.display = "none";
  }
  if (rollInfo) {
    if (lastDie1 === null || lastDie2 === null) {
      rollInfo.innerHTML = 'БРОСОК <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
      rollInfo.classList.add("rolling");
    } else {
      rollInfo.textContent = `БРОСОК ${lastDie1} + ${lastDie2}`;
      rollInfo.classList.remove("rolling");
    }
  }
  if (rollBtn) {
    rollBtn.disabled = true;
    rollBtn.style.display = "none";
  }
  doubleMsg.style.display = justRolledDouble ? "block" : "none";
  if (currentPlayerName) {
    currentPlayerName.textContent = `ИГРОК ${currentPlayer.id + 1}`;
    currentPlayerName.style.color = currentPlayer.color;
  }
  playerPanels.forEach((panel, index) => {
    panel.classList.toggle("active", index === currentPlayerIndex);
  });
  pawns.forEach((pawn, index) => {
    pawn.classList.toggle("active-turn", index === currentPlayerIndex);
  });
  if (turnCounterDisplay) {
    turnCounterDisplay.textContent = `СЧЁТЧИК ХОДОВ: ${turnCounter}`;
  }
  if (devTurnInput) {
    devTurnInput.value = String(turnCounter);
  }
  updateStatusPanel();
}

function endTurn() {
  collectCastleIncomes(currentPlayerIndex);
  turnCounter += 1;
  handleMageCellTimers();
  if (turnCounter === 150 && !worldDangerShown) {
    showWorldDangerModal();
    worldDangerShown = true;
  }
  if (!barbarianPhaseStarted && turnCounter >= BARBARIAN_START_TURN) {
    spawnInitialBarbarianCells();
    barbarianPhaseStarted = true;
  }
  handleBarbarianRespawns();
  advanceMercenaries();
  movesRemaining = 0;
  lastRoll = null;
  lastRollText = "-";
  clearReachable();

  turnsUntilResources = Math.max(0, turnsUntilResources - 1);
  if (turnsUntilResources === 0) {
    spawnResources();
  }

  let spawnedTreasureThisTurn = false;
  turnsUntilTreasure -= 1;
  if (turnsUntilTreasure <= 0) {
    spawnTreasure();
    turnsUntilTreasure = TREASURE_INTERVAL;
    spawnedTreasureThisTurn = true;
  }
  if (treasure && !spawnedTreasureThisTurn) {
    treasureTurnsRemaining -= 1;
    if (treasureTurnsRemaining <= 0) {
      clearTreasure();
    }
  }
  handleFlowerTimers();
  handleStoneTimers();
  handleStoneSpawns();
  handleRainbowTimers();
  handleRainbowSpawns();
  handleMasterCell();
  if (typeof handleTrollsTurn === "function") {
    handleTrollsTurn();
  }

  const keepCurrentPlayer = extraTurnPending;
  extraTurnPending = false;
  if (keepCurrentPlayer) {
    justRolledDouble = extraTurnReason === "double";
  } else {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    justRolledDouble = false;
    robberAmbushThisSession = false;
  }
  extraTurnReason = null;

  updateTurnUI();
  scheduleAutoRoll();
}

function scheduleAutoRoll() {
  if (autoRollTimer) {
    clearTimeout(autoRollTimer);
  }
  if (gameEnded) return;
  if (movesRemaining > 0) return;
  if (rollInfo) {
    rollInfo.innerHTML = 'БРОСОК <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
    rollInfo.classList.add("rolling");
  }
  lastDie1 = null;
  lastDie2 = null;
  autoRollTimer = setTimeout(() => {
    autoRollTimer = null;
    tryAutoRoll();
  }, 1500);
}

function tryAutoRoll() {
  if (gameEnded) return;
  if (movesRemaining > 0) return;
  if (processRobberAmbushChance()) return;
  doRoll();
}

function doRoll() {
  const die1 = testModeEnabled ? 12 : Math.floor(Math.random() * 6) + 1;
  const die2 = testModeEnabled ? 13 : Math.floor(Math.random() * 6) + 1;
  lastDie1 = die1;
  lastDie2 = die2;
  const currentPlayer = players[currentPlayerIndex];
  if (currentPlayer && currentPlayer.stunnedTurnsRemaining > 0) {
    currentPlayer.stunnedTurnsRemaining = Math.max(0, currentPlayer.stunnedTurnsRemaining - 1);
    showPickupToast("Тролли оглушили вас — пропуск хода.");
    movesRemaining = 0;
    lastRoll = null;
    lastRollText = "-";
    clearReachable();
    extraTurnPending = false;
    extraTurnReason = null;
    justRolledDouble = false;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateTurnUI();
    scheduleAutoRoll();
    return;
  }
  const stoneBonusActive = currentPlayer && currentPlayer.stoneBonusRollsRemaining > 0;
  const bonus = stoneBonusActive ? 1 : 0;
  const roll = die1 + die2 + bonus;
  lastRoll = roll;
  lastRollText = bonus > 0 ? `${die1} + ${die2} + 1 = ${roll}` : `${die1} + ${die2} = ${roll}`;
  if (stoneBonusActive && currentPlayer) {
    currentPlayer.stoneBonusRollsRemaining = Math.max(0, currentPlayer.stoneBonusRollsRemaining - 1);
  }
  const penalty = currentPlayer && currentPlayer.slowTurnsRemaining > 0 ? MAGE_SLOW_PENALTY : 0;
  let effectiveMoves = roll;
  if (penalty > 0 && currentPlayer) {
    effectiveMoves = Math.max(0, roll - penalty);
    currentPlayer.slowTurnsRemaining = Math.max(0, currentPlayer.slowTurnsRemaining - 1);
  }
  const rolledDouble = die1 === die2;
  justRolledDouble = false;
  let extraTurn = stoneBonusActive || rolledDouble;
  extraTurnReason = stoneBonusActive ? "stone" : (rolledDouble ? "double" : null);
  if (rolledDouble) {
    robberAmbushThisSession = true;
  }
  if (!stoneBonusActive && currentPlayer && currentPlayer.noDoubleTurnsRemaining > 0 && rolledDouble) {
    extraTurn = false;
    extraTurnReason = null;
    currentPlayer.noDoubleTurnsRemaining = Math.max(0, currentPlayer.noDoubleTurnsRemaining - 1);
  }
  extraTurnPending = extraTurn;
  if (rolledDouble) {
    showDoubleToast();
  }
  if (effectiveMoves <= 0) {
    movesRemaining = 0;
    showPickupToast("Маг замедлил вас — ход пропущен.");
    endTurn();
    return;
  }
  movesRemaining = effectiveMoves;
  showReachable();
  updateTurnUI();
}

if (rollBtn) {
  rollBtn.addEventListener("click", () => {
    tryAutoRoll();
  });
}
if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    window.location.reload();
  });
}
function relayout() {
  const bodyPadding = 16;
  const gap = 32;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const leftWidth = playerSlotLeft?.offsetWidth || 260;
  const rightWidth = playerSlotRight?.offsetWidth || 260;
  let controlsBeside = true;
  if (playerSlotLeft && playerSlotRight) {
    const leftRect = playerSlotLeft.getBoundingClientRect();
    const rightRect = playerSlotRight.getBoundingClientRect();
    controlsBeside = Math.abs(leftRect.top - rightRect.top) < Math.max(leftRect.height, rightRect.height) * 0.5;
  }
  const controlsWidth = controlsBeside ? leftWidth + rightWidth : leftWidth;
  const gapCount = controlsBeside ? 2 : 1;
  const availableW = Math.max(0, viewportW - bodyPadding * 2 - controlsWidth - gap * gapCount);
  const summaryHeight = summaryBar ? summaryBar.getBoundingClientRect().height : 0;
  const availableH = Math.max(0, viewportH - bodyPadding * 2 - summaryHeight - gap * 2);

  const sizeByWidth = availableW > 0 ? availableW / COLS : MIN_CELL;
  const sizeByHeight = availableH > 0 ? availableH / ROWS : MIN_CELL;
  const nextSize = Math.floor(Math.min(sizeByWidth, sizeByHeight, MAX_CELL));
  const clamped = Math.max(MIN_CELL, nextSize);

  applyCellSize(clamped);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[`${x},${y}`];
      cell.style.left = (x * cellSize) + "px";
      cell.style.top  = (y * cellSize) + "px";
    }
  }

  updatePawns();
}

applyCellSize(BASE_CELL);
relayout();
updateTurnUI();
window.addEventListener("resize", relayout);
scheduleAutoRoll();







