import { Application, Context, TAnnotationScanerMethod, TApplicationOptions } from '@typeclient/core';
import { createApp, defineComponent, onMounted, h, ComponentPublicInstance, reactive, DefineComponent, Component, Fragment } from 'vue';
import { NAMESPACE } from './annotations';
import { contextProps, contextTypes, TContextProps } from './context';

type TVueRootData<T extends Context = Context> = {
  context: T,
  template: any,
  slot: DefineComponent<T>
}

export interface TVueApplicationOptions extends TApplicationOptions {
  el: HTMLElement | string
}

export class VueApplication extends Application {
  private portalDispatcher: (options: TVueRootData) => void;
  public readonly FCS: WeakMap<any, Map<string, DefineComponent>> = new WeakMap();
  constructor(options: TVueApplicationOptions) {
    super(options);
    this.on('Application.onInit', next => this.setup(options.el, next));
    this.on('Application.onRender', (ctx, server, key, metadata) => this.render(ctx, server, key, metadata));
  }

  setup(el: TVueApplicationOptions['el'], next: () => void) {
    const component = defineComponent({
      props: contextTypes,
      setup: () => {
        const data = reactive<{ 
          context: TContextProps, 
          template: DefineComponent,
          slot: DefineComponent,
        }>({
          context: null,
          template: null,
          slot: null,
        });
        onMounted(next);
        this.portalDispatcher = (options) => {
          data.context = reactive(contextProps(options.context)) || null;
          data.slot = options.slot || null;
          data.template = options.template || null;
        }
        return data;
      },
      render() {
        if (!this.template) return h(this.slot, this.context);
        return h(this.template, this.context, h(this.slot, this.context));
      }
    })
    createApp(component).mount(el);
  }

  render(ctx: Context, server: any, key: string, metadata: TAnnotationScanerMethod) {
    const classModuleMetaData = metadata.meta.parent;
    const TemplateComponent = classModuleMetaData.got<any>(NAMESPACE.TEMPLATE, null);
    const SlotComponent = this.getSlot(server, key);
    if (this.portalDispatcher) {
      this.portalDispatcher({
        context: ctx,
        template: TemplateComponent,
        slot: SlotComponent
      })
    }
  }

  getSlot(server: any, key: string) {
    const constructor = server.constructor;
    if (!this.FCS.has(constructor)) this.FCS.set(constructor, new Map());
    const fcs = this.FCS.get(constructor);
    if (!fcs.has(key)) {
      const Component = defineComponent({
        props: contextTypes,
        setup: server[key].bind(server)
      });
      fcs.set(key, Component);
    }
    return fcs.get(key);
  }
}