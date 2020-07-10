import { decodeURIComponent as fastDecode} from './decode';
import Node, { types, Handlers } from './node';
const NODE_TYPES = types;
const FULL_PATH_REGEXP = /^https?:\/\/.*\//;

type IRoutesType = {
  method: 'GET',
  path: string,
  opts: object,
  handler: Function,
}

export interface RouterArguments {
  caseSensitive?: boolean,
  ignoreTrailingSlash?: boolean,
  maxParamLength?: number,
}

export class Router {
  private caseSensitive: boolean;
  private ignoreTrailingSlash: boolean;
  private maxParamLength: number;
  private tree: Node;
  private routes: IRoutesType[];

  constructor(opts: RouterArguments = {}) {
    this.caseSensitive = opts.caseSensitive === undefined ? true : opts.caseSensitive;
    this.ignoreTrailingSlash = opts.ignoreTrailingSlash || false;
    this.maxParamLength = opts.maxParamLength || 100;
    this.tree = new Node();
    this.routes = [];
  }

  on(
    path: string, 
    opts: object | Function, 
    handler?: Function
  ) {
    if (typeof opts === 'function') {
      handler = opts;
      opts = {};
    }

    if (typeof path !== 'string') throw new Error('Path should be a string');
    if (path.length === 0) throw new Error('The path could not be empty');
    if (path[0] !== '/' && path[0] !== '*') throw new Error('The first character of a path should be `/` or `*`');
    if (typeof handler !== 'function') throw new Error('Handler should be a function');

    this._on(path, opts, handler);

    if (this.ignoreTrailingSlash && path !== '/' && !path.endsWith('*')) {
      if (path.endsWith('/')) {
        this._on(path.slice(0, -1), opts, handler);
      } else {
        this._on(path + '/', opts, handler);
      }
    }
  }

  private _on(
    path: string, 
    opts: object | Function, 
    handler: Function
  ) {
    const params = [];
    let j = 0;

    this.routes.push({
      method: 'GET',
      path: path,
      opts: opts,
      handler: handler
    });

    for (let i = 0, len = path.length; i < len; i++) {
      // search for parametric or wildcard routes
      // parametric route
      if (path.charCodeAt(i) === 58) {
        let nodeType = NODE_TYPES.PARAM;
        j = i + 1;
        let staticPart = path.slice(0, i);

        if (this.caseSensitive === false) {
          staticPart = staticPart.toLowerCase();
        }

        // add the static part of the route to the tree
        this._insert(staticPart, 0, null, null, null);

        // isolate the parameter name
        let isRegex = false;
        while (i < len && path.charCodeAt(i) !== 47) {
          isRegex = isRegex || path[i] === '('
          if (isRegex) {
            i = getClosingParenthensePosition(path, i) + 1;
            break
          } else if (path.charCodeAt(i) !== 45) {
            i++;
          } else {
            break;
          }
        }

        if (isRegex && (i === len || path.charCodeAt(i) === 47)) {
          nodeType = NODE_TYPES.REGEX;
        } else if (i < len && path.charCodeAt(i) !== 47) {
          nodeType = NODE_TYPES.MULTI_PARAM;
        }

        let parameter = path.slice(j, i);
        let regex: RegExp | null = isRegex ? new RegExp(parameter.slice(parameter.indexOf('('), i)) : null;
        params.push(parameter.slice(0, isRegex ? parameter.indexOf('(') : i));

        path = path.slice(0, j) + path.slice(i);
        i = j;
        len = path.length;

        // if the path is ended
        if (i === len) {
          let completedPath = path.slice(0, i)
          if (this.caseSensitive === false) {
            completedPath = completedPath.toLowerCase()
          }
          return this._insert(completedPath, nodeType, params, handler, regex);
        }
        // add the parameter and continue with the search
        this._insert(path.slice(0, i), nodeType, params, null, regex);
        i--;
      } else if (path.charCodeAt(i) === 42) {
        this._insert(path.slice(0, i), 0, null, null, null);
        // add the wildcard parameter
        params.push('*');
        return this._insert(path.slice(0, len), 2, params, handler, null);
      }
    }

    if (this.caseSensitive === false) {
      path = path.toLowerCase();
    }
  
    // static route
    this._insert(path, 0, params, handler, null);
  }

