// ────────────────────────────────────────
//   ВАЖНЫЕ ТОЧКИ (те, что были в твоём скриншоте)
// ────────────────────────────────────────
const importantNodes = [
  {id:  2, type: "barracks", label: "КАЗ", x: 24, y: 19},
  {id: 17, type: "castle",   x: 26, y:  4},

  {id: 15, type: "city",     label: "КОР", x: 29, y: 24},

  {id:  6, type: "hire",     label: "НАЕМ", x: 15, y: 12},

  {id:  9, type: "barracks", label: "ЛАВ", x: 21, y: 21},
  {id: 19, type: "barracks", label: "МАС", x: 24, y: 23},

  {id: 10, type: "dragon",   x:  4, y:  3},
  {id: 11, type: "castle",   x:  4, y: 20},
  {id: 20, type: "guard",    label: "СТ", x: 22, y: 17},
];
const guardNode = importantNodes.find(node => node.type === "guard");
const guardKey = guardNode ? `${guardNode.x},${guardNode.y}` : null;
const guardApproachKeys = new Set([
  `${22},${16}`, // E503
  `${21},${16}`, // E502
  `${21},${17}`  // E532
]);
