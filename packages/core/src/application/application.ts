import { join } from 'path';
import { useHistoryFeedback, redirect, replace, reload } from '../history';
import { TClassIndefiner, AnnotationMetaDataScan, NAMESPACE, AnnotationDependenciesAutoRegister } from '../annotation';
import { TypeClientContainer } from '../ioc';
import { Router, RouterArguments } from '../router';
import { Context } from './context';
import { createNextTick } from '../history/next-tick';
import { ContextEventEmitter } from './events';
import { TApplicationLifeCycle } from './lifecycle';
import { ActionTransforming, ContextTransforming } from './transform';
import { Request } from './request';
import { ComposeMiddleware } from './compose';
import { MiddlewareTransform } from './transforms';

type TNotFound = TApplicationLifeCycle['Application.onNotFound'];
type TError = TApplicationLifeCycle['Application.onError'];
type THashAnchor = TApplicationLifeCycle['Application.onHashAnchorChange'];
type TBeforeContextCreateProps = { server: any, key: string | symbol, state: any, next: (state: any) => void };
export type TApplicationOptions = RouterArguments & { prefix: string };

export class Application<S extends { 
  [key: string]: { 
    arguments: any[], 
    return: any 
  } 
} = {}> extends ContextEventEmitter<TApplicationLifeCycle & S> {
  private _initialized = false;
  private _subscribed = false;
  private _unSubscribe: ReturnType<typeof useHistoryFeedback>;
  private _beforeContextCreate: (props: TBeforeContextCreateProps) => void;
  private _afterContextCreated: (ctx: Context<any>) => void;

  public context: Context;
  public readonly prefix: string;
  private readonly router: Router;
  public readonly middlewares: any[] = [];

  // history reload action
  public readonly reload = reload;
  public readonly nextTick = createNextTick((e: Error, ctx: Context) => {
    this.trigger(
      'Application.onErrorRender', 
      this.trigger('Application.onError', e, ctx)
    )
  });

  public setBeforeContextCreate(callback: (props: TBeforeContextCreateProps) => void) {
    this._beforeContextCreate = callback;
    return this;
  }

  public setAfterContextCreated(callback: (ctx: Context<any>) => void) {
    this._afterContextCreated = callback;
    return this;
  }

  constructor(options: TApplicationOptions = { prefix: '/' }) {
    super();
    this.prefix = options.prefix || '/';
    this.router = new Router(options);
    this.subscribe();
  }

  use<C extends Context, T extends MiddlewareTransform<C>, M extends TClassIndefiner<T>>(classModule: ComposeMiddleware<C> | M) {
    if ((classModule as M).prototype && (classModule as M).prototype.use) {
      this.injectClassModules(classModule as M);
    }
    this.middlewares.push(classModule);
    return this;
  }

  /**
   * subscribe the history change evnets pool.
   * the browser history will been connected once it subscribed.
   * 
   * ```ts
   *  app.subscribe();
   * ```
   */
  public subscribe() {
    if (this._subscribed) return this;
    this._unSubscribe = useHistoryFeedback(url => {
      if (this._initialized) return this.createContext(url);
      return this.trigger('Application.onInit', () => {
        this._initialized = true;
        this.createContext(url);
      });
    });
    this._subscribed = true;
    return this;
  }

  /**
   * unSubscribe the history change events pool.
   * the browser history will been disconnected  once it unsubscribed.
   * 
   * ```ts
   *  app.unSubscribe();
   * ```
   */
  public unSubscribe() {
    if (!this._subscribed) return this;
    if (this._unSubscribe) {
      this._unSubscribe();
      this._subscribed = false;
    }
    return this;
  }

  /**
   * Lifecycle for `not found`
   * @param callback 
   * ```ts
   *  app.onNotFound((req: Request) => { ... });
   * ```
   */
  public onNotFound(callback: (...args: TNotFound['arguments']) => TNotFound['return']) {
    return this.on('Application.onNotFound', callback);
  }

  /**
   * Lifecycle for `error`
   * @param callback 
   * ```ts
   *  app.onError((err, ctx) => { ... });
   * ```
   */
  public onError(callback: (...args: TError['arguments']) => TError['return']) {
    return this.on('Application.onError', callback);
  }

  public onHashAnchor(callback: (...args: THashAnchor['arguments']) => THashAnchor['return']) {
    return this.on('Application.onHashAnchorChange', callback);
  }

  // create a new context for request.
  private createContext(url: string) {
    const uri = this.decode(url);
    if (uri) {
      const req = new Request(uri);
      const handler = this.router.lookup(req.pathname);
      const prevContext = this.context;
      
      // Not found.
      // You can deal with Application.onNotFound by return a value.
      if (!handler) return this.trigger(
        'Application.onErrorRender', 
        this.trigger('Application.onNotFound', req)
      );

      if (prevContext) {
        // deal with old context
        // force it destory.
        switch (prevContext.status.value) {
          case 100: prevContext.destroy(); break;
          case 200: prevContext.$e.emit('context.destroy'); break;
        }
      }
      req.params = handler.params || {};
      this.nextTick(req, handler.handler);
    }
  }

  // If the route matches the prefix,
  // then clear the prefix to get the real routing address.
  private decode(path: string) {
    if (path.startsWith(this.prefix)) {
      let _path = path.substring(this.prefix.length) || '/';
      if (!_path.startsWith('/')) {
        _path = '/' + _path;
      }
      return _path;
    }
  }

  /**
   * auto inject modules to <TypeContainer>.
   * @param classModules 
   */
  public injectClassModules(...classModules: TClassIndefiner<any>[]) {
    classModules.forEach(classModule => {
      AnnotationDependenciesAutoRegister(
        classModule, 
        TypeClientContainer
      )
    });
    return this;
  }

  /**
   * push new controller to Router and auto register its dependencies.
   * @param classModule 
   */
  public setController<T = any>(classModule: TClassIndefiner<T>) {
    const classMetadata = AnnotationMetaDataScan(classModule, TypeClientContainer);
    const classPrefix = classMetadata.meta.got(NAMESPACE.CONTROLLER, '/');
    const classInjectors = classMetadata.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
    // auto register class injectors to container.
    this.injectClassModules(...classInjectors);
    for (const [key, method] of classMetadata.methods) {
      const propertyPaths = method.meta.got<string[]>(NAMESPACE.PATH, []);
      if (!propertyPaths.length) continue;
      const propertyInjectors = method.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
      const propertyStates = method.meta.got<object | (() => object)>(NAMESPACE.STATE, {});
      const contextCreateds = method.meta.got<((ctx: Context<any>) => void)[]>(NAMESPACE.CONTEXTCREATED, []);
      const actions = method.meta.got<((ctx: Context<any>, data: any) => Promise<void>)[]>(NAMESPACE.ACTION, []);
      // auto register method injectors to container.
      this.injectClassModules(...propertyInjectors);
      propertyPaths.forEach(propertyPath => {
        const propertyEntryPath = join(classPrefix, '.', propertyPath);
        this.router.on(propertyEntryPath, (req: Request) => {
          let context: Context<any>;
          const server = TypeClientContainer.get<T>(classModule);
          const createContext = (state: any) => {
            context = this.context = new Context(
              this, req, state
            );
            if (this._afterContextCreated) {
              this._afterContextCreated(context);
            }
            contextCreateds.forEach(created => created(context));
          }
          if (this._beforeContextCreate) {
            this._beforeContextCreate({
              server, key, state: propertyStates,
              next: createContext,
            })
          } else {
            createContext(
              typeof propertyStates === 'function' 
                ? propertyStates() 
                : propertyStates
            )
          }
          if (actions.length) {
            ActionTransforming(context, method, server, key, actions).catch(e => {
              this.trigger(
                'Application.onErrorRender', 
                this.trigger('Application.onError', e, context)
              );
            })
          } else {
            ContextTransforming(context, method, () => {
              return Promise.resolve(this.trigger(
                'Application.onRender', 
                context, server, key, method
              ));
            });
          }
        })
      });
    }
  }

  /**
   * wrap url with prefix
   * @param url 
   */
  private urlencode(url: string) {
    if (url.startsWith(this.prefix)) return url;
    return join(this.prefix, '.', url);
  }

  /**
   * history redirect action
   * @param url 
   * @param title 
   */
  public redirect(url: string, title?: string) {
    return redirect(this.urlencode(url), title);
  }

  /**
   * history replace action
   * @param url 
   * @param title 
   */
  public replace(url: string, title?: string) {
    return replace(this.urlencode(url), title);
  }
}