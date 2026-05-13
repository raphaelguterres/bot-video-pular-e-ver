const test = require("node:test");
const assert = require("node:assert/strict");
const { BOT_STATES, BotStateMachine } = require("../src/core/bot-state");

test("BotStateMachine permite fluxo principal", () => {
  const machine = new BotStateMachine();

  machine.transition(BOT_STATES.CONNECTING);
  machine.transition(BOT_STATES.OPENING);
  machine.transition(BOT_STATES.RUNNING);
  machine.transition(BOT_STATES.ADVANCING);
  machine.transition(BOT_STATES.FINISHED);

  assert.equal(machine.state, BOT_STATES.FINISHED);
  assert.equal(machine.history.length, 5);
});

test("BotStateMachine rejeita estado desconhecido", () => {
  const machine = new BotStateMachine();

  assert.throws(() => machine.transition("unknown"), /Transicao invalida/);
});
