import { Application, Controller, Route, bootstrp, Context } from '../src';
import { reactive, computed, effect } from '@vue/reactivity';

class CustomApplication extends Application {
  private readonly el = document.getElementById('app');
  private div:HTMLDivElement;
  constructor() {
    super();
    this.on('Application.onInit', next => {
      const div = document.createElement('div');
      this.el.appendChild(div);
      div.innerHTML = 'this is a div';
      this.div = div;
      next();
    })
    this.on('Application.onRender', (ctx, server, key, metadata) => {
      console.log(ctx, server, key, metadata);
      return ctx;
    })
  }
}

@Controller()
class CustomController {
  @Route()
  abc() {
    
  }
}

const app = new CustomApplication();
app.setController(CustomController);
bootstrp();
console.log(app);