import { usePopStateHistoryMode, bootstrp, Controller, Route } from '@typeclient/core';
import { defineComponent, h } from 'vue';
import { VueApplication } from '../src';
import { Template } from '../src/annotations';
import { contextTypes } from '../src/context';

usePopStateHistoryMode();

const a = defineComponent({
  props: contextTypes,
  render() {
    return <div>dafdaf</div>
  }
})

@Controller()
@Template(a)
class XXX {
  @Route()
  t() {
    return () => h('p', '123');
  }
}

const app = new VueApplication({
  el: '#app',
  prefix: '/'
});

app.setController(XXX);
bootstrp();