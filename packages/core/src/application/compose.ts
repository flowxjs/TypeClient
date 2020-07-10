export type ComposeNextCallback = (...args: any[]) => Promise<any>;
export type ComposeMiddleware<T = any> = (ctx: T, next: ComposeNextCallback) => any;
export type ComposedMiddleware<T = any> = (ctx: T, next?: ComposeNextCallback) => Promise<void>;

export function Compose<T = any>(middleware?: ComposeMiddleware<T>[]): ComposedMiddleware<T> {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return (ctx: T, next: ComposeNextCallback) => {
    // last called middleware #
    let index = -1;
    return dispatch(0);
    function dispatch(i: number): any {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(ctx, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }
}