  private _insert(path: string, kind: number, params: Array<string> = [], handler: Function, regex?: RegExp) {
    const route = path;
    let currentNode = this.tree;
    let prefix = '';
    let pathLen = 0;
    let prefixLen = 0;
    let len = 0;
    let max = 0;
    let node = null;

    while (true) {
      prefix = currentNode.prefix;
      prefixLen = prefix.length;
      pathLen = path.length;
      len = 0;

      // search for the longest common prefix
      max = pathLen < prefixLen ? pathLen : prefixLen;
      while (len < max && path[len] === prefix[len]) len++;

      // the longest common prefix is smaller than the current prefix
      // let's split the node and add a new child
      if (len < prefixLen) {
        node = new Node(
          { prefix: prefix.slice(len),
            children: currentNode.children,
            kind: currentNode.kind,
            handlers: new Handlers(currentNode.handlers),
            regex: currentNode.regex }
        );
        if (currentNode.wildcardChild !== null) {
          node.wildcardChild = currentNode.wildcardChild;
        }

        // reset the parent
        currentNode
          .reset(prefix.slice(0, len))
          .addChild(node);
        
        // if the longest common prefix has the same length of the current path
        // the handler should be added to the current node, to a child otherwise
        if (len === pathLen) {
          if (currentNode.getHandler()) {
            throw new Error(`Method '${'GET'}' already declared for route '${route}'`);
          }
          currentNode.setHandler(handler, params);
          currentNode.kind = kind;
        } else {
          node = new Node({
            prefix: path.slice(len),
            kind: kind,
            handlers: null,
            regex: regex
          })
          node.setHandler(handler, params);
          currentNode.addChild(node);
        }

      // the longest common prefix is smaller than the path length,
      // but is higher than the prefix
      } else if (len < pathLen) {
        // remove the prefix
        path = path.slice(len);
        // check if there is a child with the label extracted from the new path
        node = currentNode.findByLabel(path);
        // there is a child within the given label, we must go deepen in the tree
        if (node) {
          currentNode = node;
          continue;
        }
        // there are not children within the given label, let's create a new one!
        node = new Node({ prefix: path, kind: kind, handlers: null, regex: regex });
        node.setHandler(handler, params);

        currentNode.addChild(node);

      // the node already exist
      } else if (handler) {
        if (currentNode.getHandler()) {
          throw new Error(`Method '${'GET'}' already declared for route '${route}'`);
        }
        currentNode.setHandler(handler, params);
      }
      return;
    }
  }

  reset() {
    this.tree = new Node();
    this.routes = [];
  }

  off(path: string): any {
    let self = this;
    const method = 'GET';
    if (Array.isArray(method)) {
      return method.map(method => self.off(path));
    }

    // path validation
    if (typeof path !== 'string') throw new Error('Path should be a string');
    if (path.length === 0) throw new Error('The path could not be empty');
    if (path[0] !== '/' && path[0] !== '*') throw new Error('The first character of a path should be `/` or `*`');

    // Rebuild tree without the specific route
    const ignoreTrailingSlash = this.ignoreTrailingSlash;
    let newRoutes = self.routes.filter(route => {
      if (!ignoreTrailingSlash) {
        return !(method === route.method && path === route.path);
      }
      if (path.endsWith('/')) {
        const routeMatches = path === route.path || path.slice(0, -1) === route.path;
        return !(method === route.method && routeMatches);
      }
      const routeMatches = path === route.path || (path + '/') === route.path;
      return !(method === route.method && routeMatches);
    });
    if (ignoreTrailingSlash) {
      newRoutes = newRoutes.filter((route, i, ar) => {
        if (route.path.endsWith('/') && i < ar.length - 1) {
          return route.path.slice(0, -1) !== ar[i + 1].path;
        } else if (route.path.endsWith('/') === false && i < ar.length - 1) {
          return (route.path + '/') !== ar[i + 1].path;
        }
        return true;
      })
    }
    self.reset()
    newRoutes.forEach(route => self.on(route.path, route.opts, route.handler));
  }

  lookup(pathname: string) {
    const handle = this.find(sanitizeUrl(pathname));
    if (handle === null) return;
    return handle;
  }

  get(path: string, handler: Function) {
    return this.on(path, handler);
  }

