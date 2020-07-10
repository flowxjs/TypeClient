
export enum types {
  STATIC,
  PARAM,
  MATCH_ALL,
  REGEX,
  // It's used for a parameter, that is followed by another parameter in the same part
  MULTI_PARAM
}

export interface TypeHandler {
  handler: Function,
  params: string[],
  paramsLength: number
}

interface TypeHandlerMethods {
  GET?: TypeHandler,
}

interface NodeChildren {
  [label: string]: Node,
}

interface NodeArguments {
  prefix?: string,
  children?: NodeChildren,
  kind?: number,
  handlers?: TypeHandlerMethods,
  regex?: RegExp | null,
}

export const Handlers = buildHandlers();

export default class Node {
  public prefix: string;
  public label: string;
  public children: NodeChildren;
  public numberOfChildren: number;
  public kind: number;
  public regex: RegExp | null;
  public wildcardChild: Node | null;
  public parametricBrother: Node | null;
  public handlers: TypeHandlerMethods;

  constructor(options: NodeArguments = {}) {
    this.prefix = options.prefix || '/';
    this.label = this.prefix[0];
    this.children = options.children || {};
    this.numberOfChildren = Object.keys(this.children).length;
    this.kind = options.kind || this.types.STATIC;
    this.handlers = new Handlers(options.handlers);
    this.regex = options.regex || null;
    this.wildcardChild = null;
    this.parametricBrother = null;
  }

  get types() {
    return types;
  }

  getLabel() {
    return this.prefix[0];
  }

  addChild(node: Node): Node {
    let label: string = '';

    switch (node.kind) {
      case this.types.STATIC: label = node.getLabel(); break;
      case this.types.PARAM:
      case this.types.REGEX:
      case this.types.MULTI_PARAM: label = ':'; break;
      case this.types.MATCH_ALL: this.wildcardChild = node; label = '*'; break;
      default: throw new Error(`Unknown node kind: ${node.kind}`);
    }

    if (this.children[label] !== undefined) {
      throw new Error(`There is already a child with label '${label}'`);
    }

    this.children[label] = node;
    this.numberOfChildren = Object.keys(this.children).length;

    const labels: Array<string> = Object.keys(this.children);
    let parametricBrother: Node | null = this.parametricBrother;
    for (let i = 0; i < labels.length; i++) {
      const child: Node = this.children[labels[i]];
      if (child.label === ':') {
        parametricBrother = child;
        break;
      }
    }

    const iterate = (node: Node | null | undefined) => {
      if (!node) return;
      if (node.kind !== this.types.STATIC) return;
      if (node !== this) {
        node.parametricBrother = parametricBrother || node.parametricBrother;
      }
      const labels: Array<string> = Object.keys(node.children);
      for (let i = 0; i < labels.length; i++) {
        iterate(node.children[labels[i]]);
      }
    }

    iterate(this);

    return this;
  }

  reset(prefix: string): Node {
    this.prefix = prefix;
    this.children = {};
    this.kind = this.types.STATIC;
    this.handlers = new Handlers();
    this.numberOfChildren = 0;
    this.regex = null;
    this.wildcardChild = null;
    return this;
  }

  findByLabel(path: string): Node | undefined {
    return this.children[path[0]];
  }

  findChild(path: string): Node | null {
    const method = 'GET';
    let child = this.findByLabel(path);
    if (child !== undefined && (child.numberOfChildren > 0 || child.handlers[method] !== null)) {
      if (path.slice(0, child.prefix.length) === child.prefix) return child;
    }
    child = this.children[':'] || this.children['*']
    if (child !== undefined && (child.numberOfChildren > 0 || child.handlers[method] !== null)) return child;
    return null;
  }

  setHandler(handler: Function, params: string[]) {
    if (!handler) return;
    const method = 'GET';
    if (this.handlers[method] === undefined) throw new Error(`There is already an handler with method '${method}'`);
    this.handlers[method] = {
      handler: handler,
      params: params,
      paramsLength: params.length
    }
  }

  getHandler() {
    return this.handlers['GET'];
  }
}

function buildHandlers () {
  return class NodeHelper {

    public GET: TypeHandler;

    constructor(handlers?: TypeHandlerMethods) {
      handlers = handlers || {};
      this['GET'] = handlers['GET'] || null;
    }
  }
}