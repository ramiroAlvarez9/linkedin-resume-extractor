import { EventEmitter } from "events";

class NodeEventEmitter {
  private static instance: NodeEventEmitter;
  public emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
  }

  public static getInstance(): NodeEventEmitter {
    if (!NodeEventEmitter.instance) {
      NodeEventEmitter.instance = new NodeEventEmitter();
    }
    return NodeEventEmitter.instance;
  }
}

export const nodeEventEmitter = NodeEventEmitter.getInstance().emitter;
