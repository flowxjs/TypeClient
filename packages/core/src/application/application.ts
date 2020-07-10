import { join } from 'path';
import { useHistoryFeedback } from '../history';
import { TClassIndefiner, AnnotationMetaDataScan, NAMESPACE, AnnotationDependenciesAutoRegister } from '../annotation';
import { TypeClientContainer } from '../ioc';
import { Router, RouterArguments } from '../router';
import { Context } from './context';
import { createNextTick } from '../history/next-tick';
import { ContextEventEmitter } from './events';
import { TApplicationLifeCycle } from './lifecycle';
import { ContextTransforming } from './transform';
import { Request } from './request';

export type TApplicationOptions = RouterArguments & { prefix: string };

export class Application<S extends { [key: string]: { arguments: any[], return: any } }> extends ContextEventEmitter<TApplicationLifeCycle & S> {
  private initialized = false;
  public readonly prefix: string;
  private readonly router: Router;
  
  public context: Context;
  public readonly unSubscribe: ReturnType<typeof useHistoryFeedback>;
  public readonly nextTick = createNextTick((e: Error, ctx: Context) => this.trigger('Application.onError', e, ctx));

  constructor(options: TApplicationOptions = { prefix: '/' }) {
    super();
    this.prefix = options.prefix || '/';
    this.router = new Router(options);
    this.unSubscribe = useHistoryFeedback(url => {
      if (this.initialized) return this.createContext(url);
      return this.trigger('Application.onInit', () => {
        this.initialized = true;
        this.createContext(url);
      });
    });
  }

  private createContext(url: string) {
    const uri = this.decode(url);
    if (uri) {
      const req = new Request(uri);
      const handler = this.router.lookup(req.pathname);
      if (!handler) return this.trigger('Application.onNotFound', req);
      req.params = handler.params || {};
      handler.handler(req);
    }
  }

  // If the route matches the prefix,
  // then clear the prefix to get the real routing address.
  private decode(path: string) {
    if (path.startsWith(this.prefix)) {
      return path.substring(this.prefix.length - 1) || '/';
    }
  }

  private injectClassModules(...classModules: TClassIndefiner<any>[]) {
    classModules.forEach(classModule => {
      AnnotationDependenciesAutoRegister(
        classModule, 
        TypeClientContainer
      )
    });
    return this;
  }

  public setController<T = any>(classModule: TClassIndefiner<T>) {
    const classMetadata = AnnotationMetaDataScan(classModule, TypeClientContainer);
    const classPrefix = classMetadata.meta.got(NAMESPACE.CONTROLLER, '/');
    const classInjectors = classMetadata.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
    this.injectClassModules(...classInjectors);
    for (const [key, method] of classMetadata.methods) {
      const propertyPath = method.meta.got<string>(NAMESPACE.PATH, null);
      if (!propertyPath) continue;
      const propertyEntryPath = join(classPrefix, '.', propertyPath);
      const propertyInjectors = method.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
      const propertyStates = method.meta.got(NAMESPACE.STATE, () => ({}));
      this.injectClassModules(...propertyInjectors);
      this.router.on(propertyEntryPath, (req: Request) => {
        const context = this.context = new Context(this, req, propertyStates());
        const server = TypeClientContainer.get<T>(classModule);
        this.trigger('Application.onRender', context, server, key, method);
        ContextTransforming(context, method);
      })
    }
  }
}