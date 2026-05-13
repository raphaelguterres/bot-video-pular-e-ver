const BOT_STATES = Object.freeze({
  IDLE: "idle",
  CONNECTING: "connecting",
  OPENING: "opening",
  RUNNING: "running",
  WAITING_VIDEO: "waiting_video",
  READING: "reading",
  ADVANCING: "advancing",
  ASSESSMENT: "assessment",
  FINISHED: "finished",
  ERROR: "error",
  STOPPED: "stopped",
});

const TERMINAL_STATES = new Set([
  BOT_STATES.ASSESSMENT,
  BOT_STATES.FINISHED,
  BOT_STATES.ERROR,
  BOT_STATES.STOPPED,
]);

const ALLOWED_TRANSITIONS = {
  [BOT_STATES.IDLE]: [
    BOT_STATES.CONNECTING,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.CONNECTING]: [
    BOT_STATES.OPENING,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.OPENING]: [
    BOT_STATES.RUNNING,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.RUNNING]: [
    BOT_STATES.WAITING_VIDEO,
    BOT_STATES.READING,
    BOT_STATES.ADVANCING,
    BOT_STATES.ASSESSMENT,
    BOT_STATES.FINISHED,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.WAITING_VIDEO]: [
    BOT_STATES.RUNNING,
    BOT_STATES.READING,
    BOT_STATES.ADVANCING,
    BOT_STATES.ASSESSMENT,
    BOT_STATES.FINISHED,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.READING]: [
    BOT_STATES.RUNNING,
    BOT_STATES.ADVANCING,
    BOT_STATES.ASSESSMENT,
    BOT_STATES.FINISHED,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
  [BOT_STATES.ADVANCING]: [
    BOT_STATES.RUNNING,
    BOT_STATES.WAITING_VIDEO,
    BOT_STATES.READING,
    BOT_STATES.ASSESSMENT,
    BOT_STATES.FINISHED,
    BOT_STATES.ERROR,
    BOT_STATES.STOPPED,
  ],
};

class BotStateMachine {
  constructor(initialState = BOT_STATES.IDLE) {
    this.state = initialState;
    this.history = [];
  }

  reset() {
    this.state = BOT_STATES.IDLE;
    this.history = [];
  }

  canTransition(nextState) {
    if (!Object.values(BOT_STATES).includes(nextState)) {
      return false;
    }

    if (nextState === this.state) {
      return true;
    }

    if (nextState === BOT_STATES.ERROR || nextState === BOT_STATES.STOPPED) {
      return true;
    }

    if (TERMINAL_STATES.has(this.state)) {
      return nextState === BOT_STATES.CONNECTING;
    }

    return (ALLOWED_TRANSITIONS[this.state] || []).includes(nextState);
  }

  transition(nextState, context = {}) {
    if (!this.canTransition(nextState)) {
      const error = new Error(`Transicao invalida: ${this.state} -> ${nextState}`);
      error.context = { from: this.state, to: nextState, ...context };
      throw error;
    }

    const previousState = this.state;
    this.state = nextState;
    this.history.push({
      from: previousState,
      to: nextState,
      at: new Date().toISOString(),
      context,
    });
    return this.state;
  }
}

module.exports = {
  BOT_STATES,
  BotStateMachine,
};