  find(path: string) {
    const method = 'GET';
    if (path.charCodeAt(0) !== 47) { // 47 is '/'
      path = path.replace(FULL_PATH_REGEXP, '/');
    }

    let originalPath = path;
    let originalPathLength = path.length;

    if (this.caseSensitive === false) {
      path = path.toLowerCase();
    }

    let maxParamLength = this.maxParamLength;
    let currentNode = this.tree;
    let wildcardNode = null;
    let pathLenWildcard = 0;
    let decoded = null;
    let pindex = 0;
    let params: Array<string> = [];
    let i = 0;
    let idxInOriginalPath = 0;

    while (true) {
      let pathLen = path.length;
      let prefix = currentNode.prefix;
      let prefixLen = prefix.length;
      let len = 0;
      let previousPath = path;

      // found the route
      if (pathLen === 0 || path === prefix) {
        let handle = currentNode.handlers['GET'];
        if (handle !== null && handle !== undefined) {
          let paramsObj: { [key: string]: string } = {};
          if (handle.paramsLength > 0) {
            let paramNames = handle.params;

            for (i = 0; i < handle.paramsLength; i++) {
              paramsObj[paramNames[i]] = params[i];
            }
          }

          return {
            handler: handle.handler,
            params: paramsObj,
          }
        }
      }

      // search for the longest common prefix
      i = pathLen < prefixLen ? pathLen : prefixLen;
      while (len < i && path.charCodeAt(len) === prefix.charCodeAt(len)) len++;

      if (len === prefixLen) {
        path = path.slice(len);
        pathLen = path.length;
        idxInOriginalPath += len;
      }

      let node = currentNode.findChild(path);

      if (node === null) {
        node = currentNode.parametricBrother;
        if (node === null) {
          return getWildcardNode(wildcardNode, originalPath, pathLenWildcard);
        }
  
        if (originalPath.indexOf('/' + previousPath) === -1) {
          // we need to know the outstanding path so far from the originalPath since the last encountered "/" and assign it to previousPath.
          // e.g originalPath: /aa/bbb/cc, path: bb/cc
          // outstanding path: /bbb/cc
          let pathDiff = originalPath.slice(0, originalPathLength - pathLen);
          previousPath = pathDiff.slice(pathDiff.lastIndexOf('/') + 1, pathDiff.length) + path;
        }
        idxInOriginalPath = idxInOriginalPath - (previousPath.length - path.length);
        path = previousPath;
        pathLen = previousPath.length;
        len = prefixLen;
      }

      let kind = node.kind;

      // static route
      if (kind === NODE_TYPES.STATIC) {
        // if exist, save the wildcard child
        if (currentNode.wildcardChild !== null) {
          wildcardNode = currentNode.wildcardChild;
          pathLenWildcard = pathLen;
        }
        currentNode = node;
        continue;
      }

      if (len !== prefixLen) {
        return getWildcardNode(wildcardNode, originalPath, pathLenWildcard);
      }

      // if exist, save the wildcard child
      if (currentNode.wildcardChild !== null) {
        wildcardNode = currentNode.wildcardChild;
        pathLenWildcard = pathLen;
      }

      // parametric route
      if (kind === NODE_TYPES.PARAM) {
        currentNode = node;
        i = path.indexOf('/');
        if (i === -1) i = pathLen;
        if (i > maxParamLength) return null;
        decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i));
        if (decoded === null) return null;
        params[pindex++] = decoded;
        path = path.slice(i);
        idxInOriginalPath += i;
        continue;
      }

      // wildcard route
      if (kind === NODE_TYPES.MATCH_ALL) {
        decoded = fastDecode(originalPath.slice(idxInOriginalPath));
        if (decoded === null) return null;
        params[pindex] = decoded;
        currentNode = node;
        path = '';
        continue;
      }

      // parametric(regex) route
      if (kind === NODE_TYPES.REGEX) {
        currentNode = node;
        i = path.indexOf('/');
        if (i === -1) i = pathLen;
        if (i > maxParamLength) return null;
        decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i));
        if (decoded === null) return null;
        if (!node.regex.test(decoded)) return null;
        params[pindex++] = decoded;
        path = path.slice(i);
        idxInOriginalPath += i;
        continue;
      }

      // multiparametric route
      if (kind === NODE_TYPES.MULTI_PARAM) {
        currentNode = node;
        i = 0;
        if (node.regex !== null) {
          let matchedParameter = path.match(node.regex);
          if (matchedParameter === null) return null;
          i = matchedParameter[1].length;
        } else {
          while (i < pathLen && path.charCodeAt(i) !== 47 && path.charCodeAt(i) !== 45) i++;
          if (i > maxParamLength) return null;
        }
        decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i));
        if (decoded === null) return null;
        params[pindex++] = decoded;
        path = path.slice(i);
        idxInOriginalPath += i;
        continue;
      }

      wildcardNode = null;
    }
  }
}

function sanitizeUrl (url: string) {
  for (let i = 0, len = url.length; i < len; i++) {
    let charCode = url.charCodeAt(i)
    // Some systems do not follow RFC and separate the path and query
    // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
    // Thus, we need to split on `;` as well as `?` and `#`.
    if (charCode === 63 || charCode === 59 || charCode === 35) {
      return url.slice(0, i);
    }
  }
  return url;
}

function getWildcardNode(node: Node, path: string, len: number) {
  const method = 'GET';
  if (node === null) return null
  let decoded = fastDecode(path.slice(-len))
  if (decoded === null) return null
  let handle = node.handlers[method]
  if (handle !== null && handle !== undefined) {
    return {
      handler: handle.handler,
      params: { '*': decoded },
    }
  }
  return null;
}

function getClosingParenthensePosition (path: string, idx: number) {
  // `path.indexOf()` will always return the first position of the closing parenthese,
  // but it's inefficient for grouped or wrong regexp expressions.
  // see issues #62 and #63 for more info
  let parentheses = 1;

  while (idx < path.length) {
    idx++;

    // ignore skipped chars
    if (path[idx] === '\\') {
      idx++
      continue;
    }

    if (path[idx] === ')') {
      parentheses--;
    } else if (path[idx] === '(') {
      parentheses++;
    }

    if (!parentheses) return idx;
  }

  throw new Error('Invalid regexp expression in "' + path + '"');
}