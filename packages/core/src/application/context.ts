import { join } from 'path';
import { Request } from './request';
import { Application } from './application';
import { ContextEventEmitter } from './events';
import { TApplicationContextLifeCycle } from './lifecycle';
import { reactive, Ref, UnwrapRef } from '@vue/reactivity';
import { redirect, replace, reload } from '../history';

type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRef<T>;
let index = 0;

export class Context<T extends object = {}> extends ContextEventEmitter<TApplicationContextLifeCycle> {
  public readonly req: Request;
  public readonly app: Application<any>;
  public readonly state: UnwrapNestedRefs<T>;
  public readonly query: { [key: string]: string };
  public readonly params: { [key: string]: string };
  public readonly reload = reload;
  public readonly key: number;

  constructor(app: Application<any>, req: Request, data: T) {
    super();
    this.app = app;
    this.req = req;
    this.state = reactive(data);
    this.query = this.req.query;
    this.params = this.req.params;
    this.key = index++;
  }

  destroy() {

  }

  private readonly urlencode = (url: string) => {
    if (url.startsWith(this.app.prefix)) return url;
    return join(this.app.prefix, '.', url);
  }

  public readonly redirect = (url: string, title?: string) => {
    return redirect(this.urlencode(url), title);
  }

  public readonly replace = (url: string, title?: string) => {
    return replace(this.urlencode(url), title);
  }
}

// export interface TContext<T extends object = {}> {
//   app: Application<any>,
//   state: UnwrapNestedRefs<T>,
//   query: Readonly<Request['query']>,
//   params: Readonly<Request['params']>,
//   key: number,
//   reload: () => void,
//   redirect: (url: string, title?: string) => void,
//   replace: (url: string, title?: string) => void,
// };

// export function createNewContextObject<T extends object = {}>(app: Application<any>, req: Request, data: T): TContext<T> {
//   return {
//     app,
//     state: reactive(data),
//     query: readonly(req.query),
//     params: readonly(req.params),
//     key: index++,
//     reload,
//     redirect(url: string, title?: string) {
//       return redirect(urlencode(app.prefix, url), title);
//     },
//     replace(url: string, title?: string) {
//       return replace(urlencode(app.prefix, url), title);
//     }
//   }
// }

// function urlencode(prefix: Application<any>['prefix'], url: string) {
//   if (url.startsWith(prefix)) return url;
//   return join(prefix, '.', url);
// }