import { Context, Request } from "@typeclient/core";
import { VueApplication } from "./vue";

export const contextTypes = {
  req: Request,
  app: VueApplication,
  state: Object,
  query: Object,
  params: Object,
  id: Number,
  self: Context,
  status: Number,
  redirect: Function,
  replace: Function,
  reload: Function,
}

export type TContextProps = ReturnType<typeof contextProps>;

export function contextProps<T extends object = {}>(context: Context<T>) {
  return {
    get req() {
      return context.req;
    },
    get app() {
      return context.app;
    },
    get state() {
      return context.state;
    },
    get query() {
      return context.query;
    },
    get params() {
      return context.params;
    },
    get id() {
      return context.id;
    },
    get self() {
      return context;
    },
    get status() {
      return context.status;
    },
    redirect(url: string, title?: string) {
      return context.redirect(url, title);
    },
    replace(url: string, title?: string) {
      return context.replace(url, title);
    },
    reload() {
      return context.reload();
    }
  }
}