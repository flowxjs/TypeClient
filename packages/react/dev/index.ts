import React from 'react';
import { ReactApplication, useContextState, Template } from '../src';
import { bootstrp, Controller, Route, State, Context } from '@typeclient/core';
import { injectable, inject } from 'inversify';

interface TCustomRouteData {
  count: number
}

@injectable()
class Abc {
  abc() {
    return 123;
  }
}

@Controller()
@Template(ZTemplate)
class CustomController {
  @inject(Abc) private readonly Abc: Abc;

  @Route()
  @State<TCustomRouteData>({ count: 0 })
  test(ctx: Context<TCustomRouteData>) {
    const { count } = useContextState(() => {
      return {
        count: ctx.state.count
      }
    })
    return React.createElement(React.Fragment, null, 
      React.createElement('h3', null, ctx.query.a + 'test title' + count),
      React.createElement('button', {
        onClick: () => {
          ctx.state.count = ctx.state.count + this.Abc.abc();
        },
      }, 'add +'),
      React.createElement('button', {
        onClick: () => ctx.redirect('/ooo'),
      }, 'go')
    )
  }

  @Route('/ooo')
  sss(ctx: Context) {
    console.log(ctx)
    return React.createElement('p', null, '123 - ')
  }
}

const app = new ReactApplication({
  el: document.getElementById('app'),
  prefix: '/'
});

app.setController(CustomController);

export const Slot = app.createSlotter();

bootstrp();
function ZTemplate(props: any) {
  return React.createElement('div', null, 
    React.createElement('h2', null, 'tessssssss'),
    React.createElement(Slot, props)
  );
}
